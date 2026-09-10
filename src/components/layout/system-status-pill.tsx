"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";
import { useSystemHealth } from "@/features/system-health/hooks/use-system-health";
import { cn } from "@/lib/utils/cn";
import { SERVICE_STATUS, type ServiceStatus } from "@/types/domain/system-health";

const DOT_STYLES: Record<ServiceStatus, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  partial_outage: "bg-warning",
  outage: "bg-danger",
  maintenance: "bg-info",
};
export function SystemStatusPill({ isCollapsed }: { isCollapsed: boolean }) {
  const { data, isPending } = useSystemHealth();

  if (isPending) {
    return <Skeleton className={cn("h-9", isCollapsed ? "w-9 rounded-md" : "w-full")} />;
  }

  const status = data?.overallStatus ?? "operational";
  const meta = SERVICE_STATUS[status];
  const affected = data?.components.filter((component) => component.status !== "operational").length ?? 0;

  const content = (
    <Link
      href={ROUTES.superAdmin.systemHealth}
      className={cn(
        "flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent",
        isCollapsed && "justify-center px-0 py-2",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", DOT_STYLES[status])} aria-hidden />
      {!isCollapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2xs font-medium text-foreground">{meta.label}</span>
          <span className="block truncate text-2xs text-muted-foreground">
            {affected === 0 ? "All services normal" : `${affected} services affected`}
          </span>
        </span>
      ) : null}
    </Link>
  );

  if (!isCollapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">System health: {meta.label}</TooltipContent>
    </Tooltip>
  );
}
