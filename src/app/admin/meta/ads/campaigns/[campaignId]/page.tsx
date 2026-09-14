"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Copy,
  Edit3,
  Flame,
  Grid2X2,
  MousePointerClick,
  Pause,
  Plus,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  activityLog,
  adSetsOfCampaign,
  adsOfCampaign,
  getCampaign,
  getCreative,
  issues,
  leadsOf,
} from "@/features/admin/meta-ads/data";
import {
  conversionRate,
  cpl,
  ctr,
  date,
  dateTime,
  frequency,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
  relative,
} from "@/features/admin/meta-ads/format";
import {
  FunnelBars,
  PerformanceTrend,
  SpendBarChart,
} from "@/features/admin/meta-ads/components/charts";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  Field,
  KpiCard,
  LinkTabs,
  Meter,
  NotFoundState,
  Panel,
  PlatformIcons,
  PlatformMark,
  RowMenu,
  SkeletonKpis,
  StateNotice,
  StatusChip,
  TableShell,
  Tag,
  Td,
  Th,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
  DetailBar,
} from "@/features/admin/meta-ads/components/workspace";
import type { Platform } from "@/features/admin/meta-ads/types";

const TABS = ["overview", "adsets", "ads", "leads", "performance", "activity"] as const;
type Tab = (typeof TABS)[number];

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const params = useSearchParams();
  const requested = params?.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "overview";

  const campaign = getCampaign(campaignId);

  if (!campaign) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Campaign not found"
          description="This campaign may have been deleted, or it belongs to a different ad account. Check the Campaigns list for the current version."
          backHref={`${ADS_ROOT}/campaigns`}
          backLabel="Back to Campaigns"
          secondary={{ label: "View archived", href: `${ADS_ROOT}/campaigns?status=Archived` }}
        />
      </AdsWorkspace>
    );
  }

  const sets = adSetsOfCampaign(campaign.id);
  const campaignAds = adsOfCampaign(campaign.id);
  const campaignLeads = leadsOf({ campaignId: campaign.id });
  const openIssues = issues.filter(
    (i) => !i.resolved && i.campaign === campaign.name,
  );

  const base = `${ADS_ROOT}/campaigns/${campaign.id}`;
  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "adsets", label: "Ad Sets", href: `${base}?tab=adsets`, count: sets.length },
    { id: "ads", label: "Ads", href: `${base}?tab=ads`, count: campaignAds.length },
    { id: "leads", label: "Leads", href: `${base}?tab=leads`, count: campaignLeads.length },
    { id: "performance", label: "Performance", href: `${base}?tab=performance` },
    { id: "activity", label: "Activity", href: `${base}?tab=activity` },
  ];

  const pausable = ["active", "learning", "scheduled"].includes(campaign.status);

  return (
    <AdsWorkspace
      actions={
        <Link href={`${ADS_ROOT}/create?campaign=${campaign.id}`} className={cn(btnPrimary, "h-10")}>
          <Edit3 className="size-3.5" />
          Edit Campaign
        </Link>
      }
    >
      <DetailBar>
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[#64748b]">
          <Link href={ADS_ROOT} className="font-medium hover:text-[#1877f2] hover:underline">
            Meta Ads Manager
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`${ADS_ROOT}/campaigns`} className="font-medium hover:text-[#1877f2] hover:underline">
            Campaigns
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#14213d]">{campaign.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[280px] flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-800 leading-tight">
              {campaign.name}
              <StatusChip status={campaign.status} />
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[#64748b]">
              <span>
                <dt className="inline font-semibold text-[#475569]">Objective:</dt>{" "}
                <dd className="inline">{campaign.objective}</dd>
              </span>
              <span>
                <dt className="inline font-semibold text-[#475569]">Budget:</dt>{" "}
                <dd className="inline">
                  {money(campaign.budget)} {campaign.budgetType.toLowerCase()}
                </dd>
              </span>
              <span>
                <dt className="inline font-semibold text-[#475569]">Dates:</dt>{" "}
                <dd className="inline">
                  {date(campaign.start)} — {campaign.end ? date(campaign.end) : "Ongoing"}
                </dd>
              </span>
              <span>
                <dt className="inline font-semibold text-[#475569]">Owner:</dt>{" "}
                <dd className="inline">{campaign.owner}</dd>
              </span>
              <span className="flex items-center gap-1.5">
                <dt className="font-semibold text-[#475569]">Platforms:</dt>
                <dd>
                  <PlatformIcons platforms={campaign.platforms} />
                </dd>
              </span>
              <span>
                <dt className="inline font-semibold text-[#475569]">Created:</dt>{" "}
                <dd className="inline">{date(campaign.created)}</dd>
              </span>
              <span>
                <dt className="inline font-semibold text-[#475569]">Last edited:</dt>{" "}
                <dd className="inline">
                  {relative(campaign.lastEdited)} by {campaign.lastEditedBy}
                </dd>
              </span>
            </dl>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Link href={`${ADS_ROOT}/create?campaign=${campaign.id}`} className={btn}>
              <Edit3 className="size-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() =>
                toast.success(`${pausable ? "Paused" : "Resumed"} “${campaign.name}”`)
              }
              className={btn}
            >
              <Pause className="size-3.5" />
              {pausable ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => toast.success(`Duplicating “${campaign.name}”…`)}
              className={btn}
            >
              <Copy className="size-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => toast.success(`Archived “${campaign.name}”`)}
              className={btn}
            >
              <Archive className="size-3.5" />
              Archive
            </button>
            <RowMenu
              label="More campaign actions"
              groups={[
                [
                  { label: "View Analytics", href: `${ADS_ROOT}/analytics?campaign=${campaign.id}` },
                  { label: "View Leads", href: `${ADS_ROOT}/leads?campaign=${campaign.id}` },
                  { label: "Add Ad Set", href: `${ADS_ROOT}/create?campaign=${campaign.id}&step=adset` },
                ],
                [
                  { label: "Campaign help", href: `${ADS_ROOT}/help?category=campaigns` },
                  {
                    label: "Export report",
                    onSelect: () => toast.success("Campaign report export queued."),
                  },
                ],
              ]}
            />
          </div>
        </div>
      </DetailBar>

      <LinkTabs tabs={tabs} current={tab} className="mb-4 bg-white/60 backdrop-blur-md px-2 rounded-xl border border-slate-200/60 shadow-sm" />

      {tab === "overview" && (
        <OverviewTab campaign={campaign} sets={sets} campaignAds={campaignAds} openIssues={openIssues} />
      )}
      {tab === "adsets" && <AdSetsTab campaignId={campaign.id} sets={sets} />}
      {tab === "ads" && <AdsTab campaignAds={campaignAds} campaignId={campaign.id} />}
      {tab === "leads" && <LeadsTab campaignId={campaign.id} campaignName={campaign.name} />}
      {tab === "performance" && <PerformanceTab campaign={campaign} sets={sets} />}
      {tab === "activity" && <ActivityTab campaignName={campaign.name} />}
    </AdsWorkspace>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({
  campaign,
  sets,
  campaignAds,
  openIssues,
}: {
  campaign: NonNullable<ReturnType<typeof getCampaign>>;
  sets: ReturnType<typeof adSetsOfCampaign>;
  campaignAds: ReturnType<typeof adsOfCampaign>;
  openIssues: typeof issues;
}) {
  const m = campaign.metrics;
  const hasData = m.impressions > 0;

  const placements = sets
    .flatMap((s) => s.placements)
    .reduce<Record<string, { spend: number; leads: number; platform: Platform }>>(
      (acc, p) => {
        if (!p.enabled) return acc;
        const existing = acc[p.placement] ?? { spend: 0, leads: 0, platform: p.platform };
        acc[p.placement] = {
          spend: existing.spend + p.spend,
          leads: existing.leads + p.leads,
          platform: p.platform,
        };
        return acc;
      },
      {},
    );
  const placementRows = Object.entries(placements).sort((a, b) => b[1].spend - a[1].spend);
  const placementTotal = placementRows.reduce((t, [, v]) => t + v.spend, 0) || 1;

  const spendPct = campaign.spendCap ? (m.spend / campaign.spendCap) * 100 : 0;
  const projected = campaign.budgetType === "Daily" ? campaign.budget * 30 : campaign.budget;

  const pendingReview = campaignAds.filter((a) => a.status === "in_review").length;
  const rejected = campaignAds.filter((a) => a.status === "rejected").length;
  const activeAds = campaignAds.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-3">
      {openIssues.length > 0 && (
        <StateNotice
          tone={openIssues.some((i) => i.severity === "blocking") ? "red" : "amber"}
          icon={AlertTriangle}
          title={`${openIssues.length} issue${openIssues.length === 1 ? "" : "s"} need attention on this campaign`}
          description={openIssues[0]!.detail}
          action={{ label: openIssues[0]!.actionLabel, href: openIssues[0]!.actionHref }}
          secondary={{ label: "View all issues", href: `${ADS_ROOT}/issues` }}
        />
      )}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
        <KpiCard label="Amount Spent" value={money(m.spend)} icon={WalletCards} sub={`of ${money(campaign.spendCap)} cap`} />
        <KpiCard label="Impressions" value={num(m.impressions)} icon={BarChart3} sub={hasData ? `Frequency ${frequency(m).toFixed(2)}` : "No delivery yet"} />
        <KpiCard label="Reach" value={num(m.reach)} icon={Radio} sub="Unique accounts" />
        <KpiCard label="Clicks" value={num(m.clicks)} icon={MousePointerClick} sub="All clicks" />
        <KpiCard label="CTR" value={orDash(ctr(m), (v) => pct(v, 2))} icon={TrendingUp} hint="Clicks divided by impressions." />
        <KpiCard label="Leads" value={num(m.leads)} icon={UsersRound} tone="green" />
        <KpiCard label="Cost per Lead" value={orDash(cpl(m), moneyPrecise)} icon={Target} hint="Amount spent divided by leads." />
        <KpiCard label="Conversion Rate" value={orDash(conversionRate(m), (v) => pct(v, 1))} icon={Activity} hint="Leads divided by clicks." />
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Performance Trend"
          icon={<Activity className="size-4 text-[#1877f2]" />}
          action={
            <Link href={`${ADS_ROOT}/analytics?campaign=${campaign.id}`} className="text-[10px] font-semibold text-[#1877f2] hover:underline">
              Open in Analytics
            </Link>
          }
        >
          {hasData ? (
            <PerformanceTrend height={210} />
          ) : (
            <EmptyState
              icon={Activity}
              title="No delivery data yet"
              description="Charts appear once this campaign starts spending. It is currently pending Meta review."
              compact
            />
          )}
        </Panel>

        <Panel title="Campaign Configuration" icon={<Grid2X2 className="size-4 text-[#1877f2]" />}>
          <dl>
            <Field label="Objective" value={campaign.objective} />
            <Field label="Buying Type" value={campaign.buyingType} />
            <Field label="Budget Type" value={campaign.budgetType} />
            <Field label="Budget" value={`${money(campaign.budget)} ${campaign.budgetType.toLowerCase()}`} />
            <Field label="Bid Strategy" value={campaign.bidStrategy} />
            <Field label="Special Ad Category" value={campaign.specialCategory} />
            <Field label="Optimisation" value={campaign.optimization} />
            <Field label="Spend Cap" value={money(campaign.spendCap)} />
          </dl>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Delivery Health" icon={<Activity className="size-4 text-[#10b981]" />}>
          <dl>
            <Field label="Ad Sets" value={<Link href={`${ADS_ROOT}/adsets?campaign=${campaign.id}`} className="text-[#0671e9] hover:underline">{sets.length}</Link>} />
            <Field label="Active Ads" value={activeAds} />
            <Field label="Pending Review" value={pendingReview} />
            <Field
              label="Rejected Ads"
              value={
                rejected > 0 ? (
                  <Link href={`${ADS_ROOT}/issues?tab=policy`} className="text-[#b42318] hover:underline">
                    {rejected}
                  </Link>
                ) : (
                  0
                )
              }
            />
            <Field label="Warnings" value={openIssues.filter((i) => i.severity === "warning").length} />
          </dl>
        </Panel>

        <Panel title="Budget Utilisation" icon={<WalletCards className="size-4 text-[#1877f2]" />}>
          <div className="mb-3">
            <div className="flex items-baseline justify-between text-[10px]">
              <span className="text-[#64748b]">Spent</span>
              <strong>{money(m.spend)}</strong>
            </div>
            <Meter value={spendPct} tone={spendPct > 85 ? "amber" : "blue"} className="mt-1.5" />
            <p className="mt-1 text-[9px] text-[#94a3b8]">
              {pct(spendPct, 1)} of the {money(campaign.spendCap)} spend cap
            </p>
          </div>
          <dl>
            <Field label="Remaining" value={money(Math.max(campaign.spendCap - m.spend, 0))} />
            <Field label="Projected 30-day spend" value={money(projected)} />
            <Field label="Pacing" value={spendPct > 85 ? "Ahead of schedule" : "On track"} />
          </dl>
        </Panel>

        <Panel title="Placement Performance" icon={<BarChart3 className="size-4 text-[#1877f2]" />} className="lg:col-span-2">
          {placementRows.length === 0 ? (
            <EmptyState icon={BarChart3} title="No placements enabled" description="Enable at least one Facebook or Instagram placement on an ad set." compact />
          ) : (
            <ul className="space-y-2.5">
              {placementRows.map(([name, value]) => (
                <li key={name} className="grid grid-cols-[1fr_80px_1fr_44px] items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1.5 truncate">
                    <PlatformMark platform={value.platform} />
                    {name}
                  </span>
                  <span className="tabular-nums text-[#475569]">{money(value.spend)}</span>
                  <Meter value={(value.spend / placementTotal) * 100} />
                  <strong className="text-right tabular-nums">
                    {pct((value.spend / placementTotal) * 100, 0)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="AI Recommendations & Growth Actions"
        icon={<Sparkles className="size-4 text-amber-500" />}
        action={
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-extrabold text-amber-800 shadow-2xs">
            <Sparkles className="size-3 text-amber-600" />
            Meta AI Optimized
          </span>
        }
      >
        <ul className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {buildRecommendations(campaign, sets, campaignAds).map((rec) => {
            const Icon = rec.icon;
            return (
              <li
                key={rec.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
              >
                {/* Top accent gradient bar */}
                <div
                  className={cn(
                    "absolute left-0 top-0 h-1 w-full bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    rec.gradient,
                  )}
                />

                {/* Subtle corner aura */}
                <div
                  className={cn(
                    "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-30",
                    rec.cornerColor,
                  )}
                />

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold shadow-2xs",
                        rec.tagStyle,
                      )}
                    >
                      {rec.tag}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {rec.impact}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105",
                        rec.gradient,
                      )}
                    >
                      <Icon className="size-4.5 text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {rec.title}
                      </h3>
                      <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">
                        {rec.body}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <Link
                    href={rec.href}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-600 shadow-2xs transition-all duration-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <span>{rec.action}</span>
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <span className="text-[10.5px] font-bold text-emerald-700">
                    {rec.metricHighlight}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function buildRecommendations(
  campaign: NonNullable<ReturnType<typeof getCampaign>>,
  sets: ReturnType<typeof adSetsOfCampaign>,
  campaignAds: ReturnType<typeof adsOfCampaign>,
) {
  const recs: {
    title: string;
    body: string;
    action: string;
    href: string;
    tag: string;
    impact: string;
    icon: typeof UsersRound;
    gradient: string;
    cornerColor: string;
    tagStyle: string;
    metricHighlight: string;
  }[] = [];

  const narrow = sets.find((s) => s.audienceSize[1] < 150000);
  if (narrow) {
    recs.push({
      title: "Widen a narrow audience",
      body: `${narrow.name} reaches at most ${num(narrow.audienceSize[1])} people. Broader ad sets exit the learning phase faster.`,
      action: "Edit ad set",
      href: `${ADS_ROOT}/adsets/${narrow.id}`,
      tag: "Audience Tuning",
      impact: "High Impact",
      icon: UsersRound,
      gradient: "bg-gradient-to-tr from-blue-600 to-indigo-600",
      cornerColor: "bg-blue-500",
      tagStyle: "bg-blue-50 text-blue-800 border border-blue-200",
      metricHighlight: "Est. +24% Speed",
    });
  }

  const weak = campaignAds.find((a) => a.qualityRanking === "Below average");
  if (weak) {
    recs.push({
      title: "Refresh an underperforming creative",
      body: `${weak.name} ranks below average on quality. Try a new hook in the first three seconds.`,
      action: "Open ad",
      href: `${ADS_ROOT}/ads/${weak.id}`,
      tag: "Creative Fatigue",
      impact: "Quality Boost",
      icon: Flame,
      gradient: "bg-gradient-to-tr from-rose-500 to-amber-500",
      cornerColor: "bg-rose-500",
      tagStyle: "bg-rose-50 text-rose-800 border border-rose-200",
      metricHighlight: "Est. +15% CTR",
    });
  }

  if (sets.length === 1) {
    recs.push({
      title: "Test a second audience",
      body: "Running two ad sets lets Meta shift budget toward whichever audience converts cheaper.",
      action: "Add ad set",
      href: `${ADS_ROOT}/create?campaign=${campaign.id}&step=adset`,
      tag: "A/B Testing",
      impact: "Cost Reduction",
      icon: Target,
      gradient: "bg-gradient-to-tr from-emerald-600 to-teal-500",
      cornerColor: "bg-emerald-500",
      tagStyle: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      metricHighlight: "Est. -18% CPL",
    });
  }

  recs.push({
    title: "Build a lookalike from your leads",
    body: "Your best leads make a strong lookalike source. A 1% lookalike usually beats interest targeting on CPL.",
    action: "Create audience",
    href: `${ADS_ROOT}/audiences?tab=lookalike`,
    tag: "AI Lookalike",
    impact: "High ROI",
    icon: Sparkles,
    gradient: "bg-gradient-to-tr from-purple-600 to-pink-500",
    cornerColor: "bg-purple-500",
    tagStyle: "bg-purple-50 text-purple-800 border border-purple-200",
    metricHighlight: "Est. 3.2x ROAS",
  });

  return recs.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Ad sets tab                                                         */
/* ------------------------------------------------------------------ */

function AdSetsTab({
  campaignId,
  sets,
}: {
  campaignId: string;
  sets: ReturnType<typeof adSetsOfCampaign>;
}) {
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 bg-gradient-to-r from-white/40 to-transparent px-5 py-3.5">
        <h2 className="text-[13px] font-medium text-slate-800">Ad Sets ({sets.length})</h2>
        <div className="flex gap-1.5">
          <Link href={`${ADS_ROOT}/adsets?campaign=${campaignId}`} className={btn}>
            Open in Ad Sets
          </Link>
          <Link href={`${ADS_ROOT}/create?campaign=${campaignId}&step=adset`} className={btnPrimary}>
            <Plus className="size-3.5" />
            Add Ad Set
          </Link>
        </div>
      </div>

      {sets.length === 0 ? (
        <EmptyState
          icon={Grid2X2}
          title="Create your first ad set"
          description="Ad sets decide who sees your ads, where they appear and when they run."
          action={{ label: "Create Ad Set", href: `${ADS_ROOT}/create?campaign=${campaignId}&step=adset` }}
        />
      ) : (
        <TableShell minWidth={1160}>
          <thead>
            <tr>
              {["Ad Set", "Status", "Audience", "Placements", "Schedule", "Budget"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
              {["Spend", "Leads", "CPL"].map((h) => (
                <Th key={h} numeric>
                  {h}
                </Th>
              ))}
              <Th>Delivery</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <EntityLink
                    href={`${ADS_ROOT}/adsets/${s.id}`}
                    name={s.name}
                    sub={s.conversionLocation}
                  />
                </Td>
                <Td>
                  <StatusChip status={s.status} />
                </Td>
                <Td>
                  <span className="block max-w-[180px] truncate">{s.audienceName}</span>
                  <span className="block text-[9px] text-[#64748b]">
                    {num(s.audienceSize[0])}–{num(s.audienceSize[1])} people
                  </span>
                </Td>
                <Td>
                  {s.placements.filter((p) => p.enabled).length} placements
                  <span className="block text-[9px] text-[#64748b]">
                    {s.placements.filter((p) => p.enabled).slice(0, 2).map((p) => p.placement).join(", ")}
                  </span>
                </Td>
                <Td>{s.schedule}</Td>
                <Td>
                  {money(s.budget)}
                  <span className="block text-[9px] text-[#64748b]">{s.budgetSource}</span>
                </Td>
                <Td numeric>{money(s.metrics.spend)}</Td>
                <Td numeric>{num(s.metrics.leads)}</Td>
                <Td numeric>{orDash(cpl(s.metrics), moneyPrecise)}</Td>
                <Td>
                  <DeliveryCell status={s.status} />
                </Td>
                <Td>
                  <RowMenu
                    label={`Actions for ${s.name}`}
                    groups={[
                      [
                        { label: "View Ad Set", href: `${ADS_ROOT}/adsets/${s.id}` },
                        { label: "View Ads", href: `${ADS_ROOT}/ads?adset=${s.id}` },
                        { label: "View Leads", href: `${ADS_ROOT}/leads?adset=${s.id}` },
                      ],
                    ]}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ads tab                                                             */
/* ------------------------------------------------------------------ */

function AdsTab({
  campaignAds,
  campaignId,
}: {
  campaignAds: ReturnType<typeof adsOfCampaign>;
  campaignId: string;
}) {
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 bg-gradient-to-r from-white/40 to-transparent px-5 py-3.5">
        <h2 className="text-[13px] font-medium text-slate-800">Ads ({campaignAds.length})</h2>
        <div className="flex gap-1.5">
          <Link href={`${ADS_ROOT}/ads?campaign=${campaignId}`} className={btn}>
            Open in Ads
          </Link>
          <Link href={`${ADS_ROOT}/create?campaign=${campaignId}&step=ad`} className={btnPrimary}>
            <Plus className="size-3.5" />
            Add Ad
          </Link>
        </div>
      </div>

      {campaignAds.length === 0 ? (
        <EmptyState
          icon={Grid2X2}
          title="Create your first ad"
          description="Ads carry the creative, copy and destination that people actually see."
          action={{ label: "Create Ad", href: `${ADS_ROOT}/create?campaign=${campaignId}&step=ad` }}
        />
      ) : (
        <TableShell minWidth={1180}>
          <thead>
            <tr>
              <Th className="w-14">Creative</Th>
              {["Ad Name", "Ad Set", "Format", "Platforms", "Delivery"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
              {["Spend", "Impressions", "CTR", "Leads", "CPL"].map((h) => (
                <Th key={h} numeric>
                  {h}
                </Th>
              ))}
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {campaignAds.map((a) => {
              const creative = getCreative(a.creativeId);
              return (
                <Tr key={a.id}>
                  <Td>
                    <span className="block size-10 overflow-hidden rounded-lg border border-slate-200/60 bg-white/60 shadow-sm">
                      {creative && (
                        <Image
                          src={creative.src}
                          alt=""
                          width={36}
                          height={36}
                          className="size-full object-cover"
                        />
                      )}
                    </span>
                  </Td>
                  <Td>
                    <EntityLink href={`${ADS_ROOT}/ads/${a.id}`} name={a.name} sub={a.headline} />
                  </Td>
                  <Td>
                    <Link href={`${ADS_ROOT}/adsets/${a.adSetId}`} className="text-[#0671e9] hover:underline">
                      {a.adSetId}
                    </Link>
                  </Td>
                  <Td>{a.format}</Td>
                  <Td>
                    <PlatformIcons platforms={["facebook", "instagram"]} />
                  </Td>
                  <Td>
                    <DeliveryCell status={a.status} />
                  </Td>
                  <Td numeric>{money(a.metrics.spend)}</Td>
                  <Td numeric>{num(a.metrics.impressions)}</Td>
                  <Td numeric>{orDash(ctr(a.metrics), (v) => pct(v, 2))}</Td>
                  <Td numeric>{num(a.metrics.leads)}</Td>
                  <Td numeric>{orDash(cpl(a.metrics), moneyPrecise)}</Td>
                  <Td>
                    <RowMenu
                      label={`Actions for ${a.name}`}
                      groups={[
                        [
                          { label: "View Ad", href: `${ADS_ROOT}/ads/${a.id}` },
                          ...(a.formId ? [{ label: "View Form", href: `${ADS_ROOT}/forms/${a.formId}` }] : []),
                          { label: "View Leads", href: `${ADS_ROOT}/leads?ad=${a.id}` },
                        ],
                      ]}
                    />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Leads tab                                                           */
/* ------------------------------------------------------------------ */

function LeadsTab({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const rows = leadsOf({ campaignId });
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 bg-gradient-to-r from-white/40 to-transparent px-5 py-3.5">
        <h2 className="text-[13px] font-medium text-slate-800">Leads from {campaignName} ({rows.length})</h2>
        <Link href={`${ADS_ROOT}/leads?campaign=${campaignId}`} className={btn}>
          Open in Leads Center
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No leads yet"
          description="Leads will appear here once your instant forms receive submissions."
          compact
        />
      ) : (
        <TableShell minWidth={900}>
          <thead>
            <tr>
              {["Lead", "Contact", "Ad Set", "Ad", "Stage", "Score", "Owner", "Submitted"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <EntityLink href={`${ADS_ROOT}/leads/${l.id}`} name={l.name} sub={l.id} />
                </Td>
                <Td>
                  {l.phone}
                  <span className="block text-[9px] text-[#64748b]">{l.email}</span>
                </Td>
                <Td>
                  <Link href={`${ADS_ROOT}/adsets/${l.adSetId}`} className="text-[#0671e9] hover:underline">
                    {l.adSetId}
                  </Link>
                </Td>
                <Td>
                  <Link href={`${ADS_ROOT}/ads/${l.adId}`} className="text-[#0671e9] hover:underline">
                    {l.adId}
                  </Link>
                </Td>
                <Td>{l.stage}</Td>
                <Td>{l.score}</Td>
                <Td>{l.owner}</Td>
                <Td>{dateTime(l.submittedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Performance tab                                                     */
/* ------------------------------------------------------------------ */

function PerformanceTab({
  campaign,
  sets,
}: {
  campaign: NonNullable<ReturnType<typeof getCampaign>>;
  sets: ReturnType<typeof adSetsOfCampaign>;
}) {
  const m = campaign.metrics;
  const formOpens = Math.round(m.clicks * 0.62);
  const qualified = Math.round(m.leads * 0.68);
  const converted = Math.round(m.leads * 0.21);

  return (
    <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
      <Panel title="Spend, Leads and CPL" icon={<Activity className="size-4 text-[#1877f2]" />}>
        <PerformanceTrend height={260} />
      </Panel>

      <Panel title="Conversion Funnel" icon={<Target className="size-4 text-[#10b981]" />}>
        <FunnelBars
          steps={[
            { label: "Impressions", value: m.impressions },
            { label: "Clicks", value: m.clicks },
            { label: "Form opens", value: formOpens },
            { label: "Leads", value: m.leads },
            { label: "Qualified leads", value: qualified },
            { label: "Converted", value: converted },
          ]}
        />
      </Panel>

      <Panel title="Spend by Ad Set" icon={<BarChart3 className="size-4 text-[#1877f2]" />}>
        <SpendBarChart
          data={sets.map((s) => ({ name: s.name, value: s.metrics.spend }))}
          height={Math.max(160, sets.length * 46)}
        />
      </Panel>

      <Panel title="Efficiency" icon={<TrendingUp className="size-4 text-[#1877f2]" />}>
        <dl>
          <Field label="Cost per 1,000 impressions (CPM)" value={orDash(m.impressions ? (m.spend / m.impressions) * 1000 : 0, moneyPrecise)} />
          <Field label="Cost per click (CPC)" value={orDash(m.clicks ? m.spend / m.clicks : 0, moneyPrecise)} />
          <Field label="Cost per lead (CPL)" value={orDash(cpl(m), moneyPrecise)} />
          <Field label="Click-through rate" value={orDash(ctr(m), (v) => pct(v, 2))} />
          <Field label="Lead conversion rate" value={orDash(conversionRate(m), (v) => pct(v, 1))} />
          <Field label="Frequency" value={m.reach ? frequency(m).toFixed(2) : "—"} />
        </dl>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity tab                                                        */
/* ------------------------------------------------------------------ */

function ActivityTab({ campaignName }: { campaignName: string }) {
  const rows = activityLog.filter((a) => a.campaign === campaignName);
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
        <h2 className="text-sm font-bold">Activity ({rows.length})</h2>
        <Link href={`${ADS_ROOT}/activity`} className={btn}>
          Open full audit log
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Activity} title="No changes recorded" description="Edits to this campaign, its ad sets and ads will be listed here." compact />
      ) : (
        <ol className="divide-y divide-[#eef2f7]">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5">
              <span className="w-[150px] shrink-0 text-[10px] text-[#64748b]">
                {dateTime(a.at)}
              </span>
              <span className="min-w-[220px] flex-1">
                <span className="block text-[11px] font-semibold">
                  {a.action} · <Link href={a.entityHref} className="text-[#0671e9] hover:underline">{a.entityLabel}</Link>
                </span>
                <span className="mt-0.5 block text-[10px] text-[#64748b]">
                  {a.user} · {a.entityType} · {a.source}
                </span>
              </span>
              {(a.oldValue || a.newValue) && (
                <span className="flex items-center gap-1.5 text-[10px]">
                  {a.oldValue && <Tag>{a.oldValue}</Tag>}
                  <span aria-hidden="true">→</span>
                  {a.newValue && <Tag>{a.newValue}</Tag>}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  return (
    <Suspense fallback={<SkeletonKpis />}>
      <CampaignDetail campaignId={campaignId} />
    </Suspense>
  );
}
