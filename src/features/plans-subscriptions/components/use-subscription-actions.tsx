"use client";

import {
  BanIcon,
  BuildingIcon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  ExternalLinkIcon,
  EyeIcon,
  GaugeIcon,
  RepeatIcon,
  RotateCcwIcon,
  ShieldPlusIcon,
  TimerIcon,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { ROUTES } from "@/config/routes";
import { companySectionHref } from "@/features/companies/data/config";
import { routes } from "../data/config";
import { useSubscriptionCapabilities } from "../data/hooks";
import type { ResourceKey, ScheduledChangeView, SubscriptionRow } from "../data/types";
import { CancelScheduledFlow, CancelSubscriptionFlow, ReactivateFlow, RescheduleFlow, UndoCancellationFlow } from "./flows/lifecycle-flows";
import { OverrideFlow } from "./flows/override-flow";
import { PlanChangeWizard } from "./flows/plan-change-wizard";
import { ConvertTrialFlow, EndTrialFlow, ExtendTrialFlow, TrialManagementDialog } from "./flows/trial-flows";

export type SubscriptionFlow =
  | { kind: "change"; row: SubscriptionRow; planKey?: string }
  | { kind: "trial" | "extend" | "convert" | "endTrial" | "cancel" | "undo" | "reactivate"; row: SubscriptionRow }
  | { kind: "override"; row: SubscriptionRow; resource?: ResourceKey }
  | { kind: "reschedule" | "cancelScheduled"; change: ScheduledChangeView };

const RUNNING = new Set(["active", "trialing", "past_due", "paused", "scheduled_cancellation"]);
export function useSubscriptionActions() {
  const router = useRouter();
  const capabilities = useSubscriptionCapabilities();
  const [flow, setFlow] = useState<SubscriptionFlow | null>(null);
  const close = useCallback(() => setFlow(null), []);

  const can = useCallback(
    (row: SubscriptionRow) => {
      const operable = row.company.accountStatus !== "archived";
      const running = RUNNING.has(row.status);
      return {
        changePlan: capabilities.canChangeCompanyPlan && operable && running,
        trial: capabilities.canManageTrials && operable && row.status === "trialing",
        cancel: capabilities.canScheduleCancellation && operable && (row.status === "active" || row.status === "trialing" || row.status === "past_due"),
        undo: capabilities.canScheduleCancellation && operable && row.status === "scheduled_cancellation",
        reactivate: capabilities.canReactivateSubscription && operable && (row.status === "paused" || row.status === "cancelled" || row.status === "expired"),
        override: capabilities.canManageEntitlementOverrides && operable && running,
      };
    },
    [capabilities],
  );

  const menu = useCallback(
    (row: SubscriptionRow, options: { onPreview?: (row: SubscriptionRow) => void; hideOpen?: boolean } = {}): ActionMenuItem[] => {
      const allowed = can(row);
      const items: ActionMenuItem[] = [];
      if (!options.hideOpen) items.push({ id: "open", label: "View Subscription", icon: ExternalLinkIcon, onSelect: () => router.push(routes.subscription(row.id)) });
      if (options.onPreview) items.push({ id: "preview", label: "Quick Preview", icon: EyeIcon, onSelect: () => options.onPreview?.(row) });
      items.push({ id: "company", label: "Open Company", icon: BuildingIcon, onSelect: () => router.push(ROUTES.superAdmin.company(row.company.id)) });
      if (allowed.changePlan) items.push({ id: "change", label: "Change Plan", icon: RepeatIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "change", row }) });
      if (allowed.trial) items.push({ id: "trial", label: "Manage Trial", icon: TimerIcon, onSelect: () => setFlow({ kind: "trial", row }) });
      if (allowed.override) items.push({ id: "override", label: "Apply Entitlement Override", icon: ShieldPlusIcon, onSelect: () => setFlow({ kind: "override", row }) });
      items.push({ id: "usage", label: "View Usage", icon: GaugeIcon, separatorBefore: true, onSelect: () => router.push(companySectionHref(row.company.id, "usage")) });
      items.push({ id: "billing", label: "View Billing", icon: CircleDollarSignIcon, onSelect: () => router.push(companySectionHref(row.company.id, "billing")) });
      if (allowed.cancel) items.push({ id: "cancel", label: "Schedule Cancellation", icon: BanIcon, variant: "destructive", separatorBefore: true, onSelect: () => setFlow({ kind: "cancel", row }) });
      if (allowed.undo) items.push({ id: "undo", label: "Undo Cancellation", icon: Undo2Icon, separatorBefore: true, onSelect: () => setFlow({ kind: "undo", row }) });
      if (allowed.reactivate) items.push({ id: "reactivate", label: "Reactivate Subscription", icon: RotateCcwIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "reactivate", row }) });
      return items;
    },
    [can, router],
  );

  /** Actions on a scheduled change row. */
  const changeMenu = useCallback(
    (change: ScheduledChangeView): ActionMenuItem[] => {
      const items: ActionMenuItem[] = [{ id: "open", label: "View Details", icon: CalendarClockIcon, onSelect: () => router.push(routes.subscription(change.subscriptionId, "history")) }];
      if (capabilities.canChangeCompanyPlan && change.canReschedule) items.push({ id: "reschedule", label: "Reschedule", icon: CalendarClockIcon, onSelect: () => setFlow({ kind: "reschedule", change }) });
      if ((capabilities.canChangeCompanyPlan || capabilities.canScheduleCancellation) && change.canCancel) {
        items.push({ id: "cancel", label: change.kind === "cancellation" ? "Undo Cancellation" : "Cancel Scheduled Change", icon: Undo2Icon, variant: "destructive", separatorBefore: true, onSelect: () => setFlow({ kind: "cancelScheduled", change }) });
      }
      return items;
    },
    [capabilities, router],
  );

  const dialogs: ReactNode = useMemo(() => {
    if (!flow) return null;
    switch (flow.kind) {
      case "change":
        return <PlanChangeWizard row={flow.row} initialPlan={flow.planKey} onClose={close} />;
      case "trial":
        return <TrialManagementDialog row={flow.row} onAction={(kind) => setFlow({ kind, row: flow.row })} onClose={close} />;
      case "extend":
        return <ExtendTrialFlow row={flow.row} onClose={close} />;
      case "convert":
        return <ConvertTrialFlow row={flow.row} onClose={close} />;
      case "endTrial":
        return <EndTrialFlow row={flow.row} onClose={close} />;
      case "cancel":
        return <CancelSubscriptionFlow row={flow.row} onClose={close} />;
      case "undo":
        return <UndoCancellationFlow row={flow.row} onClose={close} />;
      case "reactivate":
        return <ReactivateFlow row={flow.row} onClose={close} />;
      case "override":
        return <OverrideFlow row={flow.row} initialResource={flow.resource} onClose={close} />;
      case "reschedule":
        return <RescheduleFlow change={flow.change} onClose={close} />;
      case "cancelScheduled":
        return <CancelScheduledFlow change={flow.change} onClose={close} />;
    }
  }, [close, flow]);

  return { capabilities, can, menu, changeMenu, openFlow: setFlow, dialogs };
}
