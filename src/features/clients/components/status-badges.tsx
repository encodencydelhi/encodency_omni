"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { WithTooltip } from "@/features/companies/components/primitives";
import { cn } from "@/lib/utils/cn";
import { ACCESS_LEVEL_META, FACTOR_STATUS, HEALTH_STATUS, ONBOARDING_STATUS, WORKSPACE_STATUS } from "../data/config";
import type { ClientAccessLevel, ClientFactorStatus, ClientHealth, ClientOnboardingStatus, ClientWorkspaceStatus } from "../data/types";

/**
 * One badge per status axis. Workspace, onboarding and operational health answer
 * different questions and are never folded into a single "status".
 */

export function WorkspaceBadge({ status }: { status: ClientWorkspaceStatus }) {
  return <StatusBadge registry={WORKSPACE_STATUS} status={status} withDot />;
}

export function OnboardingBadge({ status }: { status: ClientOnboardingStatus }) {
  return <StatusBadge registry={ONBOARDING_STATUS} status={status} />;
}

export function FactorBadge({ status }: { status: ClientFactorStatus }) {
  return <StatusBadge registry={FACTOR_STATUS} status={status} withDot />;
}

export function AccessLevelBadge({ level }: { level: ClientAccessLevel }) {
  return <StatusBadge registry={ACCESS_LEVEL_META} status={level} />;
}

const DOT = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-neutral", info: "bg-info", brand: "bg-primary" } as const;
const TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-neutral", info: "text-info", brand: "text-primary" } as const;

/** Health with its main reason on hover and to assistive tech. */
export function HealthBadge({ health, className }: { health: ClientHealth; className?: string }) {
  const meta = HEALTH_STATUS[health.status];
  return (
    <WithTooltip content={health.reason} className={cn("inline-flex", className)}>
      <Badge tone={meta.tone} aria-label={`${meta.label}. ${health.reason}`}>
        <span className={cn("size-1.5 rounded-sm", DOT[meta.tone])} aria-hidden />
        {meta.label}
      </Badge>
    </WithTooltip>
  );
}

/** Health as plain coloured text for dense summary cards. */
export function HealthInline({ health }: { health: ClientHealth }) {
  const meta = HEALTH_STATUS[health.status];
  return (
    <WithTooltip content={health.reason}>
      <span className={cn("text-[0.8125rem] font-semibold", TEXT[meta.tone])}>{meta.label}</span>
    </WithTooltip>
  );
}

export function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const tone = severity === "critical" ? "danger" : severity === "warning" ? "warning" : "info";
  const label = severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Info";
  return (
    <Badge tone={tone}>
      <span className={cn("size-1.5 rounded-sm", DOT[tone])} aria-hidden />
      {label}
    </Badge>
  );
}

export function ResultBadge({ result }: { result: "success" | "failure" | "denied" }) {
  const tone = result === "success" ? "success" : result === "failure" ? "danger" : "warning";
  return <Badge tone={tone}>{result === "success" ? "Success" : result === "failure" ? "Failed" : "Denied"}</Badge>;
}

/** Marks data that is simulated, so nothing reads as live. */
export function DemoTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">
      {children}
    </span>
  );
}
