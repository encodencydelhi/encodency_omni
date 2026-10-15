"use client";

import Link from "next/link";
import { useId, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/components/auth-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge, field } from "@/features/support/ui";
import { sourceLabel, formatDate } from "./format";
import { useScope } from "./hooks";

export { Badge, Card, ConfirmButton, EmptyState, ListSkeleton, Notice, PageHeader, Pager, SearchBox, Section, Select, Skeleton, Spinner, StatTile, btn, btnDanger, btnPrimary, field, textarea } from "@/features/support/ui";
export type { Tone } from "@/features/support/labels";

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

export function DateValue({ date, source, verified, unknownText = "Not available" }: { date: string | null; source?: string; verified?: boolean; unknownText?: string }) {
  if (!date) return <span className="text-slate-400">{unknownText}</span>;
  const src = sourceLabel(source, Boolean(verified));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-semibold text-slate-900">{formatDate(date)}</span>
      {source && <Badge tone={src.tone}>{src.label}</Badge>}
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
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-slate-600"><Icon className="size-4" /></span>;
}

export interface StripItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "red" | "amber" | "green" | "orange";
  href?: string;
  tip?: string;
}

const STRIP_TONE = { red: "text-rose-700", amber: "text-amber-700", orange: "text-orange-700", green: "text-emerald-700" } as const;

/**
 * One compact bar of key figures instead of a wall of cards: hairline dividers, small labels, tight padding.
 * Cells wrap on narrow screens without losing their borders.
 */
export function StatStrip({ items, title }: { items: StripItem[]; title?: string }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      {/* auto-fit wraps into a tidy grid at any width; each cell draws its own right/bottom hairline so a short last row has no grey holes */}
      <div className="-mb-px -mr-px grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {items.map((i) => {
          const body = (
            <div className="h-full border-b border-r border-slate-200 bg-white px-3 py-2.5 transition hover:bg-slate-50" title={i.tip ?? (typeof i.sub === "string" ? i.sub : undefined)}>
              <p className="text-[10.5px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{i.label}</p>
              <p className={cn("mt-1 text-[19px] font-semibold leading-tight tracking-tight tabular-nums", i.tone ? STRIP_TONE[i.tone] : "text-slate-900")}>{i.value}</p>
              {i.sub && <p className="mt-0.5 text-[10.5px] font-medium leading-snug text-slate-500">{i.sub}</p>}
            </div>
          );
          return i.href ? <Link key={i.label} href={i.href} className="block">{body}</Link> : <div key={i.label}>{body}</div>;
        })}
      </div>
    </section>
  );
}
