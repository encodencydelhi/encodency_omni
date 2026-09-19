import {
  AlertCircleIcon,
  Building2Icon,
  UserCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import { ALLOWED_COMPANY_ROLES } from "../../data/config";
import { useUserMutations } from "../../data/hooks";
import { getAllRawUsers } from "../../data/mock/store";
import type { UserAggregate } from "../../data/types";

interface AddMembershipModalProps {
  user: UserAggregate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyOptions: Array<{ id: string; name: string }>;
}

export function AddMembershipModal({
  user,
  open,
  onOpenChange,
  companyOptions,
}: AddMembershipModalProps) {
  const router = useRouter();
  const mutations = useUserMutations();

  const [selectedUserId, setSelectedUserId] = useState(user?.identity.id ?? "");
  const [companyId, setCompanyId] = useState(companyOptions[0]?.id ?? "");
  const [role, setRole] = useState<OrganisationRole>("marketing_manager");
  const [clientAccessScope, setClientAccessScope] = useState<"all" | "selected">("all");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.identity.id);
    }
  }, [user]);

  const allRawUsers = getAllRawUsers();
  const currentUser = allRawUsers.find((u) => u.identity.id === selectedUserId);

  const alreadyMember = currentUser?.memberships.some((m) => m.companyId === companyId);
  const existingMembership = currentUser?.memberships.find((m) => m.companyId === companyId);

  const selectedCompany = companyOptions.find((c) => c.id === companyId);
  const selectedCompanyName = selectedCompany?.name ?? "Company";

  const availableClients = [
    { id: `prj_${companyId}_1`, name: `${selectedCompanyName} Primary` },
    { id: `prj_${companyId}_2`, name: `${selectedCompanyName} Secondary` },
  ];

  const handleConfirm = () => {
    if (!currentUser || alreadyMember) return;

    mutations.addCompanyMembership.mutate(
      {
        userId: currentUser.identity.id,
        companyId,
        role,
        clientAccessScope,
        clientAccessIds: clientAccessScope === "all" ? [] : selectedClientIds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2Icon className="size-4.5 text-blue-600" />
            <span>Add Existing User to Company</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Provision access for an existing user identity to another organization tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">User Identity</Label>
            {user ? (
              <div className="p-2.5 rounded border border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{user.identity.name}</div>
                  <div className="text-xs text-slate-400">{user.identity.email}</div>
                </div>
                <span className="text-xs rounded bg-slate-200/60 px-1.5 py-0.5 font-mono">
                  {user.identity.id}
                </span>
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue placeholder="Select existing user" />
                </SelectTrigger>
                <SelectContent>
                  {allRawUsers.map((u) => (
                    <SelectItem key={u.identity.id} value={u.identity.id}>
                      {u.identity.name} ({u.identity.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Target Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="h-8.5 text-xs">
                <SelectValue placeholder="Select target company" />
              </SelectTrigger>
              <SelectContent>
                {companyOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {alreadyMember && (
            <div className="p-3 rounded-md border border-amber-200 bg-amber-50 space-y-2 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Already a Member:</strong> {currentUser?.identity.name} already belongs to {selectedCompanyName} as {existingMembership?.role ? ORGANISATION_ROLE[existingMembership.role].label : "member"}.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  if (currentUser) {
                    router.push(`${ROUTES.superAdmin.user(currentUser.identity.id)}?tab=company-access`);
                  }
                }}
                className="w-full text-xs font-semibold bg-white border-amber-300"
              >
                Open Existing Membership
              </Button>
            </div>
          )}

          {!alreadyMember && (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assigned Company Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as OrganisationRole)}>
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_COMPANY_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-1 border-t border-border">
                <Label className="text-xs font-semibold">Client Access Scope</Label>
                <RadioGroup
                  value={clientAccessScope}
                  onValueChange={(val) => setClientAccessScope(val as "all" | "selected")}
                  className="space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="add-scope-all" />
                    <Label htmlFor="add-scope-all" className="text-xs font-normal cursor-pointer">
                      All Assigned Company Clients
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="selected" id="add-scope-sel" />
                    <Label htmlFor="add-scope-sel" className="text-xs font-normal cursor-pointer">
                      Selected Clients Only
                    </Label>
                  </div>
                </RadioGroup>

                {clientAccessScope === "selected" && (
                  <div className="pl-6 pt-1 space-y-1.5">
                    {availableClients.map((client) => {
                      const isChecked = selectedClientIds.includes(client.id);
                      return (
                        <div key={client.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`add-cli-${client.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedClientIds([...selectedClientIds, client.id]);
                              else setSelectedClientIds(selectedClientIds.filter((id) => id !== client.id));
                            }}
                          />
                          <Label htmlFor={`add-cli-${client.id}`} className="text-xs cursor-pointer">
                            {client.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={alreadyMember || !currentUser || mutations.addCompanyMembership.isPending}
            onClick={handleConfirm}
            className="text-xs gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <UserCheckIcon className="size-3.5" />
            <span>Confirm Membership</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
