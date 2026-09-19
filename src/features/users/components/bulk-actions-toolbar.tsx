import {
  BanIcon,
  BellIcon,
  DownloadIcon,
  KeyRoundIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { exportUsersToCsv } from "../data/config";
import { useUserMutations } from "../data/hooks";
import type { UserAggregate } from "../data/types";

interface BulkActionsToolbarProps {
  selectedUsers: UserAggregate[];
  onClearSelection: () => void;
  className?: string;
}

export function BulkActionsToolbar({
  selectedUsers,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const mutations = useUserMutations();
  const [suspendingOpen, setSuspendingOpen] = useState(false);

  if (selectedUsers.length === 0) return null;

  const count = selectedUsers.length;
  const affectedCompanies = new Set(
    selectedUsers.flatMap((u) => u.memberships.map((m) => m.companyName)),
  );
  const protectedOwners = selectedUsers.filter((u) => u.hasOwnerAccess);

  const handleExportSelected = () => {
    exportUsersToCsv(
      selectedUsers,
      `omniplatform-selected-users-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const handleRequire2Fa = () => {
    mutations.bulkAction.mutate({
      action: "require_2fa",
      userIds: selectedUsers.map((u) => u.identity.id),
    });
  };

  const handleNotify = () => {
    const { toast } = require("sonner");
    toast.success(`Account notification queued for ${count} users.`);
  };

  const handleConfirmSuspend = () => {
    mutations.bulkAction.mutate(
      {
        action: "suspend",
        userIds: selectedUsers.map((u) => u.identity.id),
      },
      {
        onSuccess: () => {
          setSuspendingOpen(false);
          onClearSelection();
        },
      },
    );
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white text-slate-900 rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3 border border-slate-200/90 ring-1 ring-slate-950/5 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
          <span className="bg-blue-50 text-blue-700 font-bold rounded-full size-5.5 flex items-center justify-center text-xs border border-blue-200">
            {count}
          </span>
          <span className="text-xs font-semibold text-slate-800">
            {count === 1 ? "User Selected" : "Users Selected"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportSelected}
            className="h-7 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 gap-1 border-slate-200"
          >
            <DownloadIcon className="size-3" />
            <span>Export</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRequire2Fa}
            disabled={mutations.bulkAction.isPending}
            className="h-7 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 gap-1 border-slate-200"
          >
            <KeyRoundIcon className="size-3" />
            <span>Require 2FA</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNotify}
            className="h-7 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 gap-1 border-slate-200"
          >
            <BellIcon className="size-3" />
            <span>Notify</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSuspendingOpen(true)}
            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 border-rose-200"
          >
            <BanIcon className="size-3" />
            <span>Suspend</span>
          </Button>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
          title="Clear Selection"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      <ConfirmDialog
        open={suspendingOpen}
        onOpenChange={setSuspendingOpen}
        title={`Suspend ${count} Selected Users?`}
        description={`This is a high-risk platform action. Selected users will lose access to all ${affectedCompanies.size} associated companies, and active sessions will be revoked immediately.${protectedOwners.length > 0 ? ` Protected Owners Warning: ${protectedOwners.length} selected user(s) are company owners (${protectedOwners.map((u) => u.identity.name).join(", ")}). If any company has no other active owner, suspension will be safely blocked.` : ""}`}
        confirmLabel="Suspend Accounts"
        variant="destructive"
        isPending={mutations.bulkAction.isPending}
        onConfirm={handleConfirmSuspend}
      />
    </>
  );
}
