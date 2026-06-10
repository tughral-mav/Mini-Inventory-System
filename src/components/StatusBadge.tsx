import { STATUS_LABELS } from "@/lib/format";

const STYLES: Record<string, string> = {
  low: "bg-amber-100 text-amber-800 ring-amber-200",
  in_stock: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  out_of_stock: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function StatusBadge({ status }: { status: "low" | "in_stock" | "out_of_stock" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
