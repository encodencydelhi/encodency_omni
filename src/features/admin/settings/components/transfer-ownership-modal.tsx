"use client";

import { useState } from "react";
import { UserCheck, AlertTriangle, X, Loader2 } from "lucide-react";

interface TransferOwnershipModalProps {
  open: boolean;
  currentOwner: string;
  onClose: () => void;
  onConfirm: (newOwnerName: string, newOwnerEmail: string) => Promise<void>;
}

const ELIGIBLE_ADMINS = [
  { name: "Priya Sharma", email: "priya@namogange.org", role: "Organization Admin" },
  { name: "Amit Singh", email: "amit@namogange.org", role: "Organization Admin" },
  { name: "Neha Verma", email: "neha@namogange.org", role: "SEO Manager / Invited Admin" },
];

export function TransferOwnershipModal({
  open,
  currentOwner,
  onClose,
  onConfirm,
}: TransferOwnershipModalProps) {
  const [selectedAdmin, setSelectedAdmin] = useState(ELIGIBLE_ADMINS[0]?.email ?? "");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const targetAdmin = ELIGIBLE_ADMINS.find((a) => a.email === selectedAdmin) || ELIGIBLE_ADMINS[0];

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
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-2xl p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <UserCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Transfer Organization Ownership</h3>
              <p className="text-[10px] text-[#64748B]">Assign another administrator as the primary Organization Owner.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-[10.5px] text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1 text-amber-800">
            <AlertTriangle className="size-3.5" /> Transfer Impact Summary (Current Owner: {currentOwner})
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800/90 pl-1">
            <li>You will be downgraded to <strong>Organization Admin</strong>.</li>
            <li>The new owner gains exclusive rights to delete or transfer the organization.</li>
            <li>Billing liability and payment notifications shift to the new owner.</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10.5px] font-bold text-[#334155]">
            Select Successor Administrator
          </label>
          <div className="space-y-1">
            {ELIGIBLE_ADMINS.map((admin) => (
              <label
                key={admin.email}
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer text-[11px] ${
                  selectedAdmin === admin.email
                    ? "border-blue-500 bg-blue-50/40 font-semibold text-[#111C3A]"
                    : "border-[#E2E8F0] hover:bg-slate-50 text-[#334155]"
                }`}
              >
                <div>
                  <div className="font-medium text-[11px]">{admin.name}</div>
                  <div className="text-[9.5px] text-[#64748B]">{admin.email}</div>
                </div>
                <input
                  type="radio"
                  name="successor"
                  checked={selectedAdmin === admin.email}
                  onChange={() => setSelectedAdmin(admin.email)}
                  className="size-3.5 text-blue-600"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-[#E2E8F0] text-[10.5px] text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 size-3.5 mt-0.5"
          />
          <span>I understand that I am relinquishing ultimate ownership authority over Namo Gange Trust.</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-[#CBD5E1] text-[10.5px] font-semibold text-[#475569] hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!agreed || loading || !targetAdmin}
            className="px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-blue-600 text-white text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <UserCheck className="size-3.5" />}
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
