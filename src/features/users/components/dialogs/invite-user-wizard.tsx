import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  SendIcon,
  UserCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/routes";
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import { ALLOWED_COMPANY_ROLES } from "../../data/config";
import { useUserMutations } from "../../data/hooks";
import { getAllInvitations, getAllRawUsers } from "../../data/mock/store";

interface InviteUserWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyOptions: Array<{ id: string; name: string }>;
  onSwitchToAddMembership?: (userId: string) => void;
}

export function InviteUserWizard({
  open,
  onOpenChange,
  companyOptions,
  onSwitchToAddMembership,
}: InviteUserWizardProps) {
  const router = useRouter();
  const mutations = useUserMutations();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [successResult, setSuccessResult] = useState<{ email: string; companyName: string; role: string } | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [companyId, setCompanyId] = useState(companyOptions[0]?.id ?? "");
  const [role, setRole] = useState<OrganisationRole>("marketing_manager");
  const [clientAccessScope, setClientAccessScope] = useState<"all" | "selected">("all");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [requires2fa, setRequires2fa] = useState(true);
  const [expiryDays, setExpiryDays] = useState(7);
  const [note, setNote] = useState("");

  // Existing user duplicate detection
  const existingUser = email.trim()
    ? getAllRawUsers().find((u) => u.identity.email.toLowerCase() === email.trim().toLowerCase())
    : null;

  const duplicatePending = email.trim() && companyId
    ? getAllInvitations().find(
        (inv) =>
          inv.email.toLowerCase() === email.trim().toLowerCase() &&
          inv.companyId === companyId &&
          inv.status === "pending",
      )
    : null;

  const handleReset = () => {
    setStep(1);
    setEmail("");
    setName("");
    setPhone("");
    setRole("marketing_manager");
    setClientAccessScope("all");
    setSelectedClientIds([]);
    setRequires2fa(true);
    setExpiryDays(7);
    setNote("");
    setSuccessResult(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const selectedCompany = companyOptions.find((c) => c.id === companyId);
  const selectedCompanyName = selectedCompany?.name ?? "Selected Organization";

  // Mock available clients for the chosen company
  const availableClients = [
    { id: `prj_${companyId}_1`, name: `${selectedCompanyName} Primary` },
    { id: `prj_${companyId}_2`, name: `${selectedCompanyName} Secondary` },
  ];

  const canProceedStep1 = email.trim().length > 3 && email.includes("@") && name.trim().length > 1 && !existingUser;
  const canProceedStep2 = Boolean(companyId) && Boolean(role);

  const handleSubmit = () => {
    mutations.createInvitation.mutate(
      {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        companyId,
        role,
        clientAccessScope,
        clientAccessIds: clientAccessScope === "all" ? [] : selectedClientIds,
        requires2fa,
        expiryDays,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSuccessResult({
            email: email.trim(),
            companyName: selectedCompanyName,
            role: ORGANISATION_ROLE[role].label,
          });
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-slate-50/60">
          <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MailIcon className="size-4.5 text-blue-600" />
            <span>Invite User to OmniPlatform</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Send an onboarding invitation and provision company access.
          </SheetDescription>

          {!successResult && (
            <div className="flex items-center justify-between pt-3 text-xs font-semibold text-slate-400">
              <div className={step >= 1 ? "text-blue-600" : ""}>1. Identity</div>
              <ChevronRightIcon className="size-3 text-slate-300" />
              <div className={step >= 2 ? "text-blue-600" : ""}>2. Company Access</div>
              <ChevronRightIcon className="size-3 text-slate-300" />
              <div className={step >= 3 ? "text-blue-600" : ""}>3. Security</div>
              <ChevronRightIcon className="size-3 text-slate-300" />
              <div className={step >= 4 ? "text-blue-600" : ""}>4. Review</div>
            </div>
          )}
        </SheetHeader>

        <SheetBody className="p-5 overflow-y-auto flex-1 gap-2">
          {successResult ? (
            /* Success Screen (Section 38) */
            <div className="py-6 flex flex-col items-center text-center gap-2">
              <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2Icon className="size-6" />
              </div>

              <div className="gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Invitation Created in Demo Workspace
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  A platform invitation record has been created and KPIs have been updated. (Demo Mode: No external email was dispatched).
                </p>
              </div>

              <div className="w-full rounded-md border border-border p-3.5 bg-slate-50/70 text-left text-xs gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-semibold text-slate-800">{successResult.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Company:</span>
                  <span className="font-semibold text-slate-800">{successResult.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="font-semibold text-slate-800">{successResult.role}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 text-xs"
                >
                  Invite Another User
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    router.push(ROUTES.superAdmin.userInvitations);
                  }}
                  className="flex-1 text-xs"
                >
                  View Invitations
                </Button>
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: User Information */
            <div className="gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-email" className="text-xs font-semibold">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@organization.com"
                  className="h-8.5 text-xs"
                />
              </div>

              {/* Duplicate Detection Alert */}
              {existingUser && (
                <div className="rounded-md border border-blue-200 bg-blue-50/80 p-3 gap-2">
                  <div className="flex items-start gap-2 text-xs text-blue-900">
                    <AlertCircleIcon className="size-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>This user already exists:</strong> {existingUser.identity.name} ({existingUser.identity.id}) is already registered on OmniPlatform with {existingUser.memberships.length} existing membership(s).
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleClose();
                      onSwitchToAddMembership?.(existingUser.identity.id);
                    }}
                    className="w-full text-xs font-semibold text-blue-700 bg-white border-blue-300 hover:bg-blue-100"
                  >
                    <UserCheckIcon className="size-3.5 mr-1" />
                    Add Company Membership Instead
                  </Button>
                </div>
              )}

              {duplicatePending && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    A pending invitation to this email already exists for {selectedCompanyName}.
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="inv-name" className="text-xs font-semibold">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amit Sharma"
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-phone" className="text-xs font-semibold">
                  Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="inv-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 2: Company Access */
            <div className="gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-company" className="text-xs font-semibold">
                  Target Company <span className="text-rose-500">*</span>
                </Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="inv-company" className="h-8.5 text-xs">
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

              <div className="space-y-1.5">
                <Label htmlFor="inv-role" className="text-xs font-semibold">
                  Company Role <span className="text-rose-500">*</span>
                </Label>
                <Select value={role} onValueChange={(val) => setRole(val as OrganisationRole)}>
                  <SelectTrigger id="inv-role" className="h-8.5 text-xs">
                    <SelectValue placeholder="Select company role" />
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
                  Note: Company roles are organization-scoped and do NOT grant Platform Super Admin access.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold">Client Access Scope</Label>
                <RadioGroup
                  value={clientAccessScope}
                  onValueChange={(val) => setClientAccessScope(val as "all" | "selected")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="scope-all" />
                    <Label htmlFor="scope-all" className="text-xs font-normal cursor-pointer">
                      All Assigned Company Clients (Automatic access to all {selectedCompanyName} brands)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="scope-sel" />
                    <Label htmlFor="scope-sel" className="text-xs font-normal cursor-pointer">
                      Selected Clients Only (Restricted access)
                    </Label>
                  </div>
                </RadioGroup>

                {clientAccessScope === "selected" && (
                  <div className="pl-6 pt-1 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">
                      Select accessible clients in {selectedCompanyName}:
                    </span>
                    {availableClients.map((client) => {
                      const isChecked = selectedClientIds.includes(client.id);
                      return (
                        <div key={client.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cli-${client.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedClientIds([...selectedClientIds, client.id]);
                              else setSelectedClientIds(selectedClientIds.filter((id) => id !== client.id));
                            }}
                          />
                          <Label htmlFor={`cli-${client.id}`} className="text-xs cursor-pointer">
                            {client.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : step === 3 ? (
            /* Step 3: Security & Onboarding */
            <div className="gap-2">
              <div className="rounded-md border border-slate-200/80 p-3 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="req-2fa" className="text-xs font-semibold cursor-pointer">
                      Require Two-Factor Authentication (2FA)
                    </Label>
                    <p className="text-xs text-slate-500">
                      User will be mandated to enroll an authenticator app before accessing workspace data.
                    </p>
                  </div>
                  <Checkbox
                    id="req-2fa"
                    checked={requires2fa}
                    onCheckedChange={(c) => setRequires2fa(Boolean(c))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-expiry" className="text-xs font-semibold">
                  Invitation Validity Window
                </Label>
                <Select
                  value={expiryDays.toString()}
                  onValueChange={(val) => setExpiryDays(parseInt(val, 10))}
                >
                  <SelectTrigger id="inv-expiry" className="h-8.5 text-xs">
                    <SelectValue placeholder="Validity days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Days (Express)</SelectItem>
                    <SelectItem value="7">7 Days (Standard)</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-note" className="text-xs font-semibold">
                  Internal Onboarding Note <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="inv-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Account assigned for Diwali marketing campaign."
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>
          ) : (
            /* Step 4: Review & Confirm */
            <div className="gap-2">
              <div className="rounded-md border border-border p-3.5 bg-slate-50/70 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-semibold text-slate-900">{name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold text-slate-900">{email}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">Target Company</span>
                  <span className="font-semibold text-slate-900">{selectedCompanyName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">Assigned Role</span>
                  <span className="font-semibold text-slate-900">{ORGANISATION_ROLE[role].label}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">Client Access Scope</span>
                  <span className="font-semibold text-slate-900">
                    {clientAccessScope === "all" ? "All Clients" : `${selectedClientIds.length} Selected Clients`}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-slate-500">2FA Policy</span>
                  <span className="font-semibold text-slate-900">
                    {requires2fa ? "Mandatory Enrollment" : "Optional"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Validity</span>
                  <span className="font-semibold text-slate-900">{expiryDays} Days</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 italic">
                Demo Notice: Confirming this action will record the invitation in the platform state and update KPIs immediately.
              </p>
            </div>
          )}
        </SheetBody>

        {!successResult && (
          <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="text-xs gap-1"
              >
                <ChevronLeftIcon className="size-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-xs"
              >
                Cancel
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : false}
                onClick={() => setStep((s) => (s + 1) as any)}
                className="text-xs gap-1 ml-auto"
              >
                <span>Continue</span>
                <ChevronRightIcon className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={mutations.createInvitation.isPending}
                onClick={handleSubmit}
                className="text-xs gap-1.5 ml-auto bg-blue-600 hover:bg-blue-700"
              >
                <SendIcon className="size-3.5" />
                <span>Send Demo Invitation</span>
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
