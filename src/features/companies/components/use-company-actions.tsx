"use client";

import { BanIcon, CircleCheckIcon, ExternalLinkIcon, GaugeIcon, RepeatIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/components/auth-provider";
import type { Company } from "@/types/domain/company";
import { useChangeCompanyStatus } from "../hooks/use-companies";
import { ChangePlanDialog } from "./change-plan-dialog";

/**
 * Row actions for a company, together with the dialogs they open.
 *
 * The hook returns both a renderer and the dialog elements so a table only has
 * to place them; the state machine behind suspend/reactivate lives here rather
 * than being duplicated in the list and the detail page.
 */
export function useCompanyActions() {
  const router = useRouter();
  const { can } = useAuth();
  const changeStatus = useChangeCompanyStatus();

  const [planTarget, setPlanTarget] = useState<Company | null>(null);
  const [statusTarget, setStatusTarget] = useState<Company | null>(null);

  const canWrite = can("companies:write");
  const canBill = can("plans:write");

  const buildItems = (company: Company): ActionMenuItem[] => {
    const isSuspended = company.status === "suspended";

    const items: ActionMenuItem[] = [
      {
        id: "view",
        label: "View company",
        icon: ExternalLinkIcon,
        onSelect: () => router.push(ROUTES.superAdmin.company(company.id)),
      },
      {
        id: "usage",
        label: "View usage",
        icon: GaugeIcon,
        onSelect: () => router.push(`${ROUTES.superAdmin.company(company.id)}?tab=usage`),
      },
    ];

    if (canBill) {
      items.push({
        id: "plan",
        label: "Change plan",
        icon: RepeatIcon,
        onSelect: () => setPlanTarget(company),
      });
    }

    if (canWrite) {
      items.push({
        id: "status",
        label: isSuspended ? "Reactivate company" : "Suspend company",
        icon: isSuspended ? CircleCheckIcon : BanIcon,
        variant: isSuspended ? "default" : "destructive",
        separatorBefore: true,
        onSelect: () => setStatusTarget(company),
      });
    }

    return items;
  };

  const renderActions = (company: Company): ReactNode => (
    <ActionMenu items={buildItems(company)} label={`Actions for ${company.name}`} />
  );

  const isSuspending = statusTarget?.status !== "suspended";

  const dialogs = (
    <>
      <ChangePlanDialog company={planTarget} onOpenChange={(open) => !open && setPlanTarget(null)} />

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={isSuspending ? "Suspend this company?" : "Reactivate this company?"}
        description={
          isSuspending
            ? `${statusTarget?.name ?? "This company"} will lose access immediately. Scheduled publishing, crawls and analytics sync stop, and their users are signed out.`
            : `${statusTarget?.name ?? "This company"} regains access immediately. Paused background jobs resume on their next schedule.`
        }
        confirmLabel={isSuspending ? "Suspend company" : "Reactivate"}
        variant={isSuspending ? "destructive" : "default"}
        isPending={changeStatus.isPending}
        onConfirm={() => {
          if (!statusTarget) return;
          changeStatus.mutate(
            {
              companyId: statusTarget.id,
              status: statusTarget.status === "suspended" ? "active" : "suspended",
            },
            { onSuccess: () => setStatusTarget(null) },
          );
        }}
      />
    </>
  );

  return { renderActions, dialogs };
}
