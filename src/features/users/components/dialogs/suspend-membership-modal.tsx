import { AlertCircleIcon, BanIcon } from "lucide-react";
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
import type { CompanyMembership } from "../../data/types";

interface SuspendMembershipModalProps {
  membership: CompanyMembership | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSoleOwnerBlocked?: () => void;
}

export function SuspendMembershipModal({
  membership,
  userName,
  open,
  onOpenChange,
  onSoleOwnerBlocked,
}: SuspendMembershipModalProps) {
  const mutations = useUserMutations();
  const [reason, setReason] = useState("");

  if (!membership) return null;

  const allUsers = getAllRawUsers();
  const isSoleOwner =
    membership.role === "owner" &&
    allUsers.filter(
      (u) =>
        u.identity.id !== membership.userId &&
        u.memberships.some(
          (m) => m.companyId === membership.companyId && m.role === "owner" && m.status === "active",
        ),
    ).length === 0;

  const handleConfirm = () => {
    mutations.suspendMembership.mutate(
      {
        membershipId: membership.id,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
            <BanIcon className="size-4.5" />
            <span>Suspend Company Membership</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Temporarily disable {userName}&apos;s access to {membership.companyName}.
          </DialogDescription>
        </DialogHeader>

        {isSoleOwner ? (
          <div className="py-2 space-y-3 text-xs">
            <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-900 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="size-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-sm mb-0.5">Cannot Suspend Sole Owner</strong>
                  {userName} is the only active owner of {membership.companyName}. An active organization must have an active owner.
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Close
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onSoleOwnerBlocked?.();
                }}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Transfer Ownership First
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-1 text-xs">
            <div className="rounded border border-slate-200 p-3 bg-slate-50/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected User:</span>
                <span className="font-semibold text-slate-800">{userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Affected Company:</span>
                <span className="font-semibold text-slate-800">{membership.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Affected Role:</span>
                <span className="font-semibold text-slate-800">{membership.role}</span>
              </div>
            </div>

            <div className="rounded p-2.5 bg-sky-50 border border-sky-200 text-sky-900 text-xs">
              <strong>Isolated Impact:</strong> Only access to {membership.companyName} will be paused. Other company memberships and global account status remain active.
            </div>

            <div className="space-y-1">
              <Label htmlFor="suspend-reason" className="text-xs font-semibold">
                Reason for Suspension <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="suspend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Temporary leave of absence, pending security review."
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
                disabled={mutations.suspendMembership.isPending}
                onClick={handleConfirm}
                className="text-xs"
              >
                Suspend Membership
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
