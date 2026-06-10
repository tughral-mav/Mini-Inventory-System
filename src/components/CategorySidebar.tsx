"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
} from "@/app/actions/category.actions";
import type { CategoryDTO } from "@/lib/dto";

export function CategorySidebar({ categories }: { categories: CategoryDTO[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    startTransition(async () => {
      const result = await createCategoryAction(formData);
      if (result.ok) setName("");
      else setError(result.error);
    });
  }

  function remove(category: CategoryDTO) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Categories</h2>

      <ul className="mb-4 space-y-1">
        {categories.length === 0 && (
          <li className="text-sm text-slate-400">No categories yet.</li>
        )}
        {categories.map((c) => (
          <li
            key={c.id}
            className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50"
          >
            <span className="text-sm text-slate-700">
              {c.name}
              <span className="ml-1.5 text-xs text-slate-400">({c.productCount ?? 0})</span>
            </span>
            <button
              onClick={() => remove(c)}
              className="text-xs text-slate-300 hover:text-rose-600 group-hover:text-slate-500"
              aria-label={`Delete ${c.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add category"}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </aside>
  );
}
