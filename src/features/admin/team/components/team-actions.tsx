"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTeam } from "../team-data/team-store";
import type { AccessLevel } from "../team-data/types";

const CLIENTS = [{ id: "c-1", name: "Moksha Sewa" }, { id: "c-2", name: "CityInida" }, { id: "c-3", name: "EnCodency" }];
const ROLES = [{ id: "org-admin", name: "Organization Admin" }, { id: "social-manager", name: "Social Media Manager" }, { id: "seo-manager", name: "SEO Manager" }, { id: "contributor", name: "Contributor" }, { id: "analyst", name: "Analyst" }];

export function InviteMemberButton({ compact = false }: { compact?: boolean }) {
  const { invitations, members, groups, inviteMember } = useTeam();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", jobTitle: "", roleId: "contributor", clientIds: ["c-1"], accessLevel: "full" as AccessLevel, groupIds: [] as string[] });
  const role = ROLES.find((item) => item.id === form.roleId)!;
  const error = useMemo(() => {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (members.some((item) => item.email.toLowerCase() === form.email.toLowerCase())) return "This person is already a member.";
    if (invitations.some((item) => item.status === "pending" && item.email.toLowerCase() === form.email.toLowerCase())) return "A pending invitation already exists.";
    return "";
  }, [form.email, invitations, members]);
  const reset = () => { setStep(1); setSent(false); setForm({ email: "", name: "", jobTitle: "", roleId: "contributor", clientIds: ["c-1"], accessLevel: "full", groupIds: [] }); };
  const send = async () => {
    setBusy(true);
    await inviteMember({ email: form.email, name: form.name, jobTitle: form.jobTitle, roleId: role.id, roleName: role.name, clients: CLIENTS.filter((item) => form.clientIds.includes(item.id)), accessLevel: form.accessLevel, groups: groups.filter((item) => form.groupIds.includes(item.id)).map(({ id, name }) => ({ id, name })), invitedBy: { id: "mem-1", name: "Manish Sirohi" }, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    setBusy(false); setSent(true);
  };
  return <>
    <Button size="sm" onClick={() => setOpen(true)}><Plus />{compact ? "Invite" : "Invite Member"}</Button>
    <Sheet open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
      <SheetContent className="max-w-xl sm:max-w-xl">
        <SheetHeader><SheetTitle>{sent ? "Invitation sent" : "Invite a team member"}</SheetTitle><SheetDescription>{sent ? `${form.email} has been added to pending invitations.` : "Set their identity, client access and groups."}</SheetDescription></SheetHeader>
        <SheetBody>
          {sent ? <div className="grid min-h-[360px] place-items-center text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check /></div><h3 className="mt-4 font-semibold">Invitation is on its way</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">The invitation expires in 7 days. You can resend or edit it from Invitations.</p></div></div> : <>
            <div className="mb-5 grid grid-cols-3 gap-1">{["Member", "Access", "Review"].map((label, index) => <div key={label} className={`border-b-2 pb-2 text-xs font-medium ${step === index + 1 ? "border-primary text-primary" : step > index + 1 ? "border-emerald-500 text-emerald-700" : "border-border text-muted-foreground"}`}>{index + 1}. {label}</div>)}</div>
            {step === 1 && <div className="space-y-4"><Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></Field><Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Job title"><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Field>{form.email && error && <p className="text-xs text-red-600">{error}</p>}</div>}
            {step === 2 && <div className="space-y-5"><Field label="Role"><NativeSelect value={form.roleId} onChange={(value) => setForm({ ...form, roleId: value })} options={ROLES.map((item) => [item.id, item.name])} /></Field><ChoiceList label="Client access" items={CLIENTS} selected={form.clientIds} onChange={(clientIds) => setForm({ ...form, clientIds })} /><Field label="Access level"><NativeSelect value={form.accessLevel} onChange={(value) => setForm({ ...form, accessLevel: value as AccessLevel })} options={[["full", "Full Client Access"], ["module_restricted", "Module Restricted"], ["read_only", "Read Only"]]} /></Field><ChoiceList label="Groups" items={groups} selected={form.groupIds} onChange={(groupIds) => setForm({ ...form, groupIds })} /></div>}
            {step === 3 && <div className="divide-y rounded-sm border text-sm">{[["Member", `${form.name} · ${form.email}`], ["Role", role.name], ["Clients", CLIENTS.filter((item) => form.clientIds.includes(item.id)).map((item) => item.name).join(", ") || "None"], ["Access", form.accessLevel.replaceAll("_", " ")], ["Groups", groups.filter((item) => form.groupIds.includes(item.id)).map((item) => item.name).join(", ") || "None"], ["Expires", "7 days after sending"]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3"><span className="text-muted-foreground">{label}</span><span className="font-medium capitalize">{value}</span></div>)}</div>}
          </>}
        </SheetBody>
        <SheetFooter>{sent ? <><Button variant="outline" onClick={reset}>Invite another</Button><Button onClick={() => setOpen(false)}>Done</Button></> : <><Button variant="ghost" onClick={() => step === 1 ? setOpen(false) : setStep(step - 1)}>{step > 1 && <ChevronLeft />} {step === 1 ? "Cancel" : "Back"}</Button><Button disabled={(step === 1 && (!!error || !form.name)) || busy} onClick={() => step < 3 ? setStep(step + 1) : send()}>{busy ? "Sending…" : step === 3 ? "Send invitation" : "Continue"}</Button></>}</SheetFooter>
      </SheetContent>
    </Sheet>
  </>;
}

export function CreateGroupButton({ compact = false }: { compact?: boolean }) {
  const { members, createGroup } = useTeam();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", leadId: "mem-1", memberIds: [] as string[], clientIds: [] as string[] });
  const lead = members.find((item) => item.id === form.leadId) ?? members[0];
  const submit = async () => { if (!lead) return; setBusy(true); await createGroup({ name: form.name, description: form.description, leadId: lead.id, leadName: lead.name, memberIds: form.memberIds, clients: CLIENTS.filter((item) => form.clientIds.includes(item.id)) }); setBusy(false); setOpen(false); setForm({ name: "", description: "", leadId: "mem-1", memberIds: [], clientIds: [] }); };
  return <><Button size="sm" variant="outline" onClick={() => setOpen(true)}><Users />{compact ? "Group" : "Create Group"}</Button><Sheet open={open} onOpenChange={setOpen}><SheetContent className="max-w-xl sm:max-w-xl"><SheetHeader><SheetTitle>Create group</SheetTitle><SheetDescription>Organize members and client work into one operational team.</SheetDescription></SheetHeader><SheetBody className="space-y-4"><Field label="Group name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Group lead"><NativeSelect value={form.leadId} onChange={(leadId) => setForm({ ...form, leadId })} options={members.filter((item) => item.status === "active").map((item) => [item.id, item.name])} /></Field><ChoiceList label="Members" items={members.filter((item) => item.status === "active")} selected={form.memberIds} onChange={(memberIds) => setForm({ ...form, memberIds })} /><ChoiceList label="Clients" items={CLIENTS} selected={form.clientIds} onChange={(clientIds) => setForm({ ...form, clientIds })} /></SheetBody><SheetFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!form.name || busy} onClick={submit}>{busy ? "Creating…" : "Create group"}</Button></SheetFooter></SheetContent></Sheet></>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function NativeSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) { return <select className="h-9 w-full rounded-sm border bg-card px-3 text-sm outline-none focus:border-primary" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>; }
function ChoiceList({ label, items, selected, onChange }: { label: string; items: { id: string; name: string }[]; selected: string[]; onChange: (ids: string[]) => void }) { return <div><Label>{label}</Label><div className="mt-1.5 grid grid-cols-2 gap-1">{items.map((item) => <button type="button" key={item.id} onClick={() => onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])} className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-xs transition ${selected.includes(item.id) ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}><span className={`grid size-4 place-items-center rounded-sm border ${selected.includes(item.id) ? "border-primary bg-primary text-white" : ""}`}>{selected.includes(item.id) && <Check className="size-3" />}</span>{item.name}</button>)}</div></div>; }

export function copyInviteLink(idOrToken: string) { return navigator.clipboard.writeText(`${location.origin}/join/${idOrToken}`); }
