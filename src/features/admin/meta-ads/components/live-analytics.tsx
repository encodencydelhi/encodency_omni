"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, MousePointerClick, Radio, Target, UsersRound, WalletCards } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { metaScopeHeaders, useMetaScopeKey } from "@/features/admin/meta/live/meta-scope";
import { useAdsData } from "../data-source";
import type { ApiMetrics, Dataset } from "../live/meta-ads-api";
import { money, moneyPrecise, num, pct } from "../format";
import { AdsWorkspace } from "./workspace";
import { btn, KpiCard, Panel, SkeletonKpis } from "./ui";
import { PerformanceTrend, SpendBarChart } from "./charts";
import { downloadCsv } from "../export";

interface Report {
  syncedAt: string;
  summary: Dataset<ApiMetrics>;
  daily: Dataset<Array<ApiMetrics & { date: string }>>;
  segments: Dataset<Array<ApiMetrics & { label: string }>>;
}
const input = "h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-200";
const loaded = (state: string | undefined) => state === "live" || state === "empty";

export function LiveAnalytics() {
  const data = useAdsData();
  const companyId = getStoredCompanyId();
  const scope = useMetaScopeKey();
  const [campaign, setCampaign] = useState("");
  const [adset, setAdset] = useState("");
  const [platform, setPlatform] = useState("");
  const [breakdown, setBreakdown] = useState("Platform");
  const filters = { campaignId: campaign || undefined, adSetId: adset || undefined, platform: platform || undefined, breakdown: breakdown || undefined };
  const report = useQuery({
    queryKey: ["meta-ads", companyId, scope, "report", data.accountId, data.period, filters],
    enabled: data.status === "ready" && Boolean(data.accountId),
    queryFn: ({ signal }) => apiClient.request<Report>({ method: "GET", path: "/integrations/meta-ads/report", query: { adAccountId: data.accountId!, period: data.period, ...filters }, headers: metaScopeHeaders(companyId), signal }),
    staleTime: 60_000, retry: false, refetchOnWindowFocus: false,
  });
  const m = report.data?.summary.data;
  const known = loaded(report.data?.summary.state);
  const series = useMemo(() => (report.data?.daily.data ?? []).map(row => ({ ...row, label: row.date.slice(5), spend: Math.round(row.spend * 100), cpl: row.leads ? Math.round(row.spend * 100 / row.leads) : 0 })), [report.data]);
  const segments = report.data?.segments;
  function exportReport() {
    if (!m || !known) return;
    downloadCsv("meta-analytics", ["Scope", "Spend", "Impressions", "Unique Reach", "Clicks", "Leads"], [["Selected Filters", m.spend, m.impressions, m.reach, m.clicks, m.leads], ...(segments?.data ?? []).map(row => [row.label, row.spend, row.impressions, row.reach, row.clicks, row.leads])]);
  }
  return (
    <AdsWorkspace actions={<button className={btn} disabled={!known} onClick={exportReport}><Download className="size-3.5" />Export Report</button>}>
      <div className="space-y-2.5 capitalize">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <select aria-label="Reporting campaign" className={input} value={campaign} onChange={e => { setCampaign(e.target.value); setAdset(""); }}><option value="">All Campaigns</option>{data.campaigns.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          <select aria-label="Reporting ad set" className={input} value={adset} onChange={e => setAdset(e.target.value)}><option value="">All Ad Sets</option>{data.adSets.filter(row => !campaign || row.campaignId === campaign).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          <select aria-label="Reporting platform" className={input} value={platform} onChange={e => setPlatform(e.target.value)}><option value="">All Platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select>
          <select aria-label="Reporting breakdown" className={input} value={breakdown} onChange={e => setBreakdown(e.target.value)}><option value="">No Breakdown</option>{["Platform", "Placement", "Device", "Age", "Gender", "Location"].map(value => <option key={value}>{value}</option>)}</select>
          <button className={btn} onClick={() => void report.refetch()} disabled={report.isFetching}>Refresh Report</button>
        </div>
        <p className="px-1 text-[11px] leading-4 text-slate-500">Every KPI, Trend And Breakdown Uses The Same Selected Filters. Reach Is Reported By Meta For This Scope; Segment Reach Is Not Added Together.</p>
        {report.isPending ? <SkeletonKpis /> : report.isError || !known ? <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Reporting Data Unavailable</strong><p className="mt-1">{report.error instanceof Error ? report.error.message : "Meta Did Not Return Complete Insights. No Estimated Numbers Are Displayed."}</p></div> : m && <>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
            <KpiCard label="Spend" value={money(Math.round(m.spend * 100))} icon={WalletCards} />
            <KpiCard label="Impressions" value={num(m.impressions)} icon={BarChart3} />
            <KpiCard label="Unique Reach" value={num(m.reach)} icon={Radio} />
            <KpiCard label="Clicks" value={num(m.clicks)} sub={`CTR ${m.impressions ? pct(m.clicks / m.impressions * 100, 2) : "—"}`} icon={MousePointerClick} />
            <KpiCard label="Attributed Leads" value={num(m.leads)} icon={UsersRound} tone="green" />
            <KpiCard label="Cost Per Lead" value={m.leads ? moneyPrecise(m.spend * 100 / m.leads) : "—"} icon={Target} />
          </div>
          <Panel title="Performance Over Time" icon={<BarChart3 className="size-3.5" />}>
            {!loaded(report.data?.daily.state) ? <p className="text-xs text-amber-700">Daily Insights Are Unavailable. This Is Not A Zero-Delivery Result.</p> : series.length ? <PerformanceTrend height={210} data={series} /> : <p className="py-5 text-center text-xs text-slate-500">Meta Reports No Delivery For These Filters And Period.</p>}
          </Panel>
          {breakdown && <Panel title={`${breakdown} Breakdown · Reported By Meta`}>
            {!loaded(segments?.state) ? <p className="text-xs text-amber-700">Meta Could Not Return This Breakdown. Try A Different Dimension Or Review Account Permissions.</p> : segments?.data.length ? <div className="grid gap-3 lg:grid-cols-2"><SpendBarChart height={Math.max(160, Math.min(segments.data.length, 10) * 24)} data={segments.data.slice(0, 10).map(row => ({ name: row.label, value: Math.round(row.spend * 100) }))} /><div className="max-h-64 overflow-auto"><table className="w-full text-left text-[11px]"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr>{["Segment", "Spend", "Leads", "CPL"].map(label => <th key={label} className="px-2 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{segments.data.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t border-slate-100"><td className="px-2 py-2">{row.label}</td><td className="px-2 py-2 tabular-nums">{money(row.spend * 100)}</td><td className="px-2 py-2 tabular-nums">{num(row.leads)}</td><td className="px-2 py-2 tabular-nums">{row.leads ? moneyPrecise(row.spend * 100 / row.leads) : "—"}</td></tr>)}</tbody></table></div></div> : <p className="py-4 text-center text-xs text-slate-500">No Segment Results For This Period.</p>}
          </Panel>}
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-[11px] leading-4 text-violet-900">Lead Qualification And Sales Conversion Require CRM Outcomes. They Are Not Inferred From Clicks Or Assigned Percentages.</div>
        </>}
      </div>
    </AdsWorkspace>
  );
}
