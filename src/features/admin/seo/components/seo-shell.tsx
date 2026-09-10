"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SeoView =
  | "overview"
  | "keywords"
  | "pages"
  | "technical"
  | "backlinks"
  | "competitors"
  | "reports"
  | "settings";

const tabs: { id: SeoView; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/admin/seo" },
  { id: "keywords", label: "Keywords", href: "/admin/seo/keywords" },
  { id: "pages", label: "Pages", href: "/admin/seo/pages" },
  { id: "technical", label: "Technical SEO", href: "/admin/seo/technical" },
  { id: "backlinks", label: "Backlinks", href: "/admin/seo/backlinks" },
  { id: "competitors", label: "Competitors", href: "/admin/seo/competitors" },
  { id: "reports", label: "Reports", href: "/admin/seo/reports" },
  { id: "settings", label: "Settings", href: "/admin/seo/settings" },
];

/**
 * Header, date range and tab strip shared by every SEO view, so each tab only
 * has to render its own body.
 */
export function SeoShell({
  view,
  title,
  description,
  action,
  children,
}: {
  view: SeoView;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const label = tabs.find((tab) => tab.id === view)?.label ?? "Overview";
  return (
    <div className="space-y-3 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-[#71809D]">
            SEO <ChevronDown className="size-2.5 -rotate-90" /> {label}
          </div>
          <h1 className="text-[20px] font-bold text-[#172044]">{title}</h1>
          <p className="text-[10px] text-[#71809D]">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2.5 rounded border border-[#DDE4ED] bg-white px-3 text-[11px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <CalendarDays className="size-4 text-[#182A58]" />
            <span className="text-left">
              <span className="block leading-tight">Last 30 days</span>
              <span className="block mt-0.5 text-[9px] font-normal text-[#71809D]">
                Mar 15, 2025 – Apr 14, 2025
              </span>
            </span>
            <ChevronDown className="size-3.5" />
          </button>
          {action ?? (
            <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3.5 text-[11px] font-semibold text-[#172044] shadow-sm hover:bg-[#FAFBFC]">
              <Download className="size-4" />
              Export Report
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-thin mt-2 flex items-center gap-6 overflow-x-auto border-b border-[#DDE4ED] px-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "shrink-0 whitespace-nowrap pb-2 text-[10px] font-bold transition-colors",
              tab.id === view
                ? "border-b-2 border-[#EB0711] text-[#EB0711]"
                : "text-[#71809D] hover:text-[#38444D]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}

/** Card shell: fixed-height header, scrollable body. */
export function Box({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-[#DDE4ED] bg-white shadow-sm",
        className,
      )}
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[#E8EDF3] px-3">
        <h2 className="truncate text-[11.5px] font-bold text-[#172044]">{title}</h2>
        {action && (
          <div className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-[#71809D]">
            {action}
          </div>
        )}
      </header>
      <div className={cn("scrollbar-thin min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function ViewAll({ label = "View All" }: { label?: string }) {
  return <button className="cursor-pointer text-[9px] font-semibold text-[#EB0711]">{label} →</button>;
}

export function Filter({ label }: { label: string }) {
  return (
    <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">
      {label}
      <ChevronDown className="size-2.5" />
    </button>
  );
}

export const statTint: Record<string, string> = {
  blue: "bg-[#EAF2FF] text-[#3186F3]",
  purple: "bg-[#F2EAFF] text-[#805AD5]",
  green: "bg-[#EAF5EF] text-[#0FA968]",
  orange: "bg-[#FFF0DC] text-[#F28C28]",
  red: "bg-[#FFEAEC] text-[#EA111B]",
  teal: "bg-[#E2F6F5] text-[#0E9C92]",
};

export function Stat({
  label,
  value,
  trend,
  sub,
  icon: Icon,
  color,
  down = false,
  subTone,
}: {
  label: string;
  value: string;
  trend?: string;
  sub: string;
  icon: typeof CalendarDays;
  color: string;
  down?: boolean;
  subTone?: string;
}) {
  return (
    <div className="flex min-h-[70px] items-center gap-3 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
      <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", statTint[color])}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9.5px] font-bold text-[#52617D]">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[20px] font-bold tracking-[-0.02em] text-[#142044]">{value}</b>
          {trend && (
            <span
              className={cn(
                "whitespace-nowrap text-[9px] font-bold",
                down ? "text-[#EA111B]" : "text-[#00A66A]",
              )}
            >
              {trend}
            </span>
          )}
        </div>
        <p className={cn("truncate text-[8px]", subTone ?? "text-[#71809D]")}>{sub}</p>
      </div>
    </div>
  );
}

/** Severity / status pill. */
export function Pill({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  const tones: Record<string, string> = {
    critical: "bg-[#FFE8EA] text-[#D91521]",
    high: "bg-[#FFE8EA] text-[#D91521]",
    medium: "bg-[#FFF3DC] text-[#B27818]",
    low: "bg-[#EAF2FF] text-[#2C6FD1]",
    good: "bg-[#E5F7EF] text-[#078359]",
    neutral: "bg-[#EEF1F6] text-[#5B6B87]",
    purple: "bg-[#F2EAFF] text-[#7C3AED]",
    teal: "bg-[#E2F6F5] text-[#0E9C92]",
  };
  return (
    <i className={cn("w-fit rounded px-1.5 py-0.5 text-[8px] font-bold not-italic", tones[tone] ?? tones.neutral)}>
      {children}
    </i>
  );
}

/** Inline progress bar used for difficulty, health and share-of-voice columns. */
export function Meter({
  value,
  max = 100,
  color = "#3186F3",
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-[#EDF1F7]", className)}>
      <i
        className="block h-full rounded-full"
        style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
      />
    </span>
  );
}

export function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-[9px] font-semibold text-[#8A97AF]">—</span>;
  const up = value > 0;
  return (
    <span
      className={cn("whitespace-nowrap text-[9px] font-bold", up ? "text-[#10B981]" : "text-[#EF4444]")}
    >
      {up ? "↑" : "↓"} {Math.abs(value)}
      {suffix}
    </span>
  );
}

/** Read-only switch — these screens are presentational until the API lands. */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative block h-4 w-7 shrink-0 rounded-full transition-colors",
        on ? "bg-[#10B981]" : "bg-[#CBD5E1]",
      )}
    >
      <i
        className={cn(
          "absolute top-0.5 block size-3 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[14px]" : "left-0.5",
        )}
      />
    </span>
  );
}

export const chartTooltip = {
  contentStyle: {
    fontSize: 10,
    borderRadius: 6,
    border: "1px solid #DDE4ED",
    padding: "4px 8px",
  },
} as const;
