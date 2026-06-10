import { InsufficientStockError } from "@/lib/errors";
import { LOW_STOCK_THRESHOLD, StockStatus, type StockStatusValue } from "@/lib/validators";

/**
 * Pure business rules for stock. Kept free of Prisma/IO so they can be unit
 * tested in isolation and reused by the service layer.
 */

/**
 * Apply a stock delta, refusing to go below zero.
 * @throws InsufficientStockError when the result would be negative.
 */
export function computeNewStock(current: number, delta: number): number {
  const next = current + delta;
  if (next < 0) {
    throw new InsufficientStockError(current, delta);
  }
  return next;
}

/** Derive the stock status label used by the UI and filters. */
export function getStockStatus(stock: number): Exclude<StockStatusValue, "all"> {
  if (stock <= 0) return StockStatus.OUT_OF_STOCK;
  if (stock <= LOW_STOCK_THRESHOLD) return StockStatus.LOW;
  return StockStatus.IN_STOCK;
}

export function isLowStock(stock: number): boolean {
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}
