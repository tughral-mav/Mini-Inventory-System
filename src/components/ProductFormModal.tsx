"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { createProductAction, updateProductAction } from "@/app/actions/product.actions";
import type { CategoryDTO, ProductDTO } from "@/lib/dto";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: CategoryDTO[];
  product?: ProductDTO | null;
};

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export function ProductFormModal({ open, onClose, categories, product }: Props) {
  const isEdit = Boolean(product);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction(product!.id, formData)
        : await createProductAction(formData);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit product" : "Add product"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input name="name" required defaultValue={product?.name} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={product?.description ?? ""}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Price (USD)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={product?.price ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {isEdit ? "Stock (managed separately)" : "Initial stock"}
            </label>
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              required
              disabled={isEdit}
              defaultValue={product?.stock ?? 0}
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            name="categoryId"
            required
            defaultValue={product?.categoryId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
