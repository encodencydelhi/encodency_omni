"use client";

import {
  ArrowRightIcon,
  DatabaseIcon,
  GlobeIcon,
  LayersIcon,
  ServerIcon,
  SearchIcon,
  WebhookIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CardSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
import { SERVICE_STATUS, type ServiceStatus } from "@/types/domain/system-health";

const STATUS_STYLES: Record<ServiceStatus, { dot: string; text: string }> = {
  operational: { dot: "bg-success", text: "text-success" },
  degraded: { dot: "bg-warning", text: "text-warning" },
  partial_outage: { dot: "bg-warning", text: "text-warning" },
  outage: { dot: "bg-danger", text: "text-danger" },
  maintenance: { dot: "bg-info", text: "text-info" },
};

/** A recognisable icon per component, keyed by its service id. */
const SERVICE_ICONS: Record<string, LucideIcon> = {
  svc_api: ServerIcon,
  svc_db: DatabaseIcon,
  svc_redis: LayersIcon,
  svc_workers: ServerIcon,
  svc_crawler: SearchIcon,
  svc_analytics: GlobeIcon,
  svc_webhooks: WebhookIcon,
};

interface PlatformHealthProps {
  entries: DashboardSnapshot["platformHealth"];
  isLoading: boolean;
}

export function PlatformHealth({ entries, isLoading }: PlatformHealthProps) {
  return (
    <SectionCard
      title="Platform Health"
      action={
        <Link
          href={ROUTES.superAdmin.systemHealth}
          className="inline-flex items-center gap-1 text-2xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          View all
          <ArrowRightIcon className="size-3" />
        </Link>
      }
      className="h-[320px]"
      contentClassName="overflow-y-auto"
    >
      {isLoading ? (
        <CardSkeleton lines={7} />
      ) : (
        <ul className="space-y-2.5">
          {entries.map((entry) => {
            const Icon = SERVICE_ICONS[entry.id] ?? ServerIcon;
            const styles = STATUS_STYLES[entry.status];

            return (
              <li key={entry.id} className="flex items-center gap-3">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                  {entry.label}
                </span>
                <span className={cn("flex shrink-0 items-center gap-1.5 text-2xs font-medium", styles.text)}>
                  <span className={cn("size-1.5 rounded-full", styles.dot)} aria-hidden />
                  {SERVICE_STATUS[entry.status].label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
