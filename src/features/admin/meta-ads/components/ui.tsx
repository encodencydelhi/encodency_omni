"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  MessageCircle,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DELIVERY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  TONE_CLASS,
  type StatusTone,
} from "../format";
import type { EntityStatus, Platform } from "../types";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const BORDER = "border-slate-200";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300/90 bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 hover:shadow disabled:opacity-50";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-5 text-[11.5px] font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] ring-1 ring-white/20 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

export const card =
  "rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]";

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export function StatusChip({
  status,
  className,
}: {
  status: EntityStatus;
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  const t = TONE_CLASS[tone];
  const isPulse = status === "active" || status === "learning" || status === "in_review";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase transition-colors shadow-2xs",
        t.chip,
        className,
      )}
    >
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        {isPulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              t.dot,
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            t.dot,
          )}
        />
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ToneChip({
  tone,
  children,
  className,
  pulse,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  const t = TONE_CLASS[tone];
  const isPulse = pulse ?? (tone === "green" || tone === "blue" || tone === "violet");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold shadow-2xs",
        t.chip,
        className,
      )}
    >
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        {isPulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              t.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", t.dot)} />
      </span>
      {children}
    </span>
  );
}

export function DeliveryCell({ status }: { status: EntityStatus }) {
  const tone = TONE_CLASS[STATUS_TONE[status]];
  const isPulse = status === "active" || status === "learning" || status === "in_review";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium",
        tone.text,
      )}
    >
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        {isPulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              tone.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", tone.dot)} />
      </span>
      {DELIVERY_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Platforms                                                           */
/* ------------------------------------------------------------------ */

const PLATFORM_META: Record<
  Platform,
  { label: string; bg: string; icon: ReactNode }
> = {
  facebook: {
    label: "Facebook",
    bg: "bg-[#e8f1ff]",
    icon: <FaFacebookF className="size-3 text-[#1877f2]" />,
  },
  instagram: {
    label: "Instagram",
    bg: "bg-[#fdf0ff]",
    icon: <FaInstagram className="size-3 text-[#d946ef]" />,
  },
  messenger: {
    label: "Messenger",
    bg: "bg-[#f3efff]",
    icon: <MessageCircle className="size-3 text-[#7c3aed]" />,
  },
  audience_network: {
    label: "Audience Network",
    bg: "bg-[#eef2f7]",
    icon: <Globe className="size-3 text-[#475569]" />,
  },
};

export function PlatformIcons({ platforms }: { platforms: Platform[] }) {
  return (
    <span className="flex gap-1.5">
      {platforms.map((p) => {
        const meta = PLATFORM_META[p];
        return (
          <span
            key={p}
            title={meta.label}
            aria-label={meta.label}
            className={cn(
              "flex size-5 items-center justify-center rounded",
              meta.bg,
            )}
          >
            {meta.icon}
          </span>
        );
      })}
    </span>
  );
}

export function PlatformMark({ platform }: { platform: Platform }) {
  return <>{PLATFORM_META[platform].icon}</>;
}

/* ------------------------------------------------------------------ */
/* Page furniture                                                      */
/* ------------------------------------------------------------------ */

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 text-slate-400" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="font-semibold text-slate-600 hover:text-blue-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[320px] truncate font-semibold text-slate-900">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-[260px] flex-1">
        {eyebrow}
        <h1 className="flex flex-wrap items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs font-medium text-slate-600">{subtitle}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(card, "overflow-hidden flex flex-col group hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)]", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-900">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-50/80 text-blue-600 shadow-xs ring-1 ring-blue-500/20">
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatusTone;
  hint?: string;
}) {
  const valueClass = tone ? TONE_CLASS[tone].text : "text-slate-900";
  return (
    <div className={cn(card, "group relative overflow-hidden p-4 transition-all duration-300 hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5")}>
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-600 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Animated Shine Effect */}
      <div className="pointer-events-none absolute -inset-full top-0 z-10 block h-[150%] w-1/2 -rotate-45 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent opacity-0 transition-all duration-700 ease-in-out group-hover:left-[150%] group-hover:opacity-100" />

      <div className="relative flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <span className="min-w-0 truncate">{label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {hint && <InfoHint text={hint} />}
          {Icon && (
            <div className="flex size-6 items-center justify-center rounded-sm bg-blue-50 text-blue-600 ring-1 ring-blue-500/15 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
              <Icon className="size-3.5" />
            </div>
          )}
        </div>
      </div>
      <div className={cn("relative mt-2.5 text-[22px] font-semibold tracking-tight leading-none", valueClass)}>
        {value}
      </div>
      {sub && <p className="relative mt-1.5 text-[10.5px] font-medium text-slate-500 truncate">{sub}</p>}
    </div>
  );
}

export function InfoHint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className="flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[9px] font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 shadow-2xs"
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs font-medium">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Definition row used across every configuration summary card. */
export function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-slate-900">
        {href ? (
          <Link href={href} className="text-blue-600 hover:text-blue-700 hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-slate-300/80 bg-slate-100/90 px-2.5 py-0.5 text-[10.5px] font-medium text-slate-800 shadow-2xs">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function LinkTabs({
  tabs,
  current,
  className,
}: {
  tabs: { id: string; label: string; href: string; count?: number }[];
  current: string;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 border-b border-slate-200",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-medium transition",
              active
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9.5px] font-semibold",
                  active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700 border border-slate-200",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50/70 p-3.5">
      {children}
    </div>
  );
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
  minWidth = 140,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  minWidth?: number;
}) {
  return (
    <label className="relative inline-flex" style={{ minWidth }}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          btn,
          "w-full cursor-pointer appearance-none justify-start pr-8 text-left font-medium text-slate-800",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
    </label>
  );
}

export function SearchInput({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[220px] flex-1", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export function TableShell({
  children,
  minWidth = 1200,
  striped = true,
  className,
}: {
  children: ReactNode;
  minWidth?: number;
  striped?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]",
        className,
      )}
    >
      <table
        className={cn(
          "w-full table-auto text-left text-xs",
          striped && "[&_tbody_tr:nth-child(even)]:bg-slate-50/80 [&_tbody_tr:nth-child(odd)]:bg-white",
        )}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  numeric,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-slate-100/90 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-700",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "group border-b border-slate-200/70 last:border-0 even:bg-slate-50/70 odd:bg-white transition-colors duration-150 hover:!bg-blue-50/60",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  numeric,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-3.5 align-middle text-[11.5px] font-medium text-slate-700 group-hover:text-slate-900",
        numeric ? "text-right tabular-nums font-semibold text-slate-800" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function EntityLink({
  href,
  name,
  sub,
  maxWidth = 220,
}: {
  href: string;
  name: string;
  sub?: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="min-w-0" style={{ maxWidth }}>
      <Link
        href={href}
        title={name}
        className="block truncate text-[11.5px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      >
        {name}
      </Link>
      {sub && <div className="truncate text-[10px] font-medium text-slate-500">{sub}</div>}
    </div>
  );
}

/** Contextual row menu — keeps action buttons out of the table body. */
export function RowMenu({
  label,
  groups,
}: {
  label: string;
  groups: { label: string; href?: string; onSelect?: () => void; danger?: boolean }[][];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex size-7.5 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-2xs transition hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            {group.map((item) =>
              item.href ? (
                <DropdownMenuItem key={item.label} asChild>
                  <Link
                    href={item.href}
                    className={cn("text-xs font-semibold", item.danger && "text-rose-600")}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.label}
                  onSelect={item.onSelect}
                  className={cn("text-xs font-semibold", item.danger && "text-rose-600")}
                >
                  {item.label}
                </DropdownMenuItem>
              ),
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

/** An action is either a link to a route or an in-page handler — never inert. */
export type ActionSpec =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

function ActionButton({
  action,
  variant,
}: {
  action: ActionSpec;
  variant: "primary" | "secondary";
}) {
  const className = variant === "primary" ? btnPrimary : btn;
  return action.href ? (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  compact,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ActionSpec;
  secondary?: ActionSpec;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        compact ? "min-h-[160px]" : "min-h-[280px]",
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-500/20">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[340px] text-xs font-medium leading-relaxed text-slate-600">
        {description}
      </p>
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action && <ActionButton action={action} variant="primary" />}
          {secondary && <ActionButton action={secondary} variant="secondary" />}
        </div>
      )}
    </div>
  );
}

/**
 * Table pagination. Rendered only when there is more than one page, so the
 * controls are never present-but-inert.
 */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  noun,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  noun: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-600">
      <span>
        Showing <strong className="font-semibold text-slate-900">{from}–{to}</strong> of <strong className="font-semibold text-slate-900">{total}</strong> {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canPrevious}
            className={cn(btn, "h-8 px-3 text-xs disabled:cursor-not-allowed")}
          >
            Previous
          </button>
          <span className="px-1.5 text-xs font-semibold text-slate-900">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className={cn(btn, "h-8 px-3 text-xs disabled:cursor-not-allowed")}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/** Actionable problem banner — never shows a raw API error. */
export function StateNotice({
  tone,
  title,
  description,
  action,
  secondary,
  icon: Icon,
}: {
  tone: "amber" | "red" | "blue";
  title: string;
  description: string;
  action?: { label: string; href: string };
  secondary?: { label: string; href: string };
  icon?: ComponentType<{ className?: string }>;
}) {
  const palette = {
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    red: "border-rose-300 bg-rose-50 text-rose-900",
    blue: "border-blue-300 bg-blue-50 text-blue-900",
  }[tone];

  return (
    <div className={cn("flex flex-wrap items-start gap-3.5 rounded-xl border p-3.5 shadow-2xs", palette)}>
      {Icon && <Icon className="mt-0.5 size-4.5 shrink-0" />}
      <div className="min-w-[220px] flex-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-0.5 text-xs font-medium leading-relaxed opacity-95">{description}</p>
      </div>
      <div className="flex gap-2">
        {secondary && (
          <Link href={secondary.href} className={btn}>
            {secondary.label}
          </Link>
        )}
        {action && (
          <Link href={action.href} className={btnPrimary}>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Entity was deleted, archived, or never existed. */
export function NotFoundState({
  title,
  description,
  backHref = "/admin/meta/ads",
  backLabel = "Back to Ads Manager",
  secondary,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  secondary?: { label: string; href: string };
}) {
  return (
    <div className={cn(card, "mx-auto mt-8 max-w-[560px] p-8 text-center")}>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-[420px] text-xs font-medium leading-relaxed text-slate-600">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link href={backHref} className={btnPrimary}>
          {backLabel}
        </Link>
        {secondary && (
          <Link href={secondary.href} className={btn}>
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-lg bg-slate-200", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonKpis({ count = 8 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(card, "h-[88px] p-3.5")}>
          <SkeletonBar className="h-3 w-2/3" />
          <SkeletonBar className="mt-3 h-5 w-1/2" />
          <SkeletonBar className="mt-2 h-2 w-1/3" />
        </div>
      ))}
    </section>
  );
}

export function SkeletonTable({
  rows = 6,
  columns = 8,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={cn(card, "overflow-hidden")}>
      <div className="flex gap-3 border-b border-slate-200 bg-slate-100/70 px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonBar key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3 border-b border-slate-200/70 px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <SkeletonBar key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Meter({
  value,
  tone = "blue",
  className,
}: {
  value: number;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn("block h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200", className)}
    >
      <span
        className={cn("block h-full rounded-full transition-all duration-500", TONE_CLASS[tone].dot)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initial = name === "Unassigned" ? "?" : name.charAt(0).toUpperCase();
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-800 ring-1 ring-slate-300">
      {initial}
    </span>
  );
}
