import { beforeEach, describe, expect, it, vi } from "vitest";

// Built with vi.hoisted so it is initialized before the hoisted vi.mock factory runs.
const prismaMock = vi.hoisted(() => ({
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { categoryService } from "@/lib/services/category.service";
import { ConflictError, NotFoundError } from "@/lib/errors";

beforeEach(() => vi.clearAllMocks());

describe("categoryService (category–product relation)", () => {
  it("lists categories with their product counts", async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: "c1", name: "Tools", _count: { products: 3 } },
    ]);

    const result = await categoryService.list();

    expect(result[0]._count.products).toBe(3);
    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { products: true } } },
      }),
    );
  });

  it("blocks deleting a category that still has products (relation integrity)", async () => {
    prismaMock.category.findUnique.mockResolvedValue({
      id: "c1",
      name: "Tools",
      _count: { products: 2 },
    });

    await expect(categoryService.remove("c1")).rejects.toBeInstanceOf(ConflictError);
    expect(prismaMock.category.delete).not.toHaveBeenCalled();
  });

  it("allows deleting an empty category", async () => {
    prismaMock.category.findUnique.mockResolvedValue({
      id: "c2",
      name: "Empty",
      _count: { products: 0 },
    });
    prismaMock.category.delete.mockResolvedValue({ id: "c2" });

    await categoryService.remove("c2");
    expect(prismaMock.category.delete).toHaveBeenCalledWith({ where: { id: "c2" } });
  });

  it("throws NotFoundError when deleting a missing category", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);
    await expect(categoryService.remove("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates a category with a trimmed name", async () => {
    prismaMock.category.create.mockResolvedValue({ id: "c3", name: "Garden" });
    await categoryService.create({ name: "  Garden  ", description: "" });
    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { name: "Garden", description: null },
    });
  });
});
