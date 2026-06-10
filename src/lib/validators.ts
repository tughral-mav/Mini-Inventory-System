import { z } from "zod";

/**
 * Validation schemas (zod) shared by server actions and the REST API.
 * These enforce input shape before anything reaches the database.
 */

export const StockStatus = {
  ALL: "all",
  LOW: "low",
  IN_STOCK: "in_stock",
  OUT_OF_STOCK: "out_of_stock",
} as const;

export type StockStatusValue = (typeof StockStatus)[keyof typeof StockStatus];

/** Products with stock at or below this threshold are flagged "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative").max(1_000_000),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock cannot be negative"),
  categoryId: z.string().min(1, "Category is required"),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  // Positive to increase, negative to decrease.
  delta: z.coerce.number().int("Delta must be a whole number"),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});

export const productFilterSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  status: z
    .enum([StockStatus.ALL, StockStatus.LOW, StockStatus.IN_STOCK, StockStatus.OUT_OF_STOCK])
    .optional()
    .default(StockStatus.ALL),
});

// Service methods accept these *pre-coercion* shapes because they call
// `.parse()` internally (which coerces). Numeric fields accept string|number so
// callers can pass raw FormData strings or already-typed JSON/test values alike.
export type CategoryInput = {
  name: string;
  description?: string;
};

export type ProductInput = {
  name: string;
  description?: string;
  price: number | string;
  stock: number | string;
  categoryId: string;
};

export type StockAdjustmentInput = {
  productId: string;
  delta: number | string;
  note?: string;
};

// Filters are consumed *after* parsing, so the output type is correct here.
export type ProductFilter = z.infer<typeof productFilterSchema>;
