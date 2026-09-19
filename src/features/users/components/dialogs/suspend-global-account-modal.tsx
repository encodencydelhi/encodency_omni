import { AlertCircleIcon, BanIcon, ShieldAlertIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserMutations } from "../../data/hooks";
import { getAllRawUsers } from "../../data/mock/store";
import type { UserAggregate } from "../../data/types";

interface SuspendGlobalAccountModalProps {
  user: UserAggregate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSoleOwnerBlocked?: (companyId: string) => void;
}

export function SuspendGlobalAccountModal({
  user,
  open,
  onOpenChange,
}: SuspendGlobalAccountModalProps) {
  const mutations = useUserMutations();
  const [reason, setReason] = useState("");

  if (!user) return null;

  const allUsers = getAllRawUsers();

  // Check sole owner protection across all active memberships
  let soleOwnedCompany: string | null = null;
  for (const m of user.memberships) {
    if (m.role === "owner" && m.status === "active") {
      const otherOwners = allUsers.filter(
        (u) =>
          u.identity.id !== user.identity.id &&
          u.memberships.some((om) => om.companyId === m.companyId && om.role === "owner" && om.status === "active"),
      );
      if (otherOwners.length === 0) {
        soleOwnedCompany = m.companyName;
        break;
      }
    }
  }

  const handleConfirm = () => {
    mutations.suspendGlobalAccount.mutate(
      {
        userId: user.identity.id,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
            <BanIcon className="size-4.5" />
            <span>Suspend Global User Account</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Platform-wide administrative hold for {user.identity.name}.
          </DialogDescription>
        </DialogHeader>

        {soleOwnedCompany ? (
          /* Sole Owner Blocked */
          <div className="py-2 space-y-3 text-xs">
            <div className="p-3.5 rounded-md border border-rose-200 bg-rose-50 text-rose-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="size-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-sm mb-0.5">Suspension Blocked: Sole Active Owner</strong>
                  {user.identity.name} is the sole active owner of <strong>{soleOwnedCompany}</strong>. Global suspension cannot be executed while an organization would be left without an active owner.
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Please transfer ownership of {soleOwnedCompany} to another member before suspending this global account.
            </p>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3.5 py-1 text-xs">
            <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-950 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                <ShieldAlertIcon className="size-4 text-rose-600" />
                <span>High-Risk Platform Action</span>
              </div>
              <p className="text-xs leading-snug">
                Suspending this global identity will immediately revoke all <strong>{user.activeSessionsCount} active sessions</strong> across every device, and freeze access to <strong>{user.memberships.length} associated companies</strong>.
              </p>
            </div>

            {/* Affected Memberships Summary */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-700">
                Affected Company Memberships ({user.memberships.length})
              </span>
              <div className="max-h-32 overflow-y-auto border rounded divide-y divide-border bg-slate-50/50 text-xs">
                {user.memberships.map((m) => (
                  <div key={m.id} className="p-2 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{m.companyName}</span>
                    <span className="text-slate-500 capitalize">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Owned resources note */}
            {user.ownedResources.length > 0 && (
              <div className="rounded p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Operational Impact:</strong> User owns {user.ownedResources.length} active resources (tasks, workflows, campaigns). Automated workflows may require administrative reassignment.
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="global-suspend-reason" className="text-xs font-semibold">
                Suspension Reason <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="global-suspend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Security incident investigation, contract termination."
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={mutations.suspendGlobalAccount.isPending}
                onClick={handleConfirm}
                className="text-xs"
              >
                Suspend Global Account
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
