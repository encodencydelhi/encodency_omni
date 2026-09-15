"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeCheck, CircleDollarSign, ExternalLink, Gauge, IndianRupee, PlayCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildRevenue } from "../data/mock";
import { Donut, LegendList } from "../components/charts";
import { CapabilityState, PageSkeleton } from "../components/states";
import { Badge, Button, Card, CardHeader, Notice, PageTitle, Thumb, TrendDelta, tdClass, thClass, yt } from "../components/ui";
import { usePeriod } from "../hooks/use-query-state";
import { ytRoutes } from "../lib/constants";
import { compact, inr } from "../lib/format";
import { useYouTube } from "../store/youtube-store";

const SOURCE_COLORS = ["#0E9F6E", "#2563EB", "#7C3AED", "#D97706"];

export function MonetizationPage() {
  const { ready, can, channel } = useYouTube();
  if (!ready) return <PageSkeleton />;
  const studio = <Button variant="secondary" icon={ExternalLink} href={`${ytRoutes.studio}/channel/${channel.id}/monetization`} external>Open Monetization in YouTube Studio</Button>;
  return (
    <div className="space-y-1">
      <PageTitle title="Monetization" description="Estimated revenue from YouTube. Final payments are shown in AdSense." actions={studio} />
      {can.canViewRevenue.allowed ? (
        <Revenue />
      ) : (
        <Card>
          <CapabilityState
            capability={{ ...can.canViewRevenue, reason: `Revenue data is unavailable for this channel or permission level. ${can.canViewRevenue.reason ?? ""}` }}
            title="Revenue data unavailable"
          />
        </Card>
      )}
    </div>
  );
}

export function useRevenue(days: number) {
  return useMemo(() => {
    const data = buildRevenue(days);
    return { data, delta: ((data.estimatedRevenue - data.previousRevenue) / data.previousRevenue) * 100 };
  }, [days]);
}

export function RevenueKpis({ revenue, label }: { revenue: ReturnType<typeof useRevenue>; label: string }) {
  const { data, delta } = revenue;
  const kpis = [
    { label: "Estimated revenue", value: inr(data.estimatedRevenue), delta, icon: IndianRupee, hint: label },
    { label: "RPM", value: inr(data.rpm, 2), delta: 6.2, icon: Gauge, hint: "Per 1,000 views" },
    { label: "CPM", value: inr(data.cpm, 2), delta: 3.8, icon: CircleDollarSign, hint: "Per 1,000 ad impressions" },
    { label: "Monetized playbacks", value: compact(data.monetizedPlaybacks), delta: 9.4, icon: PlayCircle, hint: "With at least one ad" },
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

export function RevenueTrendCard({ data, label, className }: { data: ReturnType<typeof buildRevenue>; label: string; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Revenue trend" description={`Estimated daily revenue · ${label}`} />
      <div className="h-[260px] px-2 pb-4">
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
            <YAxis tick={{ fontSize: 11, fill: "#8792A8" }} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => `₹${compact(v)}`} />
            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { date: string; revenue: number } | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-md">
                    <p className="font-semibold text-[#0F1B3D]">{format(parseISO(row.date), "EEE, MMM d")}</p>
                    <p className="text-[#3C4A66]">Estimated revenue <b>{inr(row.revenue)}</b></p>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#0E9F6E" strokeWidth={2} fill="url(#rev)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Revenue() {
  const { videos } = useYouTube();
  const { days, label } = usePeriod();
  const revenue = useRevenue(days);
  const { data } = revenue;
  const top = useMemo(
    () =>
      videos
        .filter((v) => v.status === "published" && v.type !== "short")
        .map((v) => ({ v, revenue: Math.round((v.stats.views / 1000) * data.rpm * 0.18) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
    [videos, data.rpm],
  );

  return (
    <div className="space-y-1">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <span className="grid size-10 place-items-center rounded-sm bg-[#ECFAF3] text-[#067647]"><BadgeCheck className="size-5" /></span>
        <div className="min-w-[200px] flex-1">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1B3D]">Monetization status <Badge tone="green" dot>Monetized</Badge></p>
          <p className="mt-0.5 text-[12.5px] text-[#6B7890]">YouTube Partner Program · Ads, Shorts Feed ads, YouTube Premium and Supers are enabled.</p>
        </div>
        <Button size="sm" variant="ghost" icon={Wallet} href="https://www.google.com/adsense" external>View payments in AdSense</Button>
      </Card>

      <RevenueKpis revenue={revenue} label={label} />

      <div className="grid gap-1 xl:grid-cols-12">
        <RevenueTrendCard className="xl:col-span-8" data={data} label={label} />
        <Card className="xl:col-span-4">
          <CardHeader title="Revenue sources" />
          <div className="flex flex-col items-center gap-4 px-4 pb-4 sm:flex-row xl:flex-col">
            <Donut data={data.sources} colors={SOURCE_COLORS} size={150} thickness={18} centerValue={inr(data.estimatedRevenue)} centerLabel="Total" />
            <LegendList data={data.sources} colors={SOURCE_COLORS} className="w-full" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top earning videos" description="Estimated revenue in the selected period" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static pl-4")}>Video</th>
                <th className={cn(thClass, "static text-right")}>Views</th>
                <th className={cn(thClass, "static text-right")}>RPM</th>
                <th className={cn(thClass, "static pr-4 text-right")}>Estimated revenue</th>
              </tr>
            </thead>
            <tbody>
              {top.map(({ v, revenue: earned }) => (
                <tr key={v.id} className="group hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "max-w-[380px] pl-4")}>
                    <Link href={ytRoutes.video(v.id)} className="flex items-center gap-2.5">
                      <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[68px]" sizes="68px" />
                      <span className="truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{v.title}</span>
                    </Link>
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{compact(v.stats.views)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{inr(data.rpm * (0.8 + (v.stats.ctr ?? 5) / 25), 2)}</td>
                  <td className={cn(tdClass, "pr-4 text-right font-semibold tabular-nums text-[#0F1B3D]")}>{inr(earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Notice tone="neutral" title="About these numbers">Revenue is estimated by YouTube and can change after month-end adjustments. Figures sync from the YouTube Analytics API once a day.</Notice>
    </div>
  );
}
