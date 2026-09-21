"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, CheckCheck, Download, Eye, MoreHorizontal, Plus, X } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { buildNotificationsSnapshot } from "../data/provider";
import { campaignIntentCount, deliveryByChannel, kpis, scopedIntents } from "../data/selectors";
import type { Campaign, NotificationDelivery, NotificationEnvironment, NotificationIntent, NotificationRange, NotificationSnapshot, Preference, RecoveryRequest, Template } from "../data/types";

const BASE = ROUTES.superAdmin.notifications;
const tabs = [
  ["Overview", BASE],
  ["Notification Center", `${BASE}/center`],
  ["Compose & Campaigns", `${BASE}/compose`],
  ["Templates", `${BASE}/templates`],
  ["Delivery & Failures", `${BASE}/deliveries`],
  ["Audience & Preferences", `${BASE}/audience-preferences`],
  ["Rules & Automation", `${BASE}/rules-automation`],
  ["Activity & Settings", `${BASE}/activity-settings`],
] as const;

const tone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  scheduled: "border-sky-200 bg-sky-50 text-sky-700",
  dispatch_requested: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  provider_accepted: "border-cyan-200 bg-cyan-50 text-cyan-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  undeliverable: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-amber-200 bg-amber-50 text-amber-800",
  unread: "border-indigo-200 bg-indigo-50 text-indigo-700",
  read: "border-emerald-200 bg-emerald-50 text-emerald-700",
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

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Calcutta" }).format(new Date(value));
}

function csv(rows: Array<Record<string, string | number | null | boolean>>) {
  const keys = Object.keys(rows[0] ?? {});
  return [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
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
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" onClick={onClose}><div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><h2 className="text-sm font-bold text-[#111C3A]">{title}</h2><button ref={ref} onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button></div><div className="p-4">{children}</div></div></div>;
}

function Header({ snapshot, range, setRange, hours, setHours, companyScope, setCompanyScope, setEnvironment }: { snapshot: NotificationSnapshot; range: NotificationRange; setRange: (range: NotificationRange) => void; hours: number; setHours: (hours: number) => void; companyScope: string; setCompanyScope: (scope: string) => void; setEnvironment: (env: NotificationEnvironment) => void }) {
  return <div className="space-y-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h1 className="text-2xl font-bold text-[#111C3A]">Notifications</h1><p className="mt-1 text-sm text-slate-600">Manage platform notifications, recipient targeting, message templates and delivery operations.</p></div><div className="flex flex-wrap gap-2"><ButtonLink href={`${BASE}/compose`}><Plus className="size-4" />Compose Notification</ButtonLink><ButtonLink href={`${BASE}/center`}><Bell className="size-4" />Open Notification Center</ButtonLink><div className="group relative"><button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><MoreHorizontal className="size-4" />More</button><div className="invisible absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg group-hover:visible"><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/compose`}>View Campaigns</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/deliveries?state=failed`}>Review Delivery Failures</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/templates`}>Manage Templates</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/rules-automation`}>Review Notification Rules</Link><Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/activity-settings`}>Open Notification Settings</Link></div></div></div></div><Card className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Demo Notification Data</Badge><Badge className="border-slate-200 bg-slate-50 text-slate-700">External Delivery Channels Not Connected</Badge><span className="text-xs text-slate-500">Last updated: {fmtDate(snapshot.generatedAt)}</span></div><div className="flex flex-wrap gap-2"><select value={snapshot.environment} onChange={(e) => setEnvironment(e.target.value as NotificationEnvironment)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option></select><select value={range} onChange={(e) => setRange(e.target.value as NotificationRange)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="today">Today</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="custom">Custom</option></select>{range === "custom" ? <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs">Hours<input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))} className="w-16 border-0 bg-transparent p-0 outline-none" /></label> : null}<select value={companyScope} onChange={(e) => setCompanyScope(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="all">All companies</option><option value="platform">Platform scope</option>{Array.from(new Map(snapshot.recipients.filter((r) => r.companyId).map((r) => [r.companyId!, r.companyName!]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div></div></Card></div>;
}

function Tabs() {
  const pathname = usePathname();
  return <nav className="overflow-x-auto overflow-y-hidden border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><ul className="flex min-w-max gap-0.5">{tabs.map(([name, href]) => { const active = href === BASE ? pathname === BASE : pathname.startsWith(href); return <li key={href}><Link href={href} className={cn("relative inline-flex px-3 py-2 text-[13px] font-medium", active ? "text-[#111C3A]" : "text-slate-500 hover:text-[#111C3A]")}>{name}{active ? <span className="absolute inset-x-2 -bottom-px h-0.5 bg-[#111C3A]" /> : null}</Link></li>; })}</ul></nav>;
}

function KpiGrid({ snapshot, range, companyScope, hours }: { snapshot: NotificationSnapshot; range: NotificationRange; companyScope: string; hours: number }) {
  const m = kpis(snapshot, range, companyScope, hours);
  const rows = [["Notifications Created", m.created, "Unique notification intents"], ["In-App Unread", m.unread, "Receipt read state"], ["Scheduled Notifications", m.scheduled, "Frontend schedule records"], ["Dispatch Requested", m.dispatchRequested, "Dispatch intent only"], ["Provider Accepted", m.providerAccepted, "Not final delivery"], ["Confirmed Delivered", m.delivered, "Demo delivery records"], ["Failed Deliveries", m.failed, "Needs review"], ["Active Campaigns", m.activeCampaigns, "Scheduled or in progress"]];
  return <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">{rows.map(([title, value, hint]) => <Card key={title} className="p-3"><p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p><p className="mt-1 text-xl font-bold text-[#111C3A]">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></Card>)}</div>;
}

function ActivityTrend({ snapshot }: { snapshot: NotificationSnapshot }) {
  const buckets = Array.from({ length: 10 }, (_, index) => snapshot.intents.filter((_, row) => row % 10 === index));
  const max = Math.max(...buckets.map((bucket) => bucket.length), 1);
  return <Card className="flex h-full flex-col"><Title title="Notification Activity Trend" subtitle="Counts demo notification intent and delivery records." /><div className="flex min-h-36 flex-1 items-end gap-1 px-4 pt-3">{buckets.map((bucket, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-0.5"><div className="w-full rounded-t bg-rose-400" style={{ height: `${Math.max(4, (bucket.filter((intent) => intent.state === "dispatch_requested").length / max) * 100)}%` }} /><div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(14, (bucket.length / max) * 100)}%` }} /></div>)}</div><p className="px-4 pb-3 pt-2 text-[11px] text-slate-500">Green = intents created. Red = dispatch-requested subset. No external send is performed.</p></Card>;
}

function DeliveryChannelTable({ snapshot }: { snapshot: NotificationSnapshot }) {
  return <Card><Title title="Delivery By Channel" /><table className="w-full table-fixed text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="w-[24%] px-3 py-2">Channel</th><th className="px-2 py-2 text-right">Eligible</th><th className="px-2 py-2 text-right">Accepted</th><th className="px-2 py-2 text-right">Delivered</th><th className="px-2 py-2 text-right">Failed</th><th className="px-2 py-2 text-right">Unknown</th></tr></thead><tbody>{deliveryByChannel(snapshot).map((row) => <tr key={row.channel} className="border-b border-slate-100"><td className="px-3 py-2 text-xs font-bold text-[#111C3A]">{label(row.channel)}</td><td className="px-2 py-2 text-right text-xs">{row.eligible}</td><td className="px-2 py-2 text-right text-xs">{row.accepted}</td><td className="px-2 py-2 text-right text-xs">{row.delivered}</td><td className="px-2 py-2 text-right text-xs">{row.failed}</td><td className="px-2 py-2 text-right text-xs">{row.unknown}</td></tr>)}</tbody></table></Card>;
}

function IntentTable({ rows, onPreview, compact = false }: { rows: NotificationIntent[]; onPreview: (intent: NotificationIntent) => void; compact?: boolean }) {
  if (compact) return <table className="w-full table-fixed text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="w-[44%] px-3 py-2">Notification</th><th className="w-[22%] px-3 py-2">Scope</th><th className="w-[24%] px-3 py-2">Intent State</th><th className="w-[10%] px-3 py-2 text-right">Open</th></tr></thead><tbody>{rows.map((intent) => <tr key={intent.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><button onClick={() => onPreview(intent)} className="w-full text-left"><span className="line-clamp-2 text-xs font-bold text-[#111C3A]">{intent.title}</span><span className="block truncate text-[11px] text-slate-500">{intent.id} - {label(intent.category)}</span></button></td><td className="px-3 py-2 text-xs"><span className="line-clamp-2">{intent.companyName ?? "Platform"}</span></td><td className="px-3 py-2"><Badge className={tone[intent.state] ?? tone.draft}>{label(intent.state)}</Badge></td><td className="px-3 py-2 text-right"><Link href={`${BASE}/center/${intent.id}`} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>)}</tbody></table>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Notification</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Intent State</th><th className="px-3 py-2">Channels</th><th className="px-3 py-2">Created</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((intent) => <tr key={intent.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><button onClick={() => onPreview(intent)} className="text-left"><span className="block text-xs font-bold text-[#111C3A]">{intent.title}</span><span className="text-[11px] text-slate-500">{intent.id} - {label(intent.category)} - {intent.source}</span></button></td><td className="px-3 py-2 text-xs">{intent.companyName ?? "Platform"}</td><td className="px-3 py-2"><Badge className={tone[intent.state] ?? tone.draft}>{label(intent.state)}</Badge></td><td className="px-3 py-2 text-xs">{intent.channels.map(label).join(", ")}</td><td className="px-3 py-2 text-xs">{fmtDate(intent.createdAt)}</td><td className="px-3 py-2 text-right"><button onClick={() => onPreview(intent)} className="rounded-md border border-slate-200 p-1.5"><Eye className="size-3.5" /></button><Link href={`${BASE}/center/${intent.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>)}</tbody></table></div>;
}

function DeliveryTable({ snapshot, rows, onPreview }: { snapshot: NotificationSnapshot; rows: NotificationDelivery[]; onPreview: (delivery: NotificationDelivery) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Delivery</th><th className="px-3 py-2">Notification</th><th className="px-3 py-2">Recipient</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Last Activity</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((delivery) => { const intent = snapshot.intents.find((item) => item.id === delivery.intentId); const recipient = snapshot.recipients.find((item) => item.id === delivery.recipientId); return <tr key={delivery.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2 font-mono text-xs font-bold text-[#111C3A]">{delivery.id}</td><td className="px-3 py-2 text-xs">{intent?.title ?? "Unknown"}</td><td className="px-3 py-2 text-xs">{recipient?.name ?? "Unknown"}</td><td className="px-3 py-2 text-xs">{label(delivery.channel)}</td><td className="px-3 py-2"><Badge className={tone[delivery.state] ?? tone.unknown}>{label(delivery.state)}</Badge></td><td className="px-3 py-2 text-xs">{fmtDate(delivery.lastActivityAt)}</td><td className="px-3 py-2 text-right"><button onClick={() => onPreview(delivery)} className="rounded-md border border-slate-200 p-1.5"><Eye className="size-3.5" /></button><Link href={`${BASE}/deliveries/${delivery.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link></td></tr>; })}</tbody></table></div>;
}

function Overview({ snapshot, range, companyScope, hours, onPreviewIntent, onPreviewDelivery }: { snapshot: NotificationSnapshot; range: NotificationRange; companyScope: string; hours: number; onPreviewIntent: (intent: NotificationIntent) => void; onPreviewDelivery: (delivery: NotificationDelivery) => void }) {
  const intents = scopedIntents(snapshot, range, companyScope, hours);
  const failures = snapshot.deliveries.filter((delivery) => delivery.state === "failed" || delivery.state === "unknown").slice(0, 5);
  return <div className="space-y-1"><KpiGrid snapshot={snapshot} range={range} companyScope={companyScope} hours={hours} /><div className="grid items-stretch gap-1 xl:grid-cols-[1.2fr_0.8fr]"><ActivityTrend snapshot={snapshot} /><Card><Title title="Needs Attention" subtitle="Failures, unknown outcomes and unapproved templates." />{failures.map((delivery) => { const intent = snapshot.intents.find((item) => item.id === delivery.intentId); return <button key={delivery.id} onClick={() => onPreviewDelivery(delivery)} className="block w-full border-b border-slate-100 px-4 py-3 text-left text-xs hover:bg-slate-50"><p className="font-bold text-[#111C3A]">{intent?.title ?? delivery.id}</p><p className="text-slate-500">{label(delivery.channel)} - {label(delivery.state)} - {delivery.failureReason ?? "Review provider outcome"}</p></button>; })}</Card></div><div className="grid items-stretch gap-1 xl:grid-cols-2"><DeliveryChannelTable snapshot={snapshot} /><Card><Title title="Recent Notifications" /><IntentTable rows={intents.slice(0, 6)} onPreview={onPreviewIntent} compact /></Card></div><div className="grid gap-1 xl:grid-cols-2"><Campaigns snapshot={snapshot} compact /><ActivitySettings snapshot={snapshot} compact /></div></div>;
}

function NotificationCenter({ snapshot, rows, setRows, onPreview }: { snapshot: NotificationSnapshot; rows: NotificationIntent[]; setRows: (rows: NotificationIntent[]) => void; onPreview: (intent: NotificationIntent) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const filtered = rows.filter((intent) => (state === "all" || intent.state === state) && `${intent.id} ${intent.title} ${intent.companyName ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-1"><Card><Title title="Notification Center" subtitle="Notification intent directory separate from per-recipient delivery records." action={<button onClick={() => download("notifications.csv", csv(filtered.map((n) => ({ id: n.id, title: n.title, state: n.state, company: n.companyName, channels: n.channels.join("|") }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button>} /><div className="flex flex-wrap gap-2 border-b border-slate-100 p-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notification ID, title or company" className="min-w-64 flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs" /><select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All states</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="dispatch_requested">Dispatch requested</option><option value="completed">Completed</option></select></div>{filtered.length ? <IntentTable rows={filtered} onPreview={onPreview} /> : <Empty title="No Matching Notifications" body="Adjust search or intent state filters." />}</Card><InAppInbox snapshot={snapshot} setRows={setRows} /></div>;
}

function InAppInbox({ snapshot, setRows }: { snapshot: NotificationSnapshot; setRows: (rows: NotificationIntent[]) => void }) {
  const [receipts, setReceipts] = useState(snapshot.receipts);
  const markAll = () => setReceipts((prev) => prev.map((receipt) => ({ ...receipt, state: "read", readAt: snapshot.generatedAt })));
  return <Card><Title title="In-App Inbox" subtitle="Demo read state updates locally; global bell consistency remains with existing shared mock API." action={<button onClick={markAll} disabled={!receipts.some((receipt) => receipt.state === "unread")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"><CheckCheck className="size-4" />Mark All Read</button>} />{receipts.length ? <div className="divide-y divide-slate-100">{receipts.map((receipt) => { const intent = snapshot.intents.find((item) => item.id === receipt.intentId); return <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div><p className="text-xs font-bold text-[#111C3A]">{intent?.title}</p><p className="text-xs text-slate-500">{receipt.id} - {fmtDate(receipt.createdAt)}</p></div><div className="flex items-center gap-2"><Badge className={tone[receipt.state]}>{label(receipt.state)}</Badge><button onClick={() => { setReceipts((prev) => prev.map((item) => item.id === receipt.id ? { ...item, state: "read", readAt: snapshot.generatedAt } : item)); setRows(snapshot.intents); }} disabled={receipt.state === "read"} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50">Mark Read</button></div></div>; })}</div> : <Empty title="No In-App Receipts" body="Demo receipts will appear here when an in-app notification exists." />}</Card>;
}

function Compose({ snapshot, intents, setIntents, campaigns, setCampaigns }: { snapshot: NotificationSnapshot; intents: NotificationIntent[]; setIntents: (rows: NotificationIntent[]) => void; campaigns: Campaign[]; setCampaigns: (rows: Campaign[]) => void }) {
  const [audienceId, setAudienceId] = useState(snapshot.audiences[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(snapshot.templates[0]?.id ?? "");
  const [title, setTitle] = useState("Demo notification draft");
  const [channels, setChannels] = useState(["in_app"]);
  const [subject, setSubject] = useState(snapshot.templates[0]?.versions.at(-1)?.subject ?? "");
  const [body, setBody] = useState(snapshot.templates[0]?.versions.at(-1)?.body ?? "");
  const [scheduleAt, setScheduleAt] = useState("2026-09-22T10:00");
  const [saved, setSaved] = useState(false);
  const audience = snapshot.audiences.find((item) => item.id === audienceId);
  const template = snapshot.templates.find((item) => item.id === templateId);
  useEffect(() => {
    const latest = template?.versions.at(-1);
    setSubject(latest?.subject ?? "");
    setBody(latest?.body ?? "");
  }, [templateId, template]);
  const eligible = (audience?.recipientIds ?? []).filter((id) => snapshot.recipients.find((r) => r.id === id && channels.every((channel) => Boolean(r.verified[channel as keyof typeof r.verified]))));
  const excluded = (audience?.recipientIds.length ?? 0) - eligible.length;
  const channelReady = channels.map((channel) => ({ channel, eligible: (audience?.recipientIds ?? []).filter((id) => Boolean(snapshot.recipients.find((r) => r.id === id)?.verified[channel as keyof typeof snapshot.recipients[number]["verified"]])).length }));
  const makeIntent = (state: NotificationIntent["state"], scheduledFor: string | null): NotificationIntent => ({ id: `ntf_demo_${intents.length + 1}`, title, category: template?.category ?? "announcement", state, source: "manual", companyId: audience?.companyId ?? null, companyName: snapshot.recipients.find((r) => r.companyId === audience?.companyId)?.companyName ?? null, campaignId: null, templateId, audienceId, channels: channels as NotificationIntent["channels"], createdAt: snapshot.generatedAt, scheduledFor, relatedHref: null, createdBy: "Frontend Demo", message: body });
  const saveDraft = () => { setIntents([makeIntent("draft", null), ...intents]); setSaved(true); };
  const saveSchedule = () => { setIntents([makeIntent("scheduled", new Date(scheduleAt).toISOString()), ...intents]); setSaved(true); };
  const createCampaign = () => { const next: Campaign = { id: `cmpgn-demo-${campaigns.length + 1}`, name: title, state: scheduleAt ? "scheduled" : "draft", audienceId, companyId: audience?.companyId ?? null, channels: channels as Campaign["channels"], createdAt: snapshot.generatedAt, scheduledFor: scheduleAt ? new Date(scheduleAt).toISOString() : null, owner: "Frontend Demo" }; setCampaigns([next, ...campaigns]); setSaved(true); };
  return <div className="grid gap-1 xl:grid-cols-[1fr_0.8fr]"><Card><Title title="Compose Notification" subtitle="Creates demo draft or schedule records only; no external dispatch occurs." /><div className="space-y-3 p-4"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><div className="grid gap-1 md:grid-cols-2"><select value={audienceId} onChange={(e) => setAudienceId(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">{snapshot.audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">{snapshot.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="grid gap-1 sm:grid-cols-4">{(["in_app", "email", "whatsapp", "push"] as const).map((channel) => <label key={channel} className="rounded-md border border-slate-200 p-2 text-xs font-semibold"><input type="checkbox" className="mr-2" checked={channels.includes(channel)} onChange={(e) => setChannels((prev) => e.target.checked ? [...prev, channel] : prev.filter((item) => item !== channel))} />{label(channel)}</label>)}</div><div className="grid gap-1 sm:grid-cols-3"><Mini label="Audience" value={audience?.name ?? "-"} /><Mini label="Eligible recipients" value={String(eligible.length)} /><Mini label="Excluded" value={String(excluded)} /></div><div className="grid gap-1 sm:grid-cols-4">{channelReady.map((row) => <Mini key={row.channel} label={`${label(row.channel)} ready`} value={String(row.eligible)} />)}</div><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject / headline" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Channel content" className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><label className="block text-xs font-semibold text-slate-600">Demo schedule time<input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /></label>{excluded > 0 ? <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{excluded} recipient(s) excluded because one or more selected channels are unavailable.</div> : null}{saved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">Demo record saved. No real email, WhatsApp or push delivery was sent.</div> : null}<div className="flex flex-wrap gap-2"><button onClick={saveDraft} disabled={!title || !channels.length} className="rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save Draft</button><button onClick={saveSchedule} disabled={!scheduleAt || !channels.length} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save Demo Schedule</button><button onClick={createCampaign} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Create Campaign</button></div></div></Card><Card><Title title="Live Preview" subtitle="Preview uses the edited content and selected channels." /><div className="p-4"><p className="text-xs font-bold text-[#111C3A]">{subject}</p><p className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{body}</p><p className="mt-2 text-[11px] text-slate-500">Channels: {channels.map(label).join(", ")}. External delivery channels are not connected from this frontend-only composer.</p></div></Card><Campaigns snapshot={{ ...snapshot, campaigns }} compact={false} /></div>;
}

function Campaigns({ snapshot, compact = false }: { snapshot: NotificationSnapshot; compact?: boolean }) {
  return <Card><Title title={compact ? "Recent Campaigns" : "Campaigns"} /><div className="divide-y divide-slate-100">{snapshot.campaigns.slice(0, compact ? 4 : undefined).map((campaign) => <Link key={campaign.id} href={`${BASE}/campaigns/${campaign.id}`} className="block px-4 py-3 hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{campaign.name}</p><Badge className={tone[campaign.state] ?? tone.draft}>{label(campaign.state)}</Badge></div><p className="mt-1 text-xs text-slate-500">{campaign.channels.map(label).join(", ")} - intents {campaignIntentCount(snapshot, campaign)} - {fmtDate(campaign.createdAt)}</p></Link>)}</div></Card>;
}

function Templates({ templates, setTemplates }: { templates: Template[]; setTemplates: (templates: Template[]) => void }) {
  return <Card><Title title="Templates" subtitle="Versions are appended; historical notification content is not rewritten." action={<button onClick={() => setTemplates([{ ...templates[0]!, id: `tpl-demo-${templates.length + 1}`, name: "New demo template", state: "draft" }, ...templates])} className="rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white">New Draft</button>} /><div className="divide-y divide-slate-100">{templates.map((template) => <Link key={template.id} href={`${BASE}/templates/${template.id}`} className="block px-4 py-3 hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{template.name}</p><Badge className={tone[template.state] ?? tone.unknown}>{label(template.state)}</Badge></div><p className="mt-1 text-xs text-slate-500">{template.channels.map(label).join(", ")} - variables {template.variables.join(", ")} - v{template.versions.at(-1)?.version}</p></Link>)}</div></Card>;
}

function TemplateEditor({ template, templates, setTemplates }: { template: Template; templates: Template[]; setTemplates: (templates: Template[]) => void }) {
  const latest = template.versions.at(-1);
  const [subject, setSubject] = useState(latest?.subject ?? "");
  const [body, setBody] = useState(latest?.body ?? "");
  const invalidVariables = Array.from(`${subject} ${body}`.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => match[1]?.trim() ?? "").filter((variable) => !template.variables.includes(variable));
  const saveVersion = () => {
    const nextVersion = { version: (latest?.version ?? 0) + 1, createdAt: new Date().toISOString(), subject, body };
    setTemplates(templates.map((item) => item.id === template.id ? { ...item, state: "draft", versions: [...item.versions, nextVersion] } : item));
  };
  return <Card><Title title="Template Editor" subtitle="Adds a new draft version; old versions remain unchanged." action={<button onClick={saveVersion} disabled={!subject || !body || invalidVariables.length > 0} className="rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save Template Version</button>} /><div className="grid gap-1 p-4 xl:grid-cols-[1fr_0.8fr]"><div className="space-y-3"><input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">Allowed variables: {template.variables.join(", ") || "None"}</div>{invalidVariables.length ? <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">Invalid variables: {invalidVariables.join(", ")}</div> : null}</div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-[#111C3A]">{subject}</p><p className="mt-2 text-sm text-slate-600">{body}</p><p className="mt-3 text-[11px] text-slate-500">Preview only. It does not mutate historic notifications.</p></div></div></Card>;
}

function Deliveries({ snapshot, onPreview }: { snapshot: NotificationSnapshot; onPreview: (delivery: NotificationDelivery) => void }) {
  const params = useSearchParams();
  const initialState = params.get("state") ?? "all";
  const [state, setState] = useState(initialState);
  const rows = snapshot.deliveries.filter((delivery) => state === "all" || delivery.state === state);
  return <Card><Title title="Delivery & Failures" subtitle="Delivery records are distinct from attempts and notification intents." action={<button onClick={() => download("notification-deliveries.csv", csv(rows.map((d) => ({ id: d.id, intentId: d.intentId, channel: d.channel, state: d.state, recoveryRequested: d.recoveryRequested }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button>} /><div className="border-b border-slate-100 p-3"><select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All delivery states</option><option value="provider_accepted">Provider accepted</option><option value="delivered">Delivered</option><option value="failed">Failed</option><option value="unknown">Unknown</option></select></div><DeliveryTable snapshot={snapshot} rows={rows} onPreview={onPreview} /></Card>;
}

function AudiencePreferences({ snapshot, preferences, setPreferences }: { snapshot: NotificationSnapshot; preferences: Preference[]; setPreferences: (preferences: Preference[]) => void }) {
  return <div className="grid gap-1 xl:grid-cols-[0.9fr_1.1fr]"><Card><Title title="Audience Directory" /><div className="divide-y divide-slate-100">{snapshot.audiences.map((audience) => <div key={audience.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{audience.name}</p><p className="text-xs text-slate-500">{audience.description} - recipients {audience.recipientIds.length}</p></div>)}</div></Card><Card><Title title="Preference Matrix" subtitle="Required policy rows cannot be bypassed by optional opt-out." /><div className="divide-y divide-slate-100">{preferences.map((pref) => { const recipient = snapshot.recipients.find((item) => item.id === pref.recipientId); return <div key={pref.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div><p className="text-xs font-bold text-[#111C3A]">{recipient?.name}</p><p className="text-xs text-slate-500">{label(pref.category)} - {label(pref.channel)}</p></div><select value={pref.state} disabled={pref.state === "required"} onChange={(e) => setPreferences(preferences.map((item) => item.id === pref.id ? { ...item, state: e.target.value as Preference["state"] } : item))} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"><option value="allowed">Allowed</option><option value="opted_out">Opted Out</option><option value="unavailable">Unavailable</option><option value="required">Required</option></select></div>; })}</div></Card></div>;
}

function RulesAutomation({ snapshot }: { snapshot: NotificationSnapshot }) {
  const [rules, setRules] = useState(snapshot.rules);
  return <Card><Title title="Rules & Automation" subtitle="Demo rule drafts do not enable backend automation." action={<button onClick={() => setRules([{ id: `rule_demo_${rules.length + 1}`, name: "Demo event rule", eventType: "system.maintenance_scheduled", enabled: false, templateId: snapshot.templates[0]?.id ?? "", channels: ["in_app"], readiness: "ready" }, ...rules])} className="rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white">Save Notification Rule</button>} /><div className="divide-y divide-slate-100">{rules.map((rule) => <div key={rule.id} className="px-4 py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{rule.name}</p><Badge className={rule.readiness === "ready" ? tone.completed : tone.unknown}>{label(rule.readiness)}</Badge></div><p className="mt-1 text-xs text-slate-500">{rule.eventType} - {rule.channels.map(label).join(", ")} - {rule.enabled ? "Enabled" : "Draft/disabled"}</p></div>)}</div></Card>;
}

function ActivitySettings({ snapshot, compact = false }: { snapshot: NotificationSnapshot; compact?: boolean }) {
  return <Card><Title title={compact ? "Recent Activity" : "Activity & Settings"} subtitle={compact ? undefined : "Configuration shown here is frontend demo policy state."} /><div className="divide-y divide-slate-100">{snapshot.activity.slice(0, compact ? 4 : undefined).map((item) => <div key={item.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{item.action}</p><p className="text-xs text-slate-500">{item.actor} - {item.target} - {fmtDate(item.at)}</p></div>)}</div>{!compact ? <div className="grid gap-1 p-4 sm:grid-cols-3"><Mini label="Email provider" value="Demo reference only" /><Mini label="WhatsApp" value="Not connected" /><Mini label="Push" value="Demo unavailable" /></div> : null}</Card>;
}

function Detail({ snapshot, id, type, templates, setTemplates, setDeliveries, recoveryRequests, setRecoveryRequests }: { snapshot: NotificationSnapshot; id?: string; type: "notification" | "campaign" | "template" | "delivery"; templates: Template[]; setTemplates: (templates: Template[]) => void; setDeliveries: (rows: NotificationDelivery[]) => void; recoveryRequests: RecoveryRequest[]; setRecoveryRequests: (rows: RecoveryRequest[]) => void }) {
  if (type === "notification") { const intent = snapshot.intents.find((item) => item.id === id); if (!intent) return <NotFound title="Notification Not Found" href={`${BASE}/center`} />; const rows = snapshot.deliveries.filter((delivery) => delivery.intentId === intent.id); return <div className="space-y-1"><Back href={`${BASE}/center`} label="Back to Notification Center" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{intent.title}</h2><p className="mt-1 text-sm text-slate-600">{intent.message}</p><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Intent State" value={label(intent.state)} /><Mini label="Scope" value={intent.companyName ?? "Platform"} /><Mini label="Channels" value={intent.channels.map(label).join(", ")} /><Mini label="Source" value={label(intent.source)} /></div></Card><Card><Title title="Delivery Summary" /><DeliveryTable snapshot={snapshot} rows={rows} onPreview={() => undefined} /></Card></div>; }
  if (type === "campaign") { const campaign = snapshot.campaigns.find((item) => item.id === id); if (!campaign) return <NotFound title="Campaign Not Found" href={`${BASE}/compose`} />; return <div className="space-y-1"><Back href={`${BASE}/compose`} label="Back to Campaigns" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{campaign.name}</h2><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="State" value={label(campaign.state)} /><Mini label="Owner" value={campaign.owner} /><Mini label="Scheduled" value={fmtDate(campaign.scheduledFor)} /><Mini label="Intents" value={String(campaignIntentCount(snapshot, campaign))} /></div></Card></div>; }
  if (type === "template") { const template = templates.find((item) => item.id === id); if (!template) return <NotFound title="Template Not Found" href={`${BASE}/templates`} />; return <div className="space-y-1"><Back href={`${BASE}/templates`} label="Back to Templates" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{template.name}</h2><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="State" value={label(template.state)} /><Mini label="Channels" value={template.channels.map(label).join(", ")} /><Mini label="Variables" value={String(template.variables.length)} /><Mini label="Latest Version" value={`v${template.versions.at(-1)?.version}`} /></div></Card><TemplateEditor template={template} templates={templates} setTemplates={setTemplates} /><Card><Title title="Version History" /><div className="divide-y divide-slate-100">{template.versions.map((version) => <div key={version.version} className="px-4 py-3"><p className="text-xs font-bold">v{version.version} - {version.subject}</p><p className="text-xs text-slate-500">{version.body}</p></div>)}</div></Card></div>; }
  const delivery = snapshot.deliveries.find((item) => item.id === id); if (!delivery) return <NotFound title="Delivery Not Found" href={`${BASE}/deliveries`} />; const intent = snapshot.intents.find((item) => item.id === delivery.intentId); const attempts = snapshot.attempts.filter((attempt) => attempt.deliveryId === delivery.id); const requestRecovery = () => { setDeliveries(snapshot.deliveries.map((row) => row.id === delivery.id ? { ...row, recoveryRequested: true } : row)); setRecoveryRequests([{ id: `rec_${recoveryRequests.length + 1}`, deliveryId: delivery.id, requestedAt: new Date().toISOString(), requestedBy: "Frontend Demo", reason: delivery.failureReason ?? "Manual delivery outcome review" }, ...recoveryRequests]); }; return <div className="space-y-1"><Back href={`${BASE}/deliveries`} label="Back to Deliveries" /><Card className="p-4"><h2 className="text-xl font-bold text-[#111C3A]">{delivery.id}</h2><p className="mt-1 text-sm text-slate-600">{intent?.title}</p><div className="mt-4 grid gap-1 sm:grid-cols-4"><Mini label="Channel" value={label(delivery.channel)} /><Mini label="State" value={label(delivery.state)} /><Mini label="Provider Ref" value={delivery.providerReference ?? "Unavailable"} /><Mini label="Recovery" value={delivery.recoveryRequested ? "Requested" : "Not requested"} /></div><button onClick={requestRecovery} disabled={delivery.recoveryRequested} className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">Request Manual Recovery</button></Card><Card><Title title="Attempt History" subtitle="Attempt count remains separate from delivery count." />{attempts.length ? <div className="divide-y divide-slate-100">{attempts.map((attempt) => <div key={attempt.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{label(attempt.state)}</p><p className="text-xs text-slate-500">{attempt.summary} - {fmtDate(attempt.at)}</p></div>)}</div> : <Empty title="No Attempts" body="No provider attempt exists for this delivery record." />}</Card><Card><Title title="Recovery Requests" subtitle="Requests do not create fake successful provider attempts." />{recoveryRequests.filter((request) => request.deliveryId === delivery.id).length ? <div className="divide-y divide-slate-100">{recoveryRequests.filter((request) => request.deliveryId === delivery.id).map((request) => <div key={request.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{request.id}</p><p className="text-xs text-slate-500">{request.reason} - {fmtDate(request.requestedAt)}</p></div>)}</div> : <Empty title="No Recovery Requests" body="Use request manual recovery to create a frontend demo review record." />}</Card></div>;
}

function IntentPreview({ intent, snapshot, onClose }: { intent: NotificationIntent | null; snapshot: NotificationSnapshot; onClose: () => void }) {
  if (!intent) return null;
  const deliveries = snapshot.deliveries.filter((delivery) => delivery.intentId === intent.id);
  return <Drawer title={intent.title} open={Boolean(intent)} onClose={onClose}><div className="space-y-1"><p className="text-sm text-slate-600">{intent.message}</p><div className="grid gap-1 sm:grid-cols-3"><Mini label="Intent" value={label(intent.state)} /><Mini label="Deliveries" value={String(deliveries.length)} /><Mini label="Scope" value={intent.companyName ?? "Platform"} /></div><ButtonLink href={`${BASE}/center/${intent.id}`}>Open Notification</ButtonLink></div></Drawer>;
}

function DeliveryPreview({ delivery, snapshot, setDeliveries, recoveryRequests, setRecoveryRequests, onClose }: { delivery: NotificationDelivery | null; snapshot: NotificationSnapshot; setDeliveries: (rows: NotificationDelivery[]) => void; recoveryRequests: RecoveryRequest[]; setRecoveryRequests: (rows: RecoveryRequest[]) => void; onClose: () => void }) {
  if (!delivery) return null;
  const intent = snapshot.intents.find((item) => item.id === delivery.intentId);
  const requestRecovery = () => { setDeliveries(snapshot.deliveries.map((row) => row.id === delivery.id ? { ...row, recoveryRequested: true } : row)); setRecoveryRequests([{ id: `rec_${recoveryRequests.length + 1}`, deliveryId: delivery.id, requestedAt: new Date().toISOString(), requestedBy: "Frontend Demo", reason: delivery.failureReason ?? "Manual delivery outcome review" }, ...recoveryRequests]); };
  return <Drawer title={delivery.id} open={Boolean(delivery)} onClose={onClose}><div className="space-y-1"><p className="text-sm text-slate-600">{intent?.title}</p><div className="grid gap-1 sm:grid-cols-3"><Mini label="Channel" value={label(delivery.channel)} /><Mini label="State" value={label(delivery.state)} /><Mini label="Provider Ref" value={delivery.providerReference ?? "Unavailable"} /></div>{delivery.failureReason ? <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{delivery.failureReason}</div> : null}<div className="flex flex-wrap gap-2"><ButtonLink href={`${BASE}/deliveries/${delivery.id}`}>Open Delivery</ButtonLink><button onClick={requestRecovery} disabled={delivery.recoveryRequested} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">Request Recovery</button></div></div></Drawer>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">{label}</p><p className="truncate text-xs font-bold text-[#111C3A]">{value}</p></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="m-4 rounded-lg border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-[#111C3A]">{title}</p><p className="mt-1 text-xs text-slate-500">{body}</p></div>;
}

function Back({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#111C3A]"><ArrowLeft className="size-4" />{label}</Link>;
}

function NotFound({ title, href }: { title: string; href: string }) {
  return <Card className="p-8 text-center"><h2 className="text-lg font-bold text-[#111C3A]">{title}</h2><p className="mt-1 text-sm text-slate-600">This demo record is not available in the current notification dataset.</p><div className="mt-3"><ButtonLink href={href}>Return</ButtonLink></div></Card>;
}

export function NotificationsOperationsCenter({ page = "overview", notificationId, campaignId, templateId, deliveryId }: { page?: "overview" | "center" | "notification" | "compose" | "campaign" | "templates" | "template" | "deliveries" | "delivery" | "audience" | "rules" | "activity"; notificationId?: string; campaignId?: string; templateId?: string; deliveryId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [environment, setEnvironment] = useState<NotificationEnvironment>((search.get("env") as NotificationEnvironment) || "production");
  const [range, setRange] = useState<NotificationRange>((search.get("range") as NotificationRange) || "7d");
  const [hours, setHours] = useState(Number(search.get("hours")) || 24);
  const [companyScope, setCompanyScope] = useState(search.get("company") || "all");
  const baseSnapshot = useMemo(() => buildNotificationsSnapshot(environment), [environment]);
  const [intents, setIntents] = useState(baseSnapshot.intents);
  const [deliveries, setDeliveries] = useState(baseSnapshot.deliveries);
  const [campaigns, setCampaigns] = useState(baseSnapshot.campaigns);
  const [templates, setTemplates] = useState(baseSnapshot.templates);
  const [preferences, setPreferences] = useState(baseSnapshot.preferences);
  const [recoveryRequests, setRecoveryRequests] = useState(baseSnapshot.recoveryRequests);
  const [intentPreview, setIntentPreview] = useState<NotificationIntent | null>(null);
  const [deliveryPreview, setDeliveryPreview] = useState<NotificationDelivery | null>(null);
  const snapshot = { ...baseSnapshot, intents, deliveries, campaigns, templates, preferences, recoveryRequests };
  const rows = scopedIntents(snapshot, range, companyScope, hours);
  const replaceParam = (key: string, value: string) => { const p = new URLSearchParams(search.toString()); p.set(key, value); router.replace(`${window.location.pathname}?${p.toString()}`); };
  return <div className="space-y-1"><Header snapshot={snapshot} range={range} setRange={(next) => { setRange(next); replaceParam("range", next); }} hours={hours} setHours={(next) => { setHours(next); replaceParam("hours", String(next)); }} companyScope={companyScope} setCompanyScope={(next) => { setCompanyScope(next); replaceParam("company", next); }} setEnvironment={(next) => { setEnvironment(next); replaceParam("env", next); }} /><Tabs />{page === "overview" ? <Overview snapshot={snapshot} range={range} companyScope={companyScope} hours={hours} onPreviewIntent={setIntentPreview} onPreviewDelivery={setDeliveryPreview} /> : null}{page === "center" ? <NotificationCenter snapshot={snapshot} rows={rows} setRows={setIntents} onPreview={setIntentPreview} /> : null}{page === "notification" ? <Detail snapshot={snapshot} id={notificationId} type="notification" templates={templates} setTemplates={setTemplates} setDeliveries={setDeliveries} recoveryRequests={recoveryRequests} setRecoveryRequests={setRecoveryRequests} /> : null}{page === "compose" ? <Compose snapshot={snapshot} intents={intents} setIntents={setIntents} campaigns={campaigns} setCampaigns={setCampaigns} /> : null}{page === "campaign" ? <Detail snapshot={snapshot} id={campaignId} type="campaign" templates={templates} setTemplates={setTemplates} setDeliveries={setDeliveries} recoveryRequests={recoveryRequests} setRecoveryRequests={setRecoveryRequests} /> : null}{page === "templates" ? <Templates templates={templates} setTemplates={setTemplates} /> : null}{page === "template" ? <Detail snapshot={snapshot} id={templateId} type="template" templates={templates} setTemplates={setTemplates} setDeliveries={setDeliveries} recoveryRequests={recoveryRequests} setRecoveryRequests={setRecoveryRequests} /> : null}{page === "deliveries" ? <Deliveries snapshot={snapshot} onPreview={setDeliveryPreview} /> : null}{page === "delivery" ? <Detail snapshot={snapshot} id={deliveryId} type="delivery" templates={templates} setTemplates={setTemplates} setDeliveries={setDeliveries} recoveryRequests={recoveryRequests} setRecoveryRequests={setRecoveryRequests} /> : null}{page === "audience" ? <AudiencePreferences snapshot={snapshot} preferences={preferences} setPreferences={setPreferences} /> : null}{page === "rules" ? <RulesAutomation snapshot={snapshot} /> : null}{page === "activity" ? <ActivitySettings snapshot={snapshot} /> : null}<IntentPreview intent={intentPreview} snapshot={snapshot} onClose={() => setIntentPreview(null)} /><DeliveryPreview delivery={deliveryPreview} snapshot={snapshot} setDeliveries={setDeliveries} recoveryRequests={recoveryRequests} setRecoveryRequests={setRecoveryRequests} onClose={() => setDeliveryPreview(null)} /></div>;
}
