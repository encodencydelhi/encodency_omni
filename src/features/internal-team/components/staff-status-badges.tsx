"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AccessReviewStatus, InvitationStatus, MfaState } from "../data/types";
import { ACCESS_REVIEW_STATUS, INVITATION_STATUS_CONFIG, MFA_STATE_CONFIG, TEAM_MEMBER_STATUS_CONFIG } from "../data/config";
import { INTERNAL_ROLE, TEAM_MEMBER_STATUS, type TeamMemberStatus } from "@/types/domain/team";

export function StaffStatusBadge({ status }: { status: TeamMemberStatus }) {
  return <StatusBadge registry={TEAM_MEMBER_STATUS} status={status} withDot />;
}

export function StaffRoleBadge({ role }: { role: string }) {
  const meta = INTERNAL_ROLE[role as keyof typeof INTERNAL_ROLE];
  if (!meta) return <Badge tone="neutral">{role}</Badge>;
  return <Badge tone={meta.tone as "brand" | "info" | "neutral"}>{meta.label}</Badge>;
}

export function MfaStateBadge({ state }: { state: MfaState }) {
  return <StatusBadge registry={MFA_STATE_CONFIG} status={state} withDot />;
}

export function AccessReviewStatusBadge({ status }: { status: AccessReviewStatus }) {
  return <StatusBadge registry={ACCESS_REVIEW_STATUS} status={status} withDot />;
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return <StatusBadge registry={INVITATION_STATUS_CONFIG} status={status} withDot />;
}

export function PrivilegedBadge({ privileged }: { privileged: boolean }) {
  if (!privileged) return null;
  return <Badge tone="warning" className="text-2xs">Privileged</Badge>;
}
