"use client";

import { AlertCircle, Check, Loader2, Undo2, X } from "lucide-react";
import { SettingsSectionId } from "../settings-data/types";

interface NavigationGuardDialogProps {
  open: boolean;
  targetSection: SettingsSectionId | null;
  isSaving: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
}

export function NavigationGuardDialog({
  open,
  targetSection,
  isSaving,
  onStay,
  onDiscard,
  onSaveAndLeave,
}: NavigationGuardDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl p-3 space-y-2 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Unsaved Changes Detected</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">You have modified settings that have not yet been saved.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStay}
            className="text-[#64748B] hover:text-[#0F172A] transition-colors p-1 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="text-[11.5px] text-[#475569] font-normal leading-relaxed bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5">
          If you switch sections {targetSection ? `to ${targetSection}` : ""} without saving, your current modifications will be reverted. Would you like to save before navigating or discard them?
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onStay}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-[11.5px] font-semibold text-[#334155] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100/70 text-[11.5px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Undo2 className="size-3" /> Discard Changes
          </button>
          <button
            type="button"
            onClick={onSaveAndLeave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11.5px] font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="size-3.5" /> Save & Leave
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
