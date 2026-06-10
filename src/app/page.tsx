import { Suspense } from "react";
import { productService } from "@/lib/services/product.service";
import { categoryService } from "@/lib/services/category.service";
import { serializeCategory, serializeProduct } from "@/lib/dto";
import { FilterBar } from "@/components/FilterBar";
import { ProductTable } from "@/components/ProductTable";
import { CategorySidebar } from "@/components/CategorySidebar";
import { LOW_STOCK_THRESHOLD } from "@/lib/validators";

// This dashboard reads live data on every request.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ search?: string; categoryId?: string; status?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const [productsRaw, categoriesRaw] = await Promise.all([
    productService.list({
      search: sp.search,
      categoryId: sp.categoryId,
      status: sp.status as never,
    }),
    categoryService.list(),
  ]);

  const products = productsRaw.map(serializeProduct);
  const categories = categoriesRaw.map(serializeCategory);

  const lowStock = products.filter((p) => p.stockStatus === "low").length;
  const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mini Inventory System</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage products, categories, and stock. Items at or below {LOW_STOCK_THRESHOLD} units
          are flagged low stock.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Products" value={products.length} />
        <StatCard label="Categories" value={categories.length} />
        <StatCard label="Low stock" value={lowStock} tone="amber" />
        <StatCard label="Out of stock" value={outOfStock} tone="rose" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
        <CategorySidebar categories={categories} />

        <div className="space-y-4">
          <Suspense fallback={null}>
            <FilterBar categories={categories} />
          </Suspense>
          <ProductTable products={products} categories={categories} />
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "rose";
}) {
  const tones = {
    slate: "text-slate-900",
    amber: "text-amber-600",
    rose: "text-rose-600",
  } as const;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
    </div>
  );
}
