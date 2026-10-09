"use client";

import { useEffect, useState } from "react";
import { UserCheck, AlertTriangle, X, Loader2 } from "lucide-react";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { teamApi } from "@/features/admin/team/live/team-api";

interface TransferOwnershipModalProps {
  open: boolean;
  currentOwner: string;
  onClose: () => void;
  onConfirm: (newOwnerName: string, newOwnerEmail: string) => Promise<void>;
}

interface EligibleAdmin {
  name: string;
  email: string;
  role: string;
}

export function TransferOwnershipModal({
  open,
  currentOwner,
  onClose,
  onConfirm,
}: TransferOwnershipModalProps) {
  const [eligibleAdmins, setEligibleAdmins] = useState<EligibleAdmin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!open) return;

    const companyId = getStoredCompanyId();
    if (!companyId) {
      setEligibleAdmins([]);
      setSelectedAdmin("");
      return;
    }

    let active = true;
    setLoadingMembers(true);

    teamApi
      .listMembers(companyId)
      .then((members) => {
        if (!active) return;

        const nextAdmins = members
          .filter((member) => {
            const sameOwner = member.user.name?.trim().toLowerCase() === currentOwner.trim().toLowerCase();
            const sameEmail = member.user.email.trim().toLowerCase() === currentOwner.trim().toLowerCase();
            return !sameOwner && !sameEmail && (member.systemRole === "ADMIN" || member.systemRole === "OWNER");
          })
          .map((member) => ({
            name: member.user.name || member.user.email,
            email: member.user.email,
            role: member.systemRole === "OWNER" ? "Organization Owner" : "Organization Admin",
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setEligibleAdmins(nextAdmins);
        setSelectedAdmin(nextAdmins[0]?.email ?? "");
      })
      .catch(() => {
        if (!active) return;
        setEligibleAdmins([]);
        setSelectedAdmin("");
      })
      .finally(() => {
        if (active) {
          setLoadingMembers(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentOwner, open]);

  if (!open) return null;

  const targetAdmin = eligibleAdmins.find((a) => a.email === selectedAdmin) || eligibleAdmins[0];

  const handleTransfer = async () => {
    if (!agreed || !targetAdmin) return;
    try {
      setLoading(true);
      await onConfirm(targetAdmin.name, targetAdmin.email);
      onClose();
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#CBD5E1] shadow-2xl p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <UserCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Transfer Organization Ownership</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal">Assign another administrator as the primary Organization Owner.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-red-500 transition-colors p-1 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-[10.5px] text-amber-950 space-y-1 shadow-2xs">
          <div className="font-semibold flex items-center gap-1 text-amber-900">
            <AlertTriangle className="size-3.5" /> Transfer Impact Summary (Current Owner: {currentOwner})
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-950 pl-1 font-normal">
            <li>You will be downgraded to <strong>Organization Admin</strong>.</li>
            <li>The new owner gains exclusive rights to delete or transfer the organization.</li>
            <li>Billing liability and payment notifications shift to the new owner.</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-[#334155]">
            Select Successor Administrator
          </label>
          <div className="space-y-1">
            {loadingMembers ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-slate-50 p-2 text-[10.5px] text-[#475569]">
                <Loader2 className="size-3.5 animate-spin" />
                Loading eligible administrators...
              </div>
            ) : eligibleAdmins.length > 0 ? (
              eligibleAdmins.map((admin) => (
                <label
                  key={admin.email}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer text-[11px] shadow-2xs ${
                    selectedAdmin === admin.email
                      ? "border-blue-500 bg-blue-50/40 text-[#0F172A]"
                      : "border-[#CBD5E1] hover:bg-slate-50 text-[#334155]"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[11.5px] text-[#0F172A]">{admin.name}</div>
                    <div className="text-[9.5px] text-[#64748B] font-normal">{admin.email}</div>
                  </div>
                  <div className="text-[9px] text-[#475569] font-medium">{admin.role}</div>
                  <input
                    type="radio"
                    name="successor"
                    checked={selectedAdmin === admin.email}
                    onChange={() => setSelectedAdmin(admin.email)}
                    className="size-3.5 text-blue-600"
                  />
                </label>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 p-2 text-[10.5px] text-[#475569]">
                No eligible administrators found in this company.
              </div>
            )}
          </div>
        </div>

        <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-[#CBD5E1] text-[10.5px] text-[#334155] font-normal cursor-pointer shadow-2xs">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 size-3.5 mt-0.5"
          />
          <span>I understand that I am relinquishing ultimate ownership authority over this organization.</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[10.5px] font-semibold text-[#334155] hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!agreed || loading || !targetAdmin}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[10.5px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <UserCheck className="size-3.5" />}
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
