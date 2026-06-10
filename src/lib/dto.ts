import type { Category, Product } from "@prisma/client";
import { getStockStatus } from "@/lib/services/stock-logic";

/**
 * Data Transfer Objects: plain, JSON-serializable shapes safe to send across
 * the React Server Component boundary and the REST API. Prisma's `Decimal`
 * type is not serializable to the client, so we convert `price` to a number.
 */

export type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  stockStatus: "low" | "in_stock" | "out_of_stock";
  categoryId: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDTO = {
  id: string;
  name: string;
  description: string | null;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
};

type ProductWithCategory = Product & { category?: Pick<Category, "name"> | null };

export function serializeProduct(product: ProductWithCategory): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    stockStatus: getStockStatus(product.stock),
    categoryId: product.categoryId,
    categoryName: product.category?.name,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

type CategoryWithCount = Category & { _count?: { products: number } };

export function serializeCategory(category: CategoryWithCount): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    productCount: category._count?.products,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
