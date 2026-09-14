"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileImage,
  FileText,
  Grid2X2,
  Images,
  LayoutDashboard,
  Megaphone,
  Plug,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adSets, ads, campaigns, instantForms, issues } from "../data";
import { btn, btnPrimary } from "./ui";

const DATE_RANGES = [
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "This month",
  "Lifetime",
];

/**
 * Writes the chosen range to `?range=`, which the reporting pages read through
 * `useFilters`. Rendered only where a date range actually applies.
 */
function DateRangeControl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params?.get("range") ?? "Last 30 days";

  const choose = (range: string) => {
    const next = new URLSearchParams(params?.toString());
    if (range === "Last 30 days") next.delete("range");
    else next.set("range", range);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(btn, "h-10")} aria-label="Change date range">
        <CalendarDays className="size-3.5" />
        {current}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {DATE_RANGES.map((range) => (
          <DropdownMenuItem
            key={range}
            onSelect={() => choose(range)}
            className={cn("text-xs", range === current && "font-bold text-[#1877f2]")}
          >
            {range}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ADS_ROOT = "/admin/meta/ads";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { label: "Overview", href: ADS_ROOT, icon: LayoutDashboard, exact: true },
  { label: "Campaigns", href: `${ADS_ROOT}/campaigns`, icon: Megaphone },
  { label: "Ad Sets", href: `${ADS_ROOT}/adsets`, icon: Grid2X2 },
  { label: "Ads", href: `${ADS_ROOT}/ads`, icon: FileImage },
  { label: "Instant Forms", href: `${ADS_ROOT}/forms`, icon: FileText },
  { label: "Leads Center", href: `${ADS_ROOT}/leads`, icon: UsersRound },
  { label: "Audiences", href: `${ADS_ROOT}/audiences`, icon: UsersRound },
  { label: "Creative Library", href: `${ADS_ROOT}/creative`, icon: Images },
  { label: "Analytics", href: `${ADS_ROOT}/analytics`, icon: BarChart3 },
  { label: "Issues", href: `${ADS_ROOT}/issues`, icon: AlertTriangle },
  { label: "Activity Log", href: `${ADS_ROOT}/activity`, icon: Activity },
  { label: "Assets", href: `${ADS_ROOT}/assets`, icon: Plug },
  { label: "Help Center", href: `${ADS_ROOT}/help`, icon: CircleHelp },
];

/** Which nav item a URL belongs to — detail routes stay highlighted. */
function isCurrent(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SearchHit = {
  type: "Campaign" | "Ad Set" | "Ad" | "Instant Form";
  name: string;
  href: string;
  context: string;
};

/** Global search across campaigns, ad sets, ads and forms. */
function useSearchHits(query: string): SearchHit[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];

    for (const c of campaigns) {
      if (c.name.toLowerCase().includes(q))
        hits.push({ type: "Campaign", name: c.name, href: `${ADS_ROOT}/campaigns/${c.id}`, context: c.objective });
    }
    for (const s of adSets) {
      if (s.name.toLowerCase().includes(q))
        hits.push({
          type: "Ad Set",
          name: s.name,
          href: `${ADS_ROOT}/adsets/${s.id}`,
          context: campaigns.find((c) => c.id === s.campaignId)?.name ?? "",
        });
    }
    for (const a of ads) {
      if (a.name.toLowerCase().includes(q))
        hits.push({
          type: "Ad",
          name: a.name,
          href: `${ADS_ROOT}/ads/${a.id}`,
          context: adSets.find((s) => s.id === a.adSetId)?.name ?? "",
        });
    }
    for (const f of instantForms) {
      if (f.name.toLowerCase().includes(q))
        hits.push({ type: "Instant Form", name: f.name, href: `${ADS_ROOT}/forms/${f.id}`, context: f.type });
    }
    return hits.slice(0, 8);
  }, [query]);
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const hits = useSearchHits(query);
  const open = query.trim().length >= 2;

  return (
    <div className="relative min-w-[200px] flex-1 md:max-w-[280px]">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search campaigns, ad sets, ads…"
        aria-label="Search Ads Manager"
        className="h-10 w-full rounded-md border border-[#d8e0ea] bg-white pl-10 pr-3 text-xs outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/10"
      />
      {open && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-[#dde5ee] bg-white shadow-lg">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#64748b]">
              No campaigns, ad sets, ads or forms match “{query}”.
            </p>
          ) : (
            hits.map((hit) => (
              <Link
                key={`${hit.type}-${hit.href}`}
                href={hit.href}
                onClick={() => setQuery("")}
                className="flex items-center gap-2 border-b border-[#eef2f7] px-3 py-2 last:border-0 hover:bg-[#f7f9fc]"
              >
                <span className="shrink-0 rounded border border-[#dde5ee] bg-[#f7f9fc] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#64748b]">
                  {hit.type}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-[#14213d]">
                    {hit.name}
                  </span>
                  {hit.context && (
                    <span className="block truncate text-[9px] text-[#64748b]">{hit.context}</span>
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A connected Meta asset, as a single readable line: "Ad Account · Namo Gange
 * Official". The previous three-line stack rendered at 7–9px, which was too
 * small to read at a glance.
 */
function AssetChip({
  label,
  value,
  icon,
  warning,
  href,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  warning?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      title={`${label}: ${value}`}
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 rounded-xl border px-2.5 text-[10.5px] shadow-sm backdrop-blur-md transition-all duration-300",
        warning
          ? "border-amber-200/50 bg-amber-50/80 hover:bg-amber-100/80 hover:-translate-y-px"
          : "border-slate-200/50 bg-white/60 hover:bg-white hover:shadow-md hover:-translate-y-px",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 shadow-sm ring-1 ring-slate-200/50">
        {icon}
      </span>
      <span className="hidden shrink-0 font-medium text-[#64748b] lg:inline">
        {label}
      </span>
      <strong className="max-w-[150px] truncate font-semibold text-[#14213d]">
        {value}
      </strong>
      {warning && (
        <span className="shrink-0 whitespace-nowrap rounded bg-[#fef0c7] px-1.5 py-0.5 text-[9px] font-bold text-[#b45309]">
          {warning}
        </span>
      )}
    </Link>
  );
}

/**
 * Chrome shared by every Meta Ads Manager management page: identity header,
 * connected-asset controls, global search and workspace navigation.
 */
export function AdsWorkspace({
  children,
  actions,
  showDateRange = true,
}: {
  children: ReactNode;
  actions?: ReactNode;
  /** Pages with no time dimension (assets, help, audiences…) hide the control. */
  showDateRange?: boolean;
}) {
  const pathname = usePathname() ?? ADS_ROOT;
  const openIssues = issues.filter((i) => !i.resolved).length;
  const instagram = { needsReauth: true };

  return (
    <div className="relative min-h-screen w-full font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      {/* Exquisite Animated Mesh Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent" />
      <div className="pointer-events-none absolute -left-[10%] top-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply animate-pulse" />
      <div className="pointer-events-none absolute -right-[10%] top-[10%] -z-10 h-[400px] w-[400px] rounded-full bg-violet-400/20 blur-[120px] mix-blend-multiply" />
      <div className="pointer-events-none absolute left-[20%] top-[30%] -z-10 h-[600px] w-[600px] rounded-full bg-indigo-300/10 blur-[120px] mix-blend-multiply" />
      
      <div className="relative z-0">
        {/* Row 1 — identity, search and the primary actions. */}
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
        <Link href={ADS_ROOT} className="flex shrink-0 items-center gap-2.5">
          <FaMeta className="size-8 shrink-0 text-[#0866ff]" aria-hidden="true" />
          <FaInstagram className="size-6 shrink-0 text-[#d946ef]" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[20px] font-bold leading-tight tracking-tight">
              Meta Ads Manager
            </span>
            <span className="mt-0.5 block text-[10px] text-[#64748b]">
              Manage paid campaigns across Facebook and Instagram.
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <GlobalSearch />
          {showDateRange && <DateRangeControl />}
          {actions ?? (
            <Link href={`${ADS_ROOT}/create`} className={cn(btnPrimary, "h-10")}>
              <Plus className="size-3.5" />
              Create Campaign
            </Link>
          )}
        </div>
      </header>

      {/* Row 2 — which Meta assets this workspace is acting on. */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#cfe8df] bg-[#f2fbf7] px-2">
          <CheckCircle2 className="size-3.5 fill-[#16a36a] text-white" aria-hidden="true" />
          <span className="whitespace-nowrap text-[10px] font-bold text-[#087a50]">
            Meta Connected
          </span>
        </span>
        <span className="h-4 w-px shrink-0 bg-[#dde5ee]" aria-hidden="true" />
        <AssetChip
          label="Ad Account"
          value="Namo Gange Official"
          href={`${ADS_ROOT}/assets#ad-account`}
          icon={<FaMeta className="size-3 text-[#0866ff]" />}
        />
        <AssetChip
          label="Page"
          value="Namo Gange"
          href={`${ADS_ROOT}/assets#facebook-page`}
          icon={<FaFacebookF className="size-3 text-[#1877f2]" />}
        />
        <AssetChip
          label="Instagram"
          value="@namogangetrust"
          href={`${ADS_ROOT}/assets#instagram`}
          warning={instagram.needsReauth ? "Reconnect" : undefined}
          icon={<FaInstagram className="size-3 text-[#d946ef]" />}
        />
      </div>

      {/* The fade on the right edge signals that the section list scrolls when
          it does not fit; over the white card it is invisible when it fits. */}
      <div className="relative mb-4">
        <nav
          aria-label="Ads Manager sections"
          className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-100/50 p-1.5 shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:w-12 after:shrink-0"
        >
        {NAV.map(({ label, href, icon: Icon, exact }) => {
          const current = isCurrent(pathname, href, exact);
          const badge = label === "Issues" && openIssues > 0 ? openIssues : null;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-all duration-200",
                current
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
              {badge !== null && (
                <span className="rounded-full bg-[#fef3f2] px-1.5 py-px text-[9px] font-bold text-[#b42318]">
                  {badge}
                </span>
              )}
            </Link>
          );
          })}
        </nav>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-px right-px w-10 rounded-r-xl bg-gradient-to-l from-white/80 to-transparent backdrop-blur-sm"
        />
      </div>

      {children}
      </div>
    </div>
  );
}

/** Header strip used on detail pages that sit inside the workspace. */
export function DetailBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
