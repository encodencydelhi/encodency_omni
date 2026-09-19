"use client";

import { useState } from "react";
import { PowerOff, AlertTriangle, X, Loader2 } from "lucide-react";

interface DeactivateModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeactivateModal({ open, onClose, onConfirm }: DeactivateModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleDeactivate = async () => {
    if (!agreed) return;
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#CBD5E1] shadow-2xl p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
              <PowerOff className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Deactivate Organization</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">Temporarily suspend all organization operations and publishing.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#111C3A] hover:text-red-500 transition-colors p-1 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-orange-50/70 border border-orange-200 rounded-lg p-2.5 text-[10.5px] text-orange-950 space-y-1">
          <div className="font-bold flex items-center gap-1 text-orange-900">
            <AlertTriangle className="size-3.5" /> Consequence Checklist
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-orange-950 pl-1 font-medium">
            <li>All team members and clients will temporarily lose login access.</li>
            <li>All automated webhook executions and active workflows will pause immediately.</li>
            <li>All queued social media posts across Meta, LinkedIn, and YouTube will be halted.</li>
          </ul>
        </div>

        <label className="flex items-start gap-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] text-[10.5px] text-[#111C3A] font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded border-gray-300 text-orange-600 size-3.5 mt-0.5"
          />
          <span>I understand the operational disruption and wish to proceed with organization suspension.</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#CBD5E1]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-[#CBD5E1] text-[10.5px] font-bold text-[#111C3A] hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={!agreed || loading}
            className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <PowerOff className="size-3" />}
            Suspend Organization
          </button>
        </div>
      </div>
    </div>
  );
}
