"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Download, Eye, Loader2, MousePointerClick, ThumbsUp, UserPlus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInAnalyticsResponse } from "../../integrations/live/integrations-api";
import { Kpis, LoadError, Notice } from "./linkedin-ads-leads";

/** A chosen date range (YYYY-MM-DD, inclusive) and its label. */
export interface LinkedInRange { from: string; to: string; label: string }

const localDay = (offset: number) => { const day = new Date(); day.setDate(day.getDate() + offset); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`; };
const PRESETS: Array<[number, string]> = [[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 365 days"]];
export const presetRange = (days: number): LinkedInRange => ({ from: localDay(-(days - 1)), to: localDay(0), label: PRESETS.find(([value]) => value === days)?.[1] ?? `Last ${days} days` });
const pretty = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** The header date picker: presets plus a custom range (LinkedIn keeps page analytics for about a year). */
export function LinkedInDateRangePicker({ value, onChange }: { value: LinkedInRange; onChange: (range: LinkedInRange) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const apply = () => {
    if (!draft.from || !draft.to) return setError("Choose both dates.");
    if (draft.from > draft.to) return setError("The start date must be on or before the end date.");
    const days = Math.round((Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000) + 1;
    if (days > 366) return setError("Choose at most 366 days.");
    setError(null); setOpen(false); onChange({ ...draft, label: "Custom range" });
  };
  return <div ref={box} className="relative">
    <button type="button" onClick={() => { setDraft({ from: value.from, to: value.to }); setOpen(!open); }} aria-expanded={open} className="flex h-[36px] items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 shadow-xs hover:bg-slate-50">
      <CalendarDays className="size-3.5 shrink-0 text-blue-600" />
      <span className="text-left text-xs leading-none"><span className="block font-bold text-slate-800">{value.label}</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400">{pretty(value.from)} – {pretty(value.to)}</span></span>
      <ChevronDown className="size-3 text-slate-400" />
    </button>
    {open && <div className="absolute right-0 top-[40px] z-30 w-72 border border-slate-200 bg-white p-3 shadow-lg">
      <div className="grid grid-cols-2 gap-1.5">{PRESETS.map(([days, label]) => <button key={days} type="button" onClick={() => { setOpen(false); onChange(presetRange(days)); }} className={`h-8 border px-2 text-[11px] font-semibold ${value.label === label ? "border-[#0A66C2] bg-[#EAF3FB] text-[#0A66C2]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}</div>
      <p className="mt-3 text-[10px] font-semibold uppercase text-slate-500">Custom range</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        <label className="text-[10px] text-slate-500">From<input type="date" value={draft.from} min={localDay(-395)} max={localDay(0)} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className="mt-0.5 h-8 w-full border border-slate-200 px-1.5 text-[11px] text-slate-800" /></label>
        <label className="text-[10px] text-slate-500">To<input type="date" value={draft.to} min={localDay(-395)} max={localDay(0)} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className="mt-0.5 h-8 w-full border border-slate-200 px-1.5 text-[11px] text-slate-800" /></label>
      </div>
      {error && <p className="mt-2 text-[10.5px] text-red-700" role="alert">{error}</p>}
      <button type="button" onClick={apply} className="mt-2 h-8 w-full bg-[#0A66C2] text-[11px] font-semibold text-white hover:bg-[#004182]">Apply</button>
      <p className="mt-2 text-[10px] text-slate-400">LinkedIn keeps page analytics for about one year.</p>
    </div>}
  </div>;
}

const number = (value: number) => value.toLocaleString("en-IN");
const percent = (value: number | null) => (value === null ? "—" : `${value.toFixed(2)}%`);
const SERIES = [
  { key: "impressions", label: "Impressions", color: "#0A66C2" },
  { key: "pageViews", label: "Page views", color: "#7C3AED" },
  { key: "clicks", label: "Clicks", color: "#D97706" },
  { key: "followersGained", label: "New followers", color: "#059669" },
] as const;

/** Daily page analytics for the header's date range, with a CSV download. */
export function LinkedInRangeAnalytics({ range }: { range: LinkedInRange }) {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<LinkedInAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [metric, setMetric] = useState<(typeof SERIES)[number]["key"]>("impressions");
  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInAnalytics(companyId, clientId, range.from, range.to, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load LinkedIn analytics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, range.from, range.to, tick]);
  // Show the spinner again when the range changes (set during render, not in the effect).
  const [loadedKey, setLoadedKey] = useState(`${range.from}:${range.to}`);
  if (loadedKey !== `${range.from}:${range.to}`) { setLoadedKey(`${range.from}:${range.to}`); setLoading(true); }

  const download = () => {
    if (!data) return;
    const header = ["Date", "Page views", "Unique page views", "Impressions", "Unique impressions", "Clicks", "Likes", "Comments", "Shares", "New followers (organic)", "New followers (paid)"];
    const rows = data.series.map((day) => [day.date, day.pageViews, day.uniquePageViews, day.impressions, day.uniqueImpressions, day.clicks, day.likes, day.comments, day.shares, day.organicFollowers, day.paidFollowers]);
    const blob = new Blob([[header, ...rows].map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `linkedin-analytics-${data.from}-to-${data.to}.csv`; link.click();
    URL.revokeObjectURL(link.href);
  };

  const active = SERIES.find((item) => item.key === metric)!;
  return <div className="border-b border-[#DDE4ED] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
      <div><h3 className="text-[13px] font-bold text-[#172044]">Performance for {range.label.toLowerCase()}</h3><p className="mt-0.5 text-[10.5px] text-[#7B89A4]">{pretty(range.from)} – {pretty(range.to)} · change the dates in the header above</p></div>
      <button type="button" onClick={download} disabled={!data || data.state !== "live"} className="inline-flex h-8 items-center gap-1.5 border border-[#DDE4ED] px-3 text-[10.5px] font-semibold text-[#253352] hover:bg-[#F8FAFC] disabled:opacity-50"><Download className="size-3" /> Download CSV</button>
    </div>
    {loading && !data ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-[#0A66C2]" /></div>
      : error && !data ? <LoadError message={error} retry={() => { setLoading(true); setTick((value) => value + 1); }} />
      : data && <div className={loading ? "opacity-60" : ""}>
        {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
        {data.state === "live" && <>
          <Kpis items={[
            { label: "Impressions · CTR", value: `${number(data.totals.impressions)} · ${percent(data.totals.ctr)}`, icon: Eye, tone: "bg-[#EAF3FB] text-[#0A66C2]" },
            { label: "Page views", value: number(data.totals.pageViews), icon: Eye, tone: "bg-[#F1ECFE] text-[#7C3AED]" },
            { label: "Engagement rate", value: percent(data.totals.engagementRate), icon: ThumbsUp, tone: "bg-[#FFF4DE] text-[#D97706]" },
            { label: "New followers", value: number(data.totals.followersGained), icon: UserPlus, tone: "bg-[#E5F8F1] text-[#059669]" },
            { label: "Clicks", value: number(data.totals.clicks), icon: MousePointerClick, tone: "bg-[#EAF3FB] text-[#0A66C2]" },
            { label: "Likes", value: number(data.totals.likes), icon: ThumbsUp, tone: "bg-[#F1ECFE] text-[#7C3AED]" },
            { label: "Comments", value: number(data.totals.comments), icon: ThumbsUp, tone: "bg-[#FFF4DE] text-[#D97706]" },
            { label: "Shares", value: number(data.totals.shares), icon: ThumbsUp, tone: "bg-[#E5F8F1] text-[#059669]" },
          ]} />
          <div className="px-5 py-4">
            <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Metric">{SERIES.map((item) => <button key={item.key} type="button" role="tab" aria-selected={metric === item.key} onClick={() => setMetric(item.key)} className={`h-7 border px-2.5 text-[10.5px] font-semibold ${metric === item.key ? "border-[#0A66C2] bg-[#EAF3FB] text-[#0A66C2]" : "border-[#DDE4ED] text-[#52617D] hover:bg-[#F8FAFC]"}`}>{item.label}</button>)}</div>
            <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs><linearGradient id="li-range-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={active.color} stopOpacity={0.25} /><stop offset="100%" stopColor={active.color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 10, fill: "#7B89A4" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#7B89A4" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip labelFormatter={(value) => pretty(String(value))} formatter={(value) => [number(Number(value)), active.label]} contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey={active.key} stroke={active.color} strokeWidth={2} fill="url(#li-range-fill)" />
            </AreaChart></ResponsiveContainer></div>
            <p className="mt-2 text-[10px] text-[#8A97AF]">Daily numbers from LinkedIn page analytics (UTC days). Impressions, clicks and reactions count all of this page&apos;s posts; a day with no activity shows 0.{data.reason ? ` ${data.reason}` : ""}</p>
          </div>
        </>}
      </div>}
  </div>;
}
