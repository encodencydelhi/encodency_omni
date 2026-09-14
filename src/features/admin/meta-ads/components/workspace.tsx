"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
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
      <DropdownMenuTrigger className={cn(btn, "h-10 px-3.5 font-semibold text-slate-800")} aria-label="Change date range">
        <CalendarDays className="size-3.5 text-blue-600" />
        {current}
        <ChevronDown className="size-3.5 text-slate-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {DATE_RANGES.map((range) => (
          <DropdownMenuItem
            key={range}
            onSelect={() => choose(range)}
            className={cn("text-xs font-medium", range === current ? "font-semibold text-blue-600 bg-blue-50/60" : "text-slate-700")}
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
  const deferredQuery = useDeferredValue(query);
  const hits = useSearchHits(deferredQuery);
  const open = query.trim().length >= 2;

  return (
    <div className="relative min-w-[200px] flex-1 md:max-w-[280px]">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search campaigns, ad sets, ads…"
        aria-label="Search Ads Manager"
        className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
      />
      {open && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {hits.length === 0 ? (
            <p className="px-3.5 py-3 text-xs font-medium text-slate-600">
              No campaigns, ad sets, ads or forms match “{query}”.
            </p>
          ) : (
            hits.map((hit) => (
              <Link
                key={`${hit.type}-${hit.href}`}
                href={hit.href}
                onClick={() => setQuery("")}
                className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5 last:border-0 hover:bg-blue-50/50"
              >
                <span className="shrink-0 rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-slate-700">
                  {hit.type}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-900">
                    {hit.name}
                  </span>
                  {hit.context && (
                    <span className="block truncate text-[10px] font-medium text-slate-500">{hit.context}</span>
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
 * Official".
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
        "flex h-8.5 min-w-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium shadow-2xs transition-all duration-200",
        warning
          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm",
      )}
    >
      <span className="flex size-5.5 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200">
        {icon}
      </span>
      <span className="hidden shrink-0 font-semibold text-slate-600 lg:inline">
        {label}:
      </span>
      <strong className="max-w-[150px] truncate font-semibold text-slate-900">
        {value}
      </strong>
      {warning && (
        <span className="shrink-0 whitespace-nowrap rounded-md bg-amber-200 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-900">
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
    <div className="relative min-h-screen w-full font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Exquisite Subtle Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <div className="relative z-0">
        {/* Row 1 — identity, search and the primary actions. */}
        <header className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Link href={ADS_ROOT} className="flex shrink-0 items-center gap-3 group">
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300 transition-colors">
              <FaMeta className="size-7 shrink-0 text-[#0866ff]" aria-hidden="true" />
              <FaInstagram className="size-5.5 shrink-0 text-[#d946ef]" aria-hidden="true" />
            </div>
            <span className="min-w-0">
              <span className="block text-[22px] font-normal leading-tight tracking-tight text-slate-900">
                Meta Ads Manager
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-600">
                Manage paid campaigns across Facebook and Instagram.
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5">
            <GlobalSearch />
            {showDateRange && <DateRangeControl />}
            {actions ?? (
              <Link href={`${ADS_ROOT}/create`} className={cn(btnPrimary, "h-10 font-semibold")}>
                <Plus className="size-4" />
                Create Campaign
              </Link>
            )}
          </div>
        </header>

        {/* Row 2 — which Meta assets this workspace is acting on. */}
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <span className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 shadow-2xs">
            <CheckCircle2 className="size-4 fill-emerald-600 text-white" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs font-semibold text-emerald-800">
              Meta Connected
            </span>
          </span>
          <span className="h-5 w-px shrink-0 bg-slate-300" aria-hidden="true" />
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

        {/* The fade on the right edge signals that the section list scrolls when it does not fit */}
        <div className="relative mb-5">
          <nav
            aria-label="Ads Manager sections"
            className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:w-12 after:shrink-0"
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
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                    current
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25 ring-1 ring-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("size-3.5", current ? "text-white" : "text-slate-500")} aria-hidden="true" />
                  {label}
                  {badge !== null && (
                    <span className={cn("rounded-full px-1.5 py-px text-[9.5px] font-black", current ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700")}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px right-px w-12 rounded-r-2xl bg-gradient-to-l from-white to-transparent"
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
        "mb-4.5 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs",
        className,
      )}
    >
      {children}
    </div>
  );
}
