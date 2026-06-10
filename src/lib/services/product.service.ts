import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import {
  LOW_STOCK_THRESHOLD,
  StockStatus,
  productInputSchema,
  productFilterSchema,
  type ProductInput,
  type ProductFilter,
} from "@/lib/validators";

/**
 * Business logic layer for products: validation, search/filtering, and CRUD.
 * The database layer (Prisma) is the only thing it talks to.
 */

/** Translate UI filter options into a Prisma `where` clause. */
export function buildProductWhere(filter: ProductFilter): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filter.search) {
    // Case-insensitive name search (indexed on `name`).
    where.name = { contains: filter.search, mode: "insensitive" };
  }

  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }

  switch (filter.status) {
    case StockStatus.OUT_OF_STOCK:
      where.stock = { lte: 0 };
      break;
    case StockStatus.LOW:
      where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
      break;
    case StockStatus.IN_STOCK:
      where.stock = { gt: LOW_STOCK_THRESHOLD };
      break;
    default:
      break; // ALL
  }

  return where;
}

export const productService = {
  async list(rawFilter: Partial<ProductFilter> = {}) {
    const filter = productFilterSchema.parse(rawFilter);
    const where = buildProductWhere(filter);
    return prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    if (!product) throw new NotFoundError("Product", id);
    return product;
  },

  async create(input: ProductInput) {
    const data = productInputSchema.parse(input);

    // Verify the referenced category exists for a friendly error rather than
    // a raw foreign-key failure.
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundError("Category", data.categoryId);

    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: new Prisma.Decimal(data.price),
        stock: data.stock,
        categoryId: data.categoryId,
        // Record the opening balance in the audit trail.
        movements:
          data.stock > 0
            ? {
                create: {
                  delta: data.stock,
                  resulting: data.stock,
                  type: StockMovementType.INITIAL,
                  note: "Initial stock on product creation",
                },
              }
            : undefined,
      },
      include: { category: { select: { name: true } } },
    });
  },

  async update(id: string, input: ProductInput) {
    const data = productInputSchema.parse(input);
    await this.getById(id); // NotFoundError if missing

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundError("Category", data.categoryId);

    // Note: this update intentionally does NOT change stock — stock is mutated
    // only through the stock service so every change is audited.
    return prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        price: new Prisma.Decimal(data.price),
        categoryId: data.categoryId,
      },
      include: { category: { select: { name: true } } },
    });
  },

  async remove(id: string) {
    await this.getById(id); // NotFoundError if missing
    return prisma.product.delete({ where: { id } });
  },
};
