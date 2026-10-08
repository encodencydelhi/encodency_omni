"use client";

import Link from "next/link";
import { BarChart3, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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
  const c: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50/90", text: "text-blue-600" },
    red: { bg: "bg-rose-50/90", text: "text-rose-600" },
    green: { bg: "bg-emerald-50/90", text: "text-emerald-600" },
    purple: { bg: "bg-purple-50/90", text: "text-purple-600" },
    amber: { bg: "bg-amber-50/90", text: "text-amber-600" },
  };
  const style = c[color] ?? { bg: "bg-blue-50/90", text: "text-blue-600" };

  return (
    <div className="group relative flex flex-col justify-between min-h-[84px] rounded-sm border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-none">
          {label}
        </span>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm transition-transform group-hover:scale-105", style.bg, style.text)}>
          <Icon className="size-3.5" />
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-1">
        <b className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</b>
        {trend && (
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/50">
            <ArrowUp className="size-2.5" />
            {trend}
          </span>
        )}
      </div>

      <p className="mt-0.5 text-[11px] font-medium text-slate-500 leading-tight">{note}</p>
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
