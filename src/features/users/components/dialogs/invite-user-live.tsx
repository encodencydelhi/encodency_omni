import { AlertCircleIcon, CheckCircle2Icon, MailIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ROUTES } from "@/config/routes";
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import { ALLOWED_COMPANY_ROLES } from "../../data/config";
import { useAllInvitations, useCompanyClients, useUsersDirectory } from "../../data/directory";
import { useUserMutations } from "../../data/hooks";

export interface InviteUserLiveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyOptions: Array<{ id: string; name: string }>;
  onSwitchToAddMembership?: (userId: string) => void;
}

/** Real invitation: the platform invites on a Company's behalf. The invitee chooses their own name and password. */
export function InviteUserLive({ open, onOpenChange, companyOptions, onSwitchToAddMembership }: InviteUserLiveProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-slate-50/60">
          <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MailIcon className="size-4.5 text-blue-600" />
            <span>Invite User</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Send a Company invitation by email. The recipient sets their own name and password when they accept.
          </SheetDescription>
        </SheetHeader>
        {open && <InviteBody onClose={() => onOpenChange(false)} companyOptions={companyOptions} onSwitchToAddMembership={onSwitchToAddMembership} />}
      </SheetContent>
    </Sheet>
  );
}

function InviteBody({
  onClose,
  companyOptions,
  onSwitchToAddMembership,
}: {
  onClose: () => void;
  companyOptions: Array<{ id: string; name: string }>;
  onSwitchToAddMembership?: (userId: string) => void;
}) {
  const router = useRouter();
  const mutations = useUserMutations();
  const directory = useUsersDirectory();
  const invitations = useAllInvitations();

  const [email, setEmail] = useState("");
  const [pickedCompanyId, setCompanyId] = useState("");
  const companyId = pickedCompanyId || companyOptions[0]?.id || "";
  const [role, setRole] = useState<OrganisationRole>("marketing_manager");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [sent, setSent] = useState<{ email: string; companyName: string; roleLabel: string } | null>(null);

  const clients = useCompanyClients(companyId);
  const trimmed = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const existing = emailValid ? directory.find((u) => u.identity.email.toLowerCase() === trimmed.toLowerCase()) : undefined;
  const alreadyMember = existing?.memberships.some((m) => m.companyId === companyId) ?? false;
  const duplicate = emailValid
    ? invitations.find((i) => i.email.toLowerCase() === trimmed.toLowerCase() && i.companyId === companyId && i.status === "pending")
    : undefined;
  const reachesAll = role === "owner" || role === "admin";
  const companyName = companyOptions.find((c) => c.id === companyId)?.name ?? "this Company";

  const blocked = !emailValid || !companyId || Boolean(existing) || Boolean(duplicate);

  const submit = () => {
    mutations.createInvitation.mutate(
      { email: trimmed, name: trimmed, companyId, role, clientAccessScope: reachesAll ? "all" : "selected", clientAccessIds: reachesAll ? [] : clientIds, requires2fa: false, expiryDays: 2 },
      { onSuccess: () => setSent({ email: trimmed, companyName, roleLabel: ORGANISATION_ROLE[role].label }) },
    );
  };

  if (sent) {
    return (
      <SheetBody className="p-5 overflow-y-auto flex-1">
        <div className="py-6 flex flex-col items-center text-center gap-3">
          <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2Icon className="size-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Invitation sent</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            {sent.email} was invited to {sent.companyName} as {sent.roleLabel}. The link works for 48 hours; you can resend it from Invitations.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setSent(null); setEmail(""); setClientIds([]); }}>
              Invite Another User
            </Button>
            <Button type="button" size="sm" className="flex-1 text-xs" onClick={() => { onClose(); router.push(ROUTES.superAdmin.userInvitations); }}>
              View Invitations
            </Button>
          </div>
        </div>
      </SheetBody>
    );
  }

  return (
    <>
      <SheetBody className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email" className="text-xs font-semibold">Email address <span className="text-rose-500">*</span></Label>
          <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="h-8.5 text-xs" autoComplete="off" />
          {trimmed && !emailValid && <p className="text-rose-600">Enter a valid email address.</p>}
        </div>

        {existing && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{existing.identity.name}</strong> already has an account{alreadyMember ? " in this Company" : ""}.
                {alreadyMember ? " Manage their access from the Users list." : " Add them to the Company directly instead of inviting."}
              </div>
            </div>
            {!alreadyMember && onSwitchToAddMembership && (
              <Button type="button" variant="outline" size="sm" className="w-full text-xs bg-white border-amber-300" onClick={() => { onClose(); onSwitchToAddMembership(existing.identity.id); }}>
                Add to Company Instead
              </Button>
            )}
          </div>
        )}

        {duplicate && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
            An invitation to {companyName} is already pending for this email. Resend or revoke it from Invitations.
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Company</Label>
          <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setClientIds([]); }}>
            <SelectTrigger className="h-8.5 text-xs"><SelectValue placeholder="Select a Company" /></SelectTrigger>
            <SelectContent>
              {companyOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Role in the Company</Label>
          <Select value={role} onValueChange={(v) => setRole(v as OrganisationRole)}>
            <SelectTrigger className="h-8.5 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {ALLOWED_COMPANY_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {reachesAll ? (
          <p className="text-slate-500">{role === "owner" ? "Owners" : "Admins"} can reach every Client of the Company.</p>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Clients this person can work on</Label>
            {clients.isLoading ? (
              <p className="text-slate-400">Loading Clients…</p>
            ) : (clients.data ?? []).length === 0 ? (
              <p className="text-slate-500">This Company has no Clients yet. The person can be given Clients later.</p>
            ) : (
              <div className="space-y-1.5 rounded border border-border p-3 bg-slate-50/50">
                {(clients.data ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`invite-client-${c.id}`}
                      checked={clientIds.includes(c.id)}
                      onCheckedChange={(checked) => setClientIds((prev) => (checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))}
                    />
                    <Label htmlFor={`invite-client-${c.id}`} className="text-xs cursor-pointer">{c.name}</Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-slate-400">The invitation email is valid for 48 hours.</p>
      </SheetBody>
      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" className="text-xs gap-1.5" disabled={blocked || mutations.createInvitation.isPending} onClick={submit}>
          <SendIcon className="size-3.5" />
          <span>{mutations.createInvitation.isPending ? "Sending…" : "Send Invitation"}</span>
        </Button>
      </div>
    </>
  );
}
