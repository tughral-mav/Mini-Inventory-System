"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProductFormModal } from "@/components/ProductFormModal";
import { formatPrice } from "@/lib/format";
import { adjustStockAction, deleteProductAction } from "@/app/actions/product.actions";
import type { CategoryDTO, ProductDTO } from "@/lib/dto";

export function ProductTable({
  products,
  categories,
}: {
  products: ProductDTO[];
  categories: CategoryDTO[];
}) {
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function adjust(product: ProductDTO, delta: number) {
    setError(null);
    setPendingId(product.id);
    startTransition(async () => {
      const result = await adjustStockAction(product.id, delta);
      if (!result.ok) setError(`${product.name}: ${result.error}`);
      setPendingId(null);
    });
  }

  function remove(product: ProductDTO) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError(null);
    setPendingId(product.id);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.ok) setError(`${product.name}: ${result.error}`);
      setPendingId(null);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Products <span className="text-slate-400">({products.length})</span>
        </h2>
        <button
          onClick={() => setAdding(true)}
          disabled={categories.length === 0}
          title={categories.length === 0 ? "Create a category first" : "Add a product"}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          + Add product
        </button>
      </div>

      {error && <p className="bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No products match the current filters.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const busy = pendingId === p.id;
              return (
                <tr key={p.id} className={busy ? "opacity-50" : undefined}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    {p.description && (
                      <div className="max-w-xs truncate text-xs text-slate-400">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjust(p, -1)}
                        disabled={busy || p.stock <= 0}
                        className="h-6 w-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        aria-label="Decrease stock"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium tabular-nums">{p.stock}</span>
                      <button
                        onClick={() => adjust(p, 1)}
                        disabled={busy}
                        className="h-6 w-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        aria-label="Increase stock"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.stockStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        disabled={busy}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(p)}
                        disabled={busy}
                        className="text-sm font-medium text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        open={adding}
        onClose={() => setAdding(false)}
        categories={categories}
      />
      <ProductFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        categories={categories}
        product={editing}
      />
    </div>
  );
}
