"use client";

import React, { useState } from "react";
import { RotateCcw, AlertTriangle, X, Loader2, Check } from "lucide-react";

interface ResetPreferencesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetPreferencesModal({ open, onClose, onConfirm }: ResetPreferencesModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleReset = async () => {
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
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-2xl p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Reset Workspace Preferences</h3>
              <p className="text-[10px] text-[#64748B]">Restore default UI, table rows, and timezone settings.</p>
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

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-[10.5px] text-[#334155] space-y-1">
          <div className="font-semibold text-[#111C3A]">What this action does:</div>
          <p className="text-[#64748B] leading-snug">
            Resets table row counts (25), density, default landing page (Dashboard), and date range filter (Last 30 days) back to factory presets.
          </p>
          <div className="pt-1 text-[#10B981] font-semibold flex items-center gap-1">
            <Check className="size-3" /> Business data, clients, campaigns, and team roles remain 100% untouched.
          </div>
        </div>

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
            onClick={handleReset}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-blue-600 text-white text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
}
