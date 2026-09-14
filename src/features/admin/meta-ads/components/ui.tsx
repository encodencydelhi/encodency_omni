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

export const BORDER = "border-slate-200/60";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-y-px hover:border-slate-300/60 disabled:opacity-50";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 px-5 text-[11.5px] font-bold text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] ring-1 ring-white/20 transition-all duration-300 hover:from-blue-500 hover:to-indigo-400 hover:shadow-[0_6px_20px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

export const card =
  "rounded-2xl border border-white/60 bg-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl backdrop-saturate-200 ring-1 ring-slate-900/5 transition-all duration-300";

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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase transition-colors shadow-sm backdrop-blur-md",
        t.chip,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            tone === "slate" && "hidden",
            t.dot,
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
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
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold",
        t.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {children}
    </span>
  );
}

export function DeliveryCell({ status }: { status: EntityStatus }) {
  const tone = TONE_CLASS[STATUS_TONE[status]];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold",
        tone.text,
      )}
    >
      <span className={cn("size-2 rounded-full", tone.dot)} />
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
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[#64748b]">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-[#94a3b8]" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="font-medium hover:text-[#1877f2] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[320px] truncate font-semibold text-[#14213d]">
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
    <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-[260px] flex-1">
        {eyebrow}
        <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-bold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[11px] text-[#64748b]">{subtitle}</p>}
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
    <section className={cn(card, "overflow-hidden flex flex-col group hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/40 bg-gradient-to-r from-white/40 to-transparent px-5 py-3.5">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-slate-800">
          <span className="flex size-6 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50">
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {action}
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
    <div className={cn(card, "group relative overflow-hidden p-3.5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5")}>
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Animated Shine Effect */}
      <div className="pointer-events-none absolute -inset-full top-0 z-10 block h-[150%] w-1/2 -rotate-45 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 ease-in-out group-hover:left-[150%] group-hover:opacity-100" />
      
      <div className="relative flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
        <span className="min-w-0 truncate">{label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {hint && <InfoHint text={hint} />}
          {Icon && <Icon className="size-3.5 text-blue-500/80 transition-colors duration-300 group-hover:text-blue-600" />}
        </div>
      </div>
      <div className={cn("relative mt-2 text-[20px] font-medium tracking-tight leading-none", valueClass)}>
        {value}
      </div>
      {sub && <p className="relative mt-1 text-[10px] font-normal text-slate-400 truncate">{sub}</p>}
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
            className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-[#cbd5e1] text-[8px] font-bold text-[#64748b]"
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-[10px]">{text}</TooltipContent>
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
    <div className="flex items-baseline justify-between gap-3 border-b border-[#eef2f7] py-1.5 last:border-0">
      <dt className="shrink-0 text-[10px] text-[#64748b]">{label}</dt>
      <dd className="min-w-0 text-right text-[11px] font-semibold text-[#14213d]">
        {href ? (
          <Link href={href} className="text-[#0671e9] hover:underline">
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
    <span className="inline-flex items-center rounded-md border border-[#dde5ee] bg-[#f7f9fc] px-2 py-0.5 text-[10px] font-medium text-[#334155]">
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
        "flex flex-wrap gap-1 border-b border-[#dde5ee]",
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
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition",
              active
                ? "border-[#1877f2] text-[#1877f2]"
                : "border-transparent text-[#475569] hover:text-[#14213d]",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[9px] font-bold",
                  active ? "bg-[#e8f1ff] text-[#1877f2]" : "bg-[#eef2f7] text-[#64748b]",
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
    <div className="flex flex-wrap items-center gap-2 border-b border-[#dde5ee] bg-white p-3">
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
          "w-full cursor-pointer appearance-none justify-start pr-8 text-left",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-[#64748b]"
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
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-[#d8e0ea] bg-[#fbfcfe] pl-10 pr-3 text-xs outline-none transition focus:border-[#1877f2] focus:bg-white focus:ring-2 focus:ring-[#1877f2]/10"
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
  className,
}: {
  children: ReactNode;
  minWidth?: number;
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
        className="w-full table-auto text-left text-[10px]"
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
        "whitespace-nowrap bg-slate-50/50 px-4 py-3 font-medium text-slate-500",
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
        "group border-b border-slate-100 last:border-0 transition-colors duration-300 hover:bg-slate-50/80",
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
        "whitespace-nowrap px-4 py-3 align-middle transition-colors group-hover:text-slate-900",
        numeric ? "text-right tabular-nums" : "text-left",
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
        className="block truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
      >
        {name}
      </Link>
      {sub && <div className="truncate text-[9px] text-[#64748b]">{sub}</div>}
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
        className="flex size-7 items-center justify-center rounded-md border border-[#d8e0ea] text-[#64748b] transition hover:border-[#1877f2] hover:bg-[#eff6ff] hover:text-[#1877f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40"
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
                    className={cn("text-xs", item.danger && "text-[#b42318]")}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.label}
                  onSelect={item.onSelect}
                  className={cn("text-xs", item.danger && "text-[#b42318]")}
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
        "flex flex-col items-center justify-center p-6 text-center",
        compact ? "min-h-[160px]" : "min-h-[280px]",
      )}
    >
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-b from-white to-slate-50 shadow-sm ring-1 ring-slate-200/50">
        <Icon className="size-6 text-blue-500" aria-hidden="true" />
      </span>
      <h3 className="text-[14px] font-semibold tracking-tight text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-[320px] text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>
      {(action || secondary) && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dde5ee] px-3 py-2.5 text-[10px] text-[#64748b]">
      <span>
        Showing {from}–{to} of {total} {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canPrevious}
            className={cn(btn, "h-7 px-2.5 disabled:cursor-not-allowed")}
          >
            Previous
          </button>
          <span className="px-1 font-semibold text-[#475569]">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className={cn(btn, "h-7 px-2.5 disabled:cursor-not-allowed")}
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
    amber: "border-[#fae0a6] bg-[#fffaeb] text-[#b45309]",
    red: "border-[#fbcfcb] bg-[#fef3f2] text-[#b42318]",
    blue: "border-[#bcd9ff] bg-[#eff6ff] text-[#0b5ed7]",
  }[tone];

  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-lg border p-3", palette)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-[220px] flex-1">
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{description}</p>
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
      <h1 className="text-base font-bold text-[#14213d]">{title}</h1>
      <p className="mx-auto mt-2 max-w-[420px] text-[11px] leading-relaxed text-[#64748b]">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
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
      className={cn("block animate-pulse rounded bg-[#e8edf4]", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonKpis({ count = 8 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(card, "h-[84px] p-3")}>
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
      <div className="flex gap-3 border-b border-[#dde5ee] bg-[#f7f9fc] px-3 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonBar key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3 border-b border-[#e5eaf1] px-3 py-3 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <SkeletonBar key={c} className="h-3 flex-1" />
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
      className={cn("block h-1.5 overflow-hidden rounded-full bg-[#edf1f5]", className)}
    >
      <span
        className={cn("block h-full rounded-full", TONE_CLASS[tone].dot)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initial = name === "Unassigned" ? "?" : name.charAt(0).toUpperCase();
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[9px] font-bold text-[#475569]">
      {initial}
    </span>
  );
}
