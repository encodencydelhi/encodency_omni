"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { invitationLink } from "../live/team-api";
import { SYSTEM_ROLES } from "../team-data/live-team";
import { useTeam } from "../team-data/team-store";
import type { Invitation } from "../team-data/types";
import { reasonOf, useTeamAuthority } from "./team-live-dialogs";

const STEPS = ["Person", "Access", "Review"] as const;

/** Invites a person by email with a role and optional client access. The backend stores exactly these; nothing else is asked for. */
export function InviteMemberLive({ compact = false }: { compact?: boolean }) {
  const { members, invitations, clients, inviteMember } = useTeam();
  const { systemRole, membershipId } = useTeamAuthority();
  const me = members.find((m) => m.id === membershipId);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("viewer");
  const [clientIds, setClientIds] = useState<string[]>([]);

  // Nobody can invite above their own role; only an Owner can invite an Owner.
  const allowedRoles = SYSTEM_ROLES.filter((role) => (role.systemRole === "OWNER" ? systemRole === "OWNER" : true));
  const role = SYSTEM_ROLES.find((item) => item.id === roleId)!;
  const emailError = useMemo(() => {
    if (!email) return "";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address.";
    if (members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) return "This person is already a member.";
    if (invitations.some((i) => i.status === "pending" && i.email.toLowerCase() === email.trim().toLowerCase())) return "A pending invitation already exists for this email.";
    return "";
  }, [email, members, invitations]);

  const reset = () => { setStep(1); setSubmitError(""); setCreated(null); setCopied(false); setEmail(""); setRoleId("viewer"); setClientIds([]); };
  const send = async () => {
    setBusy(true);
    setSubmitError("");
    try {
      const result = await inviteMember({
        email: email.trim(),
        name: email.trim().split("@")[0] ?? "",
        roleId: role.id,
        roleName: role.name,
        clients: clients.filter((c) => clientIds.includes(c.id)),
        accessLevel: "full",
        groups: [],
        invitedBy: { id: membershipId ?? "", name: me?.name ?? "You" },
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      setCreated(result);
    } catch (err) {
      setSubmitError(reasonOf(err, "The invitation could not be sent."));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!created?.token) return;
    try {
      await navigator.clipboard.writeText(invitationLink(window.location.origin, created.token));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus />{compact ? "Invite" : "Invite Member"}</Button>
      <Sheet open={open} onOpenChange={(value) => { if (busy) return; setOpen(value); if (!value) reset(); }}>
        <SheetContent className="max-w-xl sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{created ? "Invitation sent" : "Invite a team member"}</SheetTitle>
            <SheetDescription>{created ? `${email.trim()} was emailed an invitation.` : "They get an email with a link to join this company."}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {created ? (
              <div className="grid min-h-[320px] place-items-center text-center">
                <div>
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check /></div>
                  <h3 className="mt-4 font-semibold">Invitation is on its way</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">The link expires in 48 hours. You can resend or revoke it from the Invitations tab.</p>
                  {created.token ? (
                    <div className="mx-auto mt-4 max-w-sm rounded-md border border-slate-200 bg-slate-50 p-3 text-left">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Link2 className="size-3.5" />Manual link (single use)</p>
                      <p className="mt-1 text-[11px] text-slate-500">If the email does not arrive, share this link yourself. It is shown only now.</p>
                      <Button type="button" size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={copy}>{copied ? "Copied" : "Copy invite link"}</Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-3 gap-1">
                  {STEPS.map((label, index) => <div key={label} className={`border-b-2 pb-2 text-xs font-medium ${step === index + 1 ? "border-primary text-primary" : step > index + 1 ? "border-emerald-500 text-emerald-700" : "border-border text-muted-foreground"}`}>{index + 1}. {label}</div>)}
                </div>
                {step === 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
                    {email && emailError && <p className="text-xs text-red-600">{emailError}</p>}
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-1.5" role="radiogroup" aria-label="Role">
                      <Label>Role</Label>
                      {allowedRoles.map((item) => (
                        <button type="button" role="radio" aria-checked={roleId === item.id} key={item.id} onClick={() => setRoleId(item.id)} className={`flex w-full items-start gap-3 rounded-sm border p-3 text-left text-sm transition ${roleId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                          <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${roleId === item.id ? "border-primary bg-primary text-white" : ""}`}>{roleId === item.id && <Check className="size-3" />}</span>
                          <span><span className="block font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.description}</span></span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Client access</Label>
                      {clients.length === 0 ? <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">This company has no clients yet.</p> : (
                        <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                          {clients.map((client) => { const on = clientIds.includes(client.id); return (
                            <button type="button" key={client.id} aria-pressed={on} onClick={() => setClientIds(on ? clientIds.filter((id) => id !== client.id) : [...clientIds, client.id])} className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-xs transition ${on ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                              <span className={`grid size-4 shrink-0 place-items-center rounded-sm border ${on ? "border-primary bg-primary text-white" : ""}`}>{on && <Check className="size-3" />}</span>{client.name}
                            </button>
                          ); })}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">Owners and admins can open every client. For managers and viewers, you can also grant access later from the member page.</p>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="divide-y rounded-sm border text-sm">
                    {([["Email", email.trim()], ["Role", role.name], ["Clients", clients.filter((c) => clientIds.includes(c.id)).map((c) => c.name).join(", ") || (role.id === "owner" || role.id === "admin" ? "All (via role)" : "None yet")], ["Expires", "48 hours after sending"]] as const).map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3"><span className="text-muted-foreground">{label}</span><span className="break-all font-medium">{value}</span></div>)}
                  </div>
                )}
                {submitError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{submitError}</p>}
              </>
            )}
          </SheetBody>
          <SheetFooter>
            {created ? (
              <><Button variant="outline" onClick={reset}>Invite another</Button><Button onClick={() => { setOpen(false); reset(); }}>Done</Button></>
            ) : (
              <>
                <Button variant="ghost" disabled={busy} onClick={() => (step === 1 ? setOpen(false) : setStep(step - 1))}>{step > 1 && <ChevronLeft />} {step === 1 ? "Cancel" : "Back"}</Button>
                <Button disabled={busy || (step === 1 && (!email || !!emailError))} onClick={() => (step < 3 ? setStep(step + 1) : send())}>{busy ? "Sending…" : step === 3 ? "Send invitation" : "Continue"}</Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
