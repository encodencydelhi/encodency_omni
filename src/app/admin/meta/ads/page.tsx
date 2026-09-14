"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import {
  Activity,
  BarChart3,
  Layers,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Percent,
  Plus,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  activityLog,
  adSets,
  ads,
  campaigns,
  instantForms,
  leads,
  sumMetrics,
} from "@/features/admin/meta-ads/data";
import {
  cpc,
  conversionRate,
  cpl,
  ctr,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
  relative,
} from "@/features/admin/meta-ads/format";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  InfoHint,
  Meter,
  Panel,
  PlatformIcons,
  PlatformMark,
  RowMenu,
  SkeletonKpis,
  StatusChip,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Platform } from "@/features/admin/meta-ads/types";

const PerformanceTrend = dynamic(
  () =>
    import("@/features/admin/meta-ads/components/charts").then(
      (mod) => mod.PerformanceTrend,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[186px] w-full animate-pulse items-center justify-center rounded-xl bg-slate-100/70 text-xs font-semibold text-slate-400">
        Loading performance trend...
      </div>
    ),
  },
);

function MasterKpiCard({
  title,
  value,
  subtitle,
  change,
  changePositive = true,
  icon: Icon,
  gradient,
  borderGlow,
  cornerGlow,
  badgeText,
  footerMetric,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  change?: string;
  changePositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderGlow: string;
  cornerGlow: string;
  badgeText?: string;
  footerMetric?: { label: string; value: string };
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        borderGlow,
      )}
    >
      {/* Corner radial aura */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-15 blur-xl transition-opacity duration-300 group-hover:opacity-35",
          cornerGlow,
        )}
      />

      {/* Top indicator bar */}
      <div
        className={cn(
          "absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          gradient,
        )}
      />

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {hint && <InfoHint text={hint} />}
        </div>
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg shadow-2xs transition-transform duration-200 group-hover:scale-105",
            gradient,
          )}
        >
          <Icon className="size-3.5 text-white" />
        </div>
      </div>

      <div className="relative z-10 mt-2 flex items-baseline justify-between gap-2">
        <span className="text-xl font-normal tracking-tight text-slate-900 leading-none">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold shadow-2xs shrink-0",
              changePositive
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800",
            )}
          >
            {changePositive ? (
              <TrendingUp className="size-2.5 text-emerald-600" />
            ) : (
              <TrendingDown className="size-2.5 text-rose-600" />
            )}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="relative z-10 mt-1 text-[11px] font-medium text-slate-500 truncate">
          {subtitle}
        </p>
      )}

      {/* Footer info pill */}
      {(footerMetric || badgeText) && (
        <div className="relative z-10 mt-2.5 flex items-center justify-between border-t border-slate-100/90 pt-2 text-[10.5px]">
          {footerMetric && (
            <span className="truncate font-medium text-slate-500">
              {footerMetric.label}:{" "}
              <strong className="font-semibold text-slate-800">
                {footerMetric.value}
              </strong>
            </span>
          )}
          {badgeText && (
            <span className="ml-auto inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 text-[9.5px] shrink-0">
              <Sparkles className="size-2.5 text-amber-500" />
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Connection gates. The demo account is fully connected, so the disconnected
 * and permission states are reachable with ?connection= for review and QA.
 */
type ConnectionState = "connected" | "disconnected" | "page-missing" | "expired";

function ConnectionGate({ state }: { state: Exclude<ConnectionState, "connected"> }) {
  const copy = {
    disconnected: {
      title: "Your Meta Ad Account is not connected",
      description:
        "Connect a Meta ad account to create campaigns, collect leads and see reporting. Nothing is charged until you publish a campaign.",
      action: { label: "Connect Meta Account", href: `${ADS_ROOT}/assets#ad-account` },
    },
    "page-missing": {
      title: "Connect a Facebook Page",
      description:
        "Every ad runs under a Page identity. Choose the Page your ads should be published from before creating a campaign.",
      action: { label: "Connect Facebook Page", href: `${ADS_ROOT}/assets#facebook-page` },
    },
    expired: {
      title: "Authorization expired",
      description:
        "Your Meta authorization has expired, so campaigns cannot be edited or published. Reconnect to restore access — your campaigns and leads are unaffected.",
      action: { label: "Reconnect", href: `${ADS_ROOT}/assets` },
    },
  }[state];

  return (
    <div className={cn(card, "mx-auto mt-6 max-w-[620px] p-8 text-center")}>
      <span className="mx-auto flex items-center justify-center gap-2">
        <FaMeta className="size-8 text-[#0866ff]" aria-hidden="true" />
        <FaInstagram className="size-6 text-[#d946ef]" aria-hidden="true" />
      </span>
      <h1 className="mt-3 text-[18px] font-semibold">{copy.title}</h1>
      <p className="mx-auto mt-2 max-w-[440px] text-[12px] leading-relaxed text-[#64748b]">
        {copy.description}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={copy.action.href} className={btnPrimary}>
          {copy.action.label}
        </Link>
        <Link href={`${ADS_ROOT}/help?category=connections`} className={btn}>
          Connection help
        </Link>
      </div>
    </div>
  );
}

function Overview() {
  const params = useSearchParams();
  const connection = (params?.get("connection") ?? "connected") as ConnectionState;

  const totals = useMemo(() => sumMetrics(campaigns), []);
  const active = useMemo(
    () => campaigns.filter((c) => c.status === "active" || c.status === "learning"),
    [],
  );

  /** Placement spend rolled up from every enabled placement on every ad set. */
  const placementRows = useMemo(() => {
    const map = new Map<string, { spend: number; impressions: number; platform: Platform }>();
    for (const set of adSets) {
      for (const p of set.placements) {
        if (!p.enabled || p.spend === 0) continue;
        const prev = map.get(p.placement) ?? { spend: 0, impressions: 0, platform: p.platform };
        map.set(p.placement, {
          spend: prev.spend + p.spend,
          impressions: prev.impressions + Math.round(p.spend / 22),
          platform: p.platform,
        });
      }
    }
    const rows = [...map.entries()]
      .map(([placement, v]) => ({ placement, ...v }))
      .sort((a, b) => b.spend - a.spend);
    const total = rows.reduce((t, r) => t + r.spend, 0) || 1;
    return rows.map((r) => ({ ...r, share: (r.spend / total) * 100 }));
  }, []);

  const topCampaigns = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.metrics.leads > 0)
        .sort((a, b) => cpl(a.metrics) - cpl(b.metrics))
        .slice(0, 5),
    [],
  );

  if (connection !== "connected") {
    return (
      <AdsWorkspace>
        <ConnectionGate state={connection} />
      </AdsWorkspace>
    );
  }

  if (campaigns.length === 0) {
    return (
      <AdsWorkspace>
        <EmptyState
          icon={Megaphone}
          title="Create your first Meta campaign"
          description="Campaigns run across Facebook and Instagram from one place. Set an objective, choose an audience, add your creative and publish."
          action={{ label: "Create Campaign", href: `${ADS_ROOT}/create` }}
          secondary={{ label: "Read the guide", href: `${ADS_ROOT}/help/first-campaign` }}
        />
      </AdsWorkspace>
    );
  }

  return (
    <AdsWorkspace>
      {/* Performance Section Header */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
          </span>
          <h2 className="text-xs font-normal uppercase tracking-wider text-slate-700">
            Real-Time Campaign Performance
          </h2>
          <span className="rounded-sm border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 shadow-2xs">
            Last 30 Days
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Target CPL: <strong className="text-slate-900">&lt; ₹180</strong></span>
          <span className="h-3 w-px bg-slate-300" />
          <span>Daily Budget: <strong className="text-slate-900">₹15.00L</strong></span>
        </div>
      </div>

      {/* Top 4 Master KPI Cards */}
      <section className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MasterKpiCard
          title="Total Ad Spend"
          value={money(totals.spend)}
          subtitle="Ad spend deployed across Meta network"
          change="+14.2%"
          changePositive={true}
          icon={WalletCards}
          gradient="bg-gradient-to-tr from-blue-600 to-indigo-600"
          borderGlow="hover:border-blue-400"
          cornerGlow="bg-blue-500"
          footerMetric={{ label: "Daily Avg", value: "₹95,133/day" }}
          badgeText="Pacing Normal"
          hint="Total spend across all Facebook & Instagram placements"
        />

        <MasterKpiCard
          title="Total Leads Generated"
          value={`${num(totals.leads)} Leads`}
          subtitle="Direct submissions via Instant Forms"
          change="+22.8%"
          changePositive={true}
          icon={UsersRound}
          gradient="bg-gradient-to-tr from-emerald-600 to-teal-500"
          borderGlow="hover:border-emerald-400"
          cornerGlow="bg-emerald-500"
          footerMetric={{ label: "Click-to-Lead", value: orDash(conversionRate(totals), (v) => pct(v, 2)) }}
          badgeText="High Quality"
          hint="Verified CRM leads captured with contact details"
        />

        <MasterKpiCard
          title="Avg. Cost Per Lead (CPL)"
          value={orDash(cpl(totals), moneyPrecise)}
          subtitle="Target threshold: ₹180.00 / lead"
          change="-20.8%"
          changePositive={true}
          icon={Target}
          gradient="bg-gradient-to-tr from-amber-500 to-orange-500"
          borderGlow="hover:border-amber-400"
          cornerGlow="bg-amber-500"
          footerMetric={{ label: "Efficiency", value: "Top 5% Tier" }}
          badgeText="Optimal"
          hint="Total investment divided by total acquired leads"
        />

        <MasterKpiCard
          title="Total Reach & CTR"
          value={num(totals.reach)}
          subtitle={`${num(totals.impressions)} Total Impressions`}
          change={orDash(ctr(totals), (v) => `${pct(v, 2)} CTR`)}
          changePositive={true}
          icon={Radio}
          gradient="bg-gradient-to-tr from-purple-600 to-violet-500"
          borderGlow="hover:border-purple-400"
          cornerGlow="bg-purple-500"
          footerMetric={{ label: "Frequency", value: "1.28x" }}
          badgeText="High Intent"
          hint="Unique individual accounts reached across FB & IG"
        />
      </section>

      {/* Secondary Quick Metrics Strip */}
      <section className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
            <Megaphone className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold text-slate-500">Active Campaigns</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-sm font-normal text-slate-900">{active.length} Delivering</strong>
              <span className="text-[10px] font-semibold text-slate-400">/ {campaigns.length} total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-500/15">
            <MousePointerClick className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold text-slate-500">Total Link Clicks</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-sm font-normal text-slate-900">{num(totals.clicks)}</strong>
              <span className="text-[10px] font-semibold text-sky-700">· {moneyPrecise(cpc(totals))} CPC</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
            <Percent className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold text-slate-500">Conversion Rate</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-sm font-normal text-emerald-800">{orDash(conversionRate(totals), (v) => pct(v, 2))}</strong>
              <span className="text-[10px] font-semibold text-slate-400">Visitor → Lead</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 ring-1 ring-purple-500/15">
            <Layers className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold text-slate-500">Active Ad Sets</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-sm font-normal text-slate-900">{adSets.length} Placements</strong>
              <span className="text-[10px] font-semibold text-purple-700">· 100% Live</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Recent Campaigns Table */}
      <section className={cn(card, "mb-2 overflow-hidden border border-slate-200 shadow-sm")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600 ring-1 ring-blue-500/20">
              <Megaphone className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Campaigns</h2>
              <p className="text-[11px] font-medium text-slate-500">Overview of your latest running and draft campaigns</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${ADS_ROOT}/campaigns`} className={btn}>
              View all campaigns
            </Link>
            <Link href={`${ADS_ROOT}/create`} className={btnPrimary}>
              <Plus className="size-4" />
              Create Campaign
            </Link>
          </div>
        </div>

        <TableShell minWidth={1320}>
          <thead>
            <tr>
              {["Status", "Campaign Name", "Objective", "Platforms", "Delivery", "Budget"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
              {["Spent", "Impressions", "Clicks", "CTR", "Leads", "CPL", "Conv. Rate"].map((h) => (
                <Th key={h} numeric>
                  {h}
                </Th>
              ))}
              <Th>Last Edited</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {campaigns.slice(0, 5).map((c) => (
              <Tr key={c.id}>
                <Td>
                  <StatusChip status={c.status} />
                </Td>
                <Td>
                  <EntityLink
                    href={`${ADS_ROOT}/campaigns/${c.id}`}
                    name={c.name}
                    sub={`Owner · ${c.owner}`}
                  />
                </Td>
                <Td>
                  <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {c.objective}
                  </span>
                </Td>
                <Td>
                  <PlatformIcons platforms={c.platforms} />
                </Td>
                <Td>
                  <DeliveryCell status={c.status} />
                </Td>
                <Td>
                  <span className="font-semibold text-slate-900">{money(c.budget)}</span>
                  <span className="block text-[10px] font-semibold text-slate-500">{c.budgetType}</span>
                </Td>
                <Td numeric>
                  <span className="font-semibold text-slate-900">{money(c.metrics.spend)}</span>
                </Td>
                <Td numeric>{num(c.metrics.impressions)}</Td>
                <Td numeric>{num(c.metrics.clicks)}</Td>
                <Td numeric>
                  <span className="font-semibold text-blue-700">{orDash(ctr(c.metrics), (v) => pct(v, 2))}</span>
                </Td>
                <Td numeric>
                  {c.metrics.leads > 0 ? (
                    <span className="inline-flex items-center rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-800">
                      {num(c.metrics.leads)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">0</span>
                  )}
                </Td>
                <Td numeric>
                  <span className="font-semibold text-slate-900">{orDash(cpl(c.metrics), moneyPrecise)}</span>
                </Td>
                <Td numeric>{orDash(conversionRate(c.metrics), (v) => pct(v, 1))}</Td>
                <Td>
                  <span className="font-semibold text-slate-800">{relative(c.lastEdited)}</span>
                  <span className="block text-[10px] font-medium text-slate-500">by {c.lastEditedBy}</span>
                </Td>
                <Td>
                  <RowMenu
                    label={`Actions for ${c.name}`}
                    groups={[
                      [
                        { label: "View Campaign", href: `${ADS_ROOT}/campaigns/${c.id}` },
                        { label: "View Ad Sets", href: `${ADS_ROOT}/adsets?campaign=${c.id}` },
                        { label: "View Ads", href: `${ADS_ROOT}/ads?campaign=${c.id}` },
                        { label: "View Leads", href: `${ADS_ROOT}/leads?campaign=${c.id}` },
                      ],
                    ]}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </section>

      {/* Grid of 4 Insight Panels */}
      <section className="grid items-stretch gap-2 xl:grid-cols-2 2xl:grid-cols-4">
        <Panel
          className="flex h-full flex-col shadow-sm"
          bodyClassName="flex-1 min-h-0 min-w-0"
          title="Performance Trend"
          icon={<Activity className="size-4" />}
          action={
            <Link href={`${ADS_ROOT}/analytics`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              Analytics →
            </Link>
          }
        >
          <PerformanceTrend />
        </Panel>

        <Panel
          className="flex h-full flex-col shadow-sm"
          bodyClassName="flex-1 min-h-0 min-w-0"
          title="Best Cost per Lead"
          icon={<Trophy className="size-4 text-amber-500" />}
          action={
            <Link href={`${ADS_ROOT}/campaigns`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              View All →
            </Link>
          }
        >
          <ol className="space-y-3">
            {topCampaigns.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-normal shadow-2xs",
                    i === 0
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/20"
                      : i === 1
                        ? "bg-slate-200 text-slate-800"
                        : i === 2
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700",
                  )}
                >
                  {i + 1}
                </span>
                <Link
                  href={`${ADS_ROOT}/campaigns/${c.id}`}
                  className="min-w-0 flex-1 truncate font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                  title={c.name}
                >
                  {c.name}
                </Link>
                <span className="shrink-0 text-right font-semibold text-emerald-800">
                  <span className="inline-block rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-800">
                    {num(c.metrics.leads)} leads
                  </span>
                  <span className="block text-[10.5px] font-semibold text-slate-600 mt-0.5">
                    {moneyPrecise(cpl(c.metrics))} CPL
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          className="flex h-full flex-col shadow-sm"
          bodyClassName="flex-1 min-h-0 min-w-0"
          title="Placement Performance"
          icon={<BarChart3 className="size-4" />}
          action={
            <Link
              href={`${ADS_ROOT}/analytics?breakdown=Placement`}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Breakdown</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          }
        >
          <ul className="space-y-3">
            {placementRows.slice(0, 6).map((row) => (
              <li
                key={row.placement}
                className="grid grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)_36px] items-center gap-2.5 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-slate-800">
                  <PlatformMark platform={row.platform} />
                  <span className="truncate">{row.placement}</span>
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-slate-600">{money(row.spend)}</span>
                <Meter value={row.share} className="min-w-[40px]" />
                <strong className="shrink-0 text-right tabular-nums text-xs font-normal text-slate-900">{pct(row.share, 0)}</strong>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="flex h-full flex-col shadow-sm"
          bodyClassName="flex-1 min-h-0 min-w-0"
          title="Recent Activity"
          icon={<Lightbulb className="size-4 text-amber-500" />}
          action={
            <Link href={`${ADS_ROOT}/activity`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              View All →
            </Link>
          }
        >
          <ol className="h-full divide-y divide-slate-100 overflow-y-auto pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            {activityLog.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2.5 py-2.5 first:pt-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-900">{entry.action}</span>
                  <Link
                    href={entry.entityHref}
                    className="block truncate text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    {entry.entityLabel}
                  </Link>
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9.5px] font-semibold text-slate-600">
                  {relative(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      {/* Quick Navigation Cards */}
      <section className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ad Sets",
            value: adSets.length,
            href: `${ADS_ROOT}/adsets`,
            icon: <FaFacebookF className="size-4 text-blue-600" />,
            badgeBg: "bg-blue-50 border-blue-200",
            glow: "hover:border-blue-400 hover:shadow-blue-500/10",
          },
          {
            label: "Ads",
            value: ads.length,
            href: `${ADS_ROOT}/ads`,
            icon: <FaInstagram className="size-4 text-fuchsia-600" />,
            badgeBg: "bg-fuchsia-50 border-fuchsia-200",
            glow: "hover:border-fuchsia-400 hover:shadow-fuchsia-500/10",
          },
          {
            label: "Instant Forms",
            value: instantForms.length,
            href: `${ADS_ROOT}/forms`,
            icon: <UsersRound className="size-4 text-indigo-600" />,
            badgeBg: "bg-indigo-50 border-indigo-200",
            glow: "hover:border-indigo-400 hover:shadow-indigo-500/10",
          },
          {
            label: "Leads in CRM",
            value: leads.length,
            href: `${ADS_ROOT}/leads`,
            icon: <UsersRound className="size-4 text-emerald-600" />,
            badgeBg: "bg-emerald-50 border-emerald-200",
            glow: "hover:border-emerald-400 hover:shadow-emerald-500/10",
          },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={cn(
              card,
              "group flex items-center gap-3.5 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
              tile.glow,
            )}
          >
            <span className={cn("flex size-10 items-center justify-center rounded-xl border shadow-2xs transition-transform duration-300 group-hover:scale-105", tile.badgeBg)}>
              {tile.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-500 group-hover:text-slate-700">{tile.label}</span>
              <strong className="block text-xl font-normal text-slate-900 leading-tight">{tile.value}</strong>
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-700">
              Open →
            </span>
          </Link>
        ))}
      </section>
    </AdsWorkspace>
  );
}

export default function AdsManagerDashboard() {
  return (
    <Suspense fallback={<SkeletonKpis />}>
      <Overview />
    </Suspense>
  );
}
