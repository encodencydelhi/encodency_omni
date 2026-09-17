"use client";

import { useUrlState } from "./components/use-url-state";
import { AdminPageTitle } from "../shared/admin-page-title";
import { SubTabs, WButton } from "../website/components/ui/kit";
import { Plus } from "lucide-react";

import { AutomationOverview } from "./components/pages/automation-overview";
import { WorkflowsPage } from "./components/pages/workflows-page";
import { TemplatesPage } from "./components/pages/templates-page";
import { RunsPage } from "./components/pages/runs-page";
import { SettingsPage } from "./components/pages/settings-page";

type AutomationTab = "overview" | "workflows" | "templates" | "runs" | "settings";
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "workflows", label: "Workflows" },
  { value: "templates", label: "Templates" },
  { value: "runs", label: "Run History" },
  { value: "settings", label: "Settings" }
];

export function AutomationPage() {
  const [activeTab, setActiveTab] = useUrlState<AutomationTab>("tab", "overview", ["overview", "workflows", "templates", "runs", "settings"]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <AdminPageTitle
          eyebrow="Operations"
          title="Automation"
          description="Automate lead follow-up, notifications and marketing operations."
        />
        <div className="flex items-center gap-3">
          {activeTab === 'settings' ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#64748B]">Client</span>
                <div className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-1.5 text-[12px] font-medium text-[#111C3A] cursor-pointer hover:bg-slate-50">
                  All Clients <svg className="size-3.5 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#D97706] bg-[#FEF9C3] px-2 py-1 rounded">
                <span className="size-1.5 rounded-full bg-[#D97706]"></span> You have unsaved changes
              </div>
              <button className="border border-[#E2E8F0] bg-white text-[#334155] rounded-lg px-4 py-1.5 text-[12px] font-bold hover:bg-slate-50">
                Reset
              </button>
              <button className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg px-4 py-1.5 text-[12px] font-bold flex items-center gap-1.5 shadow-sm shadow-red-500/20">
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Changes
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 shadow-sm text-[12px] text-[#111C3A] cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#6B7A94] font-medium leading-tight">Last 30 days</span>
                  <span className="font-semibold leading-tight">Mar 15, 2025 - Apr 14, 2025</span>
                </div>
              </div>
              <WButton tone="primary" icon={Plus} className="bg-[#E11D48] hover:bg-[#BE123C] border-none shadow-md shadow-rose-500/20 rounded-lg px-4 py-2 text-[13px]">
                Create Workflow
              </WButton>
            </>
          )}
        </div>
      </div>
      
      <SubTabs
        ariaLabel="Automation Sections"
        options={TABS}
        value={activeTab}
        onChange={(val) => setActiveTab(val as AutomationTab)}
      />

      <div className="mt-4">
        {activeTab === "overview" && <AutomationOverview />}
        {activeTab === "workflows" && <WorkflowsPage />}
        {activeTab === "templates" && <TemplatesPage />}
        {activeTab === "runs" && <RunsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </div>
    </div>
  );
}
