"use client";

import { useState } from "react";
import { AlertTriangle, UserCheck, RotateCcw, PowerOff, Trash2, Lock } from "lucide-react";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { TransferOwnershipModal } from "./transfer-ownership-modal";
import { ResetPreferencesModal } from "./reset-preferences-modal";
import { DeactivateModal } from "./deactivate-modal";
import { DeleteOrgModal } from "./delete-org-modal";

interface DangerZoneSectionProps {
  currentOwner: string;
  orgName: string;
  onResetPreferences: () => Promise<void>;
  onTransferOwnership: (newOwnerName: string, newOwnerEmail: string) => Promise<void>;
  onDeactivate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function DangerZoneSection({
  currentOwner,
  orgName,
  onResetPreferences,
  onTransferOwnership,
  onDeactivate,
  onDelete,
}: DangerZoneSectionProps) {
  const { capabilities } = useSettingsCapability();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-red-200 shadow-xs p-3 space-y-2 hover:border-red-300 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-red-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
              <AlertTriangle className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">High-Risk Organization Actions</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
                Actions here can affect entire team access, ownership hierarchy, or permanently erase workspace data.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-3.5 py-1 rounded-lg border border-red-200 whitespace-nowrap min-w-[175px] text-center shadow-2xs flex items-center justify-center gap-1.5 self-start sm:self-auto">
            <span className="size-1.5 rounded-full bg-red-600 animate-pulse"></span>
            Owner Access Restricted
          </span>
        </div>

        {/* 4 Action Cards */}
        <div className="space-y-1.5">
          {/* Action 1: Transfer Ownership */}
          <div className="p-2.5 rounded-xl border border-[#DDE4ED] bg-[#F8FAFD] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 pr-2">
              <div className="text-[11.5px] font-bold text-[#1E293B] flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-blue-600" />
                Transfer Organization Ownership
              </div>
              <p className="text-[9.5px] text-[#64748B] font-normal leading-snug">
                Current Owner: <span className="font-semibold text-[#0F172A]">{currentOwner}</span>. Transfer billing authority and root control to another verified admin.
              </p>
            </div>

            {capabilities.canTransferOwnership ? (
              <button
                type="button"
                onClick={() => setTransferModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1E293B] text-[10.5px] font-semibold shadow-2xs shrink-0 cursor-pointer transition-colors"
              >
                Transfer Ownership...
              </button>
            ) : (
              <div className="text-[10px] text-[#64748B] font-medium flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-1 rounded-md border border-[#CBD5E1]">
                <Lock className="size-3" /> Owner privilege required
              </div>
            )}
          </div>

          {/* Action 2: Reset Preferences */}
          <div className="p-2.5 rounded-xl border border-[#DDE4ED] bg-[#F8FAFD] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 pr-2">
              <div className="text-[11.5px] font-bold text-[#1E293B] flex items-center gap-1.5">
                <RotateCcw className="size-3.5 text-[#2563EB]" />
                Reset Workspace Preferences
              </div>
              <p className="text-[9.5px] text-[#64748B] font-normal leading-snug">
                Revert UI layout, pagination rows, and default date ranges to default factory values without affecting clients or campaigns.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="px-3 py-1.5 rounded-md bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1E293B] text-[10.5px] font-semibold shadow-2xs shrink-0 cursor-pointer transition-colors"
            >
              Reset to Defaults...
            </button>
          </div>

          {/* Action 3: Deactivate Organization */}
          <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/40 shadow-2xs hover:bg-orange-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 pr-2">
              <div className="text-[11.5px] font-bold text-orange-950 flex items-center gap-1.5">
                <PowerOff className="size-3.5 text-orange-600" />
                Deactivate Organization
              </div>
              <p className="text-[9.5px] text-orange-900 leading-snug font-normal">
                Temporarily suspends workspace operations, blocks team login, and pauses all scheduled workflows and marketing posts.
              </p>
            </div>

            {capabilities.canDeactivateOrganization ? (
              <button
                type="button"
                onClick={() => setDeactivateModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-white border border-orange-300 hover:bg-orange-50 text-orange-800 text-[10.5px] font-semibold shadow-2xs shrink-0 cursor-pointer transition-colors"
              >
                Deactivate Workspace...
              </button>
            ) : (
              <div className="text-[10px] text-[#64748B] font-medium flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-1 rounded-md border border-[#CBD5E1]">
                <Lock className="size-3" /> Owner only
              </div>
            )}
          </div>

          {/* Action 4: Delete Organization */}
          <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40 shadow-2xs hover:bg-red-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 pr-2">
              <div className="text-[11.5px] font-bold text-red-950 flex items-center gap-1.5">
                <Trash2 className="size-3.5 text-red-600" />
                Permanently Delete Organization
              </div>
              <p className="text-[9.5px] text-red-900 leading-snug font-normal">
                Irreversible. Immediately purges all client campaigns, media libraries, leads, and member configurations.
              </p>
            </div>

            {capabilities.canDeleteOrganization ? (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-semibold shadow-2xs shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Trash2 className="size-3" /> Delete Organization...
              </button>
            ) : (
              <div className="text-[10px] text-[#64748B] font-medium flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-1 rounded-md border border-[#CBD5E1]">
                <Lock className="size-3" /> Owner only
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      <TransferOwnershipModal
        open={transferModalOpen}
        currentOwner={currentOwner}
        onClose={() => setTransferModalOpen(false)}
        onConfirm={onTransferOwnership}
      />
      <ResetPreferencesModal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={onResetPreferences}
      />
      <DeactivateModal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={onDeactivate}
      />
      <DeleteOrgModal
        open={deleteModalOpen}
        orgName={orgName}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}
