"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { SYSTEM_ROLES } from "../team-data/live-team";
import { useTeam } from "../team-data/team-store";
import type { Member, TeamGroup } from "../team-data/types";

/** The real reason the backend gave (rank rule, last owner, client lead...), or a plain fallback. */
export function reasonOf(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (ApiError.isApiError(error) && error.message) return error.message;
  return error instanceof Error && error.message ? error.message : fallback;
}

function Checks({ items, selected, onChange, empty }: { items: Array<{ id: string; name: string; hint?: string }>; selected: string[]; onChange: (ids: string[]) => void; empty: string }) {
  if (items.length === 0) return <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <button type="button" key={item.id} onClick={() => onChange(on ? selected.filter((id) => id !== item.id) : [...selected, item.id])} aria-pressed={on} className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-xs transition ${on ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
            <span className={`grid size-4 shrink-0 place-items-center rounded-sm border ${on ? "border-primary bg-primary text-white" : ""}`}>{on && <Check className="size-3" />}</span>
            <span className="min-w-0"><span className="block truncate">{item.name}</span>{item.hint && <span className="block truncate text-[10px] text-muted-foreground">{item.hint}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}

const names = (members: Member[]) => (members.length === 1 ? members[0]!.name : `${members.length} members`);

/* ------------------------------ role ------------------------------ */

export function ChangeRoleDialog(props: { members: Member[]; open: boolean; onClose: () => void; onDone?: () => void }) {
  return props.open ? <ChangeRoleDialogBody {...props} /> : null;
}

function ChangeRoleDialogBody({ members, onClose, onDone }: { members: Member[]; onClose: () => void; onDone?: () => void }) {
  const { updateMember } = useTeam();
  const [roleId, setRoleId] = useState(members.length === 1 ? members[0]!.roleId : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    const failed: string[] = [];
    let lastReason = "";
    for (const member of members) {
      if (member.roleId === roleId) continue;
      try {
        await updateMember(member.id, { roleId });
      } catch (err) {
        failed.push(member.name);
        lastReason = reasonOf(err);
      }
    }
    setBusy(false);
    if (failed.length) {
      setError(`${failed.join(", ")}: ${lastReason}`);
      return;
    }
    toast.success(`Role updated for ${names(members)}`);
    onDone?.();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {names(members)}</DialogTitle>
          <DialogDescription>Roles are fixed by the platform. You can only assign a role at or below your own.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5" role="radiogroup" aria-label="Role">
          {SYSTEM_ROLES.map((role) => (
            <button type="button" role="radio" aria-checked={roleId === role.id} key={role.id} onClick={() => setRoleId(role.id)} className={`flex w-full items-start gap-3 rounded-sm border p-3 text-left text-sm transition ${roleId === role.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${roleId === role.id ? "border-primary bg-primary text-white" : ""}`}>{roleId === role.id && <Check className="size-3" />}</span>
              <span><span className="block font-medium">{role.name}</span><span className="text-xs text-muted-foreground">{role.description}</span></span>
            </button>
          ))}
        </div>
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!roleId || busy || members.every((m) => m.roleId === roleId)}>{busy ? "Saving…" : "Save role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- client access --------------------------- */

/**
 * One member: tick the clients they should have access to and save the difference.
 * Several members: choose one client and Grant or Remove access for all of them.
 */
export function ClientAccessDialog(props: { members: Member[]; open: boolean; onClose: () => void; initialMode?: "grant" | "revoke" }) {
  return props.open ? <ClientAccessDialogBody {...props} /> : null;
}

function ClientAccessDialogBody({ members, onClose, initialMode = "grant" }: { members: Member[]; onClose: () => void; initialMode?: "grant" | "revoke" }) {
  const { clients, setClientAccess } = useTeam();
  const single = members.length === 1 ? members[0]! : null;
  const [selected, setSelected] = useState<string[]>(single ? single.clientAccess.map((a) => a.clientId) : []);
  const [mode, setMode] = useState<"grant" | "revoke">(initialMode);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (single) {
        const before = single.clientAccess.map((a) => a.clientId);
        for (const id of selected.filter((id) => !before.includes(id))) await setClientAccess(id, [single.id], true);
        for (const id of before.filter((id) => !selected.includes(id))) await setClientAccess(id, [single.id], false);
      } else if (clientId) {
        await setClientAccess(clientId, members.map((m) => m.id), mode === "grant");
      }
      toast.success("Client access updated");
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client access for {names(members)}</DialogTitle>
          <DialogDescription>{single ? "Tick the clients this member can work on." : "Pick one client and grant or remove access for everyone selected."}</DialogDescription>
        </DialogHeader>
        {single ? (
          <Checks items={clients} selected={selected} onChange={setSelected} empty="This company has no clients yet." />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Action">
              {(["grant", "revoke"] as const).map((value) => (
                <button type="button" role="radio" aria-checked={mode === value} key={value} onClick={() => setMode(value)} className={`rounded-sm border px-3 py-2 text-sm ${mode === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>{value === "grant" ? "Grant access" : "Remove access"}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 w-full rounded-sm border bg-card px-3 text-sm">
                {clients.length === 0 && <option value="">No clients</option>}
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
          </div>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!single && !clientId)}>{busy ? "Saving…" : "Save access"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ groups ------------------------------ */

/** One member: tick the groups they belong to. Several members: choose a group and add or remove all of them. */
export function GroupMembershipDialog(props: { members: Member[]; open: boolean; onClose: () => void }) {
  return props.open ? <GroupMembershipDialogBody {...props} /> : null;
}

function GroupMembershipDialogBody({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const { groups, updateGroup } = useTeam();
  const active = useMemo(() => groups.filter((group) => !group.archived), [groups]);
  const single = members.length === 1 ? members[0]! : null;
  const [selected, setSelected] = useState<string[]>(single ? active.filter((group) => group.memberIds?.includes(single.id)).map((group) => group.id) : []);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [groupId, setGroupId] = useState(active[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const ids = members.map((m) => m.id);
      if (single) {
        for (const group of active) {
          const has = group.memberIds?.includes(single.id) ?? false;
          const want = selected.includes(group.id);
          if (has === want) continue;
          const next = want ? [...(group.memberIds ?? []), single.id] : (group.memberIds ?? []).filter((id) => id !== single.id);
          await updateGroup(group.id, { memberIds: next });
        }
      } else {
        const group = active.find((g) => g.id === groupId);
        if (group) {
          const current = group.memberIds ?? [];
          await updateGroup(group.id, { memberIds: mode === "add" ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id)) });
        }
      }
      toast.success("Groups updated");
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Groups for {names(members)}</DialogTitle>
          <DialogDescription>{single ? "Tick the groups this member belongs to." : "Pick a group and add or remove everyone selected."}</DialogDescription>
        </DialogHeader>
        {single ? (
          <Checks items={active.map((g) => ({ id: g.id, name: g.name, hint: `${g.memberCount} members` }))} selected={selected} onChange={setSelected} empty="There are no groups yet. Create one from the Team header." />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Action">
              {(["add", "remove"] as const).map((value) => (
                <button type="button" role="radio" aria-checked={mode === value} key={value} onClick={() => setMode(value)} className={`rounded-sm border px-3 py-2 text-sm ${mode === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>{value === "add" ? "Add to group" : "Remove from group"}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Group</Label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="h-9 w-full rounded-sm border bg-card px-3 text-sm">
                {active.length === 0 && <option value="">No groups</option>}
                {active.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          </div>
        )}
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!single && !groupId)}>{busy ? "Saving…" : "Save groups"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Create (no `group`) or edit a group: name, description, lead, members and clients. Saved through the real API. */
export function GroupFormSheet(props: { open: boolean; onClose: () => void; group?: TeamGroup }) {
  return props.open ? <GroupFormSheetBody {...props} /> : null;
}

function GroupFormSheetBody({ onClose, group }: { onClose: () => void; group?: TeamGroup }) {
  const { members, clients, createGroup, updateGroup } = useTeam();
  const [form, setForm] = useState({
    name: group?.name ?? "",
    description: group?.description ?? "",
    leadId: group?.leadId ?? "",
    memberIds: group?.memberIds ?? ([] as string[]),
    clientIds: group?.clients?.map((client) => client.id) ?? ([] as string[]),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const chosenClients = clients.filter((client) => form.clientIds.includes(client.id));
      const lead = members.find((member) => member.id === form.leadId);
      // A lead is always a member of the group.
      const memberIds = Array.from(new Set([...form.memberIds, ...(lead ? [lead.id] : [])]));
      if (group) {
        await updateGroup(group.id, { name: form.name.trim(), description: form.description.trim(), leadId: form.leadId, memberIds, clients: chosenClients });
        toast.success("Group updated");
      } else {
        await createGroup({ name: form.name.trim(), description: form.description.trim(), leadId: form.leadId, leadName: lead?.name ?? "", memberIds, clients: chosenClients });
        toast.success("Group created");
      }
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(value) => !value && !busy && onClose()}>
      <SheetContent className="max-w-xl sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{group ? "Edit group" : "Create group"}</SheetTitle>
          <SheetDescription>Groups organise people and clients. They do not change what anyone is allowed to do.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="space-y-1.5"><Label>Group name</Label><Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Social media" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this group is for" /></div>
          <div className="space-y-1.5">
            <Label>Group lead</Label>
            <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} className="h-9 w-full rounded-sm border bg-card px-3 text-sm">
              <option value="">No lead</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Members</Label><Checks items={members.map((m) => ({ id: m.id, name: m.name, hint: m.roleName }))} selected={form.memberIds} onChange={(memberIds) => setForm({ ...form, memberIds })} empty="No members yet." /></div>
          <div className="space-y-1.5"><Label>Clients</Label><Checks items={clients} selected={form.clientIds} onChange={(clientIds) => setForm({ ...form, clientIds })} empty="This company has no clients yet." /></div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button disabled={!form.name.trim() || busy} onClick={submit}>{busy ? "Saving…" : group ? "Save changes" : "Create group"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------- remove ----------------------------- */

export function RemoveMemberDialog(props: { member: Member | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  return props.open ? <RemoveMemberDialogBody {...props} /> : null;
}

function RemoveMemberDialogBody({ member, onClose, onDone }: { member: Member | null; onClose: () => void; onDone?: () => void }) {
  const { removeMember } = useTeam();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    setError("");
    try {
      await removeMember(member.id);
      toast.success(`${member.name} was removed from the company`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {member?.name}</DialogTitle>
          <DialogDescription>
            They lose access to this company immediately: their client access and group memberships are removed. Their account and any other company they belong to are not affected. Their past activity stays in the audit log.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>{busy ? "Removing…" : "Remove member"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- suspend / reactivate ---------------------------- */

export function SuspendMemberDialog(props: { member: Member | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  return props.open ? <SuspendMemberDialogBody {...props} /> : null;
}

function SuspendMemberDialogBody({ member, onClose, onDone }: { member: Member | null; onClose: () => void; onDone?: () => void }) {
  const { suspendMember } = useTeam();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    setError("");
    try {
      await suspendMember(member.id, reason.trim() || undefined);
      toast.success(`${member.name}'s access was suspended`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {member?.name}</DialogTitle>
          <DialogDescription>
            They cannot open this company until you reactivate them. Nothing is removed: their role, client access and group memberships stay as they are, and other companies are not affected.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="suspend-reason">Reason (optional)</Label>
          <Input id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Shown to owners and admins" />
        </div>
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>{busy ? "Suspending…" : "Suspend access"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One click, no dialog: reactivating only restores what was already there. */
export function useReactivateMember() {
  const { reactivateMember } = useTeam();
  return async (member: Member) => {
    try {
      await reactivateMember(member.id);
      toast.success(`${member.name}'s access was restored`);
    } catch (err) {
      toast.error(reasonOf(err));
    }
  };
}

/* ----------------------------- profile ----------------------------- */

/** Job title and department of one member, saved through PATCH /team/members/:id/profile. */
export function ProfileDialog(props: { member: Member | null; open: boolean; onClose: () => void }) {
  return props.open ? <ProfileDialogBody {...props} /> : null;
}

function ProfileDialogBody({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { updateMember } = useTeam();
  const [jobTitle, setJobTitle] = useState(member?.jobTitle ?? "");
  const [department, setDepartment] = useState(member?.department ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = jobTitle.trim() !== (member?.jobTitle ?? "") || department.trim() !== (member?.department ?? "");

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    setError("");
    try {
      await updateMember(member.id, { jobTitle: jobTitle.trim(), department: department.trim() });
      toast.success("Profile saved");
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile of {member?.name}</DialogTitle>
          <DialogDescription>Job title and department are kept per company. You can edit your own; editing others needs the Team permission.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Job title</Label><Input value={jobTitle} maxLength={100} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Marketing Manager" autoFocus /></div>
          <div className="space-y-1.5"><Label>Department</Label><Input value={department} maxLength={100} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Growth" /></div>
        </div>
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!dirty || busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- authority ---------------------------- */


/** What the signed-in person may do in the active company. The API still authorises every call; this only hides buttons that would be refused. */
export function useTeamAuthority(): { membershipId: string | null; systemRole: string | null; canManage: boolean } {
  const { user } = useAuth();
  const companyId = getStoredCompanyId();
  const membership = user?.memberships.find((m) => m.companyId === companyId) ?? null;
  const systemRole = membership?.systemRole ?? null;
  return { membershipId: membership?.membershipId ?? null, systemRole, canManage: systemRole === "OWNER" || systemRole === "ADMIN" };
}
