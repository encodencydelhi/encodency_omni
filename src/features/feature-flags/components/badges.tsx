"use client";

import { SnowflakeIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { AVAILABILITY, CHANGE_STATUS, IMPLEMENTATION, LIFECYCLE, OPERATIONAL_STATE, PROTECTION, STRATEGY } from "../data/config";
import type { Availability, ChangeStatus, EnvironmentConfig, ImplementationStatus, LifecycleStatus, OperationalState, Protection, RolloutStrategy } from "../data/types";
import { rolloutText } from "../lib/format";

/** Marks configuration that exists only in this frontend demo. */
export function DemoTag({ children = "Demo Data" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">{children}</span>;
}

export const StateBadge = ({ state }: { state: OperationalState }) => (
  <Badge tone={OPERATIONAL_STATE[state].tone}>
    {state === "emergency_off" ? <SnowflakeIcon className="size-3" aria-hidden /> : null}
    {OPERATIONAL_STATE[state].label}
  </Badge>
);

export const LifecycleBadge = ({ status }: { status: LifecycleStatus }) => <Badge tone={LIFECYCLE[status].tone}>{LIFECYCLE[status].label}</Badge>;
export const ProtectionBadge = ({ level }: { level: Protection }) => <Badge tone={PROTECTION[level].tone} title={PROTECTION[level].description}>{PROTECTION[level].label}</Badge>;
export const ImplementationBadge = ({ status }: { status: ImplementationStatus }) => <Badge tone={IMPLEMENTATION[status].tone} title={IMPLEMENTATION[status].description}>{IMPLEMENTATION[status].label}</Badge>;
export const AvailabilityBadge = ({ availability }: { availability: Availability }) => <Badge tone={AVAILABILITY[availability].tone} title={AVAILABILITY[availability].explanation}>{AVAILABILITY[availability].label}</Badge>;
export const ChangeStatusBadge = ({ status }: { status: ChangeStatus }) => <Badge tone={CHANGE_STATUS[status].tone}>{CHANGE_STATUS[status].label}</Badge>;

export function StrategyLabel({ strategy }: { strategy: RolloutStrategy }) {
  return <span title={STRATEGY[strategy].description}>{STRATEGY[strategy].label}</span>;
}

/** The rollout in one line: strategy and, where it has one, the size of it. */
export function RolloutCell({ config }: { config: EnvironmentConfig }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.8125rem] text-foreground">{STRATEGY[config.strategy].short}</p>
      {config.strategy === "percentage" || config.strategy === "selected" ? <p className="truncate text-2xs text-muted-foreground">{rolloutText(config)}</p> : null}
    </div>
  );
}

const RESULT = { applied: { label: "Applied (Demo)", tone: "success" }, pending: { label: "Pending Approval", tone: "warning" }, scheduled: { label: "Scheduled (Planned)", tone: "info" }, cancelled: { label: "Cancelled", tone: "neutral" }, rejected: { label: "Rejected", tone: "danger" } } as const;

/** The outcome recorded for an activity entry. Applied always says demo: nothing is enforced outside this frontend. */
export function ResultBadge({ result }: { result: keyof typeof RESULT }) {
  return <Badge tone={RESULT[result].tone}>{RESULT[result].label}</Badge>;
}
