"use client";

import Link from "next/link";
import { useId, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/components/auth-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge, field } from "@/features/support/ui";
import { sourceLabel, formatDate } from "./format";
import { useScope } from "./hooks";

export { Badge, Card, ConfirmButton, EmptyState, ListSkeleton, Notice, PageHeader, Pager, SearchBox, Select, Skeleton, Spinner, StatTile, btn, btnDanger, btnPrimary, field, textarea } from "@/features/support/ui";
export type { Tone } from "@/features/support/labels";

/* Local premium overrides — infrastructure only, no global changes. Sharp corners everywhere. */
const CARD = "rounded-none border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

export function Section({ title, description, action, children, className, flush }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn(CARD, "overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold capitalize text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-[11px] font-medium capitalize text-slate-500">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-1">{action}</div>}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export function useRoleFlags() {
  const { user } = useAuth();
  const { companyId } = useScope();
  const membership = user?.memberships?.find((m) => m.companyId === companyId) ?? user?.memberships?.[0];
  const role = membership?.systemRole;
  const privileged = role === "OWNER" || role === "ADMIN" || user?.platformRole === "SUPER_ADMIN";
  return {
    canWrite: privileged || role === "MANAGER",
    canManage: privileged,
  };
}

export function Modal({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FormRow({ label, hint, children, error }: { label: string; hint?: string; children: (id: string) => ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">{label}</label>
      {children(id)}
      {error ? <p className="text-[11px] font-medium text-rose-700" role="alert">{error}</p> : hint ? <p className="text-[11px] font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(field, props.className)} />;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cn("whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-slate-500", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-slate-100 px-3 py-2.5 align-middle text-xs font-medium text-slate-700", className)}>{children}</td>;
}

export function Chip({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "amber" | "red" | "green" | "violet" | "orange" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function DateValue({ date, source, verified, unknownText = "Not available", hideSource }: { date: string | null; source?: string; verified?: boolean; unknownText?: string; hideSource?: boolean }) {
  if (!date) return <span className="text-slate-400">{unknownText}</span>;
  const src = sourceLabel(source, Boolean(verified));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" title={src.label}>
      <span className="font-medium text-slate-700">{formatDate(date)}</span>
      {!hideSource && source && <Badge tone={src.tone}>{src.label}</Badge>}
    </span>
  );
}

/** Values that are identifiers, addresses or tokens keep their exact case; everything else is Title Case like the rest of the page. */
const RAW_LABEL = /hostname|ip address|ipv4|ipv6|identifier|instance id|image id|resource id|mac|nameserver|status codes|default user|url|\bhost\b|token|fingerprint|domain$/i;

export function KeyValue({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[11px] font-semibold text-slate-500">{r.label}</dt>
          <dd className={cn("mt-0.5 break-words text-xs font-medium text-slate-900", RAW_LABEL.test(r.label) && "normal-case")}>{r.value ?? <span className="text-slate-400">Not available</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BarList({ rows, empty = "Nothing to show yet." }: { rows: Array<{ label: string; value: number; sub?: string }>; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-xs font-medium text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-slate-800">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{r.value}{r.sub ? <span className="ml-1.5 font-medium text-slate-500">{r.sub}</span> : null}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IconBox({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="size-4" /></span>;
}

export interface StripItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "red" | "amber" | "green" | "orange";
  href?: string;
  tip?: string;
  icon?: ComponentType<{ className?: string }>;
}

const STRIP_TONE = { red: "text-rose-700", amber: "text-amber-700", orange: "text-orange-700", green: "text-emerald-700" } as const;

type CardPalette = { tile: string; iconBox: string; bar: string };

const PALETTE: CardPalette[] = [
  { tile: "border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white to-white", iconBox: "bg-blue-600 text-white", bar: "from-blue-500 to-sky-400" },
  { tile: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-white", iconBox: "bg-emerald-600 text-white", bar: "from-emerald-500 to-teal-400" },
  { tile: "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-white", iconBox: "bg-rose-600 text-white", bar: "from-rose-500 to-orange-400" },
  { tile: "border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-white", iconBox: "bg-violet-600 text-white", bar: "from-violet-500 to-purple-400" },
  { tile: "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-white", iconBox: "bg-amber-500 text-white", bar: "from-amber-500 to-yellow-400" },
  { tile: "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-white", iconBox: "bg-cyan-600 text-white", bar: "from-cyan-500 to-sky-400" },
  { tile: "border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-white", iconBox: "bg-orange-600 text-white", bar: "from-orange-500 to-amber-400" },
  { tile: "border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-white", iconBox: "bg-indigo-600 text-white", bar: "from-indigo-500 to-blue-400" },
  { tile: "border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-white", iconBox: "bg-teal-600 text-white", bar: "from-teal-500 to-emerald-400" },
];

const TONE_PALETTE: Record<string, CardPalette> = {
  red: { tile: "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-white", iconBox: "bg-rose-600 text-white", bar: "from-rose-500 to-orange-400" },
  amber: { tile: "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-white", iconBox: "bg-amber-500 text-white", bar: "from-amber-500 to-yellow-400" },
  orange: { tile: "border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-white", iconBox: "bg-orange-600 text-white", bar: "from-orange-500 to-amber-400" },
  green: { tile: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-white", iconBox: "bg-emerald-600 text-white", bar: "from-emerald-500 to-teal-400" },
};

/**
 * Colourful single-line stat cards: horizontal flex row with scroll, never wraps.
 * Sharp corners, capitalized labels, tight gap-1 — overview-wide rule.
 */
export function StatStrip({ items, title }: { items: StripItem[]; title?: string }) {
  return (
    <section aria-label={title}>
      <div className="flex gap-1">
        {items.map((i, idx) => {
          const palette = (i.tone && TONE_PALETTE[i.tone]) || PALETTE[idx % PALETTE.length]!;
          const Icon = i.icon;
          const tip = i.tip ?? (typeof i.sub === "string" ? i.sub : undefined);
          const body = (
            <div
              className={cn(
                "group relative min-w-0 overflow-visible rounded-none border px-2.5 pb-2.5 pt-2 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-10px_rgba(16,24,40,0.35)]",
                palette.tile,
              )}
            >
              <span className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", palette.bar)} aria-hidden="true" />
              <span className="flex items-center gap-1">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-none shadow-sm", palette.iconBox)} aria-hidden="true">
                  {Icon ? <Icon className="size-3.5" /> : <span className="text-xs font-bold leading-none">{String(i.label).charAt(0)}</span>}
                </span>
                <p className="truncate text-[10.5px] font-medium capitalize leading-tight text-slate-500">{i.label}</p>
              </span>
              <p className={cn("mt-1 truncate text-right text-xl font-semibold leading-none tracking-tight tabular-nums", i.tone ? STRIP_TONE[i.tone] : "text-slate-900")}>{i.value}</p>
              {i.sub && <p className="mt-1 truncate text-[11px] font-medium capitalize leading-snug text-slate-500">{i.sub}</p>}
              {tip && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-max max-w-[220px] -translate-x-1/2 whitespace-normal rounded-none border border-slate-700 bg-slate-900 px-2.5 py-2 text-left text-[11px] font-medium capitalize leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:block group-hover:opacity-100"
                >
                  <span className="block font-bold">{i.label}</span>
                  <span className="mt-0.5 block text-slate-200">{tip}</span>
                </span>
              )}
            </div>
          );
          return i.href ? (
            <Link key={i.label} href={i.href} className="block min-w-0 flex-1 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50">
              {body}
            </Link>
          ) : (
            <div key={i.label} className="min-w-0 flex-1">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
