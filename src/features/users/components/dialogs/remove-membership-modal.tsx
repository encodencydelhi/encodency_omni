import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2Icon,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserMutations } from "../../data/hooks";
import { getAllRawUsers } from "../../data/mock/store";
import type { CompanyMembership, OwnedResource } from "../../data/types";

interface RemoveMembershipModalProps {
  membership: CompanyMembership | null;
  userName: string;
  ownedResources: OwnedResource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSoleOwnerBlocked?: () => void;
}

export function RemoveMembershipModal({
  membership,
  userName,
  ownedResources,
  open,
  onOpenChange,
  onSoleOwnerBlocked,
}: RemoveMembershipModalProps) {
  const mutations = useUserMutations();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reassignUserId, setReassignUserId] = useState<string>("");

  if (!membership) return null;

  const allUsers = getAllRawUsers();
  const companyResources = ownedResources.filter((r) => r.companyId === membership.companyId);

  // Check sole owner rule
  const isSoleOwner =
    membership.role === "owner" &&
    allUsers.filter(
      (u) =>
        u.identity.id !== membership.userId &&
        u.memberships.some(
          (m) => m.companyId === membership.companyId && m.role === "owner" && m.status === "active",
        ),
    ).length === 0;

  // Eligible replacement members from the SAME company
  const eligibleMembers = allUsers.filter(
    (u) =>
      u.identity.id !== membership.userId &&
      u.memberships.some((m) => m.companyId === membership.companyId && m.status === "active"),
  );

  const handleConfirm = () => {
    mutations.removeMembership.mutate(
      {
        membershipId: membership.id,
        reassignResourcesToUserId: reassignUserId || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setStep(1);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(op) => {
        if (!op) setStep(1);
        onOpenChange(op);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
            <Trash2Icon className="size-4.5" />
            <span>Remove Company Membership</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Revoke {userName}&apos;s access and membership from {membership.companyName}.
          </DialogDescription>
        </DialogHeader>

        {isSoleOwner ? (
          /* Sole Owner Blocked Guard (Section 69) */
          <div className="py-2 space-y-3 text-xs">
            <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="size-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-sm mb-0.5">Action Blocked: Sole Organization Owner</strong>
                  {userName} is the only active owner of {membership.companyName}. An organization cannot be left without an active owner.
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-xs">
              To proceed, you must first transfer organization ownership to another active member of {membership.companyName}.
            </p>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
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
          /* 3-Step Removal Flow */
          <div className="space-y-3.5 py-1 text-xs">
            {step === 1 && (
              /* Step 1: Impact Summary */
              <div className="space-y-3">
                <div className="rounded border border-slate-200 p-3 bg-slate-50/70 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Affected Company:</span>
                    <span className="font-semibold text-slate-800">{membership.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revoked Role:</span>
                    <span className="font-semibold text-slate-800">{membership.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revoked Client Access:</span>
                    <span className="font-semibold text-slate-800">
                      {membership.clientAccess.clients.length} clients
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Owned Resources:</span>
                    <span className="font-semibold text-slate-800">
                      {companyResources.length} items
                    </span>
                  </div>
                </div>

                <div className="rounded p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Identity Notice:</strong> {userName}&apos;s global user identity will remain intact. Only access to {membership.companyName} is revoked.
                </div>
              </div>
            )}

            {step === 2 && (
              /* Step 2: Resource Reassignment */
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">
                    Reassign Owned Resources ({companyResources.length})
                  </span>
                  <p className="text-xs text-slate-500">
                    {companyResources.length > 0
                      ? `Select an active member of ${membership.companyName} to take over active tasks and workflows.`
                      : `User owns no active workflows or campaigns in ${membership.companyName}.`}
                  </p>
                </div>

                {companyResources.length > 0 && (
                  <div className="space-y-2">
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-slate-50/50 space-y-1 text-xs">
                      {companyResources.map((res) => (
                        <div key={res.id} className="flex justify-between truncate">
                          <span className="truncate font-medium">• {res.title}</span>
                          <span className="text-slate-400 capitalize shrink-0">{res.type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="reassign-select" className="text-xs font-semibold">
                        Transfer Resources To <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={reassignUserId} onValueChange={setReassignUserId}>
                        <SelectTrigger id="reassign-select" className="h-8.5 text-xs">
                          <SelectValue placeholder="Choose replacement member in this company" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleMembers.map((u) => (
                            <SelectItem key={u.identity.id} value={u.identity.id}>
                              {u.identity.name} ({u.identity.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              /* Step 3: Confirmation */
              <div className="space-y-3">
                <div className="rounded border border-rose-200 bg-rose-50/60 p-3 space-y-2 text-rose-950 text-xs">
                  <div className="font-semibold">Confirm Membership Removal</div>
                  <p className="text-xs leading-snug">
                    Are you sure you want to remove <strong>{userName}</strong> from <strong>{membership.companyName}</strong>?
                    All permissions and client associations inside this organization will be terminated.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  className="text-xs gap-2 mr-auto"
                >
                  <ChevronLeftIcon className="size-3" />
                  <span>Back</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={step === 2 && companyResources.length > 0 && !reassignUserId}
                  onClick={() => setStep((s) => (s + 1) as any)}
                  className="text-xs gap-2"
                >
                  <span>Continue</span>
                  <ChevronRightIcon className="size-3" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={mutations.removeMembership.isPending}
                  onClick={handleConfirm}
                  className="text-xs"
                >
                  Remove Membership
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
