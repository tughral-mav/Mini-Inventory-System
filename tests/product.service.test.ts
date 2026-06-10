import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above the file; build the mock with vi.hoisted so it
// exists by the time the factory runs.
const prismaMock = vi.hoisted(() => ({
  category: { findUnique: vi.fn() },
  product: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  stockMovement: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { productService, buildProductWhere } from "@/lib/services/product.service";
import { NotFoundError } from "@/lib/errors";

beforeEach(() => vi.clearAllMocks());

describe("buildProductWhere", () => {
  it("builds a case-insensitive name search", () => {
    const where = buildProductWhere({ search: "wid", status: "all" });
    expect(where.name).toEqual({ contains: "wid", mode: "insensitive" });
  });

  it("filters by category", () => {
    const where = buildProductWhere({ categoryId: "c1", status: "all" });
    expect(where.categoryId).toBe("c1");
  });

  it("maps low-stock status to a 1..5 range", () => {
    const where = buildProductWhere({ status: "low" });
    expect(where.stock).toEqual({ gt: 0, lte: 5 });
  });

  it("maps out_of_stock to <= 0", () => {
    const where = buildProductWhere({ status: "out_of_stock" });
    expect(where.stock).toEqual({ lte: 0 });
  });

  it("maps in_stock to > 5", () => {
    const where = buildProductWhere({ status: "in_stock" });
    expect(where.stock).toEqual({ gt: 5 });
  });
});

describe("productService.create", () => {
  it("creates a product under an existing category", async () => {
    prismaMock.category.findUnique.mockResolvedValue({ id: "c1", name: "Tools" });
    prismaMock.product.create.mockResolvedValue({ id: "p1", name: "Hammer" });

    const result = await productService.create({
      name: "Hammer",
      description: "Claw hammer",
      price: 9.99,
      stock: 12,
      categoryId: "c1",
    });

    expect(result).toEqual({ id: "p1", name: "Hammer" });
    expect(prismaMock.product.create).toHaveBeenCalledOnce();
    // Decimal price is passed through as a Prisma.Decimal — assert numeric value.
    const arg = prismaMock.product.create.mock.calls[0][0];
    expect(Number(arg.data.price)).toBe(9.99);
    expect(arg.data.stock).toBe(12);
  });

  it("rejects creation when the category does not exist", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);

    await expect(
      productService.create({
        name: "Orphan",
        price: 1,
        stock: 1,
        categoryId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input (negative price) before touching the database", async () => {
    await expect(
      productService.create({
        name: "Bad",
        price: -5,
        stock: 1,
        categoryId: "c1",
      }),
    ).rejects.toThrow();
    expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
  });
});
