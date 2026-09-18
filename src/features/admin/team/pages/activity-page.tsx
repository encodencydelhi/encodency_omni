"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam } from "../team-data/team-store";

export function ActivityPage() {
  const { activity, members, isLoading } = useTeam();
  const [q, setQ] = useState("");
  const [member, setMember] = useState("all");
  const [module, setModule] = useState("all");
  const [client, setClient] = useState("all");
  const shown = useMemo(() => activity.filter((a) => `${a.memberName} ${a.action} ${a.entityName}`.toLowerCase().includes(q.toLowerCase()) && (member === "all" || a.memberId === member) && (module === "all" || a.module === module) && (client === "all" || a.clientId === client)), [activity, q, member, module, client]);
  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;

  const stats = [
    ["Active today", new Set(activity.filter((a) => Date.now() - new Date(a.timestamp).getTime() < 86400000).map((a) => a.memberId)).size],
    ["Actions today", activity.filter((a) => Date.now() - new Date(a.timestamp).getTime() < 86400000).length],
    ["Pending approvals", members.reduce((n, m) => n + m.workload.pendingApprovals, 0)],
    ["Overdue tasks", members.reduce((n, m) => n + m.workload.overdueTasks, 0)],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"><p className="text-[11.5px] font-medium text-[#5F6368]">{label}</p><strong className="text-[20px] font-medium leading-6 text-[#202124]">{value}</strong></div>)}</div>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-wrap gap-2 border-b border-[#E8EAED] p-2.5"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" /><Input value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" placeholder="Search activity..." /></div><Select label="Member" value={member} set={setMember} values={members.map((m) => [m.id, m.name])} /><Select label="Client" value={client} set={setClient} values={[...new Map(activity.filter((a) => a.clientId).map((a) => [a.clientId!, [a.clientId!, a.clientName!]])).values()]} /><Select label="Module" value={module} set={setModule} values={[...new Set(activity.map((a) => a.module))].map((x) => [x, x])} /><Input type="date" aria-label="Date" className="h-9 w-auto rounded-lg border-[#DADCE0] text-[12px]" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-[12.5px]"><thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]"><tr>{["Member", "Action", "Entity", "Module", "Client", "Time", ""].map((x) => <th key={x} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{x}</th>)}</tr></thead><tbody>{shown.map((a) => <tr key={a.id} className="hover:bg-[#F8F9FA]"><td className="border-b border-[#F1F3F4] px-3 py-2.5"><Link href={`/admin/team/${a.memberId}`} className="font-medium text-[#202124] hover:text-[#1A73E8]">{a.memberName}</Link></td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{a.action}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5 font-medium text-[#202124]">{a.entityName}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5"><span className="rounded-md bg-[#E8F0FE] px-1.5 py-0.5 text-[11px] font-medium text-[#1967D2]">{a.module}</span></td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{a.clientName || "Organization"}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5 text-[#5F6368]">{new Date(a.timestamp).toLocaleString()}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5"><Button size="icon-sm" variant="ghost" title="Open entity"><ExternalLink /></Button></td></tr>)}</tbody></table></div>
        {!shown.length && <div className="grid min-h-48 place-items-center text-[12.5px] text-[#5F6368]">No activity matches these filters.</div>}
      </section>
    </div>
  );
}

function Select({ label, value, set, values }: { label: string; value: string; set: (v: string) => void; values: string[][] }) {
  return <select value={value} onChange={(e) => set(e.target.value)} className="h-9 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043] outline-none focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15"><option value="all">{label}: All</option>{values.map(([v, n]) => <option value={v} key={v}>{n}</option>)}</select>;
}
