import { AlertTriangleIcon, ShieldCheckIcon, UserCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { useUserMutations } from "../../data/hooks";
import { getAllRawUsers } from "../../data/mock/store";
import type { CompanyMembership } from "../../data/types";

interface TransferOwnershipModalProps {
  membership: CompanyMembership | null;
  currentOwnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferred?: () => void;
}

export function TransferOwnershipModal({
  membership,
  currentOwnerName,
  open,
  onOpenChange,
  onTransferred,
}: TransferOwnershipModalProps) {
  const mutations = useUserMutations();
  const [newOwnerUserId, setNewOwnerUserId] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const dirty = useMemo(
    () => newOwnerUserId !== "" || reason.trim() !== "",
    [newOwnerUserId, reason],
  );

  const { requestClose, guardDialog } = useUnsavedGuard({
    dirty,
    onDiscard: () => onOpenChange(false),
    label: "ownership transfer",
  });

  if (!membership) return null;

  // Find eligible replacement members who belong to the SAME company
  const allUsers = getAllRawUsers();
  const eligibleMembers = allUsers.filter(
    (u) =>
      u.identity.id !== membership.userId &&
      u.memberships.some((m) => m.companyId === membership.companyId && m.status === "active"),
  );

  const selectedReplacement = eligibleMembers.find((u) => u.identity.id === newOwnerUserId);

  const handleConfirm = () => {
    if (!newOwnerUserId) return;

    mutations.transferOwnership.mutate(
      {
        companyId: membership.companyId,
        currentOwnerUserId: membership.userId,
        newOwnerUserId,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onTransferred?.();
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheckIcon className="size-4.5 text-amber-600" />
            <span>Transfer Organization Ownership</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Reassign primary ownership of {membership.companyName} to protect operational continuity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div className="rounded border border-amber-200 bg-amber-50/60 p-3 space-y-1.5 text-amber-900">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
              <span>Owner Succession Rule</span>
            </div>
            <p className="text-xs leading-snug">
              {membership.companyName} requires at least one active Organization Owner. Transferring ownership will reassign {currentOwnerName} to an Organization Admin.
            </p>
          </div>

          <div className="rounded border border-slate-200 p-3 bg-slate-50/60 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Company:</span>
              <span className="font-semibold text-slate-800">{membership.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Owner:</span>
              <span className="font-semibold text-slate-800">{currentOwnerName}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="successor-select" className="text-xs font-semibold">
              Select New Organization Owner <span className="text-rose-500">*</span>
            </Label>

            {eligibleMembers.length > 0 ? (
              <Select value={newOwnerUserId} onValueChange={setNewOwnerUserId}>
                <SelectTrigger id="successor-select" className="h-8.5 text-xs">
                  <SelectValue placeholder="Choose an active member from this company" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((u) => {
                    const memberRole = u.memberships.find((m) => m.companyId === membership.companyId)?.role;
                    return (
                      <SelectItem key={u.identity.id} value={u.identity.id}>
                        {u.identity.name} ({memberRole || "member"})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 border border-dashed rounded text-amber-800 bg-amber-50/50 text-xs">
                No other active members exist in {membership.companyName}. You must invite or add another user to this company before transferring ownership.
              </div>
            )}
          </div>

          {selectedReplacement && (
            <div className="rounded border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-900 space-y-1">
              <strong>Succession Summary:</strong>
              <div>• {selectedReplacement.identity.name} will be promoted to Organization Owner.</div>
              <div>• {currentOwnerName} will be safely transitioned to Organization Admin.</div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="transfer-reason" className="text-xs font-semibold">
              Reason / Internal Note <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="transfer-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Executive role handover, departure preparation."
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestClose}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!newOwnerUserId || mutations.transferOwnership.isPending}
            onClick={handleConfirm}
            className="text-xs gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <UserCheckIcon className="size-3.5" />
            <span>Confirm Ownership Transfer</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {guardDialog}
    </>
  );
}
