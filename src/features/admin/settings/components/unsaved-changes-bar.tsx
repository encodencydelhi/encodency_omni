"use client";

import { AlertCircle, Check, Loader2, Undo2 } from "lucide-react";
import { SettingsSectionId } from "../settings-data/types";

interface UnsavedChangesBarProps {
  sectionId: SettingsSectionId;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

const SECTION_LABELS: Record<SettingsSectionId, string> = {
  organization: "Organization Profile",
  workspace: "Clients & Workspace",
  branding: "Branding Assets",
  notifications: "Notification Matrix",
  security: "Security Policy",
  preferences: "Workspace Preferences",
  "data-privacy": "Data & Privacy",
  audit: "Audit Log",
  danger: "Danger Zone",
};

export function UnsavedChangesBar({ sectionId, isSaving, onSave, onDiscard }: UnsavedChangesBarProps) {
  const sectionName = SECTION_LABELS[sectionId] || "Section";

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[600px] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-[#111C3A] text-white rounded-xl px-3 py-2 shadow-xl border border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-white truncate">
              Unsaved changes in <span className="text-amber-300 font-semibold">{sectionName}</span>
            </div>
            <div className="text-[10px] text-slate-300 font-normal truncate">
              Save changes to update organization policies and preferences.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Undo2 className="size-3" /> Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg text-[11.5px] font-semibold text-white bg-[#2563EB] hover:bg-blue-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="size-3.5" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
