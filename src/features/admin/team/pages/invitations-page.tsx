"use client";

import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, RotateCcw, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { copyInviteLink } from "../components/team-actions";
import { reasonOf, useTeamAuthority } from "../components/team-live-dialogs";
import { TEAM_LIVE } from "../team-data/live-team";
import { useTeam } from "../team-data/team-store";
import type { Invitation } from "../team-data/types";

const colors = { pending: "border-[#FEEFC3] bg-[#FEF7E0] text-[#B06000]", accepted: "border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]", expired: "border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]", cancelled: "border-[#E8EAED] bg-[#F1F3F4] text-[#5F6368]" };
const STATUS_LABEL: Record<string, string> = { pending: "Pending", accepted: "Accepted", expired: "Expired", cancelled: "Revoked" };

export function InvitationsPage() {
  const { invitations, isLoading, error, refresh, updateInvitation, deleteInvitation } = useTeam();
  const { canManage } = useTeamAuthority();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [revoke, setRevoke] = useState<Invitation | null>(null);
  const shown = useMemo(() => invitations.filter((i) => `${i.name} ${i.email} ${i.roleName}`.toLowerCase().includes(q.trim().toLowerCase()) && (status === "all" || i.status === status)), [invitations, q, status]);
  if (isLoading) return <div className="space-y-2"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-72 rounded-lg" /></div>;
  if (error) return <div className="grid min-h-48 place-items-center text-center text-xs text-slate-500"><div><p>Invitations could not be loaded.</p><Button size="sm" className="mt-2" onClick={refresh}>Retry</Button></div></div>;

  const run = async (id: string, work: () => Promise<void>, ok: string) => {
    setBusy(id);
    try {
      await work();
      toast.success(ok);
    } catch (err) {
      toast.error(reasonOf(err));
    } finally {
      setBusy(null);
    }
  };
  const resend = (invite: Invitation) => run(invite.id, () => updateInvitation(invite.id, { status: "pending", sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }), `Invitation sent again to ${invite.email}`);
  const copy = (invite: Invitation) => (invite.token ? copyInviteLink(invite.token).then(() => toast.success("Invite link copied")) : toast.error("The one-time link is only available right after the invitation is created. Use Resend to email it again."));
  const none = (i: Invitation) => TEAM_LIVE && (i.status === "accepted" || i.status === "cancelled");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{(["pending", "accepted", "expired", "cancelled"] as const).map((s) => <button key={s} type="button" onClick={() => setStatus(status === s ? "all" : s)} className={`rounded-lg border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(60,64,67,0.08)] ${status === s ? "border-[#1A73E8]" : "border-[#E8EAED]"}`}><p className="text-[11.5px] font-medium text-[#5F6368]">{STATUS_LABEL[s]}</p><strong className="text-[20px] font-medium leading-6 text-[#202124]">{invitations.filter((i) => i.status === s).length}</strong></button>)}</div>
      <section className="overflow-hidden rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-wrap gap-2 border-b border-[#E8EAED] p-2.5">
          <div className="relative min-w-[240px] flex-1"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" /><Input className="h-9 rounded-lg border-[#DADCE0] pl-8 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or role..." aria-label="Search invitations" /></div>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] text-[#3C4043] outline-none focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15"><option value="all">All statuses</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <Button size="sm" variant="ghost" disabled={!q && status === "all"} onClick={() => { setQ(""); setStatus("all"); }}>Clear</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12.5px]">
            <thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-[0.04em] text-[#5F6368]"><tr>{(TEAM_LIVE ? ["Email", "Role", "Invited by", "Sent", "Expires", "Status", ""] : ["Email / name", "Role", "Clients", "Groups", "Invited by", "Sent", "Expires", "Status", ""]).map((x) => <th key={x} className="border-b border-[#E8EAED] px-3 py-2 font-medium">{x}</th>)}</tr></thead>
            <tbody>
              {shown.map((invite) => (
                <tr key={invite.id} className="hover:bg-[#F8F9FA]">
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{TEAM_LIVE ? <strong className="font-medium text-[#202124]">{invite.email}</strong> : <><strong className="font-medium text-[#202124]">{invite.name || "Unnamed"}</strong><p className="text-[11px] text-[#5F6368]">{invite.email}</p></>}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{invite.roleName}</td>
                  {!TEAM_LIVE && <td className="border-b border-[#F1F3F4] px-3 py-2.5">{list(invite.clients.map((c) => c.name))}</td>}
                  {!TEAM_LIVE && <td className="border-b border-[#F1F3F4] px-3 py-2.5">{list(invite.groups.map((g) => g.name))}</td>}
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{invite.invitedBy.name}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{date(invite.sentAt)}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">{date(invite.expiresAt)}</td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5"><span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${colors[invite.status]}`}>{STATUS_LABEL[invite.status]}</span></td>
                  <td className="border-b border-[#F1F3F4] px-3 py-2.5">
                    {none(invite) || (TEAM_LIVE && !canManage) ? <span className="text-[11px] text-slate-400">—</span> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${invite.email}`} disabled={busy === invite.id}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => resend(invite)}><RotateCcw />Resend</DropdownMenuItem>
                          {!TEAM_LIVE && <DropdownMenuItem onSelect={() => updateInvitation(invite.id, { roleId: "contributor", roleName: "Contributor" })}>Edit invite role</DropdownMenuItem>}
                          {invite.status === "pending" && <DropdownMenuItem onSelect={() => copy(invite)}><Copy />Copy invite link</DropdownMenuItem>}
                          {TEAM_LIVE ? (invite.status === "pending" && <DropdownMenuItem variant="destructive" onSelect={() => setRevoke(invite)}><XCircle />Revoke</DropdownMenuItem>)
                            : invite.status === "expired" || invite.status === "cancelled" ? <DropdownMenuItem variant="destructive" onSelect={() => deleteInvitation(invite.id)}><Trash2 />Delete</DropdownMenuItem> : <DropdownMenuItem variant="destructive" onSelect={() => updateInvitation(invite.id, { status: "cancelled" })}><XCircle />Revoke</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <div className="grid min-h-48 place-items-center text-center text-[12.5px] text-[#5F6368]">{invitations.length === 0 ? "No invitations yet. Use Invite Member to add someone." : "No invitations match your filters."}</div>}
      </section>

      <Dialog open={revoke !== null} onOpenChange={(value) => !value && setRevoke(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke invitation</DialogTitle><DialogDescription>The link sent to {revoke?.email} stops working immediately. You can invite them again later.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevoke(null)}>Keep invitation</Button>
            <Button variant="destructive" onClick={() => { const target = revoke; setRevoke(null); if (target) void run(target.id, () => deleteInvitation(target.id), "Invitation revoked"); }}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function list(values: string[]) { return values.length ? `${values[0]}${values.length > 1 ? ` +${values.length - 1}` : ""}` : "-"; }
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
