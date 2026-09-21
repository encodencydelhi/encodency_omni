/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Small shared presentation primitives. Everything else composes the app's shared components.
 */

"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon, CheckIcon, CopyIcon, DownloadIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import type { PaginationMeta } from "@/types/api";
import type { StatusRegistry, Tone } from "@/types/common";
import { DEMO_CLOCK_ANCHOR, JOBS_ROUTE_AVAILABLE } from "../data/config";
import type { WebhookDirection } from "../data/types";

const DEMO_NOW = Date.parse(DEMO_CLOCK_ANCHOR);

/* ------------------------------------------------------------------ */
/* Text & time                                                         */
/* ------------------------------------------------------------------ */

export function Timestamp({ iso, relative = true }: { iso: string | null | undefined; relative?: boolean }) {
  if (!iso) return <span className="text-muted-foreground">Not recorded</span>;
  return (
    <span className="block whitespace-nowrap tabular text-[0.8125rem]" title={new Date(iso).toISOString()}>
      {formatDateTime(iso)}
      {relative ? <span className="block text-2xs text-muted-foreground">{formatRelativeTime(iso, DEMO_NOW)}</span> : null}
    </span>
  );
}

export const humanize = (value: string): string =>
  value.replaceAll("_", " ").replaceAll(".", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-2xs text-foreground", className)}>{children}</span>;
}

export function IdCell({ id, sub }: { id: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <Mono className="block truncate text-[0.75rem] font-semibold">{id}</Mono>
      {sub ? <span className="block truncate text-2xs text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`${label} ${value}`}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(false), 1_400);
          },
          () => toast.error("Copy is not available in this browser context"),
        );
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function DirectionBadge({ direction }: { direction: WebhookDirection }) {
  const incoming = direction === "incoming";
  return (
    <Badge tone={incoming ? "info" : "brand"}>
      {incoming ? <ArrowDownLeftIcon /> : <ArrowUpRightIcon />}
      {incoming ? "Incoming" : "Outgoing"}
    </Badge>
  );
}

export function State<T extends string>({ registry, status }: { registry: StatusRegistry<T>; status: T }) {
  return <StatusBadge registry={registry} status={status} withDot />;
}

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Related sibling cards use gap-1, as the module spec requires. */
export function CardGrid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 6; className?: string }) {
  const map = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    6: "sm:grid-cols-3 lg:grid-cols-6",
  } as const;
  return <div className={cn("grid grid-cols-1 gap-1", map[cols], className)}>{children}</div>;
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "danger" | "warning" | "success";
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-sm border bg-card px-3.5 py-3 shadow-xs transition-colors",
        tone === "danger" && "border-danger/25 bg-danger-subtle/30",
        tone === "warning" && "border-warning/25 bg-warning-subtle/30",
        tone === "success" && "border-success/20",
        tone === "default" && "border-border",
        href && "hover:border-border-strong",
      )}
    >
      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold leading-none tracking-tight tabular text-foreground">{value}</p>
      {hint ? <p className="mt-1.5 text-2xs leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "brand"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-info/20 bg-info-subtle/50",
    warning: "border-warning/25 bg-warning-subtle/50",
    danger: "border-danger/25 bg-danger-subtle/50",
    brand: "border-primary/15 bg-primary-subtle/60",
  } as const;
  return (
    <div role="note" className={cn("rounded-sm border px-3 py-2.5 text-[0.8125rem] leading-relaxed text-foreground", styles[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title && "mt-0.5 text-muted-foreground")}>{children}</div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">{children}</div>;
}

export function EmptyRows({
  title = "No matching records",
  description = "Adjust the filters or the selected time range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex size-9 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <SearchXIcon className="size-4" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[0.8125rem] text-muted-foreground">{description}</p>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Loading webhook data">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-sm" />
      <div className="grid gap-1 xl:grid-cols-2">
        <Skeleton className="h-56 rounded-sm" />
        <Skeleton className="h-56 rounded-sm" />
      </div>
    </div>
  );
}

export function NotFoundPanel({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="rounded-sm border border-border bg-card px-6 py-14 text-center shadow-xs">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-muted-foreground">{description}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Links to other modules                                              */
/* ------------------------------------------------------------------ */

export function JobReference({ jobId }: { jobId: string | null }) {
  if (!jobId) return <span className="text-muted-foreground">No job recorded</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Mono>{jobId}</Mono>
      {JOBS_ROUTE_AVAILABLE ? (
        <Link className="text-2xs text-primary hover:underline" href="/super-admin/jobs">
          Open job
        </Link>
      ) : (
        <Badge tone="neutral" title="The Jobs & Queues route is not built yet, so this reference cannot be opened.">
          Jobs &amp; Queues unavailable
        </Badge>
      )}
    </span>
  );
}

export function ModuleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[0.8125rem] font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export function usePaged<T>(rows: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => rows.slice((safePage - 1) * pageSize, safePage * pageSize), [rows, safePage, pageSize]);
  const pagination: PaginationMeta = {
    page: safePage,
    pageSize,
    total: rows.length,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
  return {
    pageRows,
    pagination,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}

export function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>): string {
  const keys = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
}

export function ExportButton({
  filename,
  rows,
  label = "Export",
}: {
  filename: string;
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} as CSV`);
      }}
    >
      <DownloadIcon />
      {label}
    </Button>
  );
}

/** Pill-style secondary navigation used inside a section (for example Sources | Events). */
export function SubNav<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-sm bg-surface-sunken p-1 scrollbar-thin">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-3 py-1 text-[0.8125rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            value === item.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
          {item.count !== undefined ? <span className="rounded-sm bg-muted px-1.5 text-2xs tabular text-muted-foreground">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
