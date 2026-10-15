"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Server } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/features/infrastructure/format";
import { INFRA_KEY, useScope } from "@/features/infrastructure/hooks";

type Health = "ok" | "warning" | "critical" | "unknown";
interface DatePick { name: string; date: string | null; daysRemaining: number; source: string; kind: string }
interface StatusSummary {
  servers: { total: number; running: number; notRunning: Array<{ name: string; status: string | null }>; monitored: number; collectorOffline: number; openAlerts: number; health: Health; nextDue: DatePick | null };
  domains: { total: number; withKnownExpiry: number; unknownExpiry: number; expired: number; expiringWithin30Days: number; sslExpired: number; sslExpiring: number; health: Health; nearest: DatePick | null };
}

// Three colours only: green = all fine, yellow = something needs a look, red = something is down or expired.
const TONE: Record<Exclude<Health, "unknown">, { box: string; dot: string }> = {
  ok: { box: "border-[#BDE8D6] bg-[#E6F6EF] text-[#0B7A55] hover:bg-[#D9F0E7]", dot: "bg-[#12A06D]" },
  warning: { box: "border-[#F5DFB8] bg-[#FDF3E3] text-[#9A5B08] hover:bg-[#FBE9C7]", dot: "bg-[#E29208]" },
  critical: { box: "border-[#F7CFCC] bg-[#FDECEB] text-[#C0261F] hover:bg-[#FBDDDC]", dot: "bg-[#DC3A32]" },
};
const tone3 = (h: Health) => TONE[h === "unknown" ? "warning" : h];

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function useStatusSummary() {
  const { companyId, ready } = useScope();
  return useQuery({
    queryKey: [INFRA_KEY, companyId, "status-summary"],
    enabled: ready,
    queryFn: ({ signal }) => apiClient.request<StatusSummary>({ method: "GET", path: "/infrastructure/status-summary", headers: companyScopeHeaders(companyId), signal }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });
}

function Pill({ href, health, icon: Icon, label, detail, tip }: { href: string; health: Health; icon: typeof Server; label: string; detail: string; tip: string }) {
  const tone = tone3(health);
  return (
    <Link href={href} title={tip} className={cn("hidden h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[11px] font-semibold capitalize transition-colors md:inline-flex", tone.box)}>
      <Icon className="size-3" aria-hidden />
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      <span>{label}</span>
      <span className="hidden font-medium opacity-80 xl:inline">· {detail}</span>
    </Link>
  );
}

/** Server and domain health + the nearest known date, next to the Website pill. Hidden when there is nothing to show. */
export function InfrastructureLiveStatus() {
  const q = useStatusSummary();
  const d = q.data;
  if (!d || (d.servers.total === 0 && d.domains.total === 0)) return null;
  const { servers: s, domains: m } = d;

  let serverLabel = "Server Live";
  if (s.total > 1) serverLabel = s.running === s.total ? `${s.total} Servers Live` : `${s.running}/${s.total} Servers Live`;
  if (s.health === "critical" && s.running === 0) serverLabel = s.total > 1 ? "Servers Need Attention" : "Server Issue";
  else if (s.notRunning.length === 1 && s.total === 1) serverLabel = `Server ${title(s.notRunning[0]!.status ?? "Not Running")}`;
  if (s.total > 0 && s.running === 0 && s.notRunning.length === 0) serverLabel = s.total > 1 ? `${s.total} Servers Unverified` : "Server Unverified";
  const short = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }) : "");
  const serverDetail = s.nextDue ? (s.nextDue.daysRemaining < 0 ? `Overdue ${short(s.nextDue.date)}` : `Due ${short(s.nextDue.date)}`) : "No Date";
  const serverTip = [
    `${s.running}/${s.total} servers running (provider status)`,
    `${s.monitored} with live monitoring${s.collectorOffline ? `, ${s.collectorOffline} collector offline` : ""}`,
    s.openAlerts ? `${s.openAlerts} open alert${s.openAlerts === 1 ? "" : "s"}` : "No open alerts",
    s.nextDue ? `Next confirmed date: ${s.nextDue.name} on ${formatDate(s.nextDue.date)}` : "No confirmed renewal date recorded",
  ].join("\n");

  let domainLabel = m.total > 1 ? `${m.total} Domains OK` : "Domain OK";
  if (m.expired > 0) domainLabel = m.expired > 1 ? `${m.expired} Domains Expired` : "Domain Expired";
  else if (m.sslExpired > 0) domainLabel = "SSL Expired";
  else if (m.health === "critical") domainLabel = "Domain Expiring Soon";
  else if (m.health === "warning") domainLabel = m.expiringWithin30Days > 0 ? (m.expiringWithin30Days > 1 ? `${m.expiringWithin30Days} Domains Expiring` : "Domain Expiring") : "SSL Expiring";
  else if (m.health === "unknown") domainLabel = "Domain Expiry Unknown";
  const domainDetail = m.nearest ? (m.nearest.daysRemaining < 0 ? `Expired ${short(m.nearest.date)}` : `${m.nearest.daysRemaining}d · ${formatDate(m.nearest.date)}`) : "No Date";
  const domainTip = [
    m.nearest ? `${m.nearest.name} expires ${formatDate(m.nearest.date)} (${m.nearest.daysRemaining} day${m.nearest.daysRemaining === 1 ? "" : "s"}, ${m.nearest.source === "manual" ? "entered manually" : "registry"})` : "No domain expiry date is known yet",
    m.unknownExpiry ? `${m.unknownExpiry} domain${m.unknownExpiry === 1 ? "" : "s"} without a known expiry` : null,
    m.sslExpired || m.sslExpiring ? `SSL: ${m.sslExpired} expired, ${m.sslExpiring} expiring within 30 days` : null,
  ].filter(Boolean).join("\n");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {s.total > 0 ? <Pill href="/admin/infrastructure/servers" health={s.health} icon={Server} label={serverLabel} detail={serverDetail} tip={serverTip} /> : null}
      {m.total > 0 ? <Pill href="/admin/infrastructure/domains" health={m.health} icon={Globe2} label={domainLabel} detail={domainDetail} tip={domainTip} /> : null}
    </div>
  );
}
