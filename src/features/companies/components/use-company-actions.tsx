"use client";

import {
  ActivityIcon,
  ArchiveIcon,
  ArrowRightLeftIcon,
  BanIcon,
  CircleCheckIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  FolderIcon,
  GaugeIcon,
  LayersIcon,
  PencilIcon,
  PlugIcon,
  RepeatIcon,
  SquareArrowOutUpRightIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils/format";
import { useCompanyCapabilities } from "../data/capability-provider";
import { companySectionHref } from "../data/config";
import type { CompanySection, CompanySummary, UsageResource } from "../data/types";
import { downloadCsv } from "../lib/csv";
import { CompanyEditDrawer } from "./company-edit-drawer";
import {
  ArchiveFlow,
  AssignOwnersDialog,
  ReactivateFlow,
  SendNotificationDialog,
  SuspendFlow,
  TransferOwnershipFlow,
} from "./flows/lifecycle-flows";
import {
  ChangePlanFlow,
  SubscriptionActionDialog,
  UsageOverrideDialog,
  type SubscriptionAction,
} from "./flows/subscription-flows";

export type CompanyFlow =
  | { kind: "edit"; summary: CompanySummary }
  | { kind: "suspend"; targets: CompanySummary[] }
  | { kind: "reactivate"; targets: CompanySummary[] }
  | { kind: "archive"; summary: CompanySummary }
  | { kind: "transfer"; summary: CompanySummary }
  | { kind: "assign"; targets: CompanySummary[] }
  | { kind: "notify"; targets: CompanySummary[] }
  | { kind: "changePlan"; companyId: string }
  | { kind: "override"; companyId: string; resource?: UsageResource }
  | { kind: "subscription"; companyId: string; action: SubscriptionAction };

const VIEWS: ReadonlyArray<{ id: CompanySection; label: string; icon: typeof UsersIcon }> = [
  { id: "users", label: "View Users", icon: UsersIcon },
  { id: "clients", label: "View Clients", icon: FolderIcon },
  { id: "subscription", label: "View Subscription", icon: LayersIcon },
  { id: "billing", label: "View Billing", icon: CreditCardIcon },
  { id: "usage", label: "View Usage", icon: GaugeIcon },
  { id: "integrations", label: "View Integrations", icon: PlugIcon },
  { id: "activity", label: "View Activity", icon: ActivityIcon },
];

export function exportCompanySummary(summary: CompanySummary): void {
  const { company } = summary;
  downloadCsv(
    `${company.slug}-summary.csv`,
    ["Field", "Value"],
    [
      ["Company", company.name],
      ["Company ID", company.displayId],
      ["Domain", company.domain],
      ["Account status", company.accountStatus],
      ["Subscription status", summary.subscriptionStatus],
      ["Billing status", summary.billingStatus],
      ["Plan", `${summary.plan.name} (${summary.plan.billingCycle})`],
      ["MRR (minor units)", summary.mrrMinor],
      ["Currency", summary.currency],
      ["Owner", `${summary.owner.name} <${summary.owner.email}>`],
      ["Users", summary.counts.users],
      ["Clients", summary.counts.clients],
      ["Connections", summary.counts.connections],
      ["Highest limit utilisation", summary.usage.utilization === null ? "" : `${summary.usage.utilization}%`],
      ["Tenant health", `${summary.health.status}: ${summary.health.reason}`],
      ["Created", formatDate(company.createdAt)],
    ],
  );
}

/**
 * The single place that decides which actions a company offers and hosts the
 * dialogs behind them. Rows, the preview drawer and the detail header all ask
 * this hook, so an action is valid (or hidden) for the same reasons everywhere.
 */
export function useCompanyActions() {
  const router = useRouter();
  const capabilities = useCompanyCapabilities();
  const [flow, setFlow] = useState<CompanyFlow | null>(null);

  const closeFlow = useCallback(() => setFlow(null), []);

  const rowMenu = useCallback(
    (summary: CompanySummary, options: { onPreview?: (summary: CompanySummary) => void } = {}): ActionMenuItem[] => {
      const { company } = summary;
      const status = company.accountStatus;
      const archived = status === "archived";
      const id = company.id;
      const items: ActionMenuItem[] = [
        { id: "open", label: "Open Company", icon: SquareArrowOutUpRightIcon, onSelect: () => router.push(ROUTES.superAdmin.company(id)) },
      ];

      if (options.onPreview) {
        items.push({ id: "preview", label: "Quick Preview", icon: EyeIcon, onSelect: () => options.onPreview?.(summary) });
      }
      if (capabilities.canEditCompany && !archived) {
        items.push({ id: "edit", label: "Edit Company", icon: PencilIcon, onSelect: () => setFlow({ kind: "edit", summary }) });
      }

      VIEWS.forEach((view, index) => {
        // Archived companies keep read-only history views but drop day-to-day ones.
        if (archived && view.id !== "billing" && view.id !== "activity") return;
        items.push({
          id: view.id,
          label: view.label,
          icon: view.icon,
          separatorBefore: index === 0,
          onSelect: () => router.push(companySectionHref(id, view.id)),
        });
      });

      if (capabilities.canEditCompany && !archived) {
        items.push({ id: "assign", label: "Assign Internal Owner", icon: UserCogIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "assign", targets: [summary] }) });
      }
      if (status === "active" && capabilities.canSuspendCompany) {
        items.push({ id: "suspend", label: "Suspend Company", icon: BanIcon, variant: "destructive", separatorBefore: true, onSelect: () => setFlow({ kind: "suspend", targets: [summary] }) });
      }
      if (status === "suspended" && capabilities.canReactivateCompany) {
        items.push({ id: "reactivate", label: "Reactivate Company", icon: CircleCheckIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "reactivate", targets: [summary] }) });
      }
      if (!archived && capabilities.canArchiveCompany) {
        items.push({ id: "archive", label: "Archive Company", icon: ArchiveIcon, variant: "destructive", onSelect: () => setFlow({ kind: "archive", summary }) });
      }
      return items;
    },
    [capabilities, router],
  );

  /** The "More" menu on the detail header. */
  const detailMenu = useCallback(
    (summary: CompanySummary): ActionMenuItem[] => {
      const status = summary.company.accountStatus;
      const archived = status === "archived";
      const items: ActionMenuItem[] = [];

      if (capabilities.canManageSubscription && !archived) {
        items.push({ id: "plan", label: "Change Plan", icon: RepeatIcon, onSelect: () => setFlow({ kind: "changePlan", companyId: summary.company.id }) });
      }
      if (capabilities.canEditCompany && !archived) {
        items.push({ id: "assign", label: "Assign Internal Owner", icon: UserCogIcon, onSelect: () => setFlow({ kind: "assign", targets: [summary] }) });
      }
      if (capabilities.canTransferOwnership && !archived) {
        items.push({ id: "transfer", label: "Transfer Ownership", icon: ArrowRightLeftIcon, onSelect: () => setFlow({ kind: "transfer", summary }) });
      }
      if (capabilities.canExportCompanyData) {
        items.push({ id: "export", label: "Export Company Summary", icon: DownloadIcon, separatorBefore: items.length > 0, onSelect: () => exportCompanySummary(summary) });
      }
      if (status === "active" && capabilities.canSuspendCompany) {
        items.push({ id: "suspend", label: "Suspend Company", icon: BanIcon, variant: "destructive", separatorBefore: true, onSelect: () => setFlow({ kind: "suspend", targets: [summary] }) });
      }
      if (status === "suspended" && capabilities.canReactivateCompany) {
        items.push({ id: "reactivate", label: "Reactivate Company", icon: CircleCheckIcon, separatorBefore: true, onSelect: () => setFlow({ kind: "reactivate", targets: [summary] }) });
      }
      if (!archived && capabilities.canArchiveCompany) {
        items.push({ id: "archive", label: "Archive Company", icon: ArchiveIcon, variant: "destructive", onSelect: () => setFlow({ kind: "archive", summary }) });
      }
      return items;
    },
    [capabilities],
  );

  const dialogs: ReactNode = useMemo(() => {
    if (!flow) return null;
    switch (flow.kind) {
      case "edit":
        return <CompanyEditDrawer summary={flow.summary} onClose={closeFlow} />;
      case "suspend":
        return <SuspendFlow targets={flow.targets} onClose={closeFlow} />;
      case "reactivate":
        return <ReactivateFlow targets={flow.targets} onClose={closeFlow} />;
      case "archive":
        return <ArchiveFlow target={flow.summary} onClose={closeFlow} />;
      case "transfer":
        return <TransferOwnershipFlow target={flow.summary} onClose={closeFlow} />;
      case "assign":
        return <AssignOwnersDialog targets={flow.targets} onClose={closeFlow} />;
      case "notify":
        return <SendNotificationDialog targets={flow.targets} onClose={closeFlow} />;
      case "changePlan":
        return <ChangePlanFlow companyId={flow.companyId} onClose={closeFlow} />;
      case "override":
        return <UsageOverrideDialog companyId={flow.companyId} initialResource={flow.resource} onClose={closeFlow} />;
      case "subscription":
        return <SubscriptionActionDialog companyId={flow.companyId} action={flow.action} onClose={closeFlow} />;
    }
  }, [closeFlow, flow]);

  return { capabilities, openFlow: setFlow, closeFlow, rowMenu, detailMenu, dialogs };
}
