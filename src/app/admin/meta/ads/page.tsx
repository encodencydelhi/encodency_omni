"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import {
  Activity,
  BarChart3,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Plus,
  Radio,
  Target,
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
import { PerformanceTrend } from "@/features/admin/meta-ads/components/charts";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  KpiCard,
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
      <h1 className="mt-3 text-[18px] font-bold">{copy.title}</h1>
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
  const active = campaigns.filter((c) => c.status === "active" || c.status === "learning");

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
      {/* Issues notice removed from overview */}

      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
        <KpiCard label="Total Campaigns" value={campaigns.length} icon={Megaphone} sub={`${active.length} delivering`} />
        <KpiCard label="Active Campaigns" value={active.length} icon={Activity} tone="green" />
        <KpiCard label="Total Spend" value={money(totals.spend)} icon={WalletCards} sub="Last 30 days" />
        <KpiCard label="Total Leads" value={num(totals.leads)} icon={UsersRound} tone="green" />
        <KpiCard label="Avg. Cost per Lead" value={orDash(cpl(totals), moneyPrecise)} icon={Target} hint="Total spend divided by total leads." />
        <KpiCard label="Total Reach" value={num(totals.reach)} icon={Radio} />
        <KpiCard label="Impressions" value={num(totals.impressions)} icon={BarChart3} />
        <KpiCard label="CTR" value={orDash(ctr(totals), (v) => pct(v, 2))} icon={MousePointerClick} />
      </section>

      <section className={cn(card, "mb-3 overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-[#1877f2]" aria-hidden="true" />
            <h2 className="text-sm font-bold">Recent Campaigns</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link href={`${ADS_ROOT}/campaigns`} className={btn}>
              View all campaigns
            </Link>
            <Link href={`${ADS_ROOT}/create`} className={btnPrimary}>
              <Plus className="size-3.5" />
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
                <Td>{c.objective}</Td>
                <Td>
                  <PlatformIcons platforms={c.platforms} />
                </Td>
                <Td>
                  <DeliveryCell status={c.status} />
                </Td>
                <Td>
                  {money(c.budget)}
                  <span className="block text-[9px] text-[#64748b]">{c.budgetType}</span>
                </Td>
                <Td numeric>{money(c.metrics.spend)}</Td>
                <Td numeric>{num(c.metrics.impressions)}</Td>
                <Td numeric>{num(c.metrics.clicks)}</Td>
                <Td numeric>{orDash(ctr(c.metrics), (v) => pct(v, 2))}</Td>
                <Td numeric>{num(c.metrics.leads)}</Td>
                <Td numeric>{orDash(cpl(c.metrics), moneyPrecise)}</Td>
                <Td numeric>{orDash(conversionRate(c.metrics), (v) => pct(v, 1))}</Td>
                <Td>
                  {relative(c.lastEdited)}
                  <span className="block text-[9px] text-[#64748b]">by {c.lastEditedBy}</span>
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

      <section className="grid items-stretch gap-3 xl:grid-cols-2 2xl:grid-cols-4">
        <Panel
          className="flex h-full flex-col"
          bodyClassName="flex-1"
          title="Performance Trend"
          icon={<Activity className="size-4 text-[#1877f2]" />}
          action={
            <Link href={`${ADS_ROOT}/analytics`} className="text-[10px] font-semibold text-[#1877f2] hover:underline">
              Open Analytics
            </Link>
          }
        >
          <PerformanceTrend height={186} />
        </Panel>

        <Panel
          className="flex h-full flex-col"
          bodyClassName="flex-1"
          title="Best Cost per Lead"
          icon={<Trophy className="size-4 text-[#f59e0b]" />}
          action={
            <Link href={`${ADS_ROOT}/campaigns`} className="text-[10px] font-semibold text-[#1877f2] hover:underline">
              View All
            </Link>
          }
        >
          <ol className="space-y-2.5">
            {topCampaigns.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2.5 text-[10px]">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full font-bold",
                    i === 0 ? "bg-[#1877f2] text-white" : "bg-[#e8eef5] text-[#475569]",
                  )}
                >
                  {i + 1}
                </span>
                <Link
                  href={`${ADS_ROOT}/campaigns/${c.id}`}
                  className="min-w-0 flex-1 truncate font-medium text-[#0671e9] hover:underline"
                  title={c.name}
                >
                  {c.name}
                </Link>
                <span className="shrink-0 text-right font-bold text-[#087a50]">
                  {num(c.metrics.leads)} leads
                  <span className="block text-[9px] font-medium text-[#475569]">
                    {moneyPrecise(cpl(c.metrics))} CPL
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          className="flex h-full flex-col"
          bodyClassName="flex-1"
          title="Placement Performance"
          icon={<BarChart3 className="size-4 text-[#1877f2]" />}
          action={
            <Link
              href={`${ADS_ROOT}/analytics?breakdown=Placement`}
              className="text-[10px] font-semibold text-[#1877f2] hover:underline"
            >
              Breakdown
            </Link>
          }
        >
          <ul className="space-y-2.5">
            {placementRows.slice(0, 6).map((row) => (
              <li
                key={row.placement}
                className="grid grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)_32px] items-center gap-2 text-[9px]"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <PlatformMark platform={row.platform} />
                  <span className="truncate">{row.placement}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[#475569]">{money(row.spend)}</span>
                <Meter value={row.share} className="min-w-[40px]" />
                <strong className="shrink-0 text-right tabular-nums">{pct(row.share, 0)}</strong>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="flex h-full flex-col"
          bodyClassName="flex-1"
          title="Recent Activity"
          icon={<Lightbulb className="size-4 text-[#f5b000]" />}
          action={
            <Link href={`${ADS_ROOT}/activity`} className="text-[10px] font-semibold text-[#1877f2] hover:underline">
              View All
            </Link>
          }
        >
          <ol className="max-h-[186px] divide-y divide-[#eef2f7] overflow-y-auto pr-3 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            {activityLog.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 py-2.5 first:pt-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-bold">{entry.action}</span>
                  <Link
                    href={entry.entityHref}
                    className="block truncate text-[9px] text-[#0671e9] hover:underline"
                  >
                    {entry.entityLabel}
                  </Link>
                </span>
                <span className="shrink-0 whitespace-nowrap text-[9px] text-[#64748b]">
                  {relative(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ad Sets",
            value: adSets.length,
            href: `${ADS_ROOT}/adsets`,
            icon: <FaFacebookF className="size-3.5 text-[#1877f2]" />,
          },
          {
            label: "Ads",
            value: ads.length,
            href: `${ADS_ROOT}/ads`,
            icon: <FaInstagram className="size-3.5 text-[#d946ef]" />,
          },
          {
            label: "Instant Forms",
            value: instantForms.length,
            href: `${ADS_ROOT}/forms`,
            icon: <UsersRound className="size-3.5 text-[#1877f2]" />,
          },
          {
            label: "Leads in CRM",
            value: leads.length,
            href: `${ADS_ROOT}/leads`,
            icon: <UsersRound className="size-3.5 text-[#10b981]" />,
          },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={cn(card, "flex items-center gap-3 p-3 transition hover:border-[#bcd9ff]")}
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-[#f1f5f9]">
              {tile.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[#64748b]">{tile.label}</span>
              <strong className="block text-[16px] leading-none">{tile.value}</strong>
            </span>
            <span className="text-[10px] font-bold text-[#1877f2]">Open →</span>
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
