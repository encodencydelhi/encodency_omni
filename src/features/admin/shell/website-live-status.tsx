"use client";

import Link from "next/link";
import { AlertCircle, Loader2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWebsiteMonitoring } from "@/features/admin/website/data/hooks";
import type { LiveStatus } from "@/features/admin/website/data/types";
import { useAdminContext } from "./admin-context";

const STATUS_META: Record<LiveStatus, { label: string; className: string; dot: string }> = {
  live: {
    label: "Website live",
    className: "border-[#BDE8D6] bg-[#E6F6EF] text-[#0B7A55] hover:bg-[#D9F0E7]",
    dot: "bg-[#12A06D]",
  },
  degraded: {
    label: "Website degraded",
    className: "border-[#F5DFB8] bg-[#FDF3E3] text-[#9A5B08] hover:bg-[#FBE9C7]",
    dot: "bg-[#E29208]",
  },
  down: {
    label: "Website down",
    className: "border-[#F7CFCC] bg-[#FDECEB] text-[#C0261F] hover:bg-[#FBDDDC]",
    dot: "bg-[#DC3A32]",
  },
  unknown: {
    label: "Website unknown",
    className: "border-[#DAE1EC] bg-white text-[#64748B] hover:bg-[#F7F9FC]",
    dot: "bg-[#94A3B8]",
  },
};

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

  const status = monitoring.data?.uptime.status ?? "unknown";
  const meta = STATUS_META[status];
  const title = domain ? `${domain}: ${meta.label}` : meta.label;

  return (
    <Link
      href="/admin/website/monitoring"
      title={title}
      className={cn(
        "ml-auto hidden h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors md:inline-flex",
        monitoring.error ? STATUS_META.unknown.className : meta.className,
      )}
    >
      {monitoring.isLoading ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : monitoring.error ? (
        <AlertCircle className="size-3" aria-hidden />
      ) : (
        <Wifi className="size-3" aria-hidden />
      )}
      <span className={cn("size-1.5 rounded-full", monitoring.error ? STATUS_META.unknown.dot : meta.dot)} />
      <span>{monitoring.isLoading ? "Checking website" : monitoring.error ? "Website check failed" : meta.label}</span>
    </Link>
  );
}
