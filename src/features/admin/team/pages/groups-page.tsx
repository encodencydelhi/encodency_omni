"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTeam } from "../team-data/team-store";

export function GroupsPage() {
  const { groups, members, isLoading, updateGroup } = useTeam();
  const [q, setQ] = useState("");
  const shown = useMemo(() => groups.filter((g) => !g.archived && `${g.name} ${g.description}`.toLowerCase().includes(q.toLowerCase())), [groups, q]);
  if (isLoading) return <div className="h-80 animate-pulse rounded-lg bg-[#F1F3F4]" />;

  const stats = [
    ["Total groups", shown.length],
    ["Members assigned", new Set(members.filter((m) => m.groups.length).map((m) => m.id)).size],
    ["Clients covered", new Set(members.flatMap((m) => m.clientAccess.map((c) => c.clientId))).size],
    ["Group leads", new Set(shown.map((g) => g.leadId)).size],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
            <p className="text-[11.5px] font-medium text-[#5F6368]">{label}</p>
            <strong className="text-[20px] font-medium leading-6 text-[#202124]">{value}</strong>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="relative border-b border-[#E8EAED] p-2.5">
          <Search className="absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" />
          <Input className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-[12.5px]">
            <thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]">
              <tr>{["Group", "Lead", "Members", "Clients", "Active work", "Updated", ""].map((x) => <th key={x} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{x}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((g) => (
                <tr key={g.id} className="hover:bg-[#F8F9FA]">
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5"><Link href={`/admin/team/groups/${g.id}`} className="font-medium text-[#202124] hover:text-[#1A73E8]">{g.name}</Link><p className="max-w-72 truncate text-[11px] text-[#5F6368]">{g.description}</p></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.leadName}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.memberCount}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.clientCount}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{g.activeTasks} tasks</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5 text-[#5F6368]">{new Date(g.updatedAt).toLocaleDateString()}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/admin/team/groups/${g.id}`}>View group</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => { const m = members.find((x) => !x.groups.some((i) => i.id === g.id)); if (m) updateGroup(g.id, { memberIds: [...(g.memberIds || members.filter((x) => x.groups.some((i) => i.id === g.id)).map((x) => x.id)), m.id], memberCount: g.memberCount + 1 }); }}>Add member</DropdownMenuItem><DropdownMenuItem onSelect={() => { const lead = members.find((m) => m.status === "active" && m.id !== g.leadId); if (lead) updateGroup(g.id, { leadId: lead.id, leadName: lead.name }); }}>Change lead</DropdownMenuItem><DropdownMenuItem onSelect={() => updateGroup(g.id, { clients: [...(g.clients || []), { id: "c-1", name: "Moksha Sewa" }], clientCount: Math.max(1, g.clientCount) })}>Assign client</DropdownMenuItem><DropdownMenuItem onSelect={() => updateGroup(g.id, { name: `${g.name} · Updated` })}>Edit</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => updateGroup(g.id, { archived: true })}>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <div className="grid min-h-48 place-items-center text-[12.5px] text-[#5F6368]">No groups found. Create one from the Team header.</div>}
      </section>
    </div>
  );
}
