"use client";

import { Activity, AlertCircle, CheckCircle2, Loader2, Wifi } from "lucide-react";
import { useWebsiteMonitoring } from "@/features/admin/website/data/hooks";
import type { LiveStatus } from "@/features/admin/website/data/types";
import { useAdminContext } from "./admin-context";
import { StatusPill, type StatusTone, type StatusHighlightData } from "./status-pill";

function websiteDetails(website: string | null | undefined) {
  const value = website?.trim();
  if (!value) return { hasWebsite: false, domain: null as string | null };

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return { hasWebsite: true, domain: url.hostname };
  } catch {
    return { hasWebsite: false, domain: null as string | null };
  }
}

export function WebsiteLiveStatus() {
  const { Clients, selectedProjectId } = useAdminContext();
  const selected =
    Clients.find((client) => client.id === selectedProjectId) ??
    Clients.find((client) => Boolean(websiteDetails(client.website).hasWebsite));
  const { hasWebsite, domain } = websiteDetails(selected?.website);
  const monitoring = useWebsiteMonitoring(selected?.id ?? "", Boolean(selected?.id && hasWebsite), 60_000);

  if (!selected || !hasWebsite) {
    return null;
  }

  const rawStatus: LiveStatus = monitoring.data?.uptime.status ?? "unknown";

  let tone: StatusTone = "healthy";
  let label = "Website Live";

  if (monitoring.isLoading) {
    tone = "neutral";
    label = "Checking Website";
  } else if (monitoring.error) {
    tone = "critical";
    label = "Check Failed";
  } else if (rawStatus === "live") {
    tone = "healthy";
    label = "Website Live";
  } else if (rawStatus === "degraded") {
    tone = "warning";
    label = "Website Degraded";
  } else if (rawStatus === "down") {
    tone = "critical";
    label = "Website Down";
  } else {
    tone = "neutral";
    label = "Website Unknown";
  }

  const uptimePct = monitoring.data?.uptime.uptimePct30d;

  let highlightData: StatusHighlightData | null = null;
  if (monitoring.isLoading) {
    highlightData = { text: "Checking", icon: Loader2, tone: "neutral" };
  } else if (monitoring.error) {
    highlightData = { text: "Error", icon: AlertCircle, tone: "critical" };
  } else if (uptimePct != null) {
    highlightData = {
      text: `${uptimePct.toFixed(1)}% Uptime`,
      icon: Activity,
      tone: rawStatus === "down" ? "critical" : rawStatus === "degraded" ? "warning" : "healthy",
    };
  } else if (rawStatus === "live") {
    highlightData = { text: "200 OK", icon: CheckCircle2, tone: "healthy" };
  }

  const tooltipLines: string[] = [
    domain ? `Monitored host: ${domain}` : "",
    rawStatus === "live"
      ? "Status: Live & operational (HTTP 200 OK)"
      : rawStatus === "degraded"
        ? "Status: Performance degraded"
        : rawStatus === "down"
          ? "Status: Down or unreachable"
          : "Status: Awaiting next scheduled check",
    uptimePct != null ? `30-Day availability: ${uptimePct.toFixed(2)}%` : "",
  ].filter(Boolean);

  const icon = monitoring.isLoading ? Loader2 : monitoring.error ? AlertCircle : Wifi;

  return (
    <StatusPill
      href="/admin/website/monitoring"
      tone={tone}
      icon={icon}
      label={label}
      highlightData={highlightData}
      tooltipTitle="Website Monitoring"
      tooltipLines={tooltipLines}
      tooltipAction="Open website monitoring →"
      loading={monitoring.isLoading}
    />
  );
}
