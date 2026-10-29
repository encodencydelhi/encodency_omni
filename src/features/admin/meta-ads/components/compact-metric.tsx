import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { STAT_COLORS, statColorForLabel, statColorForTone } from "@/components/shared/stat-color";

export function CompactMetric({ label, value, sub, icon: Icon, tone, hint }: {
  label: string; value: ReactNode; sub?: ReactNode;
  icon?: ComponentType<{ className?: string }>; tone?: string; hint?: string;
}) {
  const color = STAT_COLORS[statColorForTone(tone) ?? statColorForLabel(label)];
  return (
    <article className={cn("flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-xs", color.card)} title={hint}>
      {Icon && <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", color.chip)}><Icon className="size-4" /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium leading-4 text-slate-600" title={label}>{label}</p>
        <div className="mt-0.5 text-xl font-semibold leading-6 tracking-tight text-slate-900 tabular-nums">{value}</div>
        {sub && <div className="mt-0.5 truncate text-[10px] leading-4 text-slate-500" title={typeof sub === "string" ? sub : undefined}>{sub}</div>}
      </div>
    </article>
  );
}
