"use client";

import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleDollarSign, ExternalLink, Gauge, IndianRupee, Info, PlayCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CapabilityState, ErrorState, PageSkeleton } from "../components/states";
import { Button, Card, CardHeader, EmptyState, Notice, PageTitle, Skeleton, TrendDelta, yt } from "../components/ui";
import { useChannelAnalytics, useRevenueData } from "../data/view-hooks";
import { usePeriod } from "../hooks/use-query-state";
import { ytRoutes } from "../lib/constants";
import { changePct, compact, money } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { RevenueData } from "../types";

export function MonetizationPage() {
  const { ready, can, channel } = useYouTube();
  if (!ready) return <PageSkeleton />;
  const actions = (
    <>
      <Button variant="secondary" icon={Wallet} href="https://www.google.com/adsense" external>View payments in AdSense</Button>
      {channel.id && (
        <Button variant="secondary" icon={ExternalLink} href={ytRoutes.monetizationInStudio(channel.id)} external>Open Monetization in YouTube Studio</Button>
      )}
    </>
  );
  return (
    <div className="space-y-1">
      <PageTitle title="Monetization" description="Estimated revenue from YouTube. Final payments are shown in AdSense." actions={actions} />
      {can.canViewRevenue.allowed ? (
        <RevenueSection />
      ) : (
        <Card>
          <CapabilityState capability={can.canViewRevenue} title="Revenue data unavailable" />
        </Card>
      )}
    </div>
  );
}

export function RevenueKpis({ revenue, views, previousRevenue, label }: { revenue: RevenueData; views: number | null; previousRevenue: number | null; label: string }) {
  const c = revenue.currency;
  // RPM = revenue per 1,000 views, from the same period's views (YouTube's definition); unavailable without both.
  const rpm = revenue.estimatedRevenue !== null && views !== null && views > 0 ? (revenue.estimatedRevenue / views) * 1000 : null;
  const kpis = [
    { label: "Estimated revenue", value: money(revenue.estimatedRevenue, c), delta: changePct(revenue.estimatedRevenue, previousRevenue), icon: IndianRupee, hint: label },
    { label: "RPM", value: money(rpm, c, 2), delta: null, icon: Gauge, hint: "Per 1,000 views" },
    { label: "CPM", value: money(revenue.cpm, c, 2), delta: null, icon: CircleDollarSign, hint: "Per 1,000 ad impressions" },
    { label: "Monetized playbacks", value: compact(revenue.monetizedPlaybacks), delta: null, icon: PlayCircle, hint: "With at least one ad" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className={cn(yt.card, "p-3.5")}>
          <p className="flex items-center gap-1.5 text-[12px] text-[#6B7890]"><k.icon className="size-3.5" />{k.label}</p>
          <p className="mt-1.5 text-[21px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F1B3D]">{k.value}</p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[#98A2B3]"><TrendDelta value={k.delta} /><span className="truncate">{k.hint}</span></p>
        </div>
      ))}
    </div>
  );
}

export function RevenueTrendCard({ data, label, className }: { data: RevenueData; label: string; className?: string }) {
  const c = data.currency;
  return (
    <Card className={className}>
      <CardHeader title="Revenue Trend" description={`Estimated daily revenue · ${label}`} />
      <div className="h-[260px] px-2 pb-4">
        {data.series.length === 0 ? (
          <EmptyState compact icon={Info} title="No daily revenue reported" description="YouTube returned totals for this period but no day-by-day rows." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E9F6E" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0E9F6E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EEF1F5" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), "MMM d")} tick={{ fontSize: 11, fill: "#8792A8" }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: "#8792A8" }} axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => money(v, c)} />
              <Tooltip
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as { date: string; revenue: number | null } | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-md">
                      <p className="font-semibold text-[#0F1B3D]">{format(parseISO(row.date), "EEE, MMM d")}</p>
                      <p className="text-[#3C4A66]">Estimated revenue <b>{money(row.revenue, c, 2)}</b></p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0E9F6E" strokeWidth={2} fill="url(#rev)" isAnimationActive={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/** Revenue KPIs, trend and notes. Only rendered when the monetary permission is granted. */
export function RevenueSection() {
  const { days, label } = usePeriod();
  const revenue = useRevenueData(days);
  const channelTotals = useChannelAnalytics(days);

  if (revenue.isLoading) {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading revenue">
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Card key={i} className="p-3.5"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-6 w-28" /></Card>)}</div>
        <Card className="p-4"><Skeleton className="h-[240px] w-full" /></Card>
      </div>
    );
  }
  if (revenue.error) return <Card><ErrorState error={revenue.error} onRetry={revenue.refetch} title="Revenue couldn't load" /></Card>;

  const data = revenue.data.total;
  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={Info}
          title="No revenue reported for this period"
          description="YouTube returned no revenue for this date range. The channel may not be monetized or had no earnings. It's unavailable, not zero."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <RevenueKpis revenue={data} views={channelTotals.data.totals.views.value} previousRevenue={revenue.data.previousTotal} label={label} />
      <RevenueTrendCard data={data} label={label} />
      <Notice tone="neutral" title="About these numbers">Revenue is estimated by YouTube and can change after month-end adjustments. Amounts are shown in {data.currency}, as reported by YouTube.</Notice>
    </div>
  );
}
