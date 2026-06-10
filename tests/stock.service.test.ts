import { beforeEach, describe, expect, it, vi } from "vitest";

// Built with vi.hoisted so it is initialized before the hoisted vi.mock factory runs.
const prismaMock = vi.hoisted(() => ({
  product: { updateMany: vi.fn(), findUnique: vi.fn() },
  stockMovement: { create: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { stockService } from "@/lib/services/stock.service";
import { InsufficientStockError, NotFoundError } from "@/lib/errors";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.stockMovement.create.mockResolvedValue({});
});

describe("stockService.adjust", () => {
  it("increases stock with an atomic unguarded update and writes an audit movement", async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      name: "Widget",
      stock: 15,
      category: { name: "Tools" },
    });

    const result = await stockService.adjust({ productId: "p1", delta: 5 });

    expect(result.stock).toBe(15);
    // Increase: no lower-bound guard, atomic increment.
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: { increment: 5 } },
    });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: 5, resulting: 15, type: "INCREASE" }),
      }),
    );
  });

  it("decreases stock with a guarded update so it can't go negative", async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      stock: 6,
      category: { name: "Tools" },
    });

    const result = await stockService.decrease("p1", 4);

    expect(result.stock).toBe(6);
    // Decrease: guard requires at least the amount being removed.
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", stock: { gte: 4 } },
      data: { stock: { increment: -4 } },
    });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: -4, type: "DECREASE" }),
      }),
    );
  });

  it("prevents negative stock: guarded update affects 0 rows and no movement is written", async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 2 });

    await expect(stockService.adjust({ productId: "p1", delta: -5 })).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the product does not exist", async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(stockService.adjust({ productId: "ghost", delta: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
  });
});
