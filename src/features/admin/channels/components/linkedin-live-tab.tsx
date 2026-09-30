"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle, ArrowUpRight, BarChart3, Building2, CheckCircle2, ExternalLink, Eye,
  FileText, Loader2, MessageSquare, RefreshCcw, ShieldCheck, TrendingUp, Users,
  X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInDashboardResponse, type LinkedInDataset } from "../../integrations/live/integrations-api";

type LinkedInTab = "Overview" | "Posts" | "Analytics" | "Audience" | "Campaigns" | "Leads" | "Inbox" | "Settings";
type Metric = { key: string; label: string; value: number };
type SummaryMetric = { key: string; label: string; value: number | null };

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const toText = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : null;

function title(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compact(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function flattenMetrics(value: unknown, prefix = "", result: Metric[] = []): Metric[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!/(^|\s|\/)(id|start|end|timestamp|time)$/i.test(prefix)) result.push({ key: prefix, label: title(prefix.split(" / ").at(-1) || "Value"), value });
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => flattenMetrics(child, prefix ? `${prefix} / ${key}` : key, result));
  }
  return result;
}

function firstMetric(metrics: Metric[], terms: string[]) {
  return metrics.find((metric) => terms.some((term) => metric.key.toLowerCase().includes(term)))?.value ?? 0;
}

function dashboardMetrics(dashboard: LinkedInDashboardResponse): SummaryMetric[] {
  const analytics = flattenMetrics([...dashboard.pageStatistics.data, ...dashboard.shareStatistics.data]);
  const followers = dashboard.networkSize.state === "live" && typeof dashboard.networkSize.data.firstDegreeSize === "number" ? dashboard.networkSize.data.firstDegreeSize : null;
  const analyticsLive = dashboard.pageStatistics.state === "live" || dashboard.shareStatistics.state === "live";
  return [
    { key: "followers", label: "Followers", value: followers },
    { key: "pageViews", label: "Page views", value: analyticsLive ? firstMetric(analytics, ["allpageviews", "overviewpageviews", "pageviews"]) : null },
    { key: "impressions", label: "Impressions", value: analyticsLive ? firstMetric(analytics, ["impressioncount", "impressions"]) : null },
    { key: "engagements", label: "Engagements", value: analyticsLive ? firstMetric(analytics, ["engagement", "clickcount", "likecount"]) : null },
  ];
}

function DatasetNotice({ dataset, title: noticeTitle }: { dataset: LinkedInDataset<unknown>; title?: string }) {
  if (dataset.state === "live") return null;
  const permission = dataset.state === "permission_required";
  return (
    <div className={`border-l-4 px-5 py-4 ${permission ? "border-amber-500 bg-amber-50" : "border-[#94A3B8] bg-[#F8FAFC]"}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${permission ? "text-amber-600" : "text-[#64748B]"}`} />
        <div>
          <p className="text-[12px] font-semibold text-[#172044]">{noticeTitle || (permission ? "Additional LinkedIn access required" : dataset.state === "empty" ? "No data in this period" : "Data temporarily unavailable")}</p>
          <p className="mt-1 text-[11px] leading-5 text-[#64748B]">{dataset.reason || "LinkedIn returned no records for the mapped page."}</p>
        </div>
      </div>
    </div>
  );
}

function PageToolbar({ title: heading, subtitle, syncedAt, onSync, syncing }: { title: string; subtitle: string; syncedAt: string; onSync: () => void; syncing: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#DDE4ED] bg-[#FBFCFE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2"><span className="h-4 w-0.5 bg-[#0A66C2]" /><h2 className="text-[16px] font-bold text-[#111B43]">{heading}</h2></div><p className="text-[10.5px] text-[#687797]">{subtitle} · Updated {new Date(syncedAt).toLocaleString()}</p></div>
      <button onClick={onSync} disabled={syncing} className="inline-flex h-9 items-center justify-center gap-2 border border-[#CBD5E1] bg-white px-3 text-[11px] font-semibold text-[#334155] shadow-sm hover:bg-[#F8FAFC] disabled:opacity-60">
        <RefreshCcw className={`size-3.5 text-[#0A66C2] ${syncing ? "animate-spin" : ""}`} /> Sync live
      </button>
    </div>
  );
}

function KpiStrip({ metrics }: { metrics: SummaryMetric[] }) {
  const primary = metrics.slice(0, 4).map((metric) => [metric.label, metric.value] as const);
  const styles = [
    { icon: Users, color: "text-[#0A66C2]", background: "bg-[#EAF3FB]", accent: "bg-[#0A66C2]" },
    { icon: Eye, color: "text-[#7C3AED]", background: "bg-[#F1ECFE]", accent: "bg-[#7C3AED]" },
    { icon: BarChart3, color: "text-[#D97706]", background: "bg-[#FFF4DE]", accent: "bg-[#F59E0B]" },
    { icon: MessageSquare, color: "text-[#059669]", background: "bg-[#E5F8F1]", accent: "bg-[#10B981]" },
  ];
  return <div className="grid border-y border-[#DDE4ED] bg-white sm:grid-cols-2 lg:grid-cols-4">{primary.map(([label, value], index) => (
    <div key={label} className={`relative overflow-hidden px-5 py-4 ${index > 0 ? "border-t border-[#E8EDF3] sm:border-l sm:border-t-0" : ""}`}>
      {(() => { const style = styles[index] ?? styles[0]!; const Icon = style.icon; return <><span className={`absolute inset-x-0 top-0 h-0.5 ${style.accent}`} /><div className="flex items-start justify-between gap-3"><div><p className="text-[9.5px] font-semibold uppercase text-[#7B89A4]">{label}</p><p className="mt-1.5 text-[24px] font-bold tracking-normal text-[#111B43]">{value === null ? "—" : compact(value)}</p></div><div className={`grid size-8 place-items-center ${style.background} ${style.color}`}><Icon className="size-4" /></div></div><p className="mt-0.5 text-[9.5px] text-[#8190AA]">{value === null ? "Currently unavailable" : "LinkedIn reported value"}</p></>; })()}
    </div>
  ))}</div>;
}

function Overview({ dashboard }: { dashboard: LinkedInDashboardResponse }) {
  const org = dashboard.organization.data;
  const name = toText(org.localizedName) || toText(org.vanityName) || "LinkedIn company page";
  const vanity = toText(org.vanityName);
  const logoUrl = toText(org.logoUrl);
  const description = toText(org.localizedDescription);
  const website = toText(org.localizedWebsite);
  const organizationType = toText(org.organizationType);
  const specialties = Array.isArray(org.localizedSpecialties) ? org.localizedSpecialties.filter((item): item is string => typeof item === "string") : [];
  const metrics = dashboardMetrics(dashboard);
  const snapshot = metrics.filter((metric): metric is SummaryMetric & { value: number } => metric.value !== null);
  const datasets = [
    ["Company profile", dashboard.organization], ["Published content", dashboard.posts], ["Page analytics", dashboard.pageStatistics],
    ["Follower insights", dashboard.followers], ["Post analytics", dashboard.shareStatistics], ["Comments & reactions", dashboard.social],
  ] as Array<[string, LinkedInDataset<unknown>]>;
  return <>
    <div className="flex flex-col justify-between gap-4 bg-white px-5 py-5 md:flex-row md:items-center">
      <div className="flex items-start gap-4">{logoUrl ? <Image src={logoUrl} alt={`${name} logo`} width={56} height={56} className="size-14 shrink-0 border border-[#DDE4ED] bg-white object-contain p-1" /> : <div className="grid size-14 shrink-0 place-items-center bg-[#0A66C2] text-white"><Building2 className="size-5" /></div>}<div><h3 className="text-[18px] font-bold text-[#111B43]">{name}</h3><p className="mt-1 text-[11px] text-[#687797]">{organizationType ? title(organizationType) : "LinkedIn organization"} · {dashboard.organizationUrn}</p>{description && <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#52617D]">{description}</p>}<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{website && <a href={website} target="_blank" rel="noreferrer" className="text-[10.5px] font-semibold text-[#0A66C2]">Company website <ExternalLink className="ml-1 inline size-3" /></a>}{specialties.slice(0, 4).map((specialty) => <span key={specialty} className="text-[10px] text-[#71809B]">{specialty}</span>)}</div></div></div>
      {vanity && <a href={`https://www.linkedin.com/company/${vanity}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 border border-[#B8D5F0] bg-[#F2F8FD] px-3 text-[11px] font-semibold text-[#0A66C2]">View on LinkedIn <ExternalLink className="size-3" /></a>}
    </div>
    <DatasetNotice dataset={dashboard.organization} />
    <KpiStrip metrics={metrics} />
    {snapshot.length > 0 && <div className="grid border-b border-[#DDE4ED] bg-white lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]"><section className="border-b border-[#DDE4ED] px-5 py-5 lg:border-b-0 lg:border-r"><div className="mb-4"><h3 className="text-[13px] font-bold text-[#172044]">Page performance snapshot</h3><p className="mt-1 text-[10.5px] text-[#7B89A4]">Current totals reported by LinkedIn</p></div><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={snapshot} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#7B89A4", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={compact} /><Tooltip formatter={(value) => [Number(value).toLocaleString(), "Value"]} contentStyle={{ border: "1px solid #DDE4ED", borderRadius: 4, fontSize: 11 }} /><Bar dataKey="value" fill="#0A66C2" radius={[3, 3, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div></section><aside className="p-5"><h3 className="text-[13px] font-bold text-[#172044]">Sync health</h3><p className="mt-1 text-[10.5px] text-[#7B89A4]">Dataset availability for this page</p><div className="mt-4 space-y-3">{datasets.slice(0, 5).map(([label, dataset]) => <div key={label} className="flex items-center justify-between gap-4"><span className="text-[10.5px] font-medium text-[#52617D]">{label}</span><span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${dataset.state === "live" ? "text-emerald-700" : dataset.state === "permission_required" ? "text-amber-700" : "text-[#64748B]"}`}><span className={`size-1.5 rounded-full ${dataset.state === "live" ? "bg-emerald-500" : dataset.state === "permission_required" ? "bg-amber-500" : "bg-[#94A3B8]"}`} />{title(dataset.state)}</span></div>)}</div></aside></div>}
    <div className="bg-white px-5 py-4"><div className="mb-3"><h3 className="text-[13px] font-bold text-[#172044]">Live data coverage</h3><p className="text-[10.5px] text-[#7B89A4]">Availability reported independently for each LinkedIn API</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-150 text-left"><thead><tr className="border-y border-[#E5EAF1] bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]"><th className="px-3 py-2.5">Dataset</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Records</th><th className="px-3 py-2.5">Details</th></tr></thead><tbody className="divide-y divide-[#EDF1F5]">{datasets.map(([label, dataset]) => <tr key={label} className="text-[11px]"><td className="px-3 py-3 font-semibold text-[#253352]">{label}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 font-semibold ${dataset.state === "live" ? "text-emerald-700" : dataset.state === "permission_required" ? "text-amber-700" : "text-[#64748B]"}`}>{dataset.state === "live" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}{title(dataset.state)}</span></td><td className="px-3 py-3 text-[#52617D]">{Array.isArray(dataset.data) ? dataset.data.length : dataset.state === "live" ? "Available" : "-"}</td><td className="max-w-lg px-3 py-3 text-[#687797]">{dataset.reason || "Data is available from LinkedIn."}</td></tr>)}</tbody></table></div>
    </div>
  </>;
}

function Posts({ dataset, social }: { dataset: LinkedInDashboardResponse["posts"]; social: LinkedInDashboardResponse["social"] }) {
  if (dataset.state !== "live") return <div className="p-5"><DatasetNotice dataset={dataset} /></div>;
  const socialByPost = new Map(social.data.map((item) => [toText(item.postId), item]));
  return <div className="overflow-x-auto bg-white"><table className="w-full min-w-210 text-left"><thead><tr className="border-y border-[#DDE4ED] bg-[#F7F9FC] text-[10px] font-semibold uppercase text-[#6C7B97]"><th className="w-[48%] px-5 py-3">Post</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Published</th><th className="px-4 py-3 text-right">Likes</th><th className="px-4 py-3 text-right">Comments</th><th className="px-4 py-3"></th></tr></thead>
    <tbody className="divide-y divide-[#E8EDF3]">{dataset.data.map((post, index) => { const id = toText(post.id) || `post-${index}`; const commentary = toText(post.commentary) || toText(asRecord(post.content).title) || "LinkedIn post"; const activity = asRecord(socialByPost.get(id)?.summary); const likes = Number(asRecord(activity.likesSummary).totalLikes || 0); const comments = Number(asRecord(activity.commentsSummary).totalFirstLevelComments || 0); return <tr key={id} className="hover:bg-[#FAFCFE]"><td className="px-5 py-4"><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center bg-[#EAF3FB] text-[#0A66C2]"><FileText className="size-4" /></div><div className="min-w-0"><p className="line-clamp-2 text-[12px] font-semibold leading-5 text-[#172044]">{commentary}</p><p className="mt-1 truncate text-[9.5px] text-[#8A97AF]">{id}</p></div></div></td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700"><span className="size-1.5 bg-emerald-500" />{title(toText(post.lifecycleState) || "Published")}</span></td><td className="whitespace-nowrap px-4 py-4 text-[11px] text-[#52617D]">{post.publishedAt ? new Date(Number(post.publishedAt)).toLocaleString() : "-"}</td><td className="px-4 py-4 text-right text-[12px] font-semibold text-[#253352]">{likes.toLocaleString()}</td><td className="px-4 py-4 text-right text-[12px] font-semibold text-[#253352]">{comments.toLocaleString()}</td><td className="px-4 py-4 text-right"><a href={`https://www.linkedin.com/feed/update/${id}`} target="_blank" rel="noreferrer" title="Open post on LinkedIn" className="inline-grid size-8 place-items-center border border-[#DDE4ED] text-[#0A66C2] hover:bg-[#F2F8FD]"><ArrowUpRight className="size-3.5" /></a></td></tr>; })}</tbody>
  </table></div>;
}

function Analytics({ dashboard }: { dashboard: LinkedInDashboardResponse }) {
  const metrics = flattenMetrics([...dashboard.shareStatistics.data, ...dashboard.pageStatistics.data]);
  const summary = dashboardMetrics(dashboard);
  const chartData = metrics
    .filter((metric) => metric.value >= 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 10)
    .map((metric) => ({ name: metric.label, value: metric.value, path: metric.key }));
  return <><DatasetNotice dataset={dashboard.shareStatistics} /><DatasetNotice dataset={dashboard.pageStatistics} /><KpiStrip metrics={summary} />
    {chartData.length > 0 && <div className="grid border-t border-[#DDE4ED] bg-white xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
      <section className="border-b border-[#DDE4ED] p-5 xl:border-b-0 xl:border-r"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-[13px] font-bold text-[#172044]">Performance breakdown</h3><p className="mt-1 text-[10.5px] text-[#7B89A4]">Top live metrics returned for the mapped organization</p></div><div className="grid size-8 place-items-center bg-[#EAF3FB] text-[#0A66C2]"><TrendingUp className="size-4" /></div></div>
        <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ right: 24, left: 20 }}><CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fill: "#7B89A4", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={compact} /><YAxis type="category" dataKey="name" width={105} tick={{ fill: "#52617D", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#F4F7FA" }} formatter={(value) => [Number(value).toLocaleString(), "Value"]} contentStyle={{ border: "1px solid #DDE4ED", borderRadius: 4, fontSize: 11 }} /><Bar dataKey="value" fill="#0A66C2" radius={[0, 3, 3, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="p-5"><h3 className="text-[13px] font-bold text-[#172044]">Metric detail</h3><p className="mt-1 text-[10.5px] text-[#7B89A4]">Exact values from LinkedIn</p><div className="mt-4 divide-y divide-[#EDF1F5]">{chartData.slice(0, 8).map((metric) => <div key={metric.path} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#33415F]">{metric.name}</p><p className="mt-0.5 truncate text-[9px] text-[#94A0B5]" title={metric.path}>{title(metric.path.replaceAll(" / ", " · "))}</p></div><span className="shrink-0 text-[13px] font-bold tabular-nums text-[#111B43]">{compact(metric.value)}</span></div>)}</div></section>
    </div>}
  </>;
}

const seniorityLabels: Record<string, string> = {
  "1": "Unpaid", "2": "Training", "3": "Entry level", "4": "Senior",
  "5": "Manager", "6": "Director", "7": "Vice President", "8": "CXO",
  "9": "Partner", "10": "Owner",
};

function audienceMetrics(data: Record<string, unknown>[]) {
  const rawMetrics = data.flatMap((record) => Object.entries(record).flatMap(([key, entries]) => {
    if (!key.startsWith("followerCountsBy") || !Array.isArray(entries)) return [];
    const rawCategory = title(key.replace("followerCountsBy", ""));
    const category = ({ "Geo Country": "Country", Geo: "Region", Function: "Job function", "Staff Count Range": "Company size" } as Record<string, string>)[rawCategory] || rawCategory;
    return entries.flatMap((entry): Array<Metric & { category: string }> => {
      const row = asRecord(entry);
      const counts = asRecord(row.followerCounts);
      const value = Number(counts.organicFollowerCount || 0) + Number(counts.paidFollowerCount || 0);
      if (value <= 0) return [];
      const dimension = Object.entries(row).find(([field]) => field !== "followerCounts")?.[1];
      const dimensionRecord = asRecord(dimension);
      const raw = toText(dimension) || toText(dimensionRecord.localizedName) || toText(dimensionRecord.name);
      const identifier = raw ? decodeURIComponent(raw.split(":").at(-1) || raw) : "Unknown";
      const readable = category === "Seniority"
        ? seniorityLabels[identifier] || `Seniority level ${identifier}`
        : identifier.replace(/^SIZE_/, "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
      const needsTaxonomyLabel = /^(Industry|Function|Geo|Geo Country)\s/i.test(category) && /^\d+$/.test(identifier);
      return [{ key: `${key}/${identifier}`, label: needsTaxonomyLabel ? `${category} audience` : readable, value, category }];
    });
  }));
  const combined = new Map<string, Metric & { category: string }>();
  for (const metric of rawMetrics) {
    const key = `${metric.category}:${metric.label}`;
    const current = combined.get(key);
    combined.set(key, current ? { ...current, value: current.value + metric.value } : metric);
  }
  return [...combined.values()].sort((left, right) => right.value - left.value);
}

function Audience({ dataset, networkSize }: { dataset: LinkedInDashboardResponse["followers"]; networkSize: LinkedInDashboardResponse["networkSize"] }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showDetails, setShowDetails] = useState(false);
  if (dataset.state !== "live") return <div className="p-5"><DatasetNotice dataset={dataset} /></div>;
  const metrics = audienceMetrics(dataset.data);
  const categories = [...new Set(metrics.map((metric) => metric.category))];
  const categoryData = categories.map((category) => ({ name: category, value: metrics.filter((metric) => metric.category === category).reduce((sum, metric) => sum + metric.value, 0) })).sort((left, right) => right.value - left.value);
  const selectedCategory = activeCategory === "All" || categories.includes(activeCategory) ? activeCategory : "All";
  const filteredMetrics = selectedCategory === "All" ? metrics : metrics.filter((metric) => metric.category === selectedCategory);
  const total = filteredMetrics.reduce((sum, metric) => sum + metric.value, 0) || 1;
  const visibleMetrics = filteredMetrics.slice(0, 10);
  const chartData = selectedCategory === "All" ? categoryData.map((item) => ({ key: item.name, label: item.name, value: item.value, category: item.name })) : filteredMetrics.slice(0, 10);
  const totalFollowers = networkSize.state === "live" && typeof networkSize.data.firstDegreeSize === "number" ? networkSize.data.firstDegreeSize : null;
  const colors = ["#0A66C2", "#14B8A6", "#F59E0B", "#6366F1", "#EC4899", "#22C55E", "#8B5CF6"];
  return <div className="bg-white"><div className="border-b border-[#DDE4ED] px-5 py-4"><div className="flex items-center gap-2"><Users className="size-4 text-[#0A66C2]" /><h3 className="text-[13px] font-bold text-[#172044]">Follower demographics</h3></div><p className="mt-1 text-[10.5px] text-[#7B89A4]">Professional audience segments supplied by LinkedIn</p></div>
    <div className="flex gap-2 overflow-x-auto border-b border-[#DDE4ED] bg-[#FBFCFE] px-5 py-3"><button type="button" onClick={() => setActiveCategory("All")} className={`h-8 shrink-0 border px-3 text-[10.5px] font-semibold ${selectedCategory === "All" ? "border-[#0A66C2] bg-[#0A66C2] text-white" : "border-[#DDE4ED] bg-white text-[#52617D]"}`}>All overview</button>{categoryData.map((category) => <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={`h-8 shrink-0 border px-3 text-[10.5px] font-semibold ${selectedCategory === category.name ? "border-[#0A66C2] bg-[#0A66C2] text-white" : "border-[#DDE4ED] bg-white text-[#52617D] hover:border-[#B8C7DA]"}`}>{category.name}</button>)}</div>
    <div className="grid border-b border-[#DDE4ED] xl:grid-cols-[minmax(0,1.5fr)_320px]"><section className="border-b border-[#DDE4ED] p-5 xl:border-b-0 xl:border-r"><div className="mb-4 flex items-start justify-between gap-4"><div><h4 className="text-[12px] font-bold text-[#172044]">{selectedCategory === "All" ? "Audience coverage trend" : `${selectedCategory} breakdown`}</h4><p className="mt-0.5 text-[10px] text-[#8A97AF]">{selectedCategory === "All" ? "Compare the coverage returned across each demographic dimension" : `Follower distribution within ${selectedCategory.toLowerCase()}`}</p></div><button type="button" onClick={() => setShowDetails(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[#B8D5F0] bg-[#F5F9FD] px-3 text-[10px] font-semibold text-[#0A66C2] hover:bg-[#EAF3FB]"><ArrowUpRight className="size-3" />View details</button></div><div className="h-80">{selectedCategory === "All" ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 16, right: 24, left: 4, bottom: 12 }}><CartesianGrid stroke="#E4EAF2" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} tick={{ fill: "#52617D", fontSize: 9 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#7B89A4", fontSize: 9 }} domain={[0, "dataMax + 20"]} /><Tooltip formatter={(value) => [Number(value).toLocaleString(), "Records"]} contentStyle={{ border: "1px solid #DDE4ED", borderRadius: 4, fontSize: 11 }} /><Line type="monotone" dataKey="value" stroke="#0A66C2" strokeWidth={3} dot={{ r: 5, fill: "#FFFFFF", stroke: "#0A66C2", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#0A66C2", stroke: "#FFFFFF", strokeWidth: 3 }} /></LineChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ right: 22, left: 28 }}><CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#7B89A4", fontSize: 9 }} /><YAxis type="category" dataKey="label" width={125} axisLine={false} tickLine={false} tick={{ fill: "#52617D", fontSize: 9 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString(), "Followers"]} contentStyle={{ border: "1px solid #DDE4ED", borderRadius: 4, fontSize: 11 }} /><Bar dataKey="value" fill="#0A66C2" radius={[0, 3, 3, 0]} barSize={14} /></BarChart></ResponsiveContainer>}</div></section><aside className="p-5"><p className="text-[9.5px] font-semibold uppercase text-[#7B89A4]">{selectedCategory === "All" ? "Total page followers" : `${selectedCategory} distribution`}</p><p className="mt-1 text-[28px] font-bold text-[#111B43]">{selectedCategory === "All" ? (totalFollowers === null ? "—" : totalFollowers.toLocaleString()) : total.toLocaleString()}</p><p className="text-[10px] text-[#8A97AF]">{selectedCategory === "All" ? `${categoryData.length} demographic categories available` : "Followers represented in this category"}</p><div className="relative mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="label" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">{chartData.map((item, index) => <Cell key={item.label} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => [Number(value).toLocaleString(), selectedCategory === "All" ? "Records" : "Followers"]} contentStyle={{ border: "1px solid #DDE4ED", borderRadius: 4, fontSize: 10 }} /></PieChart></ResponsiveContainer></div><div className="mt-2 space-y-2.5">{chartData.slice(0, 6).map((item, index) => <div key={item.label} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate text-[10px] font-medium text-[#52617D]">{item.label}</span></span><span className="text-[10.5px] font-bold text-[#172044]">{item.value}</span></div>)}</div></aside></div>
    {selectedCategory !== "All" && <div className="overflow-x-auto"><table className="w-full min-w-170 text-left"><thead><tr className="border-b border-[#E5EAF1] bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]"><th className="px-5 py-3">Audience segment</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Followers</th><th className="w-[32%] px-5 py-3">Share</th></tr></thead><tbody className="divide-y divide-[#EDF1F5]">{visibleMetrics.map((metric, index) => <tr key={`${metric.key}-${index}`} className="hover:bg-[#FAFCFE]"><td className="px-5 py-3 text-[11px] font-semibold text-[#253352]">{metric.label}</td><td className="px-4 py-3"><span className="inline-flex bg-[#EEF5FB] px-2 py-1 text-[9.5px] font-semibold text-[#0A66C2]">{metric.category}</span></td><td className="px-4 py-3 text-right text-[12px] font-bold text-[#172044]">{metric.value.toLocaleString()}</td><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7EDF4]"><div className="h-full rounded-full bg-[#2C7DC5]" style={{ width: `${Math.min(100, Math.max(2, metric.value / total * 100))}%` }} /></div><span className="w-10 text-right text-[9.5px] font-medium text-[#7B89A4]">{(metric.value / total * 100).toFixed(1)}%</span></div></td></tr>)}</tbody></table></div>}
    {showDetails && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 p-4" role="dialog" aria-modal="true" aria-label="Audience details"><div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden border border-[#D8E1EC] bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[#DDE4ED] px-5 py-4"><div><h3 className="text-[15px] font-bold text-[#172044]">{selectedCategory === "All" ? "Audience demographics overview" : `${selectedCategory} audience details`}</h3><p className="mt-0.5 text-[10.5px] text-[#7B89A4]">Complete live breakdown returned by LinkedIn</p></div><button type="button" onClick={() => setShowDetails(false)} title="Close" className="grid size-9 place-items-center border border-[#DDE4ED] text-[#52617D] hover:bg-[#F8FAFC]"><X className="size-4" /></button></header><div className="overflow-y-auto p-5"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={selectedCategory === "All" ? chartData : filteredMetrics} layout="vertical" margin={{ right: 30, left: 45 }}><CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#7B89A4", fontSize: 10 }} /><YAxis type="category" dataKey="label" width={150} axisLine={false} tickLine={false} tick={{ fill: "#52617D", fontSize: 10 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString(), selectedCategory === "All" ? "Records" : "Followers"]} /><Bar dataKey="value" fill="#0A66C2" radius={[0, 3, 3, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>{selectedCategory !== "All" && <div className="mt-5 grid gap-2 sm:grid-cols-2">{filteredMetrics.map((metric) => <div key={metric.key} className="flex items-center justify-between border border-[#E5EAF1] px-3 py-2.5"><span className="text-[10.5px] font-medium text-[#52617D]">{metric.label}</span><span className="text-[11px] font-bold text-[#172044]">{metric.value}</span></div>)}</div>}</div></div></div>}
  </div>;
}

function RestrictedDataset({ dataset, heading, description, icon: Icon }: { dataset: LinkedInDataset<unknown>; heading: string; description: string; icon: typeof BarChart3 }) {
  return <div className="bg-white"><div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center"><div className="grid size-12 place-items-center border border-[#C8DDF0] bg-[#F1F7FC] text-[#0A66C2]"><Icon className="size-5" /></div><h3 className="mt-4 text-[15px] font-bold text-[#172044]">{heading}</h3><p className="mt-2 max-w-xl text-[11px] leading-5 text-[#687797]">{description}</p><div className="mt-5 w-full max-w-2xl text-left"><DatasetNotice dataset={dataset} /></div></div></div>;
}

function Inbox({ dataset }: { dataset: LinkedInDashboardResponse["inbox"] }) {
  if (dataset.state !== "live") return <RestrictedDataset dataset={dataset} heading="LinkedIn page activity" description="LinkedIn does not expose a general private-message inbox. This area shows comments and reactions on company-page posts when Community Management feed permissions are approved." icon={MessageSquare} />;
  const comments: Array<Record<string, unknown> & { postId: string | null }> = dataset.data.flatMap((item) =>
    Array.isArray(item.comments) ? item.comments.map((comment) => ({ ...asRecord(comment), postId: toText(item.postId) })) : [],
  );
  return <div className="bg-white"><div className="border-b border-[#DDE4ED] px-5 py-4"><h3 className="text-[13px] font-bold text-[#172044]">Page conversations</h3><p className="mt-1 text-[10.5px] text-[#7B89A4]">Comments received on your recent LinkedIn posts</p></div>{comments.length === 0 ? <div className="px-5 py-12 text-center"><MessageSquare className="mx-auto size-6 text-[#A8B4C7]" /><p className="mt-3 text-[12px] font-semibold text-[#52617D]">No comments returned</p><p className="mt-1 text-[10.5px] text-[#8A97AF]">New company-page comments will appear here after the next sync.</p></div> : <div className="divide-y divide-[#E8EDF3]">{comments.map((comment, index) => <div key={toText(comment.id) || index} className="flex gap-3 px-5 py-4"><div className="grid size-8 shrink-0 place-items-center bg-[#EAF3FB] text-[#0A66C2]"><MessageSquare className="size-3.5" /></div><div className="min-w-0"><p className="text-[11.5px] leading-5 text-[#253352]">{toText(asRecord(comment.message).text) || "LinkedIn comment"}</p><p className="mt-1 truncate text-[9.5px] text-[#8A97AF]">Post: {comment.postId || "Unknown"}</p></div></div>)}</div>}</div>;
}

function Settings({ dashboard }: { dashboard: LinkedInDashboardResponse }) {
  const org = dashboard.organization.data;
  const rows = [["Organization name", toText(org.localizedName)], ["Vanity name", toText(org.vanityName)], ["Organization URN", dashboard.organizationUrn], ["Mapping ID", dashboard.mappingId], ["Last synced", new Date(dashboard.syncedAt).toLocaleString()]];
  return <div className="bg-white"><div className="border-b border-[#DDE4ED] px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#0A66C2]" /><h3 className="text-[13px] font-bold text-[#172044]">Mapped page configuration</h3></div><p className="mt-1 text-[10.5px] text-[#7B89A4]">Verified LinkedIn resource currently assigned to this client</p></div><dl className="divide-y divide-[#EDF1F5]">{rows.map(([label, value]) => <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[190px_1fr]"><dt className="text-[10.5px] font-semibold text-[#7B89A4]">{label}</dt><dd className="break-all text-[11.5px] font-medium text-[#253352]">{value || "Not returned"}</dd></div>)}</dl></div>;
}

export function LinkedInLiveTab({ tab }: { tab: LinkedInTab }) {
  const { companyId, clientId } = useTenancyContext();
  const [dashboard, setDashboard] = useState<LinkedInDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!companyId || !clientId) return;
    setLoading(true); setError(null);
    try { setDashboard(await integrationsApi.getLinkedInDashboard(companyId, clientId)); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Could not load LinkedIn page data."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!companyId || !clientId) return;
    let active = true;

    const fetchDashboard = async () => {
      try {
        const nextDashboard = await integrationsApi.getLinkedInDashboard(companyId, clientId);
        if (active) {
          setDashboard(nextDashboard);
          setError(null);
        }
      } catch (cause: unknown) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load LinkedIn page data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDashboard();
    return () => { active = false; };
  }, [companyId, clientId]);

  if (loading && !dashboard) return <div className="flex min-h-72 items-center justify-center border-y border-[#DDE4ED] bg-white"><div className="text-center"><Loader2 className="mx-auto size-5 animate-spin text-[#0A66C2]" /><p className="mt-3 text-[11px] text-[#687797]">Syncing LinkedIn page data...</p></div></div>;
  if (error || !dashboard) return <div className="border-l-4 border-red-500 bg-red-50 px-5 py-4"><p className="text-[12px] font-semibold text-red-800">LinkedIn data could not be loaded</p><p className="mt-1 text-[11px] text-red-700">{error}</p><button onClick={() => void load()} className="mt-3 inline-flex h-8 items-center gap-2 border border-red-200 bg-white px-3 text-[10.5px] font-semibold text-red-700"><RefreshCcw className="size-3" /> Retry</button></div>;

  const copy: Record<LinkedInTab, [string, string]> = {
    Overview: ["LinkedIn page overview", "Live company-page health, reach and data coverage"], Posts: ["Posts & content", "Published content retrieved directly from LinkedIn"],
    Analytics: ["Page analytics", "Views, clicks, impressions and content performance"], Audience: ["Audience", "Follower totals and professional demographics"],
    Campaigns: ["LinkedIn campaigns", "Advertising accounts and campaign performance"], Leads: ["Lead forms", "LinkedIn Lead Gen form responses"],
    Inbox: ["Page activity", "Comments and reactions across company-page posts"], Settings: ["LinkedIn settings", "Page mapping and live API configuration"],
  };

  return <section className="overflow-hidden border border-[#DDE4ED] bg-white shadow-[0_1px_3px_rgb(31_50_81/0.05)]">
    <PageToolbar title={copy[tab][0]} subtitle={copy[tab][1]} syncedAt={dashboard.syncedAt} onSync={() => void load()} syncing={loading} />
    {tab === "Overview" && <Overview dashboard={dashboard} />}
    {tab === "Posts" && <Posts dataset={dashboard.posts} social={dashboard.social} />}
    {tab === "Analytics" && <Analytics dashboard={dashboard} />}
    {tab === "Audience" && <Audience dataset={dashboard.followers} networkSize={dashboard.networkSize} />}
    {tab === "Campaigns" && <RestrictedDataset dataset={dashboard.campaigns} heading="Advertising API access required" description="Campaign data is separate from company-page data. Once LinkedIn approves r_ads and r_ads_reporting for this app, ad accounts and campaign performance can be shown here." icon={BarChart3} />}
    {tab === "Leads" && <RestrictedDataset dataset={dashboard.leads} heading="Lead Sync access required" description="Lead form responses require LinkedIn Lead Sync approval and the r_marketing_leadgen_automation permission. This is independent of page and advertising access." icon={Users} />}
    {tab === "Inbox" && <Inbox dataset={dashboard.inbox} />}
    {tab === "Settings" && <Settings dashboard={dashboard} />}
  </section>;
}
