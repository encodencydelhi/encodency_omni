import { ArrowRightLeftIcon } from "lucide-react";
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
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import { ALLOWED_COMPANY_ROLES } from "../../data/config";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { useUserMutations } from "../../data/hooks";
import type { CompanyMembership } from "../../data/types";

interface ChangeRoleModalProps {
  membership: CompanyMembership | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeRoleModal({
  membership,
  userName,
  open,
  onOpenChange,
}: ChangeRoleModalProps) {
  const mutations = useUserMutations();
  const [newRole, setNewRole] = useState<OrganisationRole>(
    membership?.role ?? "marketing_manager",
  );

  const dirty = useMemo(
    () => newRole !== (membership?.role ?? "marketing_manager"),
    [newRole, membership],
  );

  const { requestClose, guardDialog } = useUnsavedGuard({
    dirty,
    onDiscard: () => onOpenChange(false),
    label: "role change",
  });

  if (!membership) return null;

  const handleConfirm = () => {
    mutations.changeMembershipRole.mutate(
      {
        membershipId: membership.id,
        newRole,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
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
            <ArrowRightLeftIcon className="size-4.5 text-blue-600" />
            <span>Change Company Role</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modify {userName}&apos;s role in {membership.companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded border border-slate-200 p-3 bg-slate-50/60 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Organization:</span>
              <span className="font-semibold text-slate-800">{membership.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Role:</span>
              <span className="font-semibold text-slate-800">
                {ORGANISATION_ROLE[membership.role]?.label || membership.role}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role-select" className="text-xs font-semibold">
              New Assigned Role
            </Label>
            <Select value={newRole} onValueChange={(val) => setNewRole(val as OrganisationRole)}>
              <SelectTrigger id="new-role-select" className="h-8.5 text-xs">
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_COMPANY_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              Important: This updates role permissions strictly for {membership.companyName}. Roles in other companies remain completely unchanged.
            </p>
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
            disabled={newRole === membership.role || mutations.changeMembershipRole.isPending}
            onClick={handleConfirm}
            className="text-xs bg-blue-600 hover:bg-blue-700"
          >
            Confirm Role Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {guardDialog}
    </>
  );
}
