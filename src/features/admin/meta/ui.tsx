"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ImageOff,
  Loader2,
  Megaphone,
  PlugZap,
  RefreshCw,
  Settings,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { btn, btnPrimary, card } from "@/features/admin/meta-ads/components/ui";
import { useMeta } from "./connection-context";

export const META_ROOT = "/admin/meta";

/* ------------------------------------------------------------------ */
/* Product tabs + shell                                                 */
/* ------------------------------------------------------------------ */

export type MetaTab = "overview" | "ads" | "facebook" | "instagram" | "settings";

const TABS: { id: MetaTab; label: string; href: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", href: META_ROOT, icon: LayoutDashboard },
  { id: "ads", label: "Meta Ads", href: `${META_ROOT}/ads`, icon: Megaphone },
  { id: "facebook", label: "Facebook", href: `${META_ROOT}/facebook`, icon: FaFacebookF },
  { id: "instagram", label: "Instagram", href: `${META_ROOT}/instagram`, icon: FaInstagram },
  { id: "settings", label: "Settings", href: `${META_ROOT}/settings`, icon: Settings },
];

export function tabOfPath(pathname: string): MetaTab {
  if (pathname.startsWith(`${META_ROOT}/ads`)) return "ads";
  if (pathname.startsWith(`${META_ROOT}/facebook`)) return "facebook";
  if (pathname.startsWith(`${META_ROOT}/instagram`)) return "instagram";
  if (pathname.startsWith(`${META_ROOT}/settings`)) return "settings";
  return "overview";
}

/** The five products of the Meta hub as one navigable strip. Also used above the Ads workspace. */
export function MetaProductNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? META_ROOT;
  const active = tabOfPath(pathname);
  return (
    <nav aria-label="Meta products" className={cn("flex gap-1.5 overflow-x-auto rounded-sm border border-slate-200 bg-white p-1.5 shadow-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {TABS.map(({ id, label, href, icon: Icon }) => {
        const current = id === active;
        return (
          <Link
            key={id}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-4 py-2 text-xs font-semibold transition-all duration-200",
              current ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25 ring-1 ring-blue-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("size-3.5", current ? "text-white" : "text-slate-500")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Small "Connected as …" indicator shared by every Meta page. */
export function ConnectionPill() {
  const meta = useMeta();
  const tone =
    meta.state === "connected"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : meta.state === "loading"
        ? "border-slate-200 bg-white text-slate-600"
        : "border-amber-300 bg-amber-50 text-amber-900";
  const label =
    meta.state === "connected"
      ? `Connected${meta.connection?.accountName ? ` as ${meta.connection.accountName}` : ""}`
      : meta.state === "loading"
        ? "Checking Meta…"
        : meta.state === "reconnect"
          ? "Reconnect needed"
          : meta.state === "not_connected"
            ? "Not connected"
            : meta.state === "no_client"
              ? "Select a Client"
              : meta.state === "no_company"
                ? "Select a Company"
                : "Connection unknown";
  const Icon = meta.state === "connected" ? CheckCircle2 : meta.state === "loading" ? Loader2 : AlertTriangle;
  return (
    <span className={cn("flex h-9 items-center gap-1.5 rounded-sm border px-3 text-xs font-semibold shadow-2xs", tone)}>
      <Icon className={cn("size-4", meta.state === "loading" && "animate-spin")} aria-hidden="true" />
      <span className="max-w-[220px] truncate">{label}</span>
    </span>
  );
}

export function MetaShell({
  title,
  subtitle,
  mark,
  actions,
  children,
  showRefresh = true,
}: {
  title: string;
  subtitle: string;
  mark?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  showRefresh?: boolean;
}) {
  const meta = useMeta();
  return (
    <div className="relative min-h-screen w-full font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      <div className="relative z-0">
        <header className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white p-1.5 shadow-2xs">
              {mark ?? <FaMeta className="size-7 shrink-0 text-[#0866ff]" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-normal leading-tight tracking-tight text-slate-900">{title}</h1>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionPill />
            {showRefresh && (
              <button type="button" onClick={meta.refresh} className={cn(btn, "h-9")} aria-label="Refresh Meta data">
                <RefreshCw className={cn("size-3.5", meta.isFetching && "animate-spin")} />
                Refresh
              </button>
            )}
            {actions}
          </div>
        </header>
        <MetaProductNav className="mb-5" />
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gate: what to show instead of the page until Meta is usable          */
/* ------------------------------------------------------------------ */

const GATE_COPY: Record<"no_company" | "no_client" | "not_connected" | "reconnect" | "error", { title: string; body: string }> = {
  no_company: { title: "Select a Company", body: "Choose the Company whose Meta account you want to manage from the switcher at the top." },
  no_client: { title: "Select a Client", body: "Meta connections and posts are shown per Client. Pick a Client from the switcher at the top." },
  not_connected: { title: "Connect your Meta account", body: "One Meta login gives OmniPlatform your ad accounts, Facebook Pages and Instagram accounts. Nothing is posted or changed when you connect." },
  reconnect: { title: "Reconnect Meta", body: "The Meta login expired or was revoked, so data cannot be read. Reconnect to continue; nothing you saved here is lost." },
  error: { title: "Meta connection could not be loaded", body: "Something went wrong while loading the connection. Try again in a moment." },
};

/** Renders children only when a usable Meta login exists; otherwise the matching call to action. */
export function ConnectionGate({ children }: { children: ReactNode }) {
  const meta = useMeta();
  if (meta.state === "connected") return <>{children}</>;
  if (meta.state === "loading") {
    return (
      <div className="space-y-3" role="status" aria-label="Loading Meta">
        <div className="h-24 animate-pulse rounded-sm border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-sm border border-slate-200 bg-white" />
      </div>
    );
  }
  const copy = GATE_COPY[meta.state];
  const canConnect = meta.state === "not_connected" || meta.state === "reconnect";
  return (
    <div className={cn(card, "mx-auto max-w-xl p-8 text-center")} role="alert">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-sm bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
        {canConnect ? <PlugZap className="size-6" /> : <ShieldAlert className="size-6" />}
      </span>
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs font-medium leading-relaxed text-slate-600">{meta.state === "error" && meta.loadError ? meta.loadError : copy.body}</p>
      <div className="mt-5 flex justify-center gap-2">
        {canConnect && (
          <button type="button" onClick={() => void meta.connect()} disabled={meta.busy === "connect"} className={btnPrimary}>
            {meta.busy === "connect" ? <Loader2 className="size-4 animate-spin" /> : <FaMeta className="size-4" />}
            {meta.state === "reconnect" ? "Reconnect Meta" : "Connect Meta"}
          </button>
        )}
        {meta.state === "error" && (
          <button type="button" onClick={meta.refresh} className={btn}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "violet";
const TONES: Record<Tone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

export function Pill({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-[10.5px] font-semibold", TONES[tone], className)}>{children}</span>;
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding: tables and lists that bring their own. */
  flush?: boolean;
}) {
  return (
    <section className={cn(card, "overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export function InlineNotice({ tone = "blue", title, children, action }: { tone?: "blue" | "amber" | "red"; title: string; children?: ReactNode; action?: ReactNode }) {
  const palette = { blue: "border-blue-300 bg-blue-50 text-blue-900", amber: "border-amber-300 bg-amber-50 text-amber-900", red: "border-rose-300 bg-rose-50 text-rose-900" }[tone];
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-sm border p-3.5 text-xs shadow-2xs", palette)} role={tone === "blue" ? "status" : "alert"}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 font-medium leading-relaxed opacity-95">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ComponentType<{ className?: string }>; tone?: "green" | "amber" | "red" }) {
  const valueTone = tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-rose-700" : "text-slate-900";
  return (
    <div className={cn(card, "p-4")}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <span className="truncate">{label}</span>
        {Icon && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className={cn("mt-2.5 text-[22px] font-semibold leading-none tracking-tight", valueTone)}>{value}</div>
      {sub && <p className="mt-1.5 truncate text-[10.5px] font-medium text-slate-500">{sub}</p>}
    </div>
  );
}

export function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
  return src ? (
    // Meta CDN hosts are not on the Next image allow-list, so a plain <img> is the right element here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

export function Thumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label="No preview available" className={cn("flex items-center justify-center overflow-hidden bg-slate-100 text-slate-400", className)}>
        <ImageOff className="size-4" aria-hidden="true" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className={cn("bg-slate-100 object-cover", className)} />
  );
}

/* ------------------------------------------------------------------ */
/* Switching between several Pages / accounts                           */
/* ------------------------------------------------------------------ */

export interface SwitcherItem {
  id: string;
  name: string;
  detail?: string | null;
  pictureUrl?: string | null;
  linked?: boolean;
}

/** One dropdown at the top of a workspace to move between the Pages (or Instagram accounts) the login manages. */
export function AssetSwitcher({ label, items, selectedId, onSelect }: { label: string; items: SwitcherItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const current = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  if (!current) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(btn, "h-10 min-w-[240px] max-w-[340px] justify-between gap-2.5 px-3 text-left")} aria-label={`Switch ${label.toLowerCase()}`}>
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar src={current.pictureUrl} name={current.name} size={24} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-900">{current.name}</span>
              {current.detail && <span className="block truncate text-[10px] font-medium text-slate-500">{current.detail}</span>}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {items.length > 1 && <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{items.length}</span>}
            <ChevronDown className="size-3.5 text-slate-500" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 min-w-[300px] overflow-y-auto">
          {items.map((item) => (
            <DropdownMenuItem key={item.id} onSelect={() => onSelect(item.id)} className={cn("gap-2.5 text-xs", item.id === current.id && "bg-blue-50/60")}>
              <Avatar src={item.pictureUrl} name={item.name} size={26} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-semibold", item.id === current.id ? "text-blue-700" : "text-slate-900")}>{item.name}</span>
                {item.detail && <span className="block truncate text-[10px] font-medium text-slate-500">{item.detail}</span>}
              </span>
              {item.linked && <Pill tone="green">Linked</Pill>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paging for Graph cursors                                             */
/* ------------------------------------------------------------------ */

/**
 * Meta paginates with cursors and never reports a total, so the pager pages through what is already
 * loaded and asks Meta for the next batch only when the user reaches the end.
 */
export function CursorPager({
  page,
  pageCount,
  from,
  to,
  loaded,
  hasMore,
  loadingMore,
  noun,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  loaded: number;
  hasMore: boolean;
  loadingMore: boolean;
  noun: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (loaded === 0) return null;
  const canNext = page < pageCount || hasMore;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-600">
      <span>
        Showing <strong className="font-semibold text-slate-900">{from}–{to}</strong> of <strong className="font-semibold text-slate-900">{loaded}{hasMore ? "+" : ""}</strong> {noun}
      </span>
      {(pageCount > 1 || hasMore) && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} disabled={page <= 1} className={cn(btn, "h-8 px-3 text-xs disabled:cursor-not-allowed")}>
            <ChevronLeft className="size-3.5" />
            Previous
          </button>
          <span className="px-1.5 text-xs font-semibold text-slate-900">Page {page}{hasMore ? "" : ` of ${pageCount}`}</span>
          <button type="button" onClick={onNext} disabled={!canNext || loadingMore} className={cn(btn, "h-8 px-3 text-xs disabled:cursor-not-allowed")}>
            {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Client-side pages over a cursor feed that grows as the user advances.
 * `resetKey` changes whenever the list is a different one (Page switched, filter or search changed): back to page 1.
 */
export function useCursorPager<T>(items: T[], pageSize: number, feed: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }, resetKey: string) {
  const [state, setState] = useState({ page: 1, key: resetKey });
  if (state.key !== resetKey) setState({ page: 1, key: resetKey });

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = state.key === resetKey ? Math.min(state.page, pageCount) : 1;
  const start = (page - 1) * pageSize;

  return {
    visible: items.slice(start, start + pageSize),
    page,
    pageCount,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    loaded: items.length,
    hasMore: feed.hasNextPage,
    loadingMore: feed.isFetchingNextPage,
    previous: () => setState((s) => ({ ...s, page: Math.max(1, page - 1) })),
    next: () => {
      if (page < pageCount) setState((s) => ({ ...s, page: page + 1 }));
      else if (feed.hasNextPage && !feed.isFetchingNextPage) {
        void Promise.resolve(feed.fetchNextPage()).then(() => setState((s) => ({ ...s, page: page + 1 })));
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Dialog                                                               */
/* ------------------------------------------------------------------ */

export function DetailDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0", wide ? "max-w-3xl" : "max-w-xl")}>
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-[15px] font-semibold text-slate-900">{title}</DialogTitle>
          {description ? <DialogDescription className="text-xs font-medium text-slate-500">{description}</DialogDescription> : <DialogDescription className="sr-only">Details</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3">{footer}</div> : <span />}
      </DialogContent>
    </Dialog>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <dt className="shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}
