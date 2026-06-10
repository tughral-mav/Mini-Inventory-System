import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory tx mock that the mocked $transaction will hand to the service.
const tx = {
  product: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  stockMovement: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    // Run the callback with our controllable tx mock.
    $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
    stockMovement: { findMany: vi.fn() },
  },
}));

import { stockService } from "@/lib/services/stock.service";
import { InsufficientStockError, NotFoundError } from "@/lib/errors";

beforeEach(() => {
  vi.clearAllMocks();
  tx.product.update.mockImplementation(({ data }: { data: { stock: number } }) => ({
    id: "p1",
    name: "Widget",
    stock: data.stock,
    category: { name: "Tools" },
  }));
  tx.stockMovement.create.mockResolvedValue({});
});

describe("stockService.adjust", () => {
  it("increases stock and writes an audit movement", async () => {
    tx.product.findUnique.mockResolvedValue({ id: "p1", stock: 10 });

    const result = await stockService.adjust({ productId: "p1", delta: 5 });

    expect(result.stock).toBe(15);
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 15 } }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: 5, resulting: 15, type: "INCREASE" }),
      }),
    );
  });

  it("decreases stock when sufficient", async () => {
    tx.product.findUnique.mockResolvedValue({ id: "p1", stock: 10 });

    const result = await stockService.decrease("p1", 4);

    expect(result.stock).toBe(6);
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: -4, type: "DECREASE" }),
      }),
    );
  });

  it("prevents stock from going negative and does NOT update the product", async () => {
    tx.product.findUnique.mockResolvedValue({ id: "p1", stock: 2 });

    await expect(stockService.adjust({ productId: "p1", delta: -5 })).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a missing product", async () => {
    tx.product.findUnique.mockResolvedValue(null);

    await expect(stockService.adjust({ productId: "ghost", delta: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
