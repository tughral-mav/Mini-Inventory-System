"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CategoryDTO } from "@/lib/dto";

const STATUS_OPTIONS = [
  { value: "all", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

/** Search + category + stock-status filters. State lives in the URL so the
 * server component can read it and re-query. */
export function FilterBar({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      router.replace(`/?${next.toString()}`);
    },
    [params, router],
  );

  // Debounce the search box so we don't navigate on every keystroke.
  useEffect(() => {
    const current = params.get("search") ?? "";
    if (search === current) return;
    const t = setTimeout(() => updateParam("search", search), 300);
    return () => clearTimeout(t);
  }, [search, params, updateParam]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search products by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <select
        value={params.get("categoryId") ?? ""}
        onChange={(e) => updateParam("categoryId", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={params.get("status") ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
