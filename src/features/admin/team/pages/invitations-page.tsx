"use client";

import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, RotateCcw, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { copyInviteLink } from "../components/team-actions";
import { useTeam } from "../team-data/team-store";

const colors = { pending: "border-[#FEEFC3] bg-[#FEF7E0] text-[#B06000]", accepted: "border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]", expired: "border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]", cancelled: "border-[#E8EAED] bg-[#F1F3F4] text-[#5F6368]" };

export function InvitationsPage() {
  const { invitations, isLoading, updateInvitation, deleteInvitation } = useTeam();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => invitations.filter((i) => `${i.name} ${i.email}`.toLowerCase().includes(q.toLowerCase()) && (status === "all" || i.status === status)), [invitations, q, status]);
  if (isLoading) return <div className="space-y-2"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-72 rounded-lg" /></div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{["pending", "accepted", "expired", "cancelled"].map((s) => <div key={s} className="rounded-lg border border-[#E8EAED] bg-white p-3.5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"><p className="text-[11.5px] font-medium capitalize text-[#5F6368]">{s}</p><strong className="text-[20px] font-medium leading-6 text-[#202124]">{invitations.filter((i) => i.status === s).length}</strong></div>)}</div>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex gap-2 border-b border-[#E8EAED] p-2.5"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" /><Input className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invitations..." /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043] outline-none focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15"><option value="all">All statuses</option>{Object.keys(colors).map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-[12.5px]"><thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]"><tr>{["Email / name", "Role", "Clients", "Groups", "Invited by", "Sent", "Expires", "Status", ""].map((x) => <th key={x} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{x}</th>)}</tr></thead><tbody>{shown.map((invite) => <tr key={invite.id} className="hover:bg-[#F8F9FA]"><td className="border-b border-[#F1F3F4] px-3 py-2.5"><strong className="font-medium text-[#202124]">{invite.name || "Unnamed"}</strong><p className="text-[11px] text-[#5F6368]">{invite.email}</p></td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{invite.roleName}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{list(invite.clients.map((c) => c.name))}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{list(invite.groups.map((g) => g.name))}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{invite.invitedBy.name}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{date(invite.sentAt)}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5">{date(invite.expiresAt)}</td><td className="border-b border-[#F1F3F4] px-3 py-2.5"><span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize ${colors[invite.status]}`}>{invite.status}</span></td><td className="border-b border-[#F1F3F4] px-3 py-2.5"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => updateInvitation(invite.id, { status: "pending", sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() })}><RotateCcw />Resend</DropdownMenuItem><DropdownMenuItem onSelect={() => updateInvitation(invite.id, { roleId: "contributor", roleName: "Contributor" })}>Edit invite role</DropdownMenuItem><DropdownMenuItem onSelect={() => copyInviteLink(invite.id).then(() => toast.success("Invite link copied"))}><Copy />Copy invite link</DropdownMenuItem>{invite.status === "expired" || invite.status === "cancelled" ? <DropdownMenuItem variant="destructive" onSelect={() => deleteInvitation(invite.id)}><Trash2 />Delete</DropdownMenuItem> : <DropdownMenuItem variant="destructive" onSelect={() => updateInvitation(invite.id, { status: "cancelled" })}><XCircle />Revoke</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></table></div>
        {!shown.length && <div className="grid min-h-48 place-items-center text-center text-[12.5px] text-[#5F6368]">No invitations match your filters.</div>}
      </section>
    </div>
  );
}

function list(values: string[]) { return values.length ? `${values[0]}${values.length > 1 ? ` +${values.length - 1}` : ""}` : "-"; }
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
