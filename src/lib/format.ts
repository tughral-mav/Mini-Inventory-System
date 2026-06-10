/** Tiny formatting helpers for the UI layer. */

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export const STATUS_LABELS: Record<string, string> = {
  low: "Low stock",
  in_stock: "In stock",
  out_of_stock: "Out of stock",
};
