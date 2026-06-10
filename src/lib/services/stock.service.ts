import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { computeNewStock } from "@/lib/services/stock-logic";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validators";

/**
 * Business logic layer for stock movements. Every change runs inside a
 * transaction so the product's stock and the audit record stay consistent,
 * and `computeNewStock` guarantees stock never goes negative (a DB CHECK
 * constraint is the final backstop).
 */
export const stockService = {
  async adjust(input: StockAdjustmentInput) {
    const { productId, delta, note } = stockAdjustmentSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundError("Product", productId);

      // Throws InsufficientStockError if this would drop below zero.
      const resulting = computeNewStock(product.stock, delta);

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: resulting },
        include: { category: { select: { name: true } } },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          delta,
          resulting,
          type:
            delta > 0
              ? StockMovementType.INCREASE
              : delta < 0
                ? StockMovementType.DECREASE
                : StockMovementType.ADJUSTMENT,
          note: note || null,
        },
      });

      return updated;
    });
  },

  /** Convenience wrappers. */
  async increase(productId: string, amount: number, note?: string) {
    return this.adjust({ productId, delta: Math.abs(amount), note });
  },

  async decrease(productId: string, amount: number, note?: string) {
    return this.adjust({ productId, delta: -Math.abs(amount), note });
  },

  /** Recent movements for a product (audit trail view). */
  async history(productId: string, limit = 20) {
    return prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
