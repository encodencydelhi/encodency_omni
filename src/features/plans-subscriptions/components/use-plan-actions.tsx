"use client";

import { ArchiveIcon, EyeIcon, EyeOffIcon, FilePlus2Icon, PencilIcon, RocketIcon, SquareArrowOutUpRightIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { describeError, usePlanMutations, useSubscriptionCapabilities } from "../data/hooks";
import { routes } from "../data/config";
import type { PlanSummary } from "../data/types";
import { PublishFlow } from "./flows/publish-flow";
import { RetireFlow } from "./flows/retire-flow";

export type PlanFlow =
  | { kind: "publish"; summary: PlanSummary }
  | { kind: "retire"; summary: PlanSummary }
  | { kind: "hide"; summary: PlanSummary }
  | { kind: "discard"; summary: PlanSummary };

/**
 * The single place that decides which actions a plan offers and hosts the dialogs
 * behind them. Cards, the detail header and the editor all ask this hook, so an
 * action is valid (or absent) for the same reasons everywhere - and a retired
 * plan offers nothing that would change it.
 */
export function usePlanActions() {
  const router = useRouter();
  const capabilities = useSubscriptionCapabilities();
  const mutations = usePlanMutations();
  const [flow, setFlow] = useState<PlanFlow | null>(null);
  const close = useCallback(() => setFlow(null), []);

  const run = useCallback(async (work: Promise<unknown>, success: string) => {
    try {
      await work;
      toast.success(success);
    } catch (failure) {
      toast.error(describeError(failure).message);
    }
  }, []);

  const startVersion = useCallback(
    async (summary: PlanSummary) => {
      try {
        await mutations.startNewVersion(summary.plan.id);
        toast.success(`Version started as a draft`);
        router.push(routes.editPlan(summary.plan.id));
      } catch (failure) {
        toast.error(describeError(failure).message);
      }
    },
    [mutations, router],
  );

  /** The primary "edit" for a plan: edit its draft, or start a new version of a live plan. */
  const editAction = useCallback(
    (summary: PlanSummary): { label: string; run: () => void } | null => {
      if (!capabilities.canEditDraftPlan || summary.plan.status === "retired") return null;
      if (summary.draft) return { label: "Edit Draft", run: () => router.push(routes.editPlan(summary.plan.id)) };
      return { label: "Create New Version", run: () => void startVersion(summary) };
    },
    [capabilities.canEditDraftPlan, router, startVersion],
  );

  const menu = useCallback(
    (summary: PlanSummary): ActionMenuItem[] => {
      const { plan } = summary;
      const items: ActionMenuItem[] = [{ id: "open", label: "View Plan", icon: SquareArrowOutUpRightIcon, onSelect: () => router.push(routes.plan(plan.id)) }];
      const edit = editAction(summary);
      if (edit) items.push({ id: "edit", label: edit.label, icon: summary.draft ? PencilIcon : FilePlus2Icon, onSelect: edit.run });
      items.push({ id: "subs", label: "View Subscriptions", icon: UsersIcon, onSelect: () => router.push(routes.subscriptionsFor({ plan: plan.key })) });
      if (summary.draft && capabilities.canPublishPlan && plan.status !== "retired") {
        items.push({ id: "publish", label: "Publish", icon: RocketIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "publish", summary }) });
      }
      if (summary.draft && summary.current && capabilities.canEditDraftPlan) {
        items.push({ id: "discard", label: "Discard Draft Version", icon: Trash2Icon, onSelect: () => setFlow({ kind: "discard", summary }) });
      }
      if (plan.status === "published" && capabilities.canPublishPlan) {
        items.push({ id: "hide", label: "Hide From New Purchase", icon: EyeOffIcon, separatorBefore: !summary.draft, onSelect: () => setFlow({ kind: "hide", summary }) });
      }
      if (plan.status === "hidden" && capabilities.canPublishPlan) {
        items.push({ id: "show", label: "Show For New Purchase", icon: EyeIcon, separatorBefore: true, onSelect: () => void run(mutations.showPlan(plan.id), `${plan.name} is available again`) });
      }
      if ((plan.status === "published" || plan.status === "hidden") && capabilities.canRetirePlan) {
        items.push({ id: "retire", label: "Retire Plan", icon: ArchiveIcon, variant: "destructive", onSelect: () => setFlow({ kind: "retire", summary }) });
      }
      return items;
    },
    [capabilities, editAction, mutations, router, run],
  );

  const dialogs: ReactNode = useMemo(() => {
    if (!flow) return null;
    const { plan } = flow.summary;
    switch (flow.kind) {
      case "publish":
        return <PublishFlow summary={flow.summary} onClose={close} />;
      case "retire":
        return <RetireFlow summary={flow.summary} onClose={close} />;
      case "hide":
        return (
          <ConfirmDialog
            open
            onOpenChange={(open) => !open && close()}
            title={`Hide ${plan.name} from new purchase?`}
            description="The plan stops appearing for new purchase, upgrade and downgrade. Every existing subscription keeps it unchanged. You can show it again at any time."
            confirmLabel="Hide Plan"
            onConfirm={() => {
              close();
              void run(mutations.hidePlan(plan.id), `${plan.name} hidden from new purchase`);
            }}
          />
        );
      case "discard":
        return (
          <ConfirmDialog
            open
            onOpenChange={(open) => !open && close()}
            title="Discard this draft version?"
            description={`The unpublished changes to ${plan.name} are removed. The published version and every subscription are untouched.`}
            confirmLabel="Discard Draft"
            variant="destructive"
            onConfirm={() => {
              close();
              void run(mutations.discardDraft(plan.id), "Draft version discarded");
            }}
          />
        );
    }
  }, [close, flow, mutations, run]);

  return { capabilities, menu, editAction, openFlow: setFlow, dialogs };
}
