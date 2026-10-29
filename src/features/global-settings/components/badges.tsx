"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ENFORCEMENT_LABEL, OVERRIDE_LABEL, POLICY_KIND_LABEL, SCOPE_LABEL, SENSITIVITY_LABEL, SETTINGS_MOCK_MODE } from "../data/config";
import type { ChangeResult, GlobalSettingDefinition, MaintenanceEntryStatus, ScopeKey, Sensitivity, VersionStatus } from "../data/types";
import type { Tone } from "@/types/common";
import { useEnforcementState } from "../data/hooks";

/** Marks configuration that lives only in this frontend demo. */
export function DemoTag({ children = "Demo Configuration" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">
      {children}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: ScopeKey }) {
  const meta = SCOPE_LABEL[scope];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function SensitivityBadge({ sensitivity }: { sensitivity: Sensitivity }) {
  const meta = SENSITIVITY_LABEL[sensitivity];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/**
 * The compact badge row under a setting. Only badges that add information are
 * shown, and they are derived from the definition so they can never contradict
 * each other: a mandatory minimum is never labelled company-replaceable.
 */
export function SettingBadges({ definition, className }: { definition: GlobalSettingDefinition; className?: string }) {
  const kind = POLICY_KIND_LABEL[definition.policyKind];
  const override = OVERRIDE_LABEL[definition.override];
  const enforcement = useEnforcementState()(definition);
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <ScopeBadge scope={definition.scope} />
      <Badge tone={kind.tone}>{kind.label}</Badge>
      {definition.override === "allowed" || definition.override === "stricter_only" ? <Badge tone={override.tone}>{override.label}</Badge> : null}
      {enforcement === "enforced" ? <Badge tone="neutral">Backend-Enforced</Badge> : null}
      {enforcement === "recorded" ? <Badge tone="warning">Recorded Only</Badge> : null}
      {enforcement === "unavailable" ? <Badge tone="neutral">Not Available</Badge> : null}
    </div>
  );
}

const RESULT: Record<ChangeResult, { label: string; tone: Tone }> = {
  applied: { label: SETTINGS_MOCK_MODE ? "Applied (Demo)" : "Applied", tone: "success" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  scheduled: { label: "Planned", tone: "info" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export function ResultBadge({ result }: { result: ChangeResult }) {
  const meta = RESULT[result];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function VersionBadge({ status }: { status: VersionStatus }) {
  return <Badge tone={status === "current" ? "success" : "neutral"}>{status === "current" ? "Current" : "Previous"}</Badge>;
}

const MAINTENANCE: Record<MaintenanceEntryStatus, { label: string; tone: Tone }> = {
  upcoming: { label: "Upcoming", tone: "info" },
  active: { label: "Active", tone: "warning" },
  completed: { label: "Completed", tone: "neutral" },
  disabled: { label: "Not Enabled", tone: "neutral" },
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceEntryStatus }) {
  const meta = MAINTENANCE[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
