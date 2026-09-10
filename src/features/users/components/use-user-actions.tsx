"use client";

import { BanIcon, Building2Icon, CircleCheckIcon, MailIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/components/auth-provider";
import type { PlatformUser } from "@/types/domain/user";
import { useChangeUserStatus } from "../hooks/use-users";

interface UserActionOptions {
  /** Hidden when the menu is already rendered inside that company. */
  includeCompanyLink?: boolean;
}

/** Row actions for a tenant user, plus the confirmation they open. */
export function useUserActions({ includeCompanyLink = true }: UserActionOptions = {}) {
  const router = useRouter();
  const { can } = useAuth();
  const changeStatus = useChangeUserStatus();

  const [statusTarget, setStatusTarget] = useState<PlatformUser | null>(null);
  const canWrite = can("users:write");

  const buildItems = (user: PlatformUser): ActionMenuItem[] => {
    const isSuspended = user.status === "suspended";
    const items: ActionMenuItem[] = [];

    if (includeCompanyLink) {
      items.push({
        id: "company",
        label: "View company",
        icon: Building2Icon,
        onSelect: () => router.push(ROUTES.superAdmin.company(user.company.id)),
      });
    }

    if (canWrite) {
      items.push({
        id: "invite",
        label: user.status === "invited" ? "Resend invitation" : "Send password reset",
        icon: MailIcon,
        onSelect: () => {
          // Delivery is a backend concern; the panel only requests it.
          toast.success(
            user.status === "invited"
              ? `Invitation resent to ${user.email}`
              : `Password reset sent to ${user.email}`,
          );
        },
      });

      items.push({
        id: "status",
        label: isSuspended ? "Reactivate user" : "Suspend user",
        icon: isSuspended ? CircleCheckIcon : BanIcon,
        variant: isSuspended ? "default" : "destructive",
        separatorBefore: true,
        onSelect: () => setStatusTarget(user),
      });
    }

    return items;
  };

  const renderActions = (user: PlatformUser): ReactNode => (
    <ActionMenu items={buildItems(user)} label={`Actions for ${user.name}`} />
  );

  const isSuspending = statusTarget?.status !== "suspended";

  const dialogs = (
    <ConfirmDialog
      open={statusTarget !== null}
      onOpenChange={(open) => !open && setStatusTarget(null)}
      title={isSuspending ? "Suspend this user?" : "Reactivate this user?"}
      description={
        isSuspending
          ? `${statusTarget?.name ?? "This user"} will be signed out of every session and lose access to their Clients. Their data is retained.`
          : `${statusTarget?.name ?? "This user"} will be able to sign in again with their existing permissions.`
      }
      confirmLabel={isSuspending ? "Suspend user" : "Reactivate"}
      variant={isSuspending ? "destructive" : "default"}
      isPending={changeStatus.isPending}
      onConfirm={() => {
        if (!statusTarget) return;
        changeStatus.mutate(
          { id: statusTarget.id, status: isSuspending ? "suspended" : "active" },
          { onSuccess: () => setStatusTarget(null) },
        );
      }}
    />
  );

  return { renderActions, dialogs };
}
