"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeam } from "../team-data/team-store";

const tabs = ["Overview", "Members", "Clients", "Work", "Activity"] as const;

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const { groups, members, activity, isLoading, updateGroup } = useTeam();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const group = groups.find((g) => g.id === groupId);
  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;
  if (!group) return <div className="p-10 text-center"><h2>Group not found</h2><Button asChild size="sm" className="mt-3"><Link href="/admin/team/groups">Back to groups</Link></Button></div>;

  const groupMembers = members.filter((m) => m.groups.some((g) => g.id === group.id) || group.memberIds?.includes(m.id));
  const clients = group.clients || [...new Map(groupMembers.flatMap((m) => m.clientAccess).map((c) => [c.clientId, { id: c.clientId, name: c.clientName }])).values()];

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/team/groups"><ArrowLeft />Groups</Link></Button>
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-[#E8EAED] bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] sm:flex-row sm:items-center">
        <div><h2 className="text-[18px] font-medium text-[#202124]">{group.name}</h2><p className="text-[12.5px] text-[#5F6368]">{group.description}</p><div className="mt-2 flex gap-4 text-[11px] text-[#5F6368]"><span>Lead: {group.leadName}</span><span>{groupMembers.length || group.memberCount} members</span><span>{clients.length || group.clientCount} clients</span></div></div>
        <div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => updateGroup(group.id, { name: `${group.name} · Updated` })}>Edit group</Button><Button size="sm" variant="outline" onClick={() => { const m = members.find((x) => !groupMembers.some((gm) => gm.id === x.id)); if (m) updateGroup(group.id, { memberIds: [...groupMembers.map((x) => x.id), m.id], memberCount: groupMembers.length + 1 }); }}>Add member</Button><Button size="sm" variant="outline" onClick={() => { const m = members.find((x) => x.status === "active" && x.id !== group.leadId); if (m) updateGroup(group.id, { leadId: m.id, leadName: m.name }); }}>Change lead</Button><Button size="sm" variant="destructive" onClick={() => updateGroup(group.id, { archived: true })}>Archive</Button></div>
      </section>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <nav className="flex gap-0.5 overflow-x-auto border-b border-[#E8EAED] px-3">{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={`border-b-2 px-2.5 py-2.5 text-[12.5px] font-medium ${tab === x ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:text-[#202124]"}`}>{x}</button>)}</nav>
        <div className="p-3">
          {tab === "Overview" && <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3"><Block title="Team lead">{group.leadName}</Block><Block title="Members preview">{groupMembers.slice(0, 4).map((m) => m.name).join(", ") || `${group.memberCount} assigned members`}</Block><Block title="Clients">{clients.map((c) => c.name).join(", ") || `${group.clientCount} assigned clients`}</Block><Block title="Current work">{group.activeTasks} active tasks</Block><Block title="Recent activity">{activity.slice(0, 2).map((a) => a.action).join(" · ")}</Block></div>}
          {tab === "Members" && <List empty="No members assigned">{groupMembers.map((m) => <Row key={m.id} title={m.name} meta={`${m.roleName} · ${m.workload.openTasks} tasks`} href={`/admin/team/${m.id}`} />)}</List>}
          {tab === "Clients" && <List empty="No clients assigned">{clients.map((c) => <Row key={c.id} title={c.name} meta={`${groupMembers.filter((m) => m.clientAccess.some((a) => a.clientId === c.id)).length} members have access`} />)}</List>}
          {tab === "Work" && <List empty="No active work"><Row title="Open team tasks" meta={`${group.activeTasks} active assignments`} /><Row title="Pending approvals" meta={`${groupMembers.reduce((n, m) => n + m.workload.pendingApprovals, 0)} waiting`} /><Row title="Overdue work" meta={`${groupMembers.reduce((n, m) => n + m.workload.overdueTasks, 0)} overdue`} /></List>}
          {tab === "Activity" && <List empty="No group activity">{activity.filter((a) => groupMembers.some((m) => m.id === a.memberId)).map((a) => <Row key={a.id} title={`${a.memberName} · ${a.action}`} meta={`${a.entityName} · ${new Date(a.timestamp).toLocaleString()}`} />)}</List>}
        </div>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) { return <div className="min-h-24 rounded-lg border border-[#E8EAED] p-3.5"><h3 className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">{title}</h3><p className="mt-2 text-[13px] font-medium text-[#202124]">{children}</p></div>; }
function List({ children, empty }: { children: React.ReactNode; empty: string }) { return <div className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">{Array.isArray(children) && children.length === 0 ? <div className="p-10 text-center text-[12.5px] text-[#5F6368]">{empty}</div> : children}</div>; }
function Row({ title, meta, href }: { title: string; meta: string; href?: string }) { const content = <><div><p className="text-[12.5px] font-medium text-[#202124]">{title}</p><p className="text-[11.5px] text-[#5F6368]">{meta}</p></div>{href && <ExternalLink className="size-3" />}</>; return href ? <Link href={href} className="flex items-center justify-between p-3 hover:bg-[#F8F9FA]">{content}</Link> : <div className="flex items-center justify-between p-3">{content}</div>; }
