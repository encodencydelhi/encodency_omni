"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, Copy, Download, Eye, MoreHorizontal, Search, Settings, X } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { buildApiMonitoringSnapshot } from "../data/observability-provider";
import { endpointLabel, endpointStats, errorGroupMembers, kpis, requestsInRange, serviceStats, statusClass } from "../data/observability-selectors";
import type { ApiEnvironment, ApiMonitoringConfig, ApiMonitoringSnapshot, ApiRateLimit, ApiRequest, ApiService, ApiTimeRange } from "../data/observability-types";

const BASE = ROUTES.superAdmin.apiMonitoring;
const tabs = [
  ["Overview", BASE],
  ["API Explorer", `${BASE}/explorer`],
  ["Requests & Errors", `${BASE}/requests`],
  ["Performance", `${BASE}/performance`],
  ["Availability & SLIs", `${BASE}/availability`],
  ["Rate Limits", `${BASE}/rate-limits`],
  ["Dependencies & Integrations", `${BASE}/dependencies`],
  ["Activity & Settings", `${BASE}/activity-settings`],
] as const;

const statusTone: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  redirect: "border-sky-200 bg-sky-50 text-sky-700",
  client_error: "border-amber-200 bg-amber-50 text-amber-800",
  rate_limited: "border-violet-200 bg-violet-50 text-violet-700",
  server_error: "border-rose-200 bg-rose-50 text-rose-700",
};

function Card({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function Title({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>{subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}</div>{action}</div>;
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">{children}</Link>;
}

function fmtDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Calcutta" }).format(new Date(value));
}

function fmtPct(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function csv(rows: Array<Record<string, string | number | null>>) {
  const keys = Object.keys(rows[0] ?? {});
  return [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
}

function download(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" onClick={onClose}><div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><h2 className="text-sm font-bold text-[#111C3A]">{title}</h2><button ref={ref} type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button></div><div className="p-4">{children}</div></div></div>;
}

function Skeleton() {
  return <div className="space-y-1"><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Card key={i} className="h-24 animate-pulse bg-slate-50" />)}</div><div className="grid gap-1 xl:grid-cols-2"><Card className="h-72 animate-pulse bg-slate-50" /><Card className="h-72 animate-pulse bg-slate-50" /></div></div>;
}

function Header({ snapshot, range, setRange, customHours, setCustomHours, serviceId, setServiceId, setEnvironment }: { snapshot: ApiMonitoringSnapshot; range: ApiTimeRange; setRange: (range: ApiTimeRange) => void; customHours: number; setCustomHours: (hours: number) => void; serviceId: string; setServiceId: (id: string) => void; setEnvironment: (env: ApiEnvironment) => void }) {
  const latest = snapshot.requests.map((r) => r.startedAt).sort().at(-1) ?? null;
  return <div className="space-y-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h1 className="text-2xl font-bold text-[#111C3A]">API Monitoring</h1><p className="mt-1 text-sm text-slate-600">Monitor API traffic, performance, availability and request failures across OmniPlatform.</p></div><div className="flex flex-wrap gap-2"><ButtonLink href={`${BASE}/explorer`}><Activity className="size-4" />Explore APIs</ButtonLink><ButtonLink href={`${BASE}/requests`}><Search className="size-4" />Inspect Requests</ButtonLink><div className="group relative"><button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><MoreHorizontal className="size-4" />More</button><div className="invisible absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg group-hover:visible"><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/requests?status=5xx`}>View API Errors</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/performance?slow=true`}>Review Slow Endpoints</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/rate-limits`}>View Rate Limits</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/activity-settings`}>View Monitoring Coverage</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={ROUTES.superAdmin.systemHealth}>Open System Health</Link></div></div></div></div><Card className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Demo API Telemetry</Badge><Badge className="border-slate-200 bg-slate-50 text-slate-700">Production Monitoring Not Connected</Badge><span className="text-xs text-slate-500">Last recorded request: {fmtDate(latest)} - {snapshot.timezone}</span></div><div className="flex flex-wrap gap-2"><select value={snapshot.environment} onChange={(e) => setEnvironment(e.target.value as ApiEnvironment)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option></select><select value={range} onChange={(e) => setRange(e.target.value as ApiTimeRange)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="15m">Last 15 Minutes</option><option value="1h">Last 1 Hour</option><option value="24h">Last 24 Hours</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="custom">Custom Range</option></select>{range === "custom" ? <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">Hours<input type="number" min={1} max={720} value={customHours} onChange={(e) => setCustomHours(Math.max(1, Number(e.target.value) || 1))} className="w-16 border-0 bg-transparent p-0 text-xs font-semibold outline-none" /></label> : null}<select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="all">All API services</option>{snapshot.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div></Card></div>;
}

function Tabs() {
  const pathname = usePathname();
  return <nav className="overflow-x-auto overflow-y-hidden border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="API Monitoring sections"><ul className="flex min-w-max gap-0.5">{tabs.map(([name, href]) => { const active = href === BASE ? pathname === BASE : pathname.startsWith(href); return <li key={href}><Link href={href} className={cn("relative inline-flex px-3 py-2 text-[13px] font-medium", active ? "text-[#111C3A]" : "text-slate-500 hover:text-[#111C3A]")}>{name}{active ? <span className="absolute inset-x-2 -bottom-px h-0.5 bg-[#111C3A]" /> : null}</Link></li>; })}</ul></nav>;
}

function KpiGrid({ snapshot, range, serviceId, customMinutes }: { snapshot: ApiMonitoringSnapshot; range: ApiTimeRange; serviceId: string; customMinutes?: number }) {
  const m = kpis(snapshot, range, serviceId, customMinutes);
  const rows = [["Total Requests", m.total, "Recorded HTTP requests"], ["HTTP 2xx Rate", fmtPct(m.http2xxRate), "Success classification"], ["HTTP 5xx Rate", fmtPct(m.http5xxRate), "Server-side errors"], ["P95 Latency", m.p95 ? `${m.p95} ms` : "Insufficient data", "Request-level percentile"], ["Throttled Requests", m.throttled, "HTTP 429"], ["Observed API Services", m.observed, "Distinct services with traffic"], ["Slow Endpoints", m.slow, "P95 above target"], ["Monitoring Gaps", m.gaps, "No observations in period"]];
  return <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">{rows.map(([title, value, hint]) => <Card key={title} className="p-3"><p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p><p className="mt-1 text-xl font-bold text-[#111C3A]">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></Card>)}</div>;
}

function Trend({ rows }: { rows: ApiRequest[] }) {
  const buckets = Array.from({ length: 12 }, (_, i) => rows.filter((_, index) => index % 12 === i));
  const max = Math.max(...buckets.map((b) => b.length), 1);
  return <Card className="flex h-full flex-col"><Title title="Request Traffic & Errors" subtitle="Series derive from recorded demo request timestamps." /><div className="flex min-h-28 flex-1 items-end gap-1 px-4 pt-3">{buckets.map((bucket, i) => <div key={i} className="flex h-full flex-1 flex-col justify-end gap-0.5"><div className="w-full rounded-t bg-rose-400" style={{ height: `${Math.max(3, (bucket.filter((r) => r.statusCode >= 500).length / max) * 100)}%` }} /><div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(12, (bucket.length / max) * 100)}%` }} /></div>)}</div><div className="px-4 pb-3 pt-2 text-[11px] text-slate-500">Green = total observed requests. Red = HTTP 5xx subset. Missing data is not counted as healthy.</div></Card>;
}

function LatencyDistribution({ rows }: { rows: ApiRequest[] }) {
  const bands = [
    ["< 500 ms", rows.filter((row) => row.durationMs < 500).length],
    ["500-1000 ms", rows.filter((row) => row.durationMs >= 500 && row.durationMs < 1000).length],
    ["1-2 sec", rows.filter((row) => row.durationMs >= 1000 && row.durationMs < 2000).length],
    ["2-3 sec", rows.filter((row) => row.durationMs >= 2000 && row.durationMs < 3000).length],
    [">= 3 sec", rows.filter((row) => row.durationMs >= 3000).length],
  ] as const;
  const max = Math.max(...bands.map(([, count]) => count), 1);
  return <Card className="h-full"><Title title="Latency Distribution" subtitle={`Sample count ${rows.length}. Empty bands remain visible.`} /><div className="space-y-2 p-4">{bands.map(([name, count]) => <div key={name} className="grid grid-cols-[82px_1fr_36px] items-center gap-2 text-xs"><span className="text-slate-500">{name}</span><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-[#111C3A]" style={{ width: `${Math.max(4, (count / max) * 100)}%` }} /></div><span className="text-right font-semibold text-[#111C3A]">{count}</span></div>)}</div></Card>;
}

function ServiceTable({ snapshot, rows, onPreview }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; onPreview: (service: ApiService) => void }) {
  const data = serviceStats(snapshot, rows);
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">API Service</th><th className="px-3 py-2">Requests</th><th className="px-3 py-2">HTTP 5xx</th><th className="px-3 py-2">P95</th><th className="px-3 py-2">429</th><th className="px-3 py-2">Freshness</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{data.map(({ service, requests, rate5xx, p95, throttled, freshness }) => <tr key={service.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><button onClick={() => onPreview(service)} className="text-left"><span className="block text-xs font-bold text-[#111C3A]">{service.name}</span><span className="text-[11px] text-slate-500">{service.category}</span></button></td><td className="px-3 py-2 text-xs">{requests}</td><td className="px-3 py-2 text-xs">{fmtPct(rate5xx)}</td><td className="px-3 py-2 text-xs">{p95 ? `${p95} ms` : "No sample"}</td><td className="px-3 py-2 text-xs">{throttled}</td><td className="px-3 py-2"><Badge className={freshness === "fresh" ? statusTone.success : "border-slate-200 bg-slate-100 text-slate-600"}>{label(freshness)}</Badge></td><td className="px-3 py-2 text-right"><button onClick={() => onPreview(service)} className="rounded-md border border-slate-200 p-1.5"><Eye className="size-3.5" /></button><Link href={`${BASE}/explorer/services/${service.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>)}</tbody></table></div>;
}

function EndpointTable({ snapshot, rows, serviceId = "all" }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; serviceId?: string }) {
  const data = endpointStats(snapshot, rows).filter((row) => serviceId === "all" || row.endpoint.serviceId === serviceId);
  if (!data.length) return <Empty title="No Endpoints Registered" body="No endpoint records match the selected service." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Endpoint</th><th className="px-3 py-2">Requests</th><th className="px-3 py-2">P50</th><th className="px-3 py-2">P95</th><th className="px-3 py-2">P99</th><th className="px-3 py-2">HTTP 5xx</th><th className="px-3 py-2">Last Seen</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody>{data.map(({ endpoint, requests, p50, p95, p99, rate5xx, lastSeen }) => <tr key={endpoint.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><span className="font-mono text-xs font-bold text-[#111C3A]">{endpoint.method}</span><span className="ml-2 text-xs text-slate-700">{endpoint.path}</span><p className="text-[11px] text-slate-500">{endpoint.name}</p></td><td className="px-3 py-2 text-xs">{requests}</td><td className="px-3 py-2 text-xs">{p50 ? `${p50} ms` : "-"}</td><td className="px-3 py-2 text-xs">{p95 ? `${p95} ms` : "-"}</td><td className="px-3 py-2 text-xs">{p99 ? `${p99} ms` : "Insufficient sample"}</td><td className="px-3 py-2 text-xs">{fmtPct(rate5xx)}</td><td className="px-3 py-2 text-xs">{fmtDate(lastSeen)}</td><td className="px-3 py-2 text-right"><Link href={`${BASE}/explorer/endpoints/${endpoint.id}`} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>)}</tbody></table></div>;
}

function RequestTable({ snapshot, rows, onPreview }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; onPreview: (request: ApiRequest) => void }) {
  void snapshot;
  if (!rows.length) return <Empty title="No Matching Requests" body="Adjust the filters or selected time range." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Request</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Latency</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Trace</th><th className="px-3 py-2">Started</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((request) => <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><button onClick={() => onPreview(request)} className="text-left"><span className="block font-mono text-xs font-bold text-[#111C3A]">{request.method} {request.path}</span><span className="text-[11px] text-slate-500">{request.requestId}</span></button></td><td className="px-3 py-2"><Badge className={statusTone[statusClass(request.statusCode)]}>{request.statusCode} {label(statusClass(request.statusCode))}</Badge></td><td className="px-3 py-2 text-xs text-right">{request.durationMs} ms</td><td className="px-3 py-2 text-xs">{request.companyName ?? "Platform"}{request.clientName ? ` - ${request.clientName}` : ""}</td><td className="px-3 py-2 text-xs">{request.traceId ? "Available" : "No trace"}</td><td className="px-3 py-2 text-xs">{fmtDate(request.startedAt)}</td><td className="px-3 py-2 text-right"><button onClick={() => onPreview(request)} className="rounded-md border border-slate-200 p-1.5"><Eye className="size-3.5" /></button><Link href={`${BASE}/requests/${request.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>)}</tbody></table></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-[#111C3A]">{title}</p><p className="mt-1 text-xs text-slate-500">{body}</p></div>;
}

function Overview({ snapshot, range, serviceId, rows, onPreviewService, onPreviewRequest }: { snapshot: ApiMonitoringSnapshot; range: ApiTimeRange; serviceId: string; rows: ApiRequest[]; onPreviewService: (service: ApiService) => void; onPreviewRequest: (request: ApiRequest) => void }) {
  const attention = endpointStats(snapshot, rows).filter((row) => row.rate5xx > 0 || row.throttled > 0 || (row.p95 && row.p95 > row.endpoint.p95TargetMs)).slice(0, 6);
  const errors = rows.filter((row) => row.statusCode >= 500 || row.statusCode === 429).slice(0, 8);
  return <div className="space-y-1"><KpiGrid snapshot={snapshot} range={range} serviceId={serviceId} /><div className="grid items-stretch gap-1 xl:grid-cols-[1.2fr_0.8fr]"><Trend rows={rows} /><Card className="h-full"><Title title="Endpoints Needing Attention" subtitle="Criteria: 5xx, slow P95, throttling or missing data." />{attention.map((row) => <Link key={row.endpoint.id} href={`${BASE}/explorer/endpoints/${row.endpoint.id}`} className="block border-b border-slate-100 px-4 py-3 text-xs hover:bg-slate-50"><p className="font-bold text-[#111C3A]">{endpointLabel(row.endpoint)}</p><p className="text-slate-500">P95 {row.p95 ?? "-"} ms - 5xx {fmtPct(row.rate5xx)} - 429 {row.throttled}</p></Link>)}</Card></div><div className="grid items-stretch gap-1 xl:grid-cols-2"><Card className="h-full"><Title title="API Service Summary" /><ServiceTable snapshot={snapshot} rows={rows} onPreview={onPreviewService} /></Card><Card className="h-full"><Title title="Recent API Errors" /><div className="max-h-[360px] overflow-y-auto"><RequestTable snapshot={snapshot} rows={errors} onPreview={onPreviewRequest} /></div></Card></div><div className="grid gap-1 xl:grid-cols-2"><RateLimitPage snapshot={snapshot} compact /><Coverage snapshot={snapshot} /></div></div>;
}

function Explorer({ snapshot, rows, onPreviewService }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; onPreviewService: (service: ApiService) => void }) {
  const [query, setQuery] = useState("");
  const services = snapshot.services.filter((service) => `${service.name} ${service.category}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-1"><Card><Title title="API Explorer" subtitle="Registered API services and endpoint directory." action={<button onClick={() => download("api-services.csv", csv(services.map((s) => ({ id: s.id, name: s.name, category: s.category, owner: s.ownerTeam }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button>} /><div className="border-b border-slate-100 p-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search API services" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs" /></div><ServiceTable snapshot={{ ...snapshot, services }} rows={rows} onPreview={onPreviewService} /></Card><Card><Title title="Endpoint Directory" /><EndpointTable snapshot={snapshot} rows={rows} /></Card></div>;
}

function ServiceDetail({ snapshot, rows, serviceId }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; serviceId: string }) {
  const service = snapshot.services.find((item) => item.id === serviceId);
  if (!service) return <NotFound title="API Service Not Found" href={`${BASE}/explorer`} />;
  const filtered = rows.filter((request) => request.serviceId === service.id);
  const stats = serviceStats(snapshot, rows).find((item) => item.service.id === service.id);
  return <div className="space-y-1"><Back href={`${BASE}/explorer`} label="Back to API Explorer" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{service.name}</h2><p className="mt-1 text-sm text-slate-600">{service.description}</p><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Requests" value={String(stats?.requests ?? 0)} /><Mini label="HTTP 5xx" value={fmtPct(stats?.rate5xx ?? 0)} /><Mini label="P95" value={stats?.p95 ? `${stats.p95} ms` : "No sample"} /><Mini label="Owner" value={service.ownerTeam} /></div></Card><div className="grid gap-1 xl:grid-cols-2"><Card><Title title="Registered Endpoints" /><EndpointTable snapshot={snapshot} rows={filtered} serviceId={service.id} /></Card><Card><Title title="Recent Requests" /><RequestTable snapshot={snapshot} rows={filtered.slice(0, 12)} onPreview={() => undefined} /></Card></div></div>;
}

function EndpointDetail({ snapshot, rows, endpointId }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; endpointId: string }) {
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId);
  if (!endpoint) return <NotFound title="Endpoint Not Found" href={`${BASE}/explorer`} />;
  const matching = rows.filter((request) => request.endpointId === endpoint.id);
  const stat = endpointStats(snapshot, rows).find((item) => item.endpoint.id === endpoint.id);
  return <div className="space-y-1"><Back href={`${BASE}/explorer`} label="Back to API Explorer" /><Card className="p-4"><h2 className="font-mono text-lg font-bold text-[#111C3A]">{endpoint.method} {endpoint.path}</h2><p className="text-sm text-slate-600">{endpoint.name}</p><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Request Count" value={String(stat?.requests ?? 0)} /><Mini label="P50" value={stat?.p50 ? `${stat.p50} ms` : "-"} /><Mini label="P95" value={stat?.p95 ? `${stat.p95} ms` : "-"} /><Mini label="P99" value={stat?.p99 ? `${stat.p99} ms` : "Insufficient sample"} /></div></Card><Card><Title title="Recent Matching Requests" /><RequestTable snapshot={snapshot} rows={matching} onPreview={() => undefined} /></Card></div>;
}

function Requests({ snapshot, rows, onPreview }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[]; onPreview: (request: ApiRequest) => void }) {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => (status === "all" || (status === "5xx" ? row.statusCode >= 500 : status === "429" ? row.statusCode === 429 : status === "4xx" ? row.statusCode >= 400 && row.statusCode < 500 : row.statusCode < 300)) && `${row.requestId} ${row.path} ${row.companyName ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-1"><Card><Title title="Requests & Errors" subtitle="Sanitized request metadata, status classification and trace availability." action={<button onClick={() => download("api-requests.csv", csv(filtered.map((r) => ({ requestId: r.requestId, method: r.method, path: r.path, statusCode: r.statusCode, durationMs: r.durationMs, company: r.companyName, traceId: r.traceId }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button>} /><div className="flex flex-wrap gap-2 border-b border-slate-100 p-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search request, endpoint or company" className="min-w-64 flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All statuses</option><option value="2xx">HTTP 2xx</option><option value="4xx">HTTP 4xx</option><option value="5xx">HTTP 5xx</option><option value="429">HTTP 429</option></select></div><RequestTable snapshot={snapshot} rows={filtered} onPreview={onPreview} /></Card><ErrorGroups snapshot={snapshot} /></div>;
}

function RequestDetail({ snapshot, requestId }: { snapshot: ApiMonitoringSnapshot; requestId: string }) {
  const request = snapshot.requests.find((item) => item.id === requestId);
  if (!request) return <NotFound title="Request Not Found" href={`${BASE}/requests`} />;
  const endpoint = snapshot.endpoints.find((item) => item.id === request.endpointId);
  const spans = request.traceId ? snapshot.traces.filter((span) => span.traceId === request.traceId) : [];
  return <div className="space-y-1"><Back href={`${BASE}/requests`} label="Back to Requests" /><Card className="p-4"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-mono text-lg font-bold text-[#111C3A]">{request.requestId}</h2><p className="text-sm text-slate-600">{request.method} {request.path}</p></div><Badge className={statusTone[statusClass(request.statusCode)]}>{request.statusCode} {label(statusClass(request.statusCode))}</Badge></div><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Latency" value={`${request.durationMs} ms`} /><Mini label="Scope" value={request.companyName ?? "Platform"} /><Mini label="Endpoint" value={endpoint?.name ?? "Unknown"} /><Mini label="Trace" value={request.traceId ? "Available" : "Missing"} /></div></Card><div className="grid gap-1 xl:grid-cols-2"><Card><Title title="Sanitized Request & Response" subtitle="Tokens, cookies and private payloads are redacted." /><KeyValues data={{ ...request.sanitizedRequest, ...request.sanitizedResponse }} /></Card><Card><Title title="Trace & Dependencies" subtitle={spans.length ? "Demo span relationships only." : "No trace data. No waterfall is fabricated."} />{spans.length ? <Trace spans={spans} /> : <Empty title="No Traces" body="This request has no trace ID in demo telemetry." />}</Card></div><Card><Title title="Technical Context" /><KeyValues data={{ requestId: request.requestId, correlationId: request.correlationId, relatedJobId: request.relatedJobId, relatedWebhookId: request.relatedWebhookId }} /></Card></div>;
}

function ErrorGroups({ snapshot }: { snapshot: ApiMonitoringSnapshot }) {
  return <Card><Title title="Error Groups" subtitle="Occurrence counts derive from matching request records." /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Group</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Occurrences</th><th className="px-3 py-2">Last Seen</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody>{snapshot.errorGroups.map((group) => { const members = errorGroupMembers(snapshot, group.id); return <tr key={group.id} className="border-b border-slate-100"><td className="px-3 py-2"><p className="text-xs font-bold text-[#111C3A]">{group.title}</p><p className="text-[11px] text-slate-500">{group.explanation}</p></td><td className="px-3 py-2"><Badge className={group.category === "server_error" ? statusTone.server_error : group.category === "rate_limit" ? statusTone.rate_limited : statusTone.client_error}>{label(group.category)}</Badge></td><td className="px-3 py-2 text-xs">{members.length}</td><td className="px-3 py-2 text-xs">{fmtDate(group.lastSeenAt)}</td><td className="px-3 py-2 text-right"><Link href={`${BASE}/requests/errors/${group.id}`} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>; })}</tbody></table></div></Card>;
}

function ErrorDetail({ snapshot, errorId }: { snapshot: ApiMonitoringSnapshot; errorId: string }) {
  const group = snapshot.errorGroups.find((item) => item.id === errorId);
  if (!group) return <NotFound title="Error Group Not Found" href={`${BASE}/requests`} />;
  const members = errorGroupMembers(snapshot, group.id);
  return <div className="space-y-1"><Back href={`${BASE}/requests`} label="Back to Requests" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{group.title}</h2><p className="mt-1 text-sm text-slate-600">{group.explanation}</p><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Occurrences" value={String(members.length)} /><Mini label="Category" value={label(group.category)} /><Mini label="First Seen" value={fmtDate(group.firstSeenAt)} /><Mini label="Last Seen" value={fmtDate(group.lastSeenAt)} /></div></Card><Card><Title title="Member Requests" /><RequestTable snapshot={snapshot} rows={members} onPreview={() => undefined} /></Card></div>;
}

function Performance({ snapshot, rows }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[] }) {
  return <div className="space-y-1"><Card><Title title="Performance" subtitle="P95/P99 are computed from eligible request-level observations." /><EndpointTable snapshot={snapshot} rows={rows} /></Card><Trend rows={rows} /></div>;
}

function Availability({ snapshot, rows }: { snapshot: ApiMonitoringSnapshot; rows: ApiRequest[] }) {
  const data = endpointStats(snapshot, rows);
  return <Card><Title title="Availability & SLIs" subtitle="Unmonitored intervals are shown as gaps, not healthy uptime." /><div className="grid gap-1 p-4 sm:grid-cols-2 lg:grid-cols-4">{data.map(({ endpoint, requests }) => { const ok = rows.filter((r) => r.endpointId === endpoint.id && r.statusCode < 500).length; const availability = requests ? (ok / requests) * 100 : null; return <div key={endpoint.id} className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="font-mono text-xs font-bold text-[#111C3A]">{endpoint.method} {endpoint.path}</p><p className="mt-1 text-lg font-bold">{availability === null ? "Unmonitored" : fmtPct(availability)}</p><p className="text-[11px] text-slate-500">{endpoint.sloTarget ? `SLO target ${endpoint.sloTarget}%` : "No configured SLO"}</p></div>; })}</div></Card>;
}

function RateLimitPage({ snapshot, compact = false }: { snapshot: ApiMonitoringSnapshot; compact?: boolean }) {
  return <Card><Title title={compact ? "Rate-Limit Activity" : "Rate Limits"} subtitle="Missing provider capacity is never invented." action={!compact ? <button onClick={() => download("api-rate-limits.csv", csv(snapshot.rateLimits.map((r) => ({ bucket: r.bucket, limit: r.limit, used: r.used, remaining: r.remaining, source: r.source }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button> : null} /><div className="divide-y divide-slate-100">{snapshot.rateLimits.map((limit) => <div key={limit.id} className="px-4 py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{limit.bucket}</p><Badge className={limit.remaining === null ? statusTone.client_error : limit.remaining <= limit.used * 0.1 ? statusTone.rate_limited : statusTone.success}>{limit.remaining === null ? "Capacity Unknown" : `${limit.remaining} remaining`}</Badge></div><p className="mt-1 text-xs text-slate-600">Used {limit.used} / {limit.limit ?? "unknown"} in {limit.window}. Source: {label(limit.source)}</p></div>)}</div></Card>;
}

function Dependencies({ snapshot }: { snapshot: ApiMonitoringSnapshot }) {
  return <Card><Title title="Dependencies & Integrations" subtitle="API Monitoring shows dependency request impact; ownership remains in dedicated modules." /><div className="divide-y divide-slate-100">{snapshot.dependencies.map((dep) => <Link key={dep.id} href={dep.href} className="block px-4 py-3 hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{dep.name}</p><Badge className={dep.freshness === "fresh" ? statusTone.success : "border-amber-200 bg-amber-50 text-amber-800"}>{label(dep.freshness)}</Badge></div><p className="mt-1 text-xs text-slate-600">{dep.summary}</p><p className="mt-1 text-[11px] text-slate-500">Owner module: {label(dep.ownerModule)}</p></Link>)}</div></Card>;
}

function ActivitySettings({ snapshot, config, setConfig }: { snapshot: ApiMonitoringSnapshot; config: ApiMonitoringConfig; setConfig: (config: ApiMonitoringConfig) => void }) {
  const [draft, setDraft] = useState(config);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  useEffect(() => { if (!dirty) return undefined; const h = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  return <div className="grid gap-1 xl:grid-cols-[1fr_0.9fr]"><Card><Title title="Monitoring Activity" /><div className="divide-y divide-slate-100">{snapshot.activity.map((a) => <div key={a.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{a.type}</p><p className="text-xs text-slate-600">{a.message}</p><p className="mt-1 text-[11px] text-slate-500">{fmtDate(a.at)} - {a.source}</p></div>)}</div></Card><Card><Title title="Activity & Settings" subtitle="Demo configuration saves locally; backend enforcement comes later." />{saved ? <div className="mx-4 mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">Supported demo monitoring configuration saved.</div> : null}<div className="space-y-3 p-4"><label className="flex items-center justify-between gap-3 text-xs font-semibold">Capture query params<input type="checkbox" checked={draft.captureQueryParams} onChange={(e) => setDraft({ ...draft, captureQueryParams: e.target.checked })} /></label><label className="flex items-center justify-between gap-3 text-xs font-semibold">Capture body preview<input type="checkbox" checked={draft.captureBodyPreview} onChange={(e) => setDraft({ ...draft, captureBodyPreview: e.target.checked })} /></label><label className="text-xs font-semibold">Slow request threshold<input type="number" value={draft.slowRequestThresholdMs} onChange={(e) => setDraft({ ...draft, slowRequestThresholdMs: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /></label><button onClick={() => { setConfig(draft); setSaved(true); }} disabled={!dirty} className="w-full rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Settings className="mr-1 inline size-4" />Save Supported Demo Monitoring Configuration</button><Coverage snapshot={snapshot} /></div></Card></div>;
}

function Coverage({ snapshot }: { snapshot: ApiMonitoringSnapshot }) {
  return <Card><Title title="Monitoring Coverage" subtitle="Source-aware coverage; demo fixtures are not production instrumentation." /><div className="divide-y divide-slate-100">{snapshot.sources.map((source) => <div key={source.id} className="px-4 py-3"><div className="flex justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{source.name}</p><Badge className={source.backendConnected ? statusTone.success : "border-indigo-200 bg-indigo-50 text-indigo-700"}>{source.backendConnected ? "Backend Connected" : "Demo Only"}</Badge></div><p className="mt-1 text-xs text-slate-600">Last observed {fmtDate(source.lastObservedAt)} - threshold {source.freshnessThresholdMinutes} min</p></div>)}</div></Card>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">{label}</p><p className="truncate text-xs font-bold text-[#111C3A]">{value}</p></div>;
}

function KeyValues({ data }: { data: Record<string, unknown> }) {
  return <div className="grid gap-1 p-4 sm:grid-cols-2">{Object.entries(data).map(([k, v]) => <div key={k} className="rounded-md border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">{label(k)}</p><p className="break-all font-mono text-xs text-[#111C3A]">{String(v ?? "Not recorded")}</p></div>)}</div>;
}

function Trace({ spans }: { spans: ApiMonitoringSnapshot["traces"] }) {
  return <div className="space-y-1 p-4">{spans.map((span) => <div key={span.id} className="rounded-md border border-slate-200 p-2"><div className="flex justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{span.parentId ? "Child span" : "Root span"}: {span.name}</p><Badge className={span.status === "ok" ? statusTone.success : statusTone.server_error}>{span.status}</Badge></div><p className="mt-1 text-xs text-slate-600">{span.serviceName} - {span.durationMs} ms - parent {span.parentId ?? "none"}</p></div>)}</div>;
}

function Back({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#111C3A]"><ArrowLeft className="size-4" />{label}</Link>;
}

function NotFound({ title, href }: { title: string; href: string }) {
  return <Card className="p-8 text-center"><AlertTriangle className="mx-auto size-8 text-amber-500" /><h2 className="mt-3 text-lg font-bold text-[#111C3A]">{title}</h2><p className="mt-1 text-sm text-slate-600">The requested record is not available in the selected demo telemetry set.</p><ButtonLink href={href}>Return</ButtonLink></Card>;
}

function ServicePreview({ service, snapshot, onClose }: { service: ApiService | null; snapshot: ApiMonitoringSnapshot; onClose: () => void }) {
  if (!service) return null;
  const serviceEndpoints = snapshot.endpoints.filter((endpoint) => endpoint.serviceId === service.id);
  return <Drawer title={service.name} open={Boolean(service)} onClose={onClose}><div className="space-y-1"><p className="text-sm text-slate-600">{service.description}</p><div className="grid gap-1 sm:grid-cols-3"><Mini label="Category" value={service.category} /><Mini label="Endpoints" value={String(serviceEndpoints.length)} /><Mini label="Owner" value={service.ownerTeam} /></div><ButtonLink href={`${BASE}/explorer/services/${service.id}`}>Open Service</ButtonLink></div></Drawer>;
}

function RequestPreview({ request, snapshot, onClose }: { request: ApiRequest | null; snapshot: ApiMonitoringSnapshot; onClose: () => void }) {
  void snapshot;
  if (!request) return null;
  return <Drawer title={request.requestId} open={Boolean(request)} onClose={onClose}><div className="space-y-1"><div className="grid gap-1 sm:grid-cols-3"><Mini label="Status" value={`${request.statusCode}`} /><Mini label="Latency" value={`${request.durationMs} ms`} /><Mini label="Trace" value={request.traceId ? "Available" : "Missing"} /></div><KeyValues data={{ requestId: request.requestId, correlationId: request.correlationId, company: request.companyName, sanitized: "Tokens, cookies and payload secrets redacted" }} /><div className="flex gap-2"><button onClick={() => navigator.clipboard.writeText(request.requestId)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Copy className="mr-1 inline size-4" />Copy Request ID</button><ButtonLink href={`${BASE}/requests/${request.id}`}>Open Request</ButtonLink>{request.relatedJobId ? <ButtonLink href={ROUTES.superAdmin.jobs}>Open Related Job</ButtonLink> : null}</div></div></Drawer>;
}

export function ApiMonitoringOperationsCenter({ page = "overview", serviceId: serviceParam, endpointId, requestId, errorId }: { page?: "overview" | "explorer" | "service" | "endpoint" | "requests" | "request" | "error" | "performance" | "availability" | "rate" | "dependencies" | "activity"; serviceId?: string; endpointId?: string; requestId?: string; errorId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [environment, setEnvironmentState] = useState<ApiEnvironment>((search.get("env") as ApiEnvironment) || "production");
  const [range, setRange] = useState<ApiTimeRange>((search.get("range") as ApiTimeRange) || "24h");
  const [serviceId, setServiceId] = useState(search.get("service") || "all");
  const [loading, setLoading] = useState(true);
  const snapshot = useMemo(() => buildApiMonitoringSnapshot(environment), [environment]);
  const [config, setConfig] = useState(snapshot.config);
  const [servicePreview, setServicePreview] = useState<ApiService | null>(null);
  const [requestPreview, setRequestPreview] = useState<ApiRequest | null>(null);
  const rows = requestsInRange(snapshot, range, serviceId);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 160); return () => window.clearTimeout(timer); }, [environment, range, serviceId, page]);
  function setEnv(env: ApiEnvironment) { setLoading(true); setEnvironmentState(env); const p = new URLSearchParams(search.toString()); p.set("env", env); router.replace(`${window.location.pathname}?${p.toString()}`); }
  return <div className="space-y-1"><Header snapshot={snapshot} range={range} setRange={(r) => { setLoading(true); setRange(r); }} serviceId={serviceId} setServiceId={(id) => { setLoading(true); setServiceId(id); }} setEnvironment={setEnv} /><Tabs />{loading ? <Skeleton /> : null}{!loading && page === "overview" ? <Overview snapshot={snapshot} range={range} serviceId={serviceId} rows={rows} onPreviewService={setServicePreview} onPreviewRequest={setRequestPreview} /> : null}{!loading && page === "explorer" ? <Explorer snapshot={snapshot} rows={rows} onPreviewService={setServicePreview} /> : null}{!loading && page === "service" && serviceParam ? <ServiceDetail snapshot={snapshot} rows={rows} serviceId={serviceParam} /> : null}{!loading && page === "endpoint" && endpointId ? <EndpointDetail snapshot={snapshot} rows={rows} endpointId={endpointId} /> : null}{!loading && page === "requests" ? <Requests snapshot={snapshot} rows={rows} onPreview={setRequestPreview} /> : null}{!loading && page === "request" && requestId ? <RequestDetail snapshot={snapshot} requestId={requestId} /> : null}{!loading && page === "error" && errorId ? <ErrorDetail snapshot={snapshot} errorId={errorId} /> : null}{!loading && page === "performance" ? <Performance snapshot={snapshot} rows={rows} /> : null}{!loading && page === "availability" ? <Availability snapshot={snapshot} rows={rows} /> : null}{!loading && page === "rate" ? <RateLimitPage snapshot={snapshot} /> : null}{!loading && page === "dependencies" ? <Dependencies snapshot={snapshot} /> : null}{!loading && page === "activity" ? <ActivitySettings snapshot={snapshot} config={config} setConfig={setConfig} /> : null}<ServicePreview service={servicePreview} snapshot={snapshot} onClose={() => setServicePreview(null)} /><RequestPreview request={requestPreview} snapshot={snapshot} onClose={() => setRequestPreview(null)} /></div>;
}
