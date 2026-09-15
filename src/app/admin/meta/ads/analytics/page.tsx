"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Gauge,
  MousePointerClick,
  Percent,
  Radio,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  adSets,
  ads,
  campaigns,
  getAdSet,
  getCampaign,
  instantForms,
  sumMetrics,
} from "@/features/admin/meta-ads/data";
import {
  compactNum,
  conversionRate,
  cpl,
  ctr,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
} from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  DonutChart,
  FunnelBars,
  PerformanceTrend,
  SERIES,
  SpendBarChart,
} from "@/features/admin/meta-ads/components/charts";
import {
  btn,
  card,
  EmptyState,
  FilterBar,
  FilterSelect,
  KpiCard,
  Meter,
  Panel,
  PlatformMark,
  SearchInput,
  SkeletonKpis,
  TableShell,
  Td,
  Th,
  ToneChip,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Metrics, Platform } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  campaign: "All Campaigns",
  adset: "All Ad Sets",
  objective: "All Objectives",
  platform: "All Platforms",
  placement: "All Placements",
  breakdown: "None",
  range: "Last 30 days",
  compare: "Previous period",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  facebook: "#1877f2",
  instagram: "#d946ef",
  messenger: "#7c3aed",
  audience_network: "#94a3b8",
};

/**
 * Breakdowns Meta only reports when the campaign has enough delivery.
 * Anything without data is hidden rather than shown as an empty table.
 */
const BREAKDOWNS: Record<string, { label: string; share: number }[]> = {
  Platform: [
    { label: "Facebook", share: 54 },
    { label: "Instagram", share: 46 },
  ],
  Placement: [
    { label: "Facebook Feed", share: 34 },
    { label: "Instagram Feed", share: 26 },
    { label: "Instagram Reels", share: 21 },
    { label: "Facebook Reels", share: 11 },
    { label: "Stories", share: 8 },
  ],
  Device: [
    { label: "Android smartphone", share: 68 },
    { label: "iPhone", share: 21 },
    { label: "Desktop", share: 8 },
    { label: "Tablet", share: 3 },
  ],
  Age: [
    { label: "18 - 24", share: 14 },
    { label: "25 - 34", share: 33 },
    { label: "35 - 44", share: 28 },
    { label: "45 - 54", share: 16 },
    { label: "55+", share: 9 },
  ],
  Gender: [
    { label: "Male", share: 58 },
    { label: "Female", share: 41 },
    { label: "Unknown", share: 1 },
  ],
  Location: [
    { label: "Delhi NCR", share: 38 },
    { label: "Uttar Pradesh", share: 24 },
    { label: "Maharashtra", share: 16 },
    { label: "Rajasthan", share: 12 },
    { label: "Other", share: 10 },
  ],
};

function AnalyticsView() {
  const { values, setFilter, setFilters, reset, isFiltered } = useFilters(DEFAULTS, {
    campaign: (v) => getCampaign(v)?.name ?? v,
    adset: (v) => getAdSet(v)?.name ?? v,
  });

  const scopedCampaigns = useMemo(
    () =>
      campaigns.filter((c) => {
        if (
          values.campaign !== DEFAULTS.campaign &&
          c.id !== values.campaign &&
          c.name !== values.campaign
        )
          return false;
        if (values.objective !== DEFAULTS.objective && c.objective !== values.objective)
          return false;
        if (values.platform === "Facebook" && !c.platforms.includes("facebook")) return false;
        if (values.platform === "Instagram" && !c.platforms.includes("instagram")) return false;
        if (values.q && !c.name.toLowerCase().includes(values.q.toLowerCase())) return false;
        return true;
      }),
    [values],
  );

  const totals: Metrics = useMemo(() => sumMetrics(scopedCampaigns), [scopedCampaigns]);

  /** Placement spend rolled up across every ad set in scope. */
  const placementRows = useMemo(() => {
    const scopedIds = new Set(scopedCampaigns.map((c) => c.id));
    const map = new Map<string, { spend: number; leads: number; platform: Platform }>();
    for (const set of adSets) {
      if (!scopedIds.has(set.campaignId)) continue;
      if (
        values.adset !== DEFAULTS.adset &&
        set.id !== values.adset &&
        set.name !== values.adset
      )
        continue;
      for (const p of set.placements) {
        if (!p.enabled) continue;
        const existing = map.get(p.placement) ?? { spend: 0, leads: 0, platform: p.platform };
        map.set(p.placement, {
          spend: existing.spend + p.spend,
          leads: existing.leads + p.leads,
          platform: p.platform,
        });
      }
    }
    return [...map.entries()]
      .map(([placement, v]) => ({ placement, ...v }))
      .filter((row) => row.spend > 0)
      .sort((a, b) => b.spend - a.spend);
  }, [scopedCampaigns, values.adset]);

  const objectiveMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of scopedCampaigns) {
      map.set(c.objective, (map.get(c.objective) ?? 0) + c.metrics.spend);
    }
    const palette = [SERIES.spend, SERIES.leads, SERIES.cpl, SERIES.impressions, SERIES.clicks];
    return [...map.entries()]
      .filter(([, value]) => value > 0)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length]! }));
  }, [scopedCampaigns]);

  const leadQuality = useMemo(
    () =>
      scopedCampaigns
        .filter((c) => c.metrics.leads > 0)
        .map((c) => {
          const forms = instantForms.filter((f) =>
            ads.some((a) => a.campaignId === c.id && a.formId === f.id),
          );
          const submissions = forms.reduce((t, f) => t + f.submissions, 0);
          const qualified = forms.reduce((t, f) => t + f.qualified, 0);
          return {
            campaign: c,
            qualityPct: submissions ? (qualified / submissions) * 100 : 0,
          };
        })
        .sort((a, b) => b.qualityPct - a.qualityPct),
    [scopedCampaigns],
  );

  const formOpens = Math.round(totals.clicks * 0.62);
  const qualified = Math.round(totals.leads * 0.68);
  const converted = Math.round(totals.leads * 0.21);

  const breakdown = values.breakdown !== "None" ? BREAKDOWNS[values.breakdown] : undefined;
  const hasDelivery = totals.impressions > 0;

  return (
    <AdsWorkspace
      actions={
        <button
          type="button"
          onClick={() => toast.success("Report export queued — we will email the file.")}
          className={cn(btn, "h-10")}
        >
          <Download className="size-3.5" />
          Export Report
        </button>
      }
    >
      <div className={cn(card, "mb-3.5 overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600 shadow-2xs ring-1 ring-blue-500/20">
              <BarChart3 className="size-4" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Ads Analytics</h2>
            <span className="rounded-sm bg-blue-100/80 px-2.5 py-0.5 text-[10.5px] font-black text-blue-700 ring-1 ring-blue-500/20">
              {scopedCampaigns.length} in scope
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Compared with <strong className="text-slate-800 font-semibold">{values.compare.toLowerCase()}</strong>
          </span>
        </div>

        <FilterBar>
          <Link
            href={`${ADS_ROOT}/assets#ad-account`}
            className={cn(btn, "min-w-[190px] justify-start gap-2")}
            title="Manage this ad account"
          >
            <span className="text-[9px] font-semibold text-[#64748b]">Ad account</span>
            <span className="truncate">Namo Gange Official</span>
          </Link>
          <FilterSelect
            label="Date range"
            value={values.range}
            onChange={(v) => setFilter("range", v)}
            options={["Last 30 days", "Last 7 days", "Last 90 days", "This month", "Lifetime"]}
            minWidth={150}
          />
          <FilterSelect
            label="Compare period"
            value={values.compare}
            onChange={(v) => setFilter("compare", v)}
            options={["Previous period", "Previous year", "No comparison"]}
            minWidth={170}
          />
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilters({ campaign: v, adset: DEFAULTS.adset })}
            options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
            minWidth={200}
          />
          <FilterSelect
            label="Ad set"
            value={values.adset}
            onChange={(v) => setFilter("adset", v)}
            options={[
              DEFAULTS.adset,
              ...adSets
                .filter(
                  (s) =>
                    values.campaign === DEFAULTS.campaign ||
                    getCampaign(s.campaignId)?.name === values.campaign ||
                    s.campaignId === values.campaign,
                )
                .map((s) => s.name),
            ]}
            minWidth={180}
          />
          <FilterSelect
            label="Objective"
            value={values.objective}
            onChange={(v) => setFilter("objective", v)}
            options={[
              "All Objectives",
              "Awareness",
              "Engagement",
              "Lead Generation",
              "Conversions",
            ]}
            minWidth={160}
          />
          <FilterSelect
            label="Platform"
            value={values.platform}
            onChange={(v) => setFilter("platform", v)}
            options={["All Platforms", "Facebook", "Instagram"]}
          />
          <FilterSelect
            label="Breakdown"
            value={values.breakdown}
            onChange={(v) => setFilter("breakdown", v)}
            options={["None", ...Object.keys(BREAKDOWNS)]}
            minWidth={150}
          />
          <SearchInput
            placeholder="Search campaigns…"
            value={values.q}
            onChange={(v) => setFilter("q", v)}
          />
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>
      </div>

      {scopedCampaigns.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No campaigns match these filters"
          description="Widen the date range or clear a filter to see reporting for this ad account."
          secondary={{ label: "Clear filters", href: `${ADS_ROOT}/analytics` }}
        />
      ) : (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
            <KpiCard label="Spend" value={money(totals.spend)} icon={WalletCards} />
            <KpiCard label="Impressions" value={compactNum(totals.impressions)} icon={BarChart3} sub={num(totals.impressions)} />
            <KpiCard label="Reach" value={compactNum(totals.reach)} icon={Radio} sub={num(totals.reach)} />
            <KpiCard label="Clicks" value={num(totals.clicks)} icon={MousePointerClick} />
            <KpiCard label="CTR" value={orDash(ctr(totals), (v) => pct(v, 2))} icon={TrendingUp} />
            <KpiCard label="Leads" value={num(totals.leads)} icon={UsersRound} tone="green" />
            <KpiCard label="CPL" value={orDash(cpl(totals), moneyPrecise)} icon={Target} />
            <KpiCard
              label="Conversion Rate"
              value={orDash(conversionRate(totals), (v) => pct(v, 1))}
              icon={Percent}
            />
          </section>

          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
            <Panel title="Performance Trend" icon={<Activity className="size-4 text-[#1877f2]" />}>
              {hasDelivery ? (
                <PerformanceTrend height={250} />
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No delivery in this period"
                  description="The campaigns in scope have not spent anything yet."
                  compact
                />
              )}
            </Panel>

            <Panel title="Conversion Funnel" icon={<Target className="size-4 text-[#10b981]" />}>
              <FunnelBars
                steps={[
                  { label: "Impressions", value: totals.impressions },
                  { label: "Clicks", value: totals.clicks },
                  { label: "Form opens", value: formOpens },
                  { label: "Leads", value: totals.leads },
                  { label: "Qualified leads", value: qualified },
                  { label: "Converted", value: converted },
                ]}
              />
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Top Campaigns by Spend" icon={<BarChart3 className="size-4 text-[#1877f2]" />}>
              <SpendBarChart
                data={[...scopedCampaigns]
                  .sort((a, b) => b.metrics.spend - a.metrics.spend)
                  .slice(0, 6)
                  .map((c) => ({ name: c.name, value: c.metrics.spend }))}
                height={Math.max(170, Math.min(scopedCampaigns.length, 6) * 42)}
              />
            </Panel>

            <Panel title="Objective Mix" icon={<Gauge className="size-4 text-[#1877f2]" />}>
              {objectiveMix.length > 0 ? (
                <DonutChart data={objectiveMix} />
              ) : (
                <EmptyState icon={Gauge} title="No spend yet" description="Objective mix appears once campaigns start spending." compact />
              )}
            </Panel>

            <Panel title="Placement Performance" icon={<BarChart3 className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
              {placementRows.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No placement data"
                  description="Placement reporting appears after delivery starts."
                  compact
                />
              ) : (
                <TableShell minWidth={380}>
                  <thead>
                    <tr>
                      <Th>Placement</Th>
                      <Th numeric>Spend</Th>
                      <Th numeric>Leads</Th>
                      <Th numeric>CPL</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {placementRows.map((row) => (
                      <Tr key={row.placement}>
                        <Td>
                          <span className="flex items-center gap-1.5">
                            <PlatformMark platform={row.platform} />
                            {row.placement}
                          </span>
                        </Td>
                        <Td numeric>{money(row.spend)}</Td>
                        <Td numeric>{row.leads > 0 ? num(row.leads) : "—"}</Td>
                        <Td numeric>
                          {row.leads > 0 ? moneyPrecise(row.spend / row.leads) : "—"}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </Panel>
          </div>

          <Panel title="Campaign Performance" icon={<BarChart3 className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
            <TableShell minWidth={1180}>
              <thead>
                <tr>
                  <Th>Campaign</Th>
                  <Th>Objective</Th>
                  {["Spend", "Impressions", "Reach", "Clicks", "CTR", "Leads", "CPL", "Conv. Rate"].map((h) => (
                    <Th key={h} numeric>
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedCampaigns.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`${ADS_ROOT}/campaigns/${c.id}`}
                        className="block max-w-[240px] truncate font-semibold text-[#0671e9] hover:underline"
                        title={c.name}
                      >
                        {c.name}
                      </Link>
                    </Td>
                    <Td>{c.objective}</Td>
                    <Td numeric>{money(c.metrics.spend)}</Td>
                    <Td numeric>{num(c.metrics.impressions)}</Td>
                    <Td numeric>{num(c.metrics.reach)}</Td>
                    <Td numeric>{num(c.metrics.clicks)}</Td>
                    <Td numeric>{orDash(ctr(c.metrics), (v) => pct(v, 2))}</Td>
                    <Td numeric>{num(c.metrics.leads)}</Td>
                    <Td numeric>{orDash(cpl(c.metrics), moneyPrecise)}</Td>
                    <Td numeric>{orDash(conversionRate(c.metrics), (v) => pct(v, 1))}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          </Panel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Lead Quality by Campaign" icon={<UsersRound className="size-4 text-[#10b981]" />}>
              {leadQuality.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No leads in this period"
                  description="Lead quality compares qualified submissions against all submissions."
                  compact
                />
              ) : (
                <ul className="space-y-2.5">
                  {leadQuality.map(({ campaign, qualityPct }) => (
                    <li key={campaign.id} className="grid grid-cols-[1fr_90px_44px] items-center gap-2 text-[10px]">
                      <Link
                        href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                        className="truncate font-medium text-[#0671e9] hover:underline"
                        title={campaign.name}
                      >
                        {campaign.name}
                      </Link>
                      <Meter
                        value={qualityPct}
                        tone={qualityPct >= 60 ? "green" : qualityPct >= 40 ? "amber" : "red"}
                      />
                      <strong className="text-right tabular-nums">
                        {qualityPct > 0 ? pct(qualityPct, 0) : "—"}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title={breakdown ? `Breakdown — ${values.breakdown}` : "Breakdowns"}
              icon={<Gauge className="size-4 text-[#1877f2]" />}
            >
              {!breakdown ? (
                <div>
                  <p className="text-[11px] leading-relaxed text-[#64748b]">
                    Pick a breakdown above to split spend, leads and CPL by platform, placement,
                    device, age, gender or location. Only breakdowns Meta has data for are shown.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {Object.keys(BREAKDOWNS).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilter("breakdown", key)}
                        className={btn}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              ) : !hasDelivery ? (
                <EmptyState
                  icon={Gauge}
                  title="Not enough data for this breakdown"
                  description="Meta reports breakdowns once a campaign has delivered enough impressions."
                  compact
                />
              ) : (
                <ul className="space-y-2.5">
                  {breakdown.map((row) => {
                    const spend = Math.round((totals.spend * row.share) / 100);
                    const leadShare = Math.round((totals.leads * row.share) / 100);
                    return (
                      <li key={row.label} className="grid grid-cols-[1fr_84px_70px_44px] items-center gap-2 text-[10px]">
                        <span className="truncate font-medium">{row.label}</span>
                        <span className="tabular-nums text-[#475569]">{money(spend)}</span>
                        <span className="tabular-nums text-[#475569]">
                          {leadShare > 0 ? `${num(leadShare)} leads` : "—"}
                        </span>
                        <span className="flex justify-end">
                          <ToneChip tone="slate">{row.share}%</ToneChip>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <p className="text-[10px] text-[#94a3b8]">
            Placement colours follow the platform palette:{" "}
            {(Object.keys(PLATFORM_COLOR) as Platform[]).slice(0, 2).map((p) => (
              <span key={p} className="mr-2 inline-flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-sm align-middle"
                  style={{ background: PLATFORM_COLOR[p] }}
                  aria-hidden="true"
                />
                {p === "facebook" ? "Facebook" : "Instagram"}
              </span>
            ))}
          </p>
        </div>
      )}
    </AdsWorkspace>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<SkeletonKpis />}>
      <AnalyticsView />
    </Suspense>
  );
}
