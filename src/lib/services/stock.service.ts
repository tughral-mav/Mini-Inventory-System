import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InsufficientStockError, NotFoundError } from "@/lib/errors";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validators";

/**
 * Business logic layer for stock movements.
 *
 * Stock is changed with a single **atomic conditional UPDATE** rather than a
 * read-then-write inside an interactive transaction. This has two benefits:
 *   1. It is concurrency-safe — the `stock >= -delta` guard and the increment
 *      happen in one statement, so two simultaneous requests can't both pass a
 *      stale check and drive stock negative.
 *   2. It runs over a single HTTPS query via the Neon serverless adapter (no
 *      WebSocket session), which is the reliable transport on Vercel's
 *      serverless functions. A DB `CHECK (stock >= 0)` constraint is the final
 *      backstop.
 * The audit `StockMovement` row is then appended (an audit log tolerates being
 * a separate insert; the critical invariant is enforced by the UPDATE above).
 */
export const stockService = {
  async adjust(input: StockAdjustmentInput) {
    const { productId, delta, note } = stockAdjustmentSchema.parse(input);

    // Atomic: only decrement if enough stock remains. For increases there is no
    // lower-bound guard. `increment` maps to `SET stock = stock + delta`.
    const guard = delta < 0 ? { stock: { gte: -delta } } : {};
    const result = await prisma.product.updateMany({
      where: { id: productId, ...guard },
      data: { stock: { increment: delta } },
    });

    if (result.count === 0) {
      // Nothing updated: either the product is missing or the guard failed.
      const existing = await prisma.product.findUnique({ where: { id: productId } });
      if (!existing) throw new NotFoundError("Product", productId);
      throw new InsufficientStockError(existing.stock, delta);
    }

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { name: true } } },
    });
    // updated is guaranteed non-null here (we just updated it).
    const resulting = updated!.stock;

    await prisma.stockMovement.create({
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

    return updated!;
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
