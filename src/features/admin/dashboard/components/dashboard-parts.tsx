"use client";

import Link from "next/link";
import { BarChart3, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { STAT_COLORS, statColorForTone, type StatColor } from "@/components/shared/stat-color";

/** The dashboard's old colour words ("purple") and the shared palette's names both work; anything else falls back to blue. */
function paletteFor(color: string): (typeof STAT_COLORS)[StatColor] {
  const name = (color === "purple" ? "violet" : color) as StatColor;
  return STAT_COLORS[name] ?? STAT_COLORS[statColorForTone(color) ?? "blue"];
}

/** A coloured stat card: the whole card is tinted in its colour family (same palette as the Super Admin cards). */
export function Stat({
  label,
  value,
  trend,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  note: string;
  icon: typeof BarChart3;
  color: string;
}) {
  const palette = paletteFor(color);

  // Compact and equal height: the label and the note stay on one line (cut with "…" and shown in full on hover), so no card grows taller than its neighbours.
  return (
    <div className={cn("group relative flex min-w-0 flex-col gap-1 rounded-sm border px-3 py-2 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs", palette.card)}>
      <span className="truncate text-[10.5px] font-bold uppercase leading-none tracking-wide text-slate-600" title={label}>
        {label}
      </span>

      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <b className="text-xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">{value}</b>
          {trend && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-50 px-1 py-0.5 text-[10px] font-bold leading-none text-emerald-700 border border-emerald-200/50">
              <ArrowUp className="size-2.5" />
              {trend}
            </span>
          )}
        </div>
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-sm transition-transform group-hover:scale-105", palette.chip)}>
          <Icon className="size-3.5" />
        </span>
      </div>

      <p className="truncate text-[11px] font-medium leading-none text-slate-600" title={note}>{note}</p>
    </div>
  );
}
export function Box({
  title,
  action,
  href,
  children,
}: {
  title: React.ReactNode;
  action?: string;
  /** When set, the action is a real link to that page. */
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-xs">
      <header className="flex min-h-[44px] shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/40 px-3.5 py-2">
        <h2 className="text-xs font-bold tracking-tight text-slate-800">{title}</h2>
        {action &&
          (href ? (
            <Link href={href} className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700">
              {action} →
            </Link>
          ) : (
            <button className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700">
              {action} →
            </button>
          ))}
      </header>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </section>
  );
}
