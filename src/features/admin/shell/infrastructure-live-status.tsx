"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Globe2, Server } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { formatDate } from "@/features/infrastructure/format";
import { INFRA_KEY, useScope } from "@/features/infrastructure/hooks";
import { StatusPill, type StatusTone, type StatusHighlightData } from "./status-pill";

type Health = "ok" | "warning" | "critical" | "unknown";
interface DatePick {
  name: string;
  date: string | null;
  daysRemaining: number;
  source: string;
  kind: string;
}

interface StatusSummary {
  servers: {
    total: number;
    running: number;
    notRunning: Array<{ name: string; status: string | null }>;
    monitored: number;
    collectorOffline: number;
    openAlerts: number;
    health: Health;
    nextDue: DatePick | null;
  };
  domains: {
    total: number;
    withKnownExpiry: number;
    unknownExpiry: number;
    expired: number;
    expiringWithin30Days: number;
    sslExpired: number;
    sslExpiring: number;
    health: Health;
    nearest: DatePick | null;
  };
}

function mapHealth(h: Health): StatusTone {
  switch (h) {
    case "ok":
      return "healthy";
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    case "unknown":
    default:
      return "warning";
  }
}

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function useStatusSummary() {
  const { companyId, ready } = useScope();
  return useQuery({
    queryKey: [INFRA_KEY, companyId, "status-summary"],
    enabled: ready,
    queryFn: ({ signal }) =>
      apiClient.request<StatusSummary>({
        method: "GET",
        path: "/infrastructure/status-summary",
        headers: companyScopeHeaders(companyId),
        signal,
      }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });
}

/** Server and domain health status pills with highlighted renewal dates and live metrics */
export function InfrastructureLiveStatus() {
  const q = useStatusSummary();
  const d = q.data;
  if (!d || (d.servers.total === 0 && d.domains.total === 0)) return null;
  const { servers: s, domains: m } = d;

  let serverLabel = "Server Live";
  if (s.total > 1) {
    serverLabel = s.running === s.total ? `${s.total} Servers Live` : `${s.running}/${s.total} Servers Live`;
  }
  if (s.health === "critical" && s.running === 0) {
    serverLabel = s.total > 1 ? "Servers Alert" : "Server Issue";
  } else if (s.notRunning.length === 1 && s.total === 1) {
    serverLabel = `Server ${title(s.notRunning[0]!.status ?? "Not Running")}`;
  }
  if (s.total > 0 && s.running === 0 && s.notRunning.length === 0) {
    serverLabel = s.total > 1 ? `${s.total} Servers Unverified` : "Server Unverified";
  }

  const short = (iso: string | null) =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        })
      : "";

  // Highlighted server renewal date badge
  let serverHighlight: StatusHighlightData | null = null;
  if (s.nextDue) {
    const isOverdue = s.nextDue.daysRemaining < 0;
    const isUrgent = s.nextDue.daysRemaining <= 30;
    serverHighlight = {
      text: isOverdue ? `Overdue ${short(s.nextDue.date)}` : `Due ${short(s.nextDue.date)}`,
      icon: Calendar,
      tone: isOverdue ? "critical" : isUrgent ? "warning" : "healthy",
    };
  }

  const serverTipLines = [
    `${s.running}/${s.total} servers running (provider status)`,
    `${s.monitored} with live monitoring${s.collectorOffline ? `, ${s.collectorOffline} collector offline` : ""}`,
    s.openAlerts ? `${s.openAlerts} open alert${s.openAlerts === 1 ? "" : "s"}` : "No open alerts",
    s.nextDue
      ? `Next renewal: ${s.nextDue.name} on ${formatDate(s.nextDue.date)}`
      : "No confirmed renewal date recorded",
  ];

  let domainLabel = m.total > 1 ? `${m.total} Domains OK` : "Domain OK";
  if (m.expired > 0) domainLabel = m.expired > 1 ? `${m.expired} Domains Expired` : "Domain Expired";
  else if (m.sslExpired > 0) domainLabel = "SSL Expired";
  else if (m.health === "critical") domainLabel = "Domain Expiring";
  else if (m.health === "warning")
    domainLabel =
      m.expiringWithin30Days > 0
        ? m.expiringWithin30Days > 1
          ? `${m.expiringWithin30Days} Expiring`
          : "Domain Expiring"
        : "SSL Expiring";
  else if (m.health === "unknown") domainLabel = "Domain Expiry Unknown";

  // Highlighted domain renewal date and days remaining badge
  let domainHighlight: StatusHighlightData | null = null;
  if (m.nearest) {
    const isOverdue = m.nearest.daysRemaining < 0;
    const isUrgent = m.nearest.daysRemaining <= 30;
    domainHighlight = {
      text: isOverdue
        ? `Expired ${short(m.nearest.date)}`
        : `${m.nearest.daysRemaining}d · ${formatDate(m.nearest.date)}`,
      icon: Calendar,
      tone: isOverdue ? "critical" : isUrgent ? "warning" : "healthy",
    };
  }

  const domainTipLines = [
    m.nearest
      ? `${m.nearest.name}: expires in ${m.nearest.daysRemaining} days (${formatDate(m.nearest.date)})`
      : "No domain expiry date recorded",
    m.unknownExpiry ? `${m.unknownExpiry} domain${m.unknownExpiry === 1 ? "" : "s"} without a known expiry` : null,
    m.sslExpired || m.sslExpiring
      ? `SSL: ${m.sslExpired} expired, ${m.sslExpiring} expiring within 30 days`
      : "SSL certificates active & verified",
  ].filter(Boolean) as string[];

  return (
    <div className="flex shrink-0 items-center gap-1">
      {s.total > 0 ? (
        <StatusPill
          href="/admin/infrastructure/servers"
          tone={mapHealth(s.health)}
          icon={Server}
          label={serverLabel}
          highlightData={serverHighlight}
          tooltipTitle="Servers & Hosting"
          tooltipLines={serverTipLines}
          tooltipAction="Manage servers & hosting →"
        />
      ) : null}

      {m.total > 0 ? (
        <StatusPill
          href="/admin/infrastructure/domains"
          tone={mapHealth(m.health)}
          icon={Globe2}
          label={domainLabel}
          highlightData={domainHighlight}
          tooltipTitle="Domains & DNS"
          tooltipLines={domainTipLines}
          tooltipAction="Manage domains & DNS →"
        />
      ) : null}
    </div>
  );
}
