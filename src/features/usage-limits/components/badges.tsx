"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ALERT_SEVERITY, ALERT_STATUS, ALERT_TYPE, OVERRIDE_STATUS, PROCESSING_STATUS, SOURCE_STATUS, UTILIZATION_STATE } from "../data/config";
import type { AlertSeverity, AlertStatus, AlertType, OverrideStatus, ProcessingStatus, SourceStatus, UtilizationState } from "../data/types";

/** Marks operational data that exists only in this frontend demo. */
export function DemoTag({ children = "Demo Data" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">{children}</span>;
}

export function StateBadge({ state, className }: { state: UtilizationState; className?: string }) {
  const meta = UTILIZATION_STATE[state];
  return <Badge tone={meta.tone} title={meta.description} className={className}>{meta.label}</Badge>;
}

export const SeverityBadge = ({ severity }: { severity: AlertSeverity }) => <Badge tone={ALERT_SEVERITY[severity].tone}>{ALERT_SEVERITY[severity].label}</Badge>;
export const AlertStatusBadge = ({ status }: { status: AlertStatus }) => <Badge tone={ALERT_STATUS[status].tone}>{ALERT_STATUS[status].label}</Badge>;
export const AlertTypeLabel = ({ type }: { type: AlertType }) => <span title={ALERT_TYPE[type].description}>{ALERT_TYPE[type].label}</span>;
export const OverrideStatusBadge = ({ status }: { status: OverrideStatus }) => <Badge tone={OVERRIDE_STATUS[status].tone}>{OVERRIDE_STATUS[status].label}</Badge>;
export const ProcessingBadge = ({ status }: { status: ProcessingStatus }) => <Badge tone={PROCESSING_STATUS[status].tone}>{PROCESSING_STATUS[status].label}</Badge>;
export const SourceBadge = ({ status }: { status: SourceStatus }) => <Badge tone={SOURCE_STATUS[status].tone}>{SOURCE_STATUS[status].label}</Badge>;

const BAR: Record<UtilizationState, string> = {
  within: "bg-success",
  near: "bg-warning",
  at_limit: "bg-warning",
  exceeded: "bg-danger",
  unlimited: "bg-info",
  not_entitled: "bg-neutral",
  unknown: "bg-info",
  monitored: "bg-neutral",
};

/** A thin utilisation bar. Only drawn when there is a percentage: unlimited and unknown show none. */
export function UtilizationBar({ percent, state, label }: { percent: number | null; state: UtilizationState; label: string }) {
  if (percent === null) return <span className="text-2xs text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-label={`${label} utilization`} aria-valuenow={Math.min(100, percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-sm", BAR[state])} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className="w-11 text-right text-2xs tabular text-foreground">{percent}%</span>
    </div>
  );
}
