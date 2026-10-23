"use client";

import { useState } from "react";
import { Download, FileArchive, ShieldCheck } from "lucide-react";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { ExportDataModal } from "./export-data-modal";

interface DataPrivacySectionProps {
  organizationName: string;
}

const FACTS = [
  { title: "Audit history", body: "Kept permanently. Audit records cannot be edited or deleted, by anyone." },
  { title: "Your content and data", body: "Kept for as long as the organization exists. Nothing is deleted on a schedule." },
  { title: "Exports", body: "Built in your browser when you ask; never stored on a server." },
  { title: "Closing the organization", body: "Ask from Danger Zone. The platform team archives it; it is never deleted from inside the app." },
];

export function DataPrivacySection({ organizationName }: DataPrivacySectionProps) {
  const { capabilities } = useSettingsCapability();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileArchive className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Organization Full Archive Export</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">Download your organization profile, team, clients, plan and recent activity as a JSON file. Created on demand from your live data.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            disabled={!capabilities.canManagePrivacy}
            className="px-4 py-1.5 min-w-[230px] rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto whitespace-nowrap transition-all"
          >
            <Download className="size-3.5" /> Export Organization Data
          </button>
        </div>

        <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
          Exports are generated in your browser the moment you ask for them and are not stored on any server, so there is no list of old exports. Each category is read live with your own permissions.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A]">How Your Data Is Kept</h3>
            <p className="text-[10.5px] text-[#64748B] font-normal">What the platform does with your organization&apos;s data today.</p>
          </div>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <div key={fact.title} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] p-2.5">
              <p className="text-[11.5px] font-bold text-[#1E293B]">{fact.title}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[#64748B]">{fact.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ExportDataModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} organizationName={organizationName} />
    </div>
  );
}
