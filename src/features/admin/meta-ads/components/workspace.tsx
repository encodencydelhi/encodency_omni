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
import { toast } from "sonner";
import { integrationsApi } from "@/features/admin/integrations/live/integrations-api";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { LIVE, useAdsData, type AdsStatus } from "../data-source";
import { MetaProductNav } from "@/features/admin/meta/ui";
import { btn, btnPrimary } from "./ui";

/** Live mode reports through Meta's 7/30/90-day presets only; the demo data also has the two extra ranges. */
const DATE_RANGES = LIVE ? ["Last 7 days", "Last 30 days", "Last 90 days"] : ["Last 7 days", "Last 30 days", "Last 90 days", "This month", "Lifetime"];

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

const STATE_COPY: Record<Exclude<AdsStatus, "ready" | "loading">, { title: string; body: string; action?: { label: string; href: string } }> = {
  no_company: { title: "Select a company", body: "Choose the company whose Meta ad account you want to see." },
  not_connected: { title: "Connect Meta to see your ads", body: "No Meta login is connected for this company yet. Connect it, then return here.", action: { label: "Open Meta settings", href: "/admin/meta/settings" } },
  reconnect: { title: "Reconnect Meta", body: "The Meta login for this company expired or was revoked. Reconnect it to read ad data again.", action: { label: "Open Meta settings", href: "/admin/meta/settings" } },
  permission: { title: "Meta needs more permissions", body: "Meta refused access to ad data. Reconnect Meta and approve the ads permissions (ads_read, leads_retrieval).", action: { label: "Open Meta settings", href: "/admin/meta/settings" } },
  rate_limited: { title: "Meta is limiting requests for this ad account", body: "Meta gives every ad account a small request budget and this one is used up for now. Your other ad accounts are not affected: pick another one above, or wait and this page retries by itself." },
  no_accounts: { title: "No ad accounts found", body: "The connected Meta login does not have access to any ad account. Add it to an ad account in Meta Business Settings, then refresh." },
  error: { title: "Meta Ads could not be loaded", body: "Something went wrong while talking to Meta. Try again in a moment." },
};

/** Starts Meta's login (same call the Integrations page makes) and sends the browser to Facebook. */
async function connectMeta(): Promise<void> {
  const companyId = getStoredCompanyId();
  if (!companyId) {
    toast.error("Select a company before connecting Meta.");
    return;
  }
  try {
    const { authUrl } = await integrationsApi.initOAuth(companyId, "META");
    window.location.assign(authUrl);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to start the Meta connection.");
  }
}

function waitText(seconds: number | null): string {
  if (!seconds) return "a few minutes";
  if (seconds < 90) return "about a minute";
  return `about ${Math.ceil(seconds / 60)} minutes`;
}

function StatePanel({ status, message, onRetry, retryAfterSeconds }: { status: Exclude<AdsStatus, "ready">; message: string | null; onRetry: () => void; retryAfterSeconds: number | null }) {
  if (status === "loading") {
    return (
      <div className="space-y-3" role="status" aria-label="Loading Meta Ads">
        <div className="h-24 animate-pulse rounded-sm border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-sm border border-slate-200 bg-white" />
      </div>
    );
  }
  const copy = STATE_COPY[status];
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-8 text-center shadow-2xs" role="alert">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs font-medium text-slate-600">{status === "error" && message ? message : copy.body}</p>
      {status === "rate_limited" && <p className="mx-auto mt-1.5 max-w-md text-xs font-semibold text-amber-800">Meta asked us to wait {waitText(retryAfterSeconds)}. Nothing is lost: the last data you saw is kept.</p>}
      <div className="mt-4 flex justify-center gap-2">
        {(status === "not_connected" || status === "reconnect" || status === "permission") && (
          <button type="button" onClick={() => void connectMeta()} className={btnPrimary}>
            {status === "not_connected" ? "Connect Meta" : "Reconnect Meta"}
          </button>
        )}
        {copy.action && (
          <Link href={copy.action.href} className={btn}>
            {copy.action.label}
          </Link>
        )}
        {(status === "error" || status === "no_accounts" || status === "rate_limited") && (
          <button type="button" onClick={onRetry} className={btn}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** Live: the real ad account (switchable), first Page and Instagram account. Demo: the original sample chips. */
function AssetChips({ onlyAccount = false }: { onlyAccount?: boolean }) {
  const ads = useAdsData();
  if (!LIVE) {
    return (
      <>
        <AssetChip label="Ad Account" value="Namo Gange Official" href={`${ADS_ROOT}/assets#ad-account`} icon={<FaMeta className="size-3 text-[#0866ff]" />} />
        <AssetChip label="Page" value="Namo Gange" href={`${ADS_ROOT}/assets#facebook-page`} icon={<FaFacebookF className="size-3 text-[#1877f2]" />} />
        <AssetChip label="Instagram" value="@namogangetrust" href={`${ADS_ROOT}/assets#instagram`} warning="Reconnect" icon={<FaInstagram className="size-3 text-[#d946ef]" />} />
      </>
    );
  }
  const current = ads.accounts.find((a) => a.id === ads.accountId);
  const page = ads.connectedAssets.find((a) => a.group === "Facebook Page");
  const instagram = ads.connectedAssets.find((a) => a.group === "Instagram Business");
  return (
    <>
      {ads.accounts.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(btn, "h-8.5 gap-2 px-3 text-xs font-semibold text-slate-800")} aria-label="Change ad account">
            <FaMeta className="size-3 text-[#0866ff]" />
            <span className="max-w-[170px] truncate">{current?.name ?? "Ad account"}</span>
            <ChevronDown className="size-3.5 text-slate-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            {ads.accounts.map((account) => (
              <DropdownMenuItem key={account.id} onSelect={() => ads.setAccountId(account.id)} className={cn("text-xs font-medium", account.id === ads.accountId ? "bg-blue-50/60 font-semibold text-blue-600" : "text-slate-700")}>
                {account.name}
                <span className="ml-2 text-[10px] text-slate-500">{account.currency}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        current && <AssetChip label="Ad Account" value={current.name} href={`${ADS_ROOT}/assets#ad-account`} icon={<FaMeta className="size-3 text-[#0866ff]" />} />
      )}
      {onlyAccount ? null : page ? (
        <AssetChip label="Page" value={page.name} href={`${ADS_ROOT}/assets#facebook-page`} icon={<FaFacebookF className="size-3 text-[#1877f2]" />} />
      ) : (
        <AssetChip label="Page" value="Not available" href="/admin/meta/facebook" warning="Fix" icon={<FaFacebookF className="size-3 text-[#1877f2]" />} />
      )}
      {onlyAccount ? null : instagram ? (
        <AssetChip label="Instagram" value={instagram.name} href={`${ADS_ROOT}/assets#instagram`} icon={<FaInstagram className="size-3 text-[#d946ef]" />} />
      ) : (
        <AssetChip label="Instagram" value="Not available" href="/admin/meta/instagram" warning="Fix" icon={<FaInstagram className="size-3 text-[#d946ef]" />} />
      )}
    </>
  );
}

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
  const { campaigns, adSets, ads, instantForms } = useAdsData();
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
  }, [query, campaigns, adSets, ads, instantForms]);
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
        className="h-10 w-full rounded-sm border border-slate-300 bg-white pl-10 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
      />
      {open && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl">
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
                <span className="shrink-0 rounded-sm border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-slate-700">
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
        "flex h-8.5 min-w-0 items-center gap-2 rounded-sm border px-3 text-xs font-medium shadow-2xs transition-all duration-200",
        warning
          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm",
      )}
    >
      <span className="flex size-5.5 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-slate-700 ring-1 ring-slate-200">
        {icon}
      </span>
      <span className="hidden shrink-0 font-semibold text-slate-600 lg:inline">
        {label}:
      </span>
      <strong className="max-w-[150px] truncate font-semibold text-slate-900">
        {value}
      </strong>
      {warning && (
        <span className="shrink-0 whitespace-nowrap rounded-sm bg-amber-200 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-900">
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
  const ads = useAdsData();
  const openIssues = ads.issues.filter((i) => !i.resolved).length;

  return (
    <div className="relative min-h-screen w-full font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Exquisite Subtle Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <div className="relative z-0">
        <MetaProductNav className="mb-3.5" />
        {/* Row 1 — identity, search and the primary actions. */}
        <header className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Link href={ADS_ROOT} className="flex shrink-0 items-center gap-3 group">
            <div className="flex items-center gap-1.5 p-1.5 rounded-sm bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300 transition-colors">
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
            {actions ??
              (LIVE ? (
                <button
                  type="button"
                  onClick={() => toast.info("Creating campaigns from here is not available yet. Create them in Meta Ads Manager; they appear here after the next refresh.")}
                  className={cn(btnPrimary, "h-10 font-semibold opacity-60")}
                  aria-disabled="true"
                >
                  <Plus className="size-4" />
                  Create Campaign
                </button>
              ) : (
                <Link href={`${ADS_ROOT}/create`} className={cn(btnPrimary, "h-10 font-semibold")}>
                  <Plus className="size-4" />
                  Create Campaign
                </Link>
              ))}
          </div>
        </header>

        {/* Row 2 — which Meta assets this workspace is acting on. */}
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {!LIVE || ads.status === "ready" ? (
            <span className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-sm border border-emerald-300 bg-emerald-50 px-2.5 shadow-2xs">
              <CheckCircle2 className="size-4 fill-emerald-600 text-white" aria-hidden="true" />
              <span className="whitespace-nowrap text-xs font-semibold text-emerald-800">Meta Connected</span>
            </span>
          ) : (
            <span className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-sm border border-amber-300 bg-amber-50 px-2.5 shadow-2xs">
              <AlertTriangle className="size-4 text-amber-700" aria-hidden="true" />
              <span className="whitespace-nowrap text-xs font-semibold text-amber-900">{ads.status === "loading" ? "Connecting to Meta…" : ads.status === "rate_limited" ? "Meta is limiting requests" : "Meta not ready"}</span>
            </span>
          )}
          <span className="h-5 w-px shrink-0 bg-slate-300" aria-hidden="true" />
          {(!LIVE || ads.status === "ready" || ((ads.status === "rate_limited" || ads.status === "error") && ads.accounts.length > 0)) && <AssetChips onlyAccount={LIVE && ads.status !== "ready"} />}
          {LIVE && ads.status === "ready" && (
            <span className="ml-auto flex items-center gap-2 text-[11px] font-medium text-slate-500">
              {ads.refetching ? "Refreshing…" : ads.syncedAt ? `Synced ${new Date(ads.syncedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : null}
              <button type="button" onClick={ads.refresh} className="rounded-sm border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                Refresh
              </button>
            </span>
          )}
        </div>

        {/* The fade on the right edge signals that the section list scrolls when it does not fit */}
        <div className="relative mb-5">
          <nav
            aria-label="Ads Manager sections"
            className="flex gap-1.5 overflow-x-auto rounded-sm border border-slate-200 bg-white p-1.5 shadow-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:w-12 after:shrink-0"
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
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                    current
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25 ring-1 ring-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("size-3.5", current ? "text-white" : "text-slate-500")} aria-hidden="true" />
                  {label}
                  {badge !== null && (
                    <span className={cn("rounded-sm px-1.5 py-px text-[9.5px] font-black", current ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700")}>
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

        {LIVE && ads.status === "ready" && ads.stale && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900" role="status">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Showing data from {ads.syncedAt ? new Date(ads.syncedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "earlier"} because Meta is limiting requests for this ad account.
              It refreshes by itself when Meta allows. Other ad accounts are not affected.
            </span>
          </div>
        )}
        {LIVE && ads.status !== "ready" ? <StatePanel status={ads.status} message={ads.errorMessage} onRetry={ads.refresh} retryAfterSeconds={ads.retryAfterSeconds} /> : children}
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
        "mb-4.5 rounded-sm border border-slate-200 bg-white p-4.5 shadow-2xs",
        className,
      )}
    >
      {children}
    </div>
  );
}
