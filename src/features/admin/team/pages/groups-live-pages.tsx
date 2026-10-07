"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { GroupFormSheet, reasonOf, useTeamAuthority } from "../components/team-live-dialogs";
import { useTeam } from "../team-data/team-store";
import type { TeamGroup } from "../team-data/types";

function ArchiveGroupDialog({ group, open, onClose, onDone }: { group: TeamGroup | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  const { updateGroup } = useTeam();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!group) return;
    setBusy(true);
    setError("");
    try {
      await updateGroup(group.id, { archived: true });
      toast.success(`${group.name} was archived`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(reasonOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Archive {group?.name}</DialogTitle><DialogDescription>The group disappears from the lists. Nobody loses any access, because groups do not grant permissions. Past activity keeps pointing at it.</DialogDescription></DialogHeader>
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <DialogFooter><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="destructive" onClick={submit} disabled={busy}>{busy ? "Archiving…" : "Archive group"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupsLivePage() {
  const { groups, members, isLoading, error, refresh } = useTeam();
  const { canManage } = useTeamAuthority();
  const [q, setQ] = useState("");
  const [lead, setLead] = useState("all");
  const [edit, setEdit] = useState<TeamGroup | null>(null);
  const [archive, setArchive] = useState<TeamGroup | null>(null);
  const active = useMemo(() => groups.filter((g) => !g.archived), [groups]);
  const shown = useMemo(() => active.filter((g) => `${g.name} ${g.description} ${g.leadName}`.toLowerCase().includes(q.trim().toLowerCase()) && (lead === "all" || (lead === "none" ? !g.leadId : g.leadId === lead))), [active, q, lead]);
  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;
  if (error) return <div className="grid min-h-48 place-items-center text-center text-xs text-slate-500"><div><p>Groups could not be loaded.</p><Button size="sm" className="mt-2" onClick={refresh}>Retry</Button></div></div>;

  const stats: Array<[string, number]> = [
    ["Groups", active.length],
    ["Members in groups", new Set(active.flatMap((g) => g.memberIds ?? [])).size],
    ["Clients covered", new Set(active.flatMap((g) => (g.clients ?? []).map((c) => c.id))).size],
    ["Without a lead", active.filter((g) => !g.leadId).length],
  ];
  const leads = Array.from(new Map(active.filter((g) => g.leadId).map((g) => [g.leadId, g.leadName] as const)).entries());

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"><p className="text-[11.5px] font-medium text-[#5F6368]">{label}</p><strong className="text-[20px] font-medium leading-6 text-[#202124]">{value}</strong></div>)}</div>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-wrap gap-2 border-b border-[#E8EAED] p-2.5">
          <div className="relative min-w-[240px] flex-1"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" /><Input className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." aria-label="Search groups" /></div>
          <select aria-label="Lead" value={lead} onChange={(e) => setLead(e.target.value)} className="h-9 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043]"><option value="all">Lead: All</option><option value="none">No lead</option>{leads.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <Button size="sm" variant="ghost" disabled={!q && lead === "all"} onClick={() => { setQ(""); setLead("all"); }}>Clear</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12.5px]">
            <thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]"><tr>{["Group", "Lead", "Members", "Clients", "Updated", ""].map((x) => <th key={x} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{x}</th>)}</tr></thead>
            <tbody>
              {shown.map((g) => (
                <tr key={g.id} className="hover:bg-[#F8F9FA]">
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5"><Link href={`/admin/team/groups/${g.id}`} className="font-medium text-[#202124] hover:text-[#1A73E8]">{g.name}</Link><p className="max-w-72 truncate text-[11px] text-[#5F6368]">{g.description || "No description"}</p></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.leadId ? <Link href={`/admin/team/${g.leadId}`} className="hover:text-[#1A73E8]">{g.leadName}</Link> : <span className="text-slate-400">No lead</span>}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.memberCount}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.clientCount}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5 text-[#5F6368]">{new Date(g.updatedAt).toLocaleDateString()}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${g.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/admin/team/groups/${g.id}`}>View group</Link></DropdownMenuItem>
                        {canManage && <DropdownMenuItem onSelect={() => setEdit(g)}>Edit group</DropdownMenuItem>}
                        {canManage && <DropdownMenuItem variant="destructive" onSelect={() => setArchive(g)}>Archive</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <div className="grid min-h-48 place-items-center text-center text-[12.5px] text-[#5F6368]">{active.length === 0 ? (canManage ? "No groups yet. Create one from the Team header." : "No groups yet.") : "No groups match these filters."}</div>}
        <div className="border-t px-3 py-2 text-xs text-slate-500">{shown.length} of {active.length} groups{members.length ? ` · ${members.length} members in the company` : ""}</div>
      </section>
      <GroupFormSheet open={edit !== null} group={edit ?? undefined} onClose={() => setEdit(null)} />
      <ArchiveGroupDialog group={archive} open={archive !== null} onClose={() => setArchive(null)} />
    </div>
  );
}

const tabs = ["Overview", "Members", "Clients", "Activity"] as const;

export function GroupDetailLivePage({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { groups, members, activity, isLoading } = useTeam();
  const { canManage } = useTeamAuthority();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const group = groups.find((g) => g.id === groupId && !g.archived);
  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;
  if (!group) return <div className="p-10 text-center"><h2 className="font-semibold">Group not found</h2><p className="mt-1 text-xs text-slate-500">It may have been archived.</p><Button asChild size="sm" className="mt-3"><Link href="/admin/team/groups">Back to groups</Link></Button></div>;

  const groupMembers = members.filter((m) => group.memberIds?.includes(m.id));
  const clients = group.clients ?? [];
  const ids = new Set(groupMembers.map((m) => m.id));
  const groupActivity = activity.filter((a) => ids.has(a.memberId));

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/team/groups"><ArrowLeft />Groups</Link></Button>
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-[#E8EAED] bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[18px] font-medium text-[#202124]">{group.name}</h2>
          <p className="text-[12.5px] text-[#5F6368]">{group.description || "No description"}</p>
          <div className="mt-2 flex gap-4 text-[11px] text-[#5F6368]"><span>Lead: {group.leadId ? group.leadName : "none"}</span><span>{groupMembers.length} members</span><span>{clients.length} clients</span></div>
        </div>
        {canManage && <div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit group</Button><Button size="sm" variant="destructive" onClick={() => setArchiving(true)}>Archive</Button></div>}
      </section>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <nav className="flex gap-0.5 overflow-x-auto border-b border-[#E8EAED] px-3">{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={`border-b-2 px-2.5 py-2.5 text-[12.5px] font-medium ${tab === x ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:text-[#202124]"}`}>{x}</button>)}</nav>
        <div className="p-3">
          {tab === "Overview" && (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <Block title="Group lead">{group.leadId ? <Link href={`/admin/team/${group.leadId}`} className="text-primary hover:underline">{group.leadName}</Link> : "No lead"}</Block>
              <Block title="Members">{groupMembers.slice(0, 5).map((m) => m.name).join(", ") || "No members"}{groupMembers.length > 5 ? ` +${groupMembers.length - 5}` : ""}</Block>
              <Block title="Clients">{clients.map((c) => c.name).join(", ") || "No clients"}</Block>
              <Block title="Created / updated">{new Date(group.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</Block>
            </div>
          )}
          {tab === "Members" && <List empty="No members in this group">{groupMembers.map((m) => <Row key={m.id} title={m.name} meta={`${m.roleName}${m.jobTitle ? ` · ${m.jobTitle}` : ""}${m.id === group.leadId ? " · Lead" : ""}`} href={`/admin/team/${m.id}`} />)}</List>}
          {tab === "Clients" && <List empty="No clients assigned to this group">{clients.map((c) => <Row key={c.id} title={c.name} meta={`${groupMembers.filter((m) => m.isOrgAdmin || m.clientAccess.some((a) => a.clientId === c.id)).length} of ${groupMembers.length} members can open it`} />)}</List>}
          {tab === "Activity" && <List empty={canManage ? "No recorded activity from this group yet" : "Activity is visible to owners and admins"}>{groupActivity.slice(0, 50).map((a) => <Row key={a.id} title={`${a.memberName} · ${a.action}`} meta={`${a.entityName} · ${new Date(a.timestamp).toLocaleString()}`} />)}</List>}
        </div>
      </section>
      <GroupFormSheet open={editing} group={group} onClose={() => setEditing(false)} />
      <ArchiveGroupDialog group={group} open={archiving} onClose={() => setArchiving(false)} onDone={() => router.replace("/admin/team/groups")} />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) { return <div className="min-h-20 rounded-lg border border-[#E8EAED] p-3.5"><h3 className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">{title}</h3><p className="mt-2 text-[13px] font-medium text-[#202124]">{children}</p></div>; }
function List({ children, empty }: { children: React.ReactNode; empty: string }) { return <div className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">{Array.isArray(children) && children.length === 0 ? <div className="p-10 text-center text-[12.5px] text-[#5F6368]">{empty}</div> : children}</div>; }
function Row({ title, meta, href }: { title: string; meta: string; href?: string }) { const content = <div><p className="text-[12.5px] font-medium text-[#202124]">{title}</p><p className="text-[11.5px] text-[#5F6368]">{meta}</p></div>; return href ? <Link href={href} className="flex items-center justify-between p-3 hover:bg-[#F8F9FA]">{content}</Link> : <div className="flex items-center justify-between p-3">{content}</div>; }
