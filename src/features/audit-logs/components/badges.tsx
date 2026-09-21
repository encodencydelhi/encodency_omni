"use client";

import { BotIcon, GlobeIcon, ShieldQuestionIcon, UserIcon, UserRoundCogIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ACTOR_TYPE, CATEGORY, INTEGRITY, OUTCOME, PRIORITY, SENSITIVE, WORKFLOW_STAGE } from "../data/config";
import type { ActorType, AuditCategory, AuditOutcome, IntegrityStatus, ReviewPriority, SensitiveCategory, WorkflowStage } from "../data/types";

/** Marks records that exist only in this frontend demo. */
export function DemoTag({ children = "Demo Audit Data" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">{children}</span>;
}

export const OutcomeBadge = ({ outcome }: { outcome: AuditOutcome }) => <Badge tone={OUTCOME[outcome].tone}>{OUTCOME[outcome].label}</Badge>;

/** Review priority is a different field from the outcome: a success can warrant review, a failure is not evidence of intent. */
export const PriorityBadge = ({ priority }: { priority: ReviewPriority }) => <Badge tone={PRIORITY[priority].tone}>{PRIORITY[priority].label}</Badge>;

export const SensitiveBadge = ({ category }: { category: SensitiveCategory }) => <Badge tone="warning">{SENSITIVE[category].label}</Badge>;

export const WorkflowBadge = ({ stage }: { stage: WorkflowStage }) => <Badge tone={WORKFLOW_STAGE[stage].tone}>{WORKFLOW_STAGE[stage].label}</Badge>;

export const IntegrityBadge = ({ status }: { status: IntegrityStatus }) => <Badge tone={INTEGRITY[status].tone}>{INTEGRITY[status].label}</Badge>;

export const CategoryLabel = ({ category }: { category: AuditCategory }) => <span className="whitespace-nowrap">{CATEGORY[category].label}</span>;

const ACTOR_ICON: Record<ActorType, typeof UserIcon> = { staff: UserRoundCogIcon, company_user: UserIcon, system: BotIcon, external_provider: GlobeIcon, anonymous: ShieldQuestionIcon };

export function ActorIcon({ type, className }: { type: ActorType; className?: string }) {
  const Icon = ACTOR_ICON[type];
  return (
    <span className={className ?? "flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground"} title={ACTOR_TYPE[type].label}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{ACTOR_TYPE[type].label}</span>
    </span>
  );
}
