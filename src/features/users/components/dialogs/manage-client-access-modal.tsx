import { FolderIcon, SaveIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { useUserMutations } from "../../data/hooks";
import type { CompanyMembership } from "../../data/types";

interface ManageClientAccessModalProps {
  membership: CompanyMembership | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageClientAccessModal({
  membership,
  userName,
  open,
  onOpenChange,
}: ManageClientAccessModalProps) {
  const mutations = useUserMutations();

  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (membership) {
      setScope(membership.clientAccess.scope);
      setSelectedIds(membership.clientAccess.clientIds);
    }
  }, [membership]);

  const dirty = useMemo(() => {
    if (!membership) return false;
    if (scope !== membership.clientAccess.scope) return true;
    if (scope === "selected") {
      const sameLength = selectedIds.length === membership.clientAccess.clientIds.length;
      const sameIds = sameLength && selectedIds.every((id) => membership.clientAccess.clientIds.includes(id));
      return !sameIds;
    }
    return false;
  }, [membership, scope, selectedIds]);

  const { requestClose, guardDialog } = useUnsavedGuard({
    dirty,
    onDiscard: () => onOpenChange(false),
    label: "client access changes",
  });

  if (!membership) return null;

  // Mock pool of all clients in this company (strictly scoped!)
  const availableCompanyClients = [
    { id: `prj_${membership.companyId}_1`, name: `${membership.companyName} Primary Brand` },
    { id: `prj_${membership.companyId}_2`, name: `${membership.companyName} Secondary Brand` },
    { id: `prj_${membership.companyId}_3`, name: `${membership.companyName} Special Projects` },
  ];

  const handleSave = () => {
    mutations.updateClientAccess.mutate(
      {
        membershipId: membership.id,
        clientAccessScope: scope,
        clientAccessIds: scope === "all" ? [] : selectedIds,
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
            <FolderIcon className="size-4.5 text-blue-600" />
            <span>Manage Client Access</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure {userName}&apos;s client access inside {membership.companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <RadioGroup
            value={scope}
            onValueChange={(val) => setScope(val as "all" | "selected")}
            className="space-y-2.5"
          >
            <div className="flex items-start gap-2.5 p-2 rounded border border-border">
              <RadioGroupItem value="all" id="scope-all-opt" className="mt-0.5" />
              <div>
                <Label htmlFor="scope-all-opt" className="text-xs font-semibold cursor-pointer">
                  All Current & Future Clients
                </Label>
                <p className="text-xs text-slate-500">
                  User automatically inherits access to every client brand managed by {membership.companyName}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded border border-border">
              <RadioGroupItem value="selected" id="scope-sel-opt" className="mt-0.5" />
              <div>
                <Label htmlFor="scope-sel-opt" className="text-xs font-semibold cursor-pointer">
                  Selected Clients Only
                </Label>
                <p className="text-xs text-slate-500">
                  Restricted view. Only explicitly checked client profiles will be accessible.
                </p>
              </div>
            </div>
          </RadioGroup>

          {scope === "selected" && (
            <div className="rounded border border-border p-3 space-y-2 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-700">
                Accessible Clients in {membership.companyName}:
              </span>

              <div className="space-y-1.5 pl-1">
                {availableCompanyClients.map((client) => {
                  const isChecked = selectedIds.includes(client.id);
                  return (
                    <div key={client.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`client-chk-${client.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds([...selectedIds, client.id]);
                          else setSelectedIds(selectedIds.filter((id) => id !== client.id));
                        }}
                      />
                      <Label htmlFor={`client-chk-${client.id}`} className="text-xs cursor-pointer">
                        {client.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            disabled={mutations.updateClientAccess.isPending}
            onClick={handleSave}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            <SaveIcon className="size-3.5" />
            <span>Save Client Access</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {guardDialog}
    </>
  );
}
