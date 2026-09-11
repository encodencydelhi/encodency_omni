import { cn } from "@/lib/utils/cn";
import type { ApprovalStatus } from "../types/content.types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "changes-requested": "bg-red-50 text-red-600 ring-red-200",
  rejected: "bg-red-50 text-red-600 ring-red-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  scheduled: "bg-blue-50 text-[#1769DF] ring-blue-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: ApprovalStatus | string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600")}>
      {status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("h-7 shrink-0 rounded-md border px-2.5 text-[11px] font-semibold transition", active ? "border-[#1769DF] bg-[#F0F6FF] text-[#1769DF]" : "border-[#E2E8F0] text-[#687797] hover:bg-slate-50")}>
      {children}
    </button>
  );
}
