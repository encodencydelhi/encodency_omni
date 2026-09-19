"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { LIMIT_KIND, PLAN_STATUS, SCHEDULED_KIND, SCHEDULED_STATUS, VERSION_STATUS } from "../data/config";
import type { LimitKind, PlanStatus, ScheduledChangeKind, ScheduledChangeStatus, UsageRisk, VersionStatus } from "../data/types";

/**
 * One badge per axis. Plan publication state, version state, subscription
 * lifecycle and billing health are different questions and never share a badge.
 */

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <StatusBadge registry={PLAN_STATUS} status={status} withDot />;
}

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  return <StatusBadge registry={VERSION_STATUS} status={status} />;
}

export function LimitKindBadge({ kind }: { kind: LimitKind }) {
  return <StatusBadge registry={LIMIT_KIND} status={kind} />;
}

export function ScheduledStatusBadge({ status }: { status: ScheduledChangeStatus }) {
  return <StatusBadge registry={SCHEDULED_STATUS} status={status} withDot />;
}

export function ScheduledKindBadge({ kind }: { kind: ScheduledChangeKind }) {
  const meta = SCHEDULED_KIND[kind];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const DOT = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-neutral", info: "bg-info" } as const;

export function UsageRiskBadge({ risk }: { risk: UsageRisk }) {
  if (risk === "ok") return <span className="text-2xs text-muted-foreground">Within limits</span>;
  const tone = risk === "over_limit" ? "danger" : "warning";
  return (
    <Badge tone={tone}>
      <span className={cn("size-1.5 rounded-sm", DOT[tone])} aria-hidden />
      {risk === "over_limit" ? "Over limit" : "Near limit"}
    </Badge>
  );
}

/** Marks a subscription that is pinned to an older plan version. */
export function LegacyVersionTag({ version, current }: { version: number; current: number | null }) {
  return (
    <span
      title={current ? `Pinned to version ${version}; the plan is now on version ${current}. Its price and limits are unchanged.` : undefined}
      className="rounded-sm border border-border-strong bg-neutral-subtle px-1 text-[10px] font-medium leading-4 text-neutral"
    >
      Legacy v{version}
    </span>
  );
}

/** Marks screens and figures that come from simulated data. */
export function DemoTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">
      {children}
    </span>
  );
}
