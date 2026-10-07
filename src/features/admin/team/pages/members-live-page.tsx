"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeRoleDialog, ClientAccessDialog, GroupMembershipDialog, ProfileDialog, RemoveMemberDialog, useTeamAuthority } from "../components/team-live-dialogs";
import { SYSTEM_ROLES } from "../team-data/live-team";
import { useTeam } from "../team-data/team-store";
import type { Member } from "../team-data/types";

const PAGE_SIZE = 10;
type Dialog = null | { kind: "role" | "access" | "groups" | "profile" | "remove"; members: Member[]; mode?: "grant" | "revoke" };

/** The Team roster against the real backend: only what the backend knows, and every control saves for real. */
export function MembersLivePage() {
  const { members, groups, clients, invitations, activity, isLoading, error, refresh } = useTeam();
  const { membershipId, canManage } = useTeamAuthority();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [client, setClient] = useState("all");
  const [group, setGroup] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (m: Member) => SYSTEM_ROLES.findIndex((r) => r.id === m.roleId);
    return members
      .filter((m) => (!q || `${m.name} ${m.email} ${m.jobTitle ?? ""} ${m.department ?? ""}`.toLowerCase().includes(q)) && (role === "all" || m.roleId === role) && (group === "all" || m.groups.some((g) => g.id === group)) && (client === "all" || m.clientAccess.some((c) => c.clientId === client)))
      .sort((a, b) => (sort === "role" ? rank(a) - rank(b) || a.name.localeCompare(b.name) : sort === "joined" ? b.joinedAt.localeCompare(a.joinedAt) : a.name.localeCompare(b.name)));
  }, [members, query, role, group, client, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedMembers = members.filter((m) => selected.includes(m.id));
  const previewMember = members.find((m) => m.id === preview) ?? null;
  const filtersOn = Boolean(query) || role !== "all" || client !== "all" || group !== "all" || sort !== "name";
  const clear = () => { setQuery(""); setRole("all"); setClient("all"); setGroup("all"); setSort("name"); setPage(1); };
  const open = (kind: NonNullable<Dialog>["kind"], list: Member[], mode?: "grant" | "revoke") => setDialog({ kind, members: list, mode });

  if (isLoading) return <Loading />;
  if (error) return <State title="Team data unavailable" detail={error.message || "We could not load the team."} action={<Button size="sm" onClick={refresh}>Retry</Button>} />;

  const kpis: Array<[string, number, string]> = [
    ["Members", members.length, "In this company"],
    ["Owners & admins", members.filter((m) => m.isOrgAdmin).length, "Can manage the team"],
    ["Groups", groups.filter((g) => !g.archived).length, "Active groups"],
    ["Pending invites", invitations.filter((i) => i.status === "pending").length, "Awaiting response"],
    ["Clients", clients.length, "In this company"],
    ["No client access", members.filter((m) => !m.isOrgAdmin && m.clientAccess.length === 0).length, "Managers and viewers"],
  ];
  const attention: Array<[string, string]> = [
    [`${invitations.filter((i) => i.status === "pending").length} pending invitations`, "/admin/team/invitations"],
    [`${members.filter((m) => !m.isOrgAdmin && m.clientAccess.length === 0).length} members without client access`, "/admin/team"],
    [`${groups.filter((g) => !g.archived && !g.leadId).length} groups without a lead`, "/admin/team/groups"],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="rounded-lg border border-[#E8EAED] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
            <p className="text-[11.5px] font-medium text-[#5F6368]">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-2"><strong className="text-[20px] font-medium leading-6 text-[#202124]">{value}</strong><span className="truncate text-[11px] text-[#80868B]">{sub}</span></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E8EAED] p-2.5">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" placeholder="Search name, email, title or department..." aria-label="Search members" />
          </div>
          <Filter label="Role" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={SYSTEM_ROLES.map((r) => [r.id, r.name])} />
          <Filter label="Client" value={client} onChange={(v) => { setClient(v); setPage(1); }} options={clients.map((c) => [c.id, c.name])} />
          <Filter label="Group" value={group} onChange={(v) => { setGroup(v); setPage(1); }} options={groups.filter((g) => !g.archived).map((g) => [g.id, g.name])} />
          <Filter label="Sort" value={sort} onChange={setSort} allowAll={false} options={[["name", "Name"], ["role", "Role"], ["joined", "Recently joined"]]} />
          <Button size="sm" variant="ghost" onClick={clear} disabled={!filtersOn}>Clear</Button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-b bg-blue-50/70 px-3 py-2 text-xs">
            <strong className="mr-2 text-blue-900">{selected.length} selected</strong>
            {canManage ? (
              <>
                <Button size="sm" variant="outline" onClick={() => open("role", selectedMembers)}>Change role</Button>
                <Button size="sm" variant="outline" onClick={() => open("access", selectedMembers, "grant")}>Client access</Button>
                <Button size="sm" variant="outline" onClick={() => open("groups", selectedMembers)}>Groups</Button>
              </>
            ) : <span className="text-blue-900/70">Only owners and admins can change roles, access and groups.</span>}
            <Button size="sm" variant="ghost" onClick={() => setSelected([])} aria-label="Clear selection"><X /></Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12.5px]">
            <thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]">
              <tr>
                <th className="w-10 border-b border-[#E8EAED] px-3 py-2"><Checkbox aria-label="Select page" checked={pageItems.length > 0 && pageItems.every((m) => selected.includes(m.id))} onCheckedChange={(yes) => setSelected(yes ? Array.from(new Set([...selected, ...pageItems.map((m) => m.id)])) : selected.filter((id) => !pageItems.some((m) => m.id === id)))} /></th>
                {["Member", "Role", "Groups", "Client access", "Joined", ""].map((h) => <th key={h} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((member) => (
                <tr key={member.id} onClick={() => setPreview(member.id)} className={`cursor-pointer transition hover:bg-[#F8F9FA] ${selected.includes(member.id) ? "bg-[#F8FBFF]" : ""}`}>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5" onClick={(e) => e.stopPropagation()}><Checkbox aria-label={`Select ${member.name}`} checked={selected.includes(member.id)} onCheckedChange={(yes) => setSelected(yes ? [...selected, member.id] : selected.filter((id) => id !== member.id))} /></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2"><Identity member={member} you={member.id === membershipId} /></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2"><Link onClick={(e) => e.stopPropagation()} href={`/admin/roles/${member.roleId}`} className="font-medium text-[#3C4043] hover:text-[#1A73E8]">{member.roleName}</Link></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2"><Chips values={member.groups.map((g) => g.name)} /></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2"><Chips values={member.clientAccess.map((c) => c.clientName)} empty={member.isOrgAdmin ? "All (admin)" : "No access"} /></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2 text-[#5F6368]">{new Date(member.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${member.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setPreview(member.id)}>Quick preview</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push(`/admin/team/${member.id}`)}>View profile</DropdownMenuItem>
                        {(canManage || member.id === membershipId) && <DropdownMenuItem onSelect={() => open("profile", [member])}>Edit profile</DropdownMenuItem>}
                        {canManage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => open("role", [member])}>Change role</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => open("access", [member])}>Client access</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => open("groups", [member])}>Groups</DropdownMenuItem>
                            {member.id !== membershipId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => open("remove", [member])}>Remove from company</DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageItems.length === 0 && <State title={query ? "No search results" : "No members match these filters"} detail="Clear the filters or invite a new member." action={<Button size="sm" variant="outline" onClick={clear}>Clear filters</Button>} />}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-slate-500">
          <span>{filtered.length} of {members.length} members · page {current} of {pages}</span>
          <div className="flex gap-1">
            <Button size="icon-sm" variant="outline" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft /></Button>
            <Button size="icon-sm" variant="outline" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight /></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-1 lg:grid-cols-3">
        <Support title="Recent team activity" action={<Link className="text-xs font-medium text-primary" href="/admin/team/activity">View all</Link>}>
          {activity.length === 0 ? <p className="border-t py-2 text-xs text-slate-500">{canManage ? "No activity yet." : "Activity is visible to owners and admins."}</p> : activity.slice(0, 4).map((a) => <p key={a.id} className="border-t py-2 text-xs"><strong>{a.memberName}</strong> {a.action.toLowerCase()} <span className="text-slate-500">{a.entityName}</span></p>)}
        </Support>
        <Support title="Needs attention">
          {attention.map(([text, href]) => <Link key={text} href={href} className="flex items-center justify-between border-t py-2 text-xs hover:text-primary"><span>{text}</span><ExternalLink className="size-3" /></Link>)}
        </Support>
        <Support title="Members by role">
          {SYSTEM_ROLES.map((r) => <Link key={r.id} href={`/admin/roles/${r.id}`} className="flex items-center justify-between border-t py-2 text-xs hover:text-primary"><span>{r.name}</span><strong>{members.filter((m) => m.roleId === r.id).length}</strong></Link>)}
        </Support>
      </div>

      <Sheet open={previewMember !== null} onOpenChange={(value) => !value && setPreview(null)}>
        <SheetContent className="max-w-lg sm:max-w-lg">
          {previewMember && (
            <>
              <SheetHeader><SheetTitle>Member preview</SheetTitle></SheetHeader>
              <SheetBody>
                <div className="flex items-center gap-3 border-b pb-4"><Avatar name={previewMember.name} large /><div><h2 className="font-semibold">{previewMember.name}</h2><p className="text-xs text-slate-500">{previewMember.email}</p><p className="text-xs text-slate-500">{[previewMember.jobTitle, previewMember.department].filter(Boolean).join(" · ") || "No title set"}</p></div></div>
                <Section title="Role"><Link href={`/admin/roles/${previewMember.roleId}`} className="text-sm font-medium text-primary">{previewMember.roleName}</Link></Section>
                <Section title="Client access"><Chips all values={previewMember.clientAccess.map((c) => c.clientName)} empty={previewMember.isOrgAdmin ? "All clients (owner/admin)" : "No client access"} /></Section>
                <Section title="Groups"><Chips all values={previewMember.groups.map((g) => g.name)} empty="No groups" /></Section>
                <Section title="Joined"><p className="text-sm">{new Date(previewMember.joinedAt).toLocaleDateString(undefined, { dateStyle: "long" })}</p></Section>
              </SheetBody>
              <SheetFooter><Button asChild><Link href={`/admin/team/${previewMember.id}`}>View full profile</Link></Button></SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ChangeRoleDialog members={dialog?.kind === "role" ? dialog.members : []} open={dialog?.kind === "role"} onClose={() => setDialog(null)} onDone={() => setSelected([])} />
      <ClientAccessDialog members={dialog?.kind === "access" ? dialog.members : []} open={dialog?.kind === "access"} initialMode={dialog?.mode} onClose={() => setDialog(null)} />
      <GroupMembershipDialog members={dialog?.kind === "groups" ? dialog.members : []} open={dialog?.kind === "groups"} onClose={() => setDialog(null)} />
      <ProfileDialog member={dialog?.kind === "profile" ? dialog.members[0]! : null} open={dialog?.kind === "profile"} onClose={() => setDialog(null)} />
      <RemoveMemberDialog member={dialog?.kind === "remove" ? dialog.members[0]! : null} open={dialog?.kind === "remove"} onClose={() => setDialog(null)} onDone={() => setSelected((ids) => ids.filter((id) => id !== dialog?.members[0]?.id))} />
    </div>
  );
}

function Identity({ member, you }: { member: Member; you: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={member.name} />
      <div className="min-w-0">
        <p className="font-medium text-[#202124]">{member.name}{you && <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-[10px] font-semibold text-blue-700">You</span>}</p>
        <p className="max-w-[260px] truncate text-[11px] text-[#5F6368]">{member.email}{member.jobTitle ? ` · ${member.jobTitle}` : ""}</p>
      </div>
    </div>
  );
}
function Avatar({ name, large = false }: { name: string; large?: boolean }) { return <span className={`grid shrink-0 place-items-center rounded-full bg-slate-900 font-semibold text-white ${large ? "size-11 text-sm" : "size-7 text-[10px]"}`}>{name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>; }
function Chips({ values, empty = "—", all = false }: { values: string[]; empty?: string; all?: boolean }) {
  if (!values.length) return <span className="text-[11px] text-slate-400">{empty}</span>;
  if (all) return <div className="flex flex-wrap gap-1">{values.map((v) => <span key={v} className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium">{v}</span>)}</div>;
  return <div className="flex items-center gap-1"><span className="max-w-[110px] truncate rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium">{values[0]}</span>{values.length > 1 && <span className="text-[10px] text-slate-500" title={values.slice(1).join(", ")}>+{values.length - 1}</span>}</div>;
}
function Filter({ value, onChange, label, options, allowAll = true }: { value: string; onChange: (v: string) => void; label: string; options: string[][]; allowAll?: boolean }) {
  return <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 max-w-[160px] rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043] outline-none focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15">{allowAll && <option value="all">{label}: All</option>}{options.map(([v, n]) => <option key={v} value={v}>{allowAll ? n : `${label}: ${n}`}</option>)}</select>;
}
function Support({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"><div className="mb-1 flex items-center justify-between"><h3 className="text-[13px] font-medium text-[#202124]">{title}</h3>{action}</div>{children}</section>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b py-4"><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>{children}</section>; }
function State({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <div className="grid min-h-48 place-items-center p-6 text-center"><div><Users className="mx-auto size-7 text-slate-300" /><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mb-3 mt-1 text-xs text-slate-500">{detail}</p>{action}</div></div>; }
function Loading() { return <div className="space-y-2"><div className="grid grid-cols-3 gap-1 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div><Skeleton className="h-10" /><Skeleton className="h-80" /></div>; }
