import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { categoryInputSchema, type CategoryInput } from "@/lib/validators";

/**
 * Business logic layer for categories. Validates input, talks to the database
 * layer (Prisma), and enforces business rules. Knows nothing about HTTP or UI.
 */
export const categoryService = {
  async list() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  },

  async getById(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Category", id);
    return category;
  },

  async create(input: CategoryInput) {
    const data = categoryInputSchema.parse(input);
    return prisma.category.create({
      data: { name: data.name, description: data.description || null },
    });
  },

  async update(id: string, input: CategoryInput) {
    const data = categoryInputSchema.parse(input);
    await this.getById(id); // ensures existence -> NotFoundError if missing
    return prisma.category.update({
      where: { id },
      data: { name: data.name, description: data.description || null },
    });
  },

  async remove(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundError("Category", id);
    if (category._count.products > 0) {
      throw new ConflictError(
        `Cannot delete category "${category.name}" because it still has ${category._count.products} product(s). Reassign or delete them first.`,
      );
    }
    return prisma.category.delete({ where: { id } });
  },
};
