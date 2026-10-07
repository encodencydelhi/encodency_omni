"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChangeRoleDialog, GroupMembershipDialog, ProfileDialog, reasonOf, RemoveMemberDialog, SuspendMemberDialog, useReactivateMember, useTeamAuthority } from "../components/team-live-dialogs";
import { useTeam } from "../team-data/team-store";
import type { Member } from "../team-data/types";

const tabs = ["Overview", "Access", "Activity"] as const;
type Dlg = null | "role" | "profile" | "groups" | "remove" | "suspend";

/** One member against the real backend. Tasks, workload and per-person security are not tracked there, so they are not shown. */
export function MemberDetailLivePage({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { members, clients, activity, isLoading, setClientAccess } = useTeam();
  const { membershipId, canManage } = useTeamAuthority();
  const reactivate = useReactivateMember();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [dialog, setDialog] = useState<Dlg>(null);
  const [busyClient, setBusyClient] = useState<string | null>(null);
  const member = members.find((item) => item.id === memberId);

  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;
  if (!member) return <div className="grid min-h-80 place-items-center text-center"><div><h2 className="font-semibold">Member not found</h2><p className="mt-1 text-xs text-slate-500">They may have been removed from this company.</p><Button asChild size="sm" className="mt-3"><Link href="/admin/team">Back to team</Link></Button></div></div>;

  const isSelf = member.id === membershipId;
  const memberActivity = activity.filter((a) => a.memberId === member.id);
  const has = (clientId: string) => member.clientAccess.some((a) => a.clientId === clientId);

  const toggleAccess = async (clientId: string, grant: boolean) => {
    setBusyClient(clientId);
    try {
      await setClientAccess(clientId, [member.id], grant);
      toast.success(grant ? "Access granted" : "Access removed");
    } catch (err) {
      toast.error(reasonOf(err));
    } finally {
      setBusyClient(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft />Back</Button>
      {member.status === "suspended" && <p role="status" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">Access to this company is suspended{member.suspensionReason ? `: ${member.suspensionReason}` : ""}. Nothing was removed; reactivate to restore it.</p>}
      <section className="rounded-lg border border-[#E8EAED] bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[#E8F0FE] font-medium text-[#1967D2] ring-1 ring-[#D2E3FC]">{member.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-[18px] font-medium text-[#202124]">{member.name}</h2><Pill>{member.roleName}</Pill>{isSelf && <Pill>You</Pill>}</div>
              <p className="text-[12.5px] text-[#5F6368]">{member.email}{member.jobTitle ? ` · ${member.jobTitle}` : ""}{member.department ? ` · ${member.department}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#5F6368]"><span>Joined {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span>{member.isOrgAdmin ? "All clients" : `${member.clientAccess.length} clients`}</span><span>{member.groups.length} groups</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(canManage || isSelf) && <Button size="sm" variant="outline" onClick={() => setDialog("profile")}>Edit profile</Button>}
            {canManage && <Button size="sm" variant="outline" onClick={() => setDialog("role")}>Change role</Button>}
            {canManage && !isSelf && (member.status === "suspended"
              ? <Button size="sm" variant="outline" onClick={() => void reactivate(member)}>Reactivate access</Button>
              : <Button size="sm" variant="outline" onClick={() => setDialog("suspend")}>Suspend access</Button>)}
            {canManage && !isSelf && <Button size="sm" variant="destructive" onClick={() => setDialog("remove")}>Remove</Button>}
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <nav className="flex gap-0.5 overflow-x-auto border-b border-[#E8EAED] px-3">
          {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-2.5 py-2.5 text-[12.5px] font-medium ${tab === item ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:text-[#202124]"}`}>{item}</button>)}
        </nav>
        <div className="p-3 sm:p-4">
          {tab === "Overview" && <Overview member={member} canManage={canManage} onGroups={() => setDialog("groups")} />}
          {tab === "Access" && (
            <div>
              <div className="mb-3"><h3 className="text-sm font-semibold">Client access</h3><p className="text-xs text-slate-500">{member.isOrgAdmin ? "Owners and admins can open every client, so explicit access is not needed." : "Managers and viewers only see the clients listed here."}</p></div>
              {clients.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-xs text-slate-500">This company has no clients yet.</p> : (
                <div className="divide-y rounded-sm border">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <span className="font-medium">{client.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${has(client.id) ? "text-emerald-700" : "text-slate-400"}`}>{has(client.id) ? "Has access" : member.isOrgAdmin ? "Via role" : "No access"}</span>
                        {canManage && <Button size="sm" variant={has(client.id) ? "outline" : "default"} disabled={busyClient === client.id} onClick={() => toggleAccess(client.id, !has(client.id))}>{busyClient === client.id ? "Saving…" : has(client.id) ? "Remove" : "Grant"}</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "Activity" && (
            memberActivity.length ? (
              <div className="divide-y rounded-sm border">
                {memberActivity.slice(0, 50).map((a) => (
                  <div key={a.id} className="p-3 text-xs"><p><strong>{a.action}</strong> · {a.entityName}</p><p className="mt-1 text-slate-500">{a.clientName || "Company-wide"} · {a.module} · {new Date(a.timestamp).toLocaleString()}</p></div>
                ))}
              </div>
            ) : <p className="rounded-md border border-dashed p-6 text-center text-xs text-slate-500">{canManage ? "No recorded activity for this member yet." : "Activity is visible to owners and admins."}</p>
          )}
        </div>
      </div>

      <ChangeRoleDialog members={[member]} open={dialog === "role"} onClose={() => setDialog(null)} />
      <ProfileDialog member={member} open={dialog === "profile"} onClose={() => setDialog(null)} />
      <GroupMembershipDialog members={[member]} open={dialog === "groups"} onClose={() => setDialog(null)} />
      <SuspendMemberDialog member={member} open={dialog === "suspend"} onClose={() => setDialog(null)} />
      <RemoveMemberDialog member={member} open={dialog === "remove"} onClose={() => setDialog(null)} onDone={() => router.replace("/admin/team")} />
    </div>
  );
}

function Overview({ member, canManage, onGroups }: { member: Member; canManage: boolean; onGroups: () => void }) {
  const blocks: Array<[string, React.ReactNode]> = [
    ["Role", <Link key="r" href={`/admin/roles/${member.roleId}`} className="text-primary hover:underline">{member.roleName}</Link>],
    ["Job title", member.jobTitle || "Not set"],
    ["Department", member.department || "Not set"],
    ["Client access", member.isOrgAdmin ? "All clients (owner/admin)" : member.clientAccess.map((a) => a.clientName).join(", ") || "No access"],
    ["Groups", member.groups.length ? member.groups.map((g) => <Link key={g.id} href={`/admin/team/groups/${g.id}`} className="mr-2 text-primary hover:underline">{g.name}</Link>) : "No groups"],
    ["Joined", new Date(member.joinedAt).toLocaleDateString(undefined, { dateStyle: "long" })],
  ];
  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {blocks.map(([title, value]) => (
        <section key={title} className="min-h-20 rounded-lg border border-[#E8EAED] p-3.5">
          <div className="flex items-center justify-between"><h3 className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">{title}</h3>{title === "Groups" && canManage && <button type="button" onClick={onGroups} className="text-[11px] font-medium text-primary hover:underline">Manage</button>}</div>
          <p className="mt-2 text-[13px] font-medium text-[#202124]">{value}</p>
        </section>
      ))}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) { return <span className="rounded-md border border-[#E8EAED] bg-[#F1F3F4] px-1.5 py-0.5 text-[11px] font-medium text-[#3C4043]">{children}</span>; }
