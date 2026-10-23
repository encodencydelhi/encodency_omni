"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, Download, Eye, Loader2, Megaphone, RefreshCw, RotateCcw, Send, X } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { useScrollLock } from "@/lib/utils/scroll-lock";
import { notificationsRepository } from "../data/repository";
import { rangeMinutes, scopedIntents } from "../data/selectors";
import type { AnnouncementAudience, NotificationDelivery, NotificationIntent, NotificationRange, NotificationSnapshot } from "../data/types";

const BASE = ROUTES.superAdmin.notifications;
const QUERY_KEY = ["super-admin-notifications", "snapshot"] as const;
const tabs = [
  ["Overview", BASE],
  ["Notification Center", `${BASE}/center`],
  ["Announcements", `${BASE}/compose`],
  ["Templates", `${BASE}/templates`],
  ["Delivery & Failures", `${BASE}/deliveries`],
  ["Audience & Routing", `${BASE}/audience-preferences`],
  ["Rules", `${BASE}/rules-automation`],
  ["Activity & Settings", `${BASE}/activity-settings`],
] as const;

const tone: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  dispatch_requested: "border-indigo-200 bg-indigo-50 text-indigo-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  provider_accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  queued: "border-sky-200 bg-sky-50 text-sky-700",
  attempting: "border-sky-200 bg-sky-50 text-sky-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  not_created: "border-slate-200 bg-slate-50 text-slate-700",
  unknown: "border-amber-200 bg-amber-50 text-amber-800",
  unread: "border-indigo-200 bg-indigo-50 text-indigo-700",
  read: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

/** Plain words for engine states. "Sent" means the mail server accepted it; inbox delivery is never claimed. */
const STATE_LABEL: Record<string, string> = {
  completed: "Done",
  dispatch_requested: "Sending",
  delivered: "In bell",
  provider_accepted: "Sent",
  queued: "Waiting",
  attempting: "Sending",
  failed: "Failed",
  not_created: "Not sent",
  unknown: "Unknown",
  unread: "Unread",
  read: "Read",
};

const CHANNEL_LABEL: Record<string, string> = { in_app: "Bell", email: "E-mail", whatsapp: "WhatsApp", push: "Push" };

const errorText = (e: unknown, fallback: string) => (ApiError.isApiError(e) ? e.message : e instanceof Error ? e.message : fallback);

function Card({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function StateBadge({ state }: { state: string }) {
  return <Badge className={tone[state] ?? tone.unknown}>{STATE_LABEL[state] ?? label(state)}</Badge>;
}

function Title({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div>
        <h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs normal-case text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">{children}</Link>;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value: string | null | undefined) {
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

function Mini({ label: name, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] text-slate-500">{name}</p>
      <p className="truncate text-xs font-bold text-[#111C3A]">{value}</p>
      {hint ? <p className="mt-0.5 text-[10.5px] normal-case leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-4 rounded-lg border border-dashed border-slate-200 p-6 text-center">
      <p className="text-sm font-bold text-[#111C3A]">{title}</p>
      <p className="mt-1 text-xs normal-case text-slate-500">{body}</p>
    </div>
  );
}

function Back({ href, label: text }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#111C3A]"><ArrowLeft className="size-4" />{text}</Link>;
}

function NotFound({ title, href, body }: { title: string; href: string; body?: string }) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-bold text-[#111C3A]">{title}</h2>
      <p className="mt-1 text-sm normal-case text-slate-600">{body ?? "This record is not in the last 30 days of notifications."}</p>
      <div className="mt-3"><ButtonLink href={href}>Return</ButtonLink></div>
    </Card>
  );
}

function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  useScrollLock(open);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>
          <button ref={ref} onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

function recipientName(snapshot: NotificationSnapshot, id: string) {
  return snapshot.recipients.find((r) => r.id === id)?.name ?? "Unknown";
}

function scopedDeliveries(snapshot: NotificationSnapshot, intents: NotificationIntent[]) {
  const ids = new Set(intents.map((i) => i.id));
  return snapshot.deliveries.filter((d) => ids.has(d.intentId));
}

function useRetry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsRepository.retry(id),
    onSuccess: (next) => {
      qc.setQueryData(QUERY_KEY, next);
      toast.success("Put back in the queue. It is sent within a minute.");
    },
    onError: (e) => toast.error(errorText(e, "Could not retry this delivery")),
  });
}

function RetryButton({ delivery }: { delivery: NotificationDelivery }) {
  const retry = useRetry();
  if (!delivery.retryable) return null;
  return (
    <button type="button" onClick={() => retry.mutate(delivery.id)} disabled={retry.isPending} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
      {retry.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Retry
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Header, tabs, KPIs                                                  */
/* ------------------------------------------------------------------ */

function Header({ snapshot, range, setRange, companyScope, setCompanyScope, refreshing, onRefresh }: { snapshot: NotificationSnapshot; range: NotificationRange; setRange: (range: NotificationRange) => void; companyScope: string; setCompanyScope: (scope: string) => void; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#111C3A]">Notifications</h1>
          <p className="mt-1 text-sm normal-case text-slate-600">Every notification the platform sent in the last {snapshot.windowDays ?? 30} days: who got it, on which channel, and whether it went out.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`${BASE}/compose`}><Megaphone className="size-4" />Send Announcement</ButtonLink>
          <ButtonLink href={`${BASE}/center`}><Bell className="size-4" />Notification Center</ButtonLink>
        </div>
      </div>
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={snapshot.live ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{snapshot.live ? "Live" : "Sample data"}</Badge>
            <Badge className={snapshot.emailReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>E-mail {snapshot.emailReady ? "connected" : "not set up"}</Badge>
            <Badge className="border-slate-200 bg-slate-50 text-slate-700">WhatsApp {snapshot.whatsappReady ? "connected" : "not set up"}</Badge>
            <span className="text-xs text-slate-500">Updated {fmtDate(snapshot.generatedAt)}</span>
            <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Refresh
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value as NotificationRange)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs">
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <select value={companyScope} onChange={(e) => setCompanyScope(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs">
              <option value="all">All companies</option>
              <option value="platform">Platform (no company)</option>
              {(snapshot.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Tabs() {
  const pathname = usePathname();
  return (
    <nav className="overflow-x-auto overflow-y-hidden border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-0.5">
        {tabs.map(([name, href]) => {
          const active = href === BASE ? pathname === BASE : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("relative inline-flex px-3 py-2 text-[13px] font-medium", active ? "text-[#111C3A]" : "text-slate-500 hover:text-[#111C3A]")}>
                {name}
                {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#111C3A]" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function KpiGrid({ snapshot, intents }: { snapshot: NotificationSnapshot; intents: NotificationIntent[] }) {
  const deliveries = scopedDeliveries(snapshot, intents);
  const ids = new Set(intents.map((i) => i.id));
  const external = deliveries.filter((d) => d.channel !== "in_app");
  const rows: [string, number, string][] = [
    ["Notifications", intents.length, "Bell notifications created"],
    ["Unread in bell", snapshot.receipts.filter((r) => r.state === "unread" && ids.has(r.intentId)).length, "Not opened yet"],
    ["E-mails / WhatsApp sent", external.filter((d) => d.state === "provider_accepted").length, "Accepted by the provider"],
    ["Waiting to send", external.filter((d) => d.state === "queued" || d.state === "attempting").length, "Sent within a minute"],
    ["Failed", external.filter((d) => d.state === "failed").length, "Can be retried"],
    ["Not sent", external.filter((d) => d.state === "not_created").length, "Skipped, see reason"],
    ["People reached", new Set(intents.map((i) => i.recipientId)).size, "Distinct recipients"],
    ["Companies customized", new Set((snapshot.companyRoutes ?? []).map((r) => r.companyId)).size, "Changed default channels"],
  ];
  return (
    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([title, value, hint]) => (
        <Card key={title} className="p-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-[#111C3A]">{value}</p>
          <p className="mt-1 text-xs normal-case text-slate-500">{hint}</p>
        </Card>
      ))}
    </div>
  );
}

/** Notifications per day across the selected range, with failed e-mail / WhatsApp deliveries on top. */
function ActivityTrend({ snapshot, intents, range }: { snapshot: NotificationSnapshot; intents: NotificationIntent[]; range: NotificationRange }) {
  const days = Math.max(1, Math.round(rangeMinutes(range) / 1440));
  const end = new Date(snapshot.generatedAt);
  const buckets = Array.from({ length: days }, (_, i) => {
    const day = new Date(end.getTime() - (days - 1 - i) * 86_400_000);
    const key = day.toISOString().slice(0, 10);
    const dayIntents = intents.filter((n) => n.createdAt.slice(0, 10) === key);
    const ids = new Set(dayIntents.map((n) => n.id));
    const failed = snapshot.deliveries.filter((d) => ids.has(d.intentId) && d.state === "failed").length;
    return { key, total: dayIntents.length, failed };
  });
  const max = Math.max(...buckets.map((b) => b.total), 1);
  return (
    <Card className="flex h-full flex-col">
      <Title title="Notifications Per Day" subtitle="Blue = notifications created. Red = e-mail or WhatsApp deliveries that failed that day." />
      <div className="flex min-h-36 flex-1 items-end gap-1 px-4 pt-3">
        {buckets.map((b) => (
          <div key={b.key} className="flex h-full flex-1 flex-col justify-end gap-0.5" title={`${b.key}: ${b.total} notification(s), ${b.failed} failed`}>
            {b.failed ? <div className="w-full rounded-t bg-rose-400" style={{ height: `${(b.failed / max) * 100}%` }} /> : null}
            <div className="w-full rounded-t bg-[#2563EB]" style={{ height: `${Math.max(b.total ? 6 : 2, (b.total / max) * 100)}%`, opacity: b.total ? 1 : 0.15 }} />
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 pt-2 text-[11px] text-slate-500">{buckets[0]?.key} → {buckets.at(-1)?.key}</p>
    </Card>
  );
}

function DeliveryChannelTable({ snapshot, intents }: { snapshot: NotificationSnapshot; intents: NotificationIntent[] }) {
  const deliveries = scopedDeliveries(snapshot, intents);
  const rows = (["in_app", "email", "whatsapp"] as const).map((channel) => {
    const r = deliveries.filter((d) => d.channel === channel);
    return { channel, total: r.length, sent: r.filter((d) => d.state === "provider_accepted" || d.state === "delivered").length, waiting: r.filter((d) => d.state === "queued" || d.state === "attempting").length, failed: r.filter((d) => d.state === "failed").length, skipped: r.filter((d) => d.state === "not_created").length };
  });
  return (
    <Card>
      <Title title="Delivery By Channel" subtitle="Bell notifications are always delivered; e-mail and WhatsApp go out per company settings." />
      <table className="w-full table-fixed text-left">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr><th className="w-[24%] px-3 py-2">Channel</th><th className="px-2 py-2 text-right">Total</th><th className="px-2 py-2 text-right">Sent</th><th className="px-2 py-2 text-right">Waiting</th><th className="px-2 py-2 text-right">Failed</th><th className="px-2 py-2 text-right">Not sent</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.channel} className="border-b border-slate-100">
              <td className="px-3 py-2 text-xs font-bold text-[#111C3A]">{CHANNEL_LABEL[row.channel]}</td>
              <td className="px-2 py-2 text-right text-xs">{row.total}</td>
              <td className="px-2 py-2 text-right text-xs">{row.sent}</td>
              <td className="px-2 py-2 text-right text-xs">{row.waiting}</td>
              <td className="px-2 py-2 text-right text-xs">{row.failed}</td>
              <td className="px-2 py-2 text-right text-xs">{row.skipped}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

function IntentTable({ snapshot, rows, onPreview, compact = false }: { snapshot: NotificationSnapshot; rows: NotificationIntent[]; onPreview: (intent: NotificationIntent) => void; compact?: boolean }) {
  if (!rows.length) return <Empty title="No Notifications" body="Nothing was sent in this period and scope." />;
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-left", compact ? "table-fixed" : "min-w-[860px]")}>
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>
            <th className={cn("px-3 py-2", compact && "w-[46%]")}>Notification</th>
            <th className="px-3 py-2">To</th>
            {!compact ? <th className="px-3 py-2">Company</th> : null}
            <th className="px-3 py-2">State</th>
            {!compact ? <th className="px-3 py-2">Channels</th> : null}
            {!compact ? <th className="px-3 py-2">Created</th> : null}
            <th className="px-3 py-2 text-right">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((intent) => (
            <tr key={intent.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2">
                <button onClick={() => onPreview(intent)} className="w-full text-left">
                  <span className="line-clamp-2 text-xs font-bold normal-case text-[#111C3A]">{intent.title}</span>
                  <span className="block truncate text-[11px] text-slate-500">{intent.createdBy}</span>
                </button>
              </td>
              <td className="px-3 py-2 text-xs normal-case">{intent.recipientId ? recipientName(snapshot, intent.recipientId) : "-"}</td>
              {!compact ? <td className="px-3 py-2 text-xs">{intent.companyName ?? "Platform"}</td> : null}
              <td className="px-3 py-2"><StateBadge state={intent.state} /></td>
              {!compact ? <td className="px-3 py-2 text-xs">{intent.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}</td> : null}
              {!compact ? <td className="px-3 py-2 text-xs">{fmtDate(intent.createdAt)}</td> : null}
              <td className="px-3 py-2 text-right">
                {!compact ? <button onClick={() => onPreview(intent)} className="rounded-md border border-slate-200 p-1.5" aria-label="Preview"><Eye className="size-3.5" /></button> : null}
                <Link href={`${BASE}/center/${intent.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryTable({ snapshot, rows, onPreview }: { snapshot: NotificationSnapshot; rows: NotificationDelivery[]; onPreview: (delivery: NotificationDelivery) => void }) {
  if (!rows.length) return <Empty title="No Deliveries" body="Nothing matches this filter." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr><th className="px-3 py-2">Notification</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Last Activity</th><th className="px-3 py-2 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((delivery) => {
            const intent = snapshot.intents.find((item) => item.id === delivery.intentId);
            return (
              <tr key={delivery.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                <td className="px-3 py-2 text-xs normal-case">
                  <span className="font-semibold text-[#111C3A]">{intent?.title ?? "Unknown"}</span>
                  {delivery.failureReason ? <span className="mt-0.5 block text-[11px] text-slate-500">{delivery.failureReason}</span> : null}
                </td>
                <td className="px-3 py-2 text-xs normal-case">{recipientName(snapshot, delivery.recipientId)}</td>
                <td className="px-3 py-2 text-xs">{CHANNEL_LABEL[delivery.channel] ?? delivery.channel}</td>
                <td className="px-3 py-2"><StateBadge state={delivery.state} /></td>
                <td className="px-3 py-2 text-xs">{fmtDate(delivery.lastActivityAt)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <RetryButton delivery={delivery} />
                  <button onClick={() => onPreview(delivery)} className="ml-1 rounded-md border border-slate-200 p-1.5" aria-label="Preview"><Eye className="size-3.5" /></button>
                  {delivery.channel !== "in_app" ? <Link href={`${BASE}/deliveries/${delivery.id}`} className="ml-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold">Open</Link> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function Overview({ snapshot, intents, range, onPreviewIntent, onPreviewDelivery }: { snapshot: NotificationSnapshot; intents: NotificationIntent[]; range: NotificationRange; onPreviewIntent: (intent: NotificationIntent) => void; onPreviewDelivery: (delivery: NotificationDelivery) => void }) {
  const problems = scopedDeliveries(snapshot, intents).filter((d) => d.state === "failed" || d.state === "not_created").slice(0, 6);
  return (
    <div className="space-y-1">
      <KpiGrid snapshot={snapshot} intents={intents} />
      <div className="grid items-stretch gap-1 xl:grid-cols-[1.2fr_0.8fr]">
        <ActivityTrend snapshot={snapshot} intents={intents} range={range} />
        <Card>
          <Title title="Needs Attention" subtitle="E-mail or WhatsApp deliveries that failed or were not sent." />
          {problems.length ? (
            problems.map((d) => {
              const intent = snapshot.intents.find((item) => item.id === d.intentId);
              return (
                <div key={d.id} className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 text-xs">
                  <button onClick={() => onPreviewDelivery(d)} className="min-w-0 text-left">
                    <p className="font-bold normal-case text-[#111C3A]">{intent?.title ?? d.id}</p>
                    <p className="normal-case text-slate-500">{CHANNEL_LABEL[d.channel]} · {STATE_LABEL[d.state]} · {d.failureReason ?? "No reason recorded"}</p>
                  </button>
                  <RetryButton delivery={d} />
                </div>
              );
            })
          ) : (
            <Empty title="All Clear" body="No failed or skipped deliveries in this period." />
          )}
        </Card>
      </div>
      <div className="grid items-start gap-1 xl:grid-cols-2">
        <DeliveryChannelTable snapshot={snapshot} intents={intents} />
        <Card>
          <Title title="Recent Notifications" />
          <IntentTable snapshot={snapshot} rows={intents.slice(0, 6)} onPreview={onPreviewIntent} compact />
        </Card>
      </div>
      <ActivitySettings snapshot={snapshot} compact />
    </div>
  );
}

function NotificationCenter({ snapshot, rows, onPreview }: { snapshot: NotificationSnapshot; rows: NotificationIntent[]; onPreview: (intent: NotificationIntent) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const filtered = rows.filter((intent) => (state === "all" || intent.state === state) && `${intent.title} ${intent.companyName ?? ""} ${intent.recipientId ? recipientName(snapshot, intent.recipientId) : ""}`.toLowerCase().includes(query.toLowerCase()));
  const ids = new Set(rows.map((r) => r.id));
  const receipts = snapshot.receipts.filter((r) => ids.has(r.intentId));
  const read = receipts.filter((r) => r.state === "read").length;
  return (
    <div className="space-y-1">
      <Card>
        <Title
          title="Notification Center"
          subtitle="Every bell notification, one row per person."
          action={
            <button onClick={() => download("notifications.csv", csv(filtered.map((n) => ({ id: n.id, title: n.title, to: n.recipientId ? recipientName(snapshot, n.recipientId) : "", company: n.companyName, state: n.state, channels: n.channels.join("|"), created: n.createdAt }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">
              <Download className="size-4" />Export
            </button>
          }
        />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, person or company" className="min-w-64 flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs normal-case" />
          <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs">
            <option value="all">All states</option>
            <option value="dispatch_requested">Sending</option>
            <option value="completed">Done</option>
          </select>
        </div>
        <IntentTable snapshot={snapshot} rows={filtered} onPreview={onPreview} />
      </Card>
      <Card>
        <Title title="Read In The Bell" subtitle="Read state belongs to each person; it is shown here, never changed from this page." />
        <div className="grid gap-1 p-4 sm:grid-cols-3">
          <Mini label="Read" value={String(read)} />
          <Mini label="Unread" value={String(receipts.length - read)} />
          <Mini label="Read rate" value={receipts.length ? `${Math.round((read / receipts.length) * 100)}%` : "-"} />
        </div>
      </Card>
    </div>
  );
}

function Announcements({ snapshot }: { snapshot: NotificationSnapshot }) {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<AnnouncementAudience>("company_admins");
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const send = useMutation({
    mutationFn: () => notificationsRepository.announce({ title: title.trim(), message: message.trim(), audience, ...(audience === "company" ? { companyId } : {}), ...(href.trim() ? { href: href.trim() } : {}) }),
    onSuccess: (res) => {
      toast.success(`Announcement sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}.`);
      setTitle("");
      setMessage("");
      setHref("");
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e) => toast.error(errorText(e, "The announcement could not be sent")),
  });
  const size = audience === "company" ? null : snapshot.audiences.find((a) => a.id === audience)?.size ?? null;
  const ready = title.trim().length >= 3 && message.trim().length >= 3 && (audience !== "company" || companyId);
  const sent = useMemo(() => {
    const groups = new Map<string, { title: string; at: string; count: number; read: number }>();
    for (const n of snapshot.intents.filter((i) => i.source === "manual")) {
      const key = `${n.title}|${n.createdAt.slice(0, 16)}`;
      const g = groups.get(key) ?? { title: n.title, at: n.createdAt, count: 0, read: 0 };
      g.count += 1;
      if (snapshot.receipts.find((r) => r.intentId === n.id)?.state === "read") g.read += 1;
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [snapshot]);
  const submit = () => {
    const who = audience === "company" ? (snapshot.companies ?? []).find((c) => c.id === companyId)?.name ?? "this company" : snapshot.audiences.find((a) => a.id === audience)?.name;
    if (window.confirm(`Send “${title.trim()}” now to ${who}${size != null ? ` (${size} people)` : ""}? It cannot be unsent.`)) send.mutate();
  };
  return (
    <div className="grid gap-1 xl:grid-cols-[1fr_0.8fr]">
      <Card>
        <Title title="Send Announcement" subtitle="Goes out immediately: a bell notification for everyone, and an e-mail where the company's Platform announcements setting allows it (on by default)." />
        <div className="space-y-3 p-4">
          <div className="grid gap-1 md:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Audience
              <select value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                {snapshot.audiences.map((a) => <option key={a.id} value={a.id}>{a.name}{a.size != null ? ` (${a.size})` : ""}</option>)}
                <option value="company">Owners & admins of one company</option>
              </select>
            </label>
            {audience === "company" ? (
              <label className="block text-xs font-semibold text-slate-600">
                Company
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Choose a company…</option>
                  {(snapshot.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Title, e.g. Planned maintenance on Sunday" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="Message" className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case" />
          <input value={href} onChange={(e) => setHref(e.target.value)} maxLength={200} placeholder="Optional page to open, e.g. /admin/billing" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case" />
          <button type="button" onClick={submit} disabled={!ready || send.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send Now
          </button>
        </div>
      </Card>
      <Card>
        <Title title="Preview" subtitle="How it looks in the bell and in the e-mail." />
        <div className="p-4">
          <p className="text-xs font-bold normal-case text-[#111C3A]">{title || "Title"}</p>
          <p className="mt-2 whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-600">{message || "Message"}</p>
          <p className="mt-2 text-[11px] normal-case text-slate-500">Opens {href.trim() || "the dashboard"} when clicked.</p>
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <Title title="Sent Announcements" subtitle="Last 30 days. Scheduling and campaigns are not available; announcements go out the moment they are sent." />
        {sent.length ? (
          <div className="divide-y divide-slate-100">
            {sent.map((s) => (
              <div key={`${s.title}-${s.at}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-xs font-bold normal-case text-[#111C3A]">{s.title}</p>
                  <p className="text-xs text-slate-500">{fmtDate(s.at)}</p>
                </div>
                <p className="text-xs text-slate-600">{s.count} people · {s.read} read</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No Announcements Yet" body="Announcements you send appear here with how many people read them." />
        )}
      </Card>
    </div>
  );
}

function Templates({ snapshot }: { snapshot: NotificationSnapshot }) {
  return (
    <Card>
      <Title title="Templates" subtitle="Every notification uses one branded layout: its own title and message, and a button to the page it is about. One row per notification event." />
      <div className="divide-y divide-slate-100">
        {snapshot.templates.map((t) => (
          <Link key={t.id} href={`${BASE}/templates/${t.id}`} className="block px-4 py-3 hover:bg-slate-50">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-xs font-bold text-[#111C3A]">{t.name}</p>
              <StateBadge state={t.state} />
            </div>
            <p className="mt-1 text-xs normal-case text-slate-500">{t.description ?? ""} · {t.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TemplateDetail({ snapshot, id }: { snapshot: NotificationSnapshot; id?: string }) {
  const t = snapshot.templates.find((item) => item.id === id);
  if (!t) return <NotFound title="Template Not Found" href={`${BASE}/templates`} body="This template does not exist." />;
  const v = t.versions.at(-1);
  return (
    <div className="space-y-1">
      <Back href={`${BASE}/templates`} label="Back to Templates" />
      <Card className="p-4">
        <h2 className="text-xl font-bold text-[#111C3A]">{t.name}</h2>
        <p className="mt-1 text-sm normal-case text-slate-600">{t.description}</p>
        <div className="mt-4 grid gap-1 sm:grid-cols-3">
          <Mini label="Channels" value={t.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")} />
          <Mini label="Filled in with" value={t.variables.join(", ")} />
          <Mini label="Editable" value="No" hint="Text comes from the event itself, so it always matches what happened." />
        </div>
      </Card>
      <Card>
        <Title title="E-mail Layout" />
        <div className="p-4">
          <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold tracking-wider text-[#2563EB]">ENCODENCY OMNIPLATFORM</p>
            <p className="mt-1 text-base font-bold normal-case text-[#111C3A]">{v?.subject}</p>
            <p className="mt-2 whitespace-pre-line text-sm normal-case text-slate-600">{v?.body}</p>
            <span className="mt-3 inline-block rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-bold text-white">Open in OmniPlatform</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Deliveries({ snapshot, intents, onPreview }: { snapshot: NotificationSnapshot; intents: NotificationIntent[]; onPreview: (delivery: NotificationDelivery) => void }) {
  const params = useSearchParams();
  const [state, setState] = useState(params.get("state") ?? "external");
  const all = scopedDeliveries(snapshot, intents);
  const rows = all.filter((d) => (state === "all" ? true : state === "external" ? d.channel !== "in_app" : d.state === state));
  return (
    <Card>
      <Title
        title="Delivery & Failures"
        subtitle="One row per person per channel. Failed and skipped e-mail / WhatsApp deliveries can be retried."
        action={
          <button onClick={() => download("notification-deliveries.csv", csv(rows.map((d) => ({ id: d.id, notification: snapshot.intents.find((i) => i.id === d.intentId)?.title ?? "", to: recipientName(snapshot, d.recipientId), channel: d.channel, state: STATE_LABEL[d.state] ?? d.state, reason: d.failureReason, at: d.lastActivityAt }))))} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">
            <Download className="size-4" />Export
          </button>
        }
      />
      <div className="border-b border-slate-100 p-3">
        <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs">
          <option value="external">E-mail & WhatsApp</option>
          <option value="all">Everything (incl. bell)</option>
          <option value="provider_accepted">Sent</option>
          <option value="queued">Waiting</option>
          <option value="failed">Failed</option>
          <option value="not_created">Not sent</option>
        </select>
      </div>
      <DeliveryTable snapshot={snapshot} rows={rows} onPreview={onPreview} />
    </Card>
  );
}

function AudienceRouting({ snapshot }: { snapshot: NotificationSnapshot }) {
  const routes = snapshot.companyRoutes ?? [];
  return (
    <div className="grid gap-1 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <Title title="Audiences" subtitle="Who an announcement can reach right now." />
        <div className="divide-y divide-slate-100">
          {snapshot.audiences.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-xs font-bold text-[#111C3A]">{a.name}</p>
                <p className="text-xs normal-case text-slate-500">{a.description}</p>
              </div>
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">{a.size ?? a.recipientIds.length} people</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Title title="Company Routing" subtitle="Changes companies made in Settings → Notifications. Companies not listed use the defaults on the Rules tab." />
        {routes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr><th className="px-3 py-2">Company</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">WhatsApp</th><th className="px-3 py-2">Changed</th></tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={`${r.companyId}-${r.event}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-[#111C3A]">{r.companyName}</td>
                    <td className="px-3 py-2">{r.eventTitle}</td>
                    <td className="px-3 py-2">{r.email ? "On" : "Off"}</td>
                    <td className="px-3 py-2">{r.whatsapp ? "On" : "Off"}</td>
                    <td className="px-3 py-2">{fmtDate(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="All Companies Use The Defaults" body="No company has changed its notification channels yet." />
        )}
      </Card>
    </div>
  );
}

function Rules({ snapshot }: { snapshot: NotificationSnapshot }) {
  return (
    <Card>
      <Title title="Rules" subtitle="Which events send which channels by default. Each company can change e-mail and WhatsApp for its own people in Settings → Notifications; the bell is always on." />
      <div className="divide-y divide-slate-100">
        {snapshot.rules.map((rule) => (
          <div key={rule.id} className="px-4 py-3">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-xs font-bold text-[#111C3A]">{rule.name}</p>
              <div className="flex gap-1">
                {rule.channels.map((c) => <Badge key={c} className="border-slate-200 bg-slate-50 text-slate-700">{CHANNEL_LABEL[c] ?? c}</Badge>)}
              </div>
            </div>
            <p className="mt-1 font-mono text-[11px] normal-case text-slate-500">{rule.eventType}</p>
            <p className="mt-0.5 text-xs normal-case text-slate-500">
              {rule.customizedBy ? `${rule.customizedBy} compan${rule.customizedBy === 1 ? "y" : "ies"} changed this. ` : ""}
              {rule.note ?? ""}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivitySettings({ snapshot, compact = false }: { snapshot: NotificationSnapshot; compact?: boolean }) {
  return (
    <Card>
      <Title title={compact ? "Recent Routing Changes" : "Activity & Settings"} subtitle={compact ? undefined : "Channel changes companies made, and the state of each delivery channel."} />
      {snapshot.activity.length ? (
        <div className="divide-y divide-slate-100">
          {snapshot.activity.slice(0, compact ? 4 : undefined).map((item) => (
            <div key={item.id} className="px-4 py-3">
              <p className="text-xs font-bold normal-case text-[#111C3A]">{item.action}</p>
              <p className="text-xs text-slate-500">{item.actor} · {fmtDate(item.at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No Changes Yet" body="Companies have not changed their notification channels." />
      )}
      {!compact ? (
        <div className="grid gap-1 p-4 sm:grid-cols-3">
          <Mini label="E-mail" value={snapshot.emailReady ? "Connected" : "Not set up"} hint="Sent through the company's own SMTP when it has one, else the platform's." />
          <Mini label="WhatsApp" value={snapshot.whatsappReady ? "Connected" : "Not set up"} hint="Sent as plain text through Opus to the number in each person’s profile; people without a number are skipped." />
          <Mini label="Push" value="Not available" hint="Browser and mobile push are not built yet." />
        </div>
      ) : null}
    </Card>
  );
}

function NotificationDetail({ snapshot, id }: { snapshot: NotificationSnapshot; id?: string }) {
  const intent = snapshot.intents.find((item) => item.id === id);
  if (!intent) return <NotFound title="Notification Not Found" href={`${BASE}/center`} />;
  const rows = snapshot.deliveries.filter((d) => d.intentId === intent.id);
  const receipt = snapshot.receipts.find((r) => r.intentId === intent.id);
  return (
    <div className="space-y-1">
      <Back href={`${BASE}/center`} label="Back to Notification Center" />
      <Card className="p-4">
        <h2 className="text-xl font-bold normal-case text-[#111C3A]">{intent.title}</h2>
        <p className="mt-1 text-sm normal-case text-slate-600">{intent.message}</p>
        <div className="mt-4 grid gap-1 sm:grid-cols-4">
          <Mini label="To" value={intent.recipientId ? recipientName(snapshot, intent.recipientId) : "-"} />
          <Mini label="Company" value={intent.companyName ?? "Platform"} />
          <Mini label="Read" value={receipt?.state === "read" ? `Yes, ${fmtDate(receipt.readAt)}` : "Not yet"} />
          <Mini label="Event" value={intent.createdBy} />
        </div>
        {intent.relatedHref ? <p className="mt-2 text-xs text-slate-500">Opens <span className="font-mono normal-case">{intent.relatedHref}</span></p> : null}
      </Card>
      <Card>
        <Title title="Deliveries" />
        <DeliveryTable snapshot={snapshot} rows={rows} onPreview={() => undefined} />
      </Card>
    </div>
  );
}

function DeliveryDetail({ snapshot, id }: { snapshot: NotificationSnapshot; id?: string }) {
  const delivery = snapshot.deliveries.find((item) => item.id === id);
  if (!delivery) return <NotFound title="Delivery Not Found" href={`${BASE}/deliveries`} />;
  const intent = snapshot.intents.find((item) => item.id === delivery.intentId);
  const attempts = snapshot.attempts.filter((a) => a.deliveryId === delivery.id);
  return (
    <div className="space-y-1">
      <Back href={`${BASE}/deliveries`} label="Back to Deliveries" />
      <Card className="p-4">
        <h2 className="text-xl font-bold normal-case text-[#111C3A]">{intent?.title ?? "Delivery"}</h2>
        <div className="mt-4 grid gap-1 sm:grid-cols-4">
          <Mini label="To" value={recipientName(snapshot, delivery.recipientId)} />
          <Mini label="Channel" value={CHANNEL_LABEL[delivery.channel] ?? delivery.channel} />
          <Mini label="State" value={STATE_LABEL[delivery.state] ?? delivery.state} />
          <Mini label="Attempts" value={String(delivery.attempts ?? 0)} />
        </div>
        {delivery.failureReason ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs normal-case text-amber-800">{delivery.failureReason}</div> : null}
        <div className="mt-3"><RetryButton delivery={delivery} /></div>
      </Card>
      <Card>
        <Title title="Attempt History" />
        {attempts.length ? (
          <div className="divide-y divide-slate-100">
            {attempts.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <p className="text-xs font-bold text-[#111C3A]">{STATE_LABEL[a.state] ?? a.state}</p>
                <p className="text-xs normal-case text-slate-500">{a.summary} · {fmtDate(a.at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No Attempts Yet" body="It is waiting in the queue and is sent within a minute." />
        )}
      </Card>
    </div>
  );
}

function IntentPreview({ intent, snapshot, onClose }: { intent: NotificationIntent | null; snapshot: NotificationSnapshot; onClose: () => void }) {
  if (!intent) return null;
  const deliveries = snapshot.deliveries.filter((d) => d.intentId === intent.id);
  return (
    <Drawer title={intent.title} open={Boolean(intent)} onClose={onClose}>
      <div className="space-y-2">
        <p className="text-sm normal-case text-slate-600">{intent.message}</p>
        <div className="grid gap-1 sm:grid-cols-3">
          <Mini label="To" value={intent.recipientId ? recipientName(snapshot, intent.recipientId) : "-"} />
          <Mini label="Channels" value={deliveries.map((d) => `${CHANNEL_LABEL[d.channel]}: ${STATE_LABEL[d.state] ?? d.state}`).join(", ")} />
          <Mini label="Company" value={intent.companyName ?? "Platform"} />
        </div>
        <ButtonLink href={`${BASE}/center/${intent.id}`}>Open Notification</ButtonLink>
      </div>
    </Drawer>
  );
}

function DeliveryPreview({ delivery, snapshot, onClose }: { delivery: NotificationDelivery | null; snapshot: NotificationSnapshot; onClose: () => void }) {
  if (!delivery) return null;
  const intent = snapshot.intents.find((item) => item.id === delivery.intentId);
  return (
    <Drawer title={intent?.title ?? "Delivery"} open={Boolean(delivery)} onClose={onClose}>
      <div className="space-y-2">
        <div className="grid gap-1 sm:grid-cols-3">
          <Mini label="To" value={recipientName(snapshot, delivery.recipientId)} />
          <Mini label="Channel" value={CHANNEL_LABEL[delivery.channel] ?? delivery.channel} />
          <Mini label="State" value={STATE_LABEL[delivery.state] ?? delivery.state} />
        </div>
        {delivery.failureReason ? <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs normal-case text-amber-800">{delivery.failureReason}</div> : null}
        <div className="flex flex-wrap gap-2">
          {delivery.channel !== "in_app" ? <ButtonLink href={`${BASE}/deliveries/${delivery.id}`}>Open Delivery</ButtonLink> : null}
          <RetryButton delivery={delivery} />
        </div>
      </div>
    </Drawer>
  );
}

export function NotificationsOperationsCenter({ page = "overview", notificationId, templateId, deliveryId }: { page?: "overview" | "center" | "notification" | "compose" | "campaign" | "templates" | "template" | "deliveries" | "delivery" | "audience" | "rules" | "activity"; notificationId?: string; campaignId?: string; templateId?: string; deliveryId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const initialRange = search.get("range");
  const [range, setRange] = useState<NotificationRange>(initialRange === "today" || initialRange === "30d" ? initialRange : "7d");
  const [companyScope, setCompanyScope] = useState(search.get("company") || "all");
  const [intentPreview, setIntentPreview] = useState<NotificationIntent | null>(null);
  const [deliveryPreview, setDeliveryPreview] = useState<NotificationDelivery | null>(null);
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => notificationsRepository.loadSnapshot(), refetchInterval: 30_000, retry: false });

  if (query.isLoading) {
    return <Card className="p-8 text-center"><h2 className="text-lg font-bold text-[#111C3A]">Loading Notifications</h2></Card>;
  }
  if (query.error || !query.data) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-[#111C3A]">Notifications Could Not Be Loaded</h2>
        <p className="mt-1 text-sm normal-case text-slate-600">{errorText(query.error, "Try again in a moment.")}</p>
        <button onClick={() => void query.refetch()} className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Retry</button>
      </Card>
    );
  }
  const snapshot = query.data;
  const intents = scopedIntents(snapshot, range, companyScope);
  const replaceParam = (key: string, value: string) => {
    const p = new URLSearchParams(search.toString());
    p.set(key, value);
    router.replace(`${window.location.pathname}?${p.toString()}`);
  };
  // Live data: the delivery the drawer shows is re-read from the latest snapshot after a retry.
  const liveDelivery = deliveryPreview ? snapshot.deliveries.find((d) => d.id === deliveryPreview.id) ?? deliveryPreview : null;

  return (
    <div className="space-y-1 capitalize">
      <Header
        snapshot={snapshot}
        range={range}
        setRange={(next) => {
          setRange(next);
          replaceParam("range", next);
        }}
        companyScope={companyScope}
        setCompanyScope={(next) => {
          setCompanyScope(next);
          replaceParam("company", next);
        }}
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
      />
      <Tabs />
      {page === "overview" ? <Overview snapshot={snapshot} intents={intents} range={range} onPreviewIntent={setIntentPreview} onPreviewDelivery={setDeliveryPreview} /> : null}
      {page === "center" ? <NotificationCenter snapshot={snapshot} rows={intents} onPreview={setIntentPreview} /> : null}
      {page === "notification" ? <NotificationDetail snapshot={snapshot} id={notificationId} /> : null}
      {page === "compose" ? <Announcements snapshot={snapshot} /> : null}
      {page === "campaign" ? <NotFound title="Campaigns Are Not Available" href={`${BASE}/compose`} body="Announcements are sent immediately; there are no scheduled campaigns." /> : null}
      {page === "templates" ? <Templates snapshot={snapshot} /> : null}
      {page === "template" ? <TemplateDetail snapshot={snapshot} id={templateId} /> : null}
      {page === "deliveries" ? <Deliveries snapshot={snapshot} intents={intents} onPreview={setDeliveryPreview} /> : null}
      {page === "delivery" ? <DeliveryDetail snapshot={snapshot} id={deliveryId} /> : null}
      {page === "audience" ? <AudienceRouting snapshot={snapshot} /> : null}
      {page === "rules" ? <Rules snapshot={snapshot} /> : null}
      {page === "activity" ? <ActivitySettings snapshot={snapshot} /> : null}
      <IntentPreview intent={intentPreview} snapshot={snapshot} onClose={() => setIntentPreview(null)} />
      <DeliveryPreview delivery={liveDelivery} snapshot={snapshot} onClose={() => setDeliveryPreview(null)} />
    </div>
  );
}
