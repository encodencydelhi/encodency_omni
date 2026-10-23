"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Loader2, PauseCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { teamApi } from "@/features/admin/team/live/team-api";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { dangerZoneApi } from "../live/workspace-api";

interface DangerZoneSectionProps {
  currentOwner: string;
  orgName: string;
}

type Action = "transfer" | "deactivate" | "delete" | null;

const errorText = (e: unknown, fallback: string) => (ApiError.isApiError(e) ? e.message : fallback);
const INPUT = "w-full rounded-lg border border-[#CBD5E1] px-2.5 py-2 text-[12px] outline-none focus:border-[#2563EB]";

function Row({ icon: Icon, title, body, button, tone, onClick, disabled, note }: { icon: typeof AlertTriangle; title: string; body: string; button: string; tone: "amber" | "red"; onClick: () => void; disabled: boolean; note?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#FDE2E2] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Icon className={tone === "red" ? "mt-0.5 size-4 shrink-0 text-[#DC2626]" : "mt-0.5 size-4 shrink-0 text-[#D97706]"} />
        <div>
          <p className="text-[12px] font-bold text-[#0F172A]">{title}</p>
          <p className="text-[10.5px] leading-snug text-[#64748B]">{body}</p>
          {note ? <p className="mt-0.5 text-[10px] text-[#94A3B8]">{note}</p> : null}
        </div>
      </div>
      <button type="button" onClick={onClick} disabled={disabled} className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${tone === "red" ? "border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]" : "border-[#FCD34D] text-[#92400E] hover:bg-[#FFFBEB]"}`}>
        {button}
      </button>
    </div>
  );
}

export function DangerZoneSection({ currentOwner, orgName }: DangerZoneSectionProps) {
  const { capabilities } = useSettingsCapability();
  const { companyId, isReady } = useTenancyContext();
  const [action, setAction] = useState<Action>(null);
  const [memberId, setMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const isOwner = capabilities.canTransferOwnership;
  const members = useQuery({ queryKey: ["danger-zone-members", companyId], queryFn: () => teamApi.listMembers(companyId), enabled: isReady && Boolean(companyId) && action === "transfer", retry: false });
  const candidates = (members.data ?? []).filter((m) => m.systemRole !== "OWNER" && !m.suspendedAt);

  const close = () => {
    setAction(null);
    setMemberId("");
    setReason("");
    setConfirmName("");
  };
  const transfer = useMutation({
    mutationFn: () => dangerZoneApi.transferOwnership(companyId, memberId),
    onSuccess: () => {
      const who = candidates.find((m) => m.id === memberId);
      toast.success(`${who?.user.name || who?.user.email || "The new owner"} is now the Owner. You are an Admin now.`);
      close();
      window.setTimeout(() => window.location.reload(), 1200);
    },
    onError: (e) => toast.error(errorText(e, "Ownership could not be transferred")),
  });
  const request = useMutation({
    mutationFn: (kind: "deactivate" | "delete") => dangerZoneApi.request(companyId, kind, reason.trim() || undefined),
    onSuccess: (res, kind) => {
      toast.success(`Your ${kind === "delete" ? "deletion" : "deactivation"} request went to the platform team${res.ticket.number ? ` as ticket #${res.ticket.number}` : ""}. They will contact you before anything changes.`);
      close();
    },
    onError: (e) => toast.error(errorText(e, "The request could not be sent")),
  });
  const nameMatches = confirmName.trim().toLowerCase() === orgName.trim().toLowerCase();

  return (
    <div className="space-y-2">
      <section className="rounded-xl border border-[#FECACA] bg-[#FFF7F7] p-3 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#FDE2E2] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-white flex items-center justify-center shadow-xs shrink-0">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#7F1D1D]">High-Risk Organization Actions</h3>
            <p className="text-[10.5px] text-[#991B1B]/80">Only the Owner can use these. Current Owner: {currentOwner || "unknown"}.</p>
          </div>
        </div>
        <Row icon={ArrowRightLeft} tone="amber" title="Transfer Organization Ownership" body="Make another member the Owner. It happens in one step; you stay in the organization as an Admin." button="Transfer Ownership…" onClick={() => setAction("transfer")} disabled={!isOwner} />
        <Row icon={PauseCircle} tone="amber" title="Deactivate Organization" body="Ask the platform team to suspend this organization. Nothing changes until they confirm with you." button="Request Deactivation…" onClick={() => setAction("deactivate")} disabled={!capabilities.canDeactivateOrganization} note="Sent as a high-priority support ticket you can follow in Support." />
        <Row icon={Trash2} tone="red" title="Delete Organization" body="Ask the platform team to close this organization. It is archived by them, never deleted from inside the app." button="Request Deletion…" onClick={() => setAction("delete")} disabled={!capabilities.canDeleteOrganization} note="Export your data first from Data & Privacy if you need a copy." />
        {!isOwner ? <p className="px-1 text-[10.5px] text-[#94A3B8]">You are not the Owner, so these actions are disabled.</p> : null}
      </section>

      <Dialog open={action !== null} onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent className="max-w-lg rounded-lg border-[#E6EBF4] bg-white p-5">
          {action === "transfer" ? (
            <>
              <DialogHeader>
                <DialogTitle>Transfer ownership</DialogTitle>
                <DialogDescription>The person you choose becomes the Owner right away. You become an Admin.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {members.isLoading ? (
                  <p className="flex items-center gap-2 text-[12px] text-[#64748B]"><Loader2 className="size-4 animate-spin" /> Loading members…</p>
                ) : candidates.length ? (
                  <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={INPUT}>
                    <option value="">Choose the new Owner…</option>
                    {candidates.map((m) => <option key={m.id} value={m.id}>{m.user.name || m.user.email} · {m.systemRole.toLowerCase()} · {m.user.email}</option>)}
                  </select>
                ) : (
                  <p className="text-[12px] text-[#64748B]">There is nobody else in this organization yet. <Link href="/admin/team" className="text-[#2563EB] hover:underline">Invite someone first.</Link></p>
                )}
                <label className="block text-[11px] font-semibold text-[#334155]">Type <span className="font-mono">{orgName}</span> to confirm</label>
                <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={INPUT} />
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={close} className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-[11.5px] font-semibold">Cancel</button>
                  <button type="button" onClick={() => transfer.mutate()} disabled={!memberId || !nameMatches || transfer.isPending} className="inline-flex items-center gap-1 rounded-lg bg-[#D97706] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50">
                    {transfer.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Transfer Ownership
                  </button>
                </div>
              </div>
            </>
          ) : action === "deactivate" || action === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>{action === "delete" ? "Request deletion" : "Request deactivation"}</DialogTitle>
                <DialogDescription>
                  {action === "delete"
                    ? "The platform team gets a high-priority ticket and contacts you. Organizations are archived by them, never deleted from inside the app."
                    : "The platform team gets a high-priority ticket and contacts you before suspending anything."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Why? (helps the platform team)" className={`${INPUT} min-h-20`} />
                {action === "delete" ? (
                  <>
                    <label className="block text-[11px] font-semibold text-[#334155]">Type <span className="font-mono">{orgName}</span> to confirm</label>
                    <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={INPUT} />
                  </>
                ) : null}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={close} className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-[11.5px] font-semibold">Cancel</button>
                  <button type="button" onClick={() => request.mutate(action)} disabled={request.isPending || (action === "delete" && !nameMatches)} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50 ${action === "delete" ? "bg-[#DC2626]" : "bg-[#D97706]"}`}>
                    {request.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Send Request
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
