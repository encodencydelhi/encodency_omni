"use client";

import { useState } from "react";
import { useUrlState } from "./components/use-url-state";
import { AdminPageTitle } from "../shared/admin-page-title";
import { SubTabs, WButton } from "../website/components/ui/kit";
import { Plus, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { AutomationWorkflow } from "./data/types";
import { WorkflowBuilder } from "./components/builder/workflow-builder";

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

const CLIENT_OPTIONS = [
  "All Clients",
  "Moksha Sewa (Active)",
  "Dental Care Clinic",
  "Ayur Luxe Wellness",
];

const DATE_RANGE_OPTIONS = [
  { label: "Last 7 days", dates: "Apr 07, 2025 - Apr 14, 2025" },
  { label: "Last 30 days", dates: "Mar 15, 2025 - Apr 14, 2025" },
  { label: "Last 90 days", dates: "Jan 14, 2025 - Apr 14, 2025" },
  { label: "Year to date", dates: "Jan 01, 2025 - Apr 14, 2025" },
] as const;

type DateRangeOption = (typeof DATE_RANGE_OPTIONS)[number];

export function AutomationPage() {
  const [activeTab, setActiveTab] = useUrlState<AutomationTab>("tab", "overview", ["overview", "workflows", "templates", "runs", "settings"]);
  const [selectedClient, setSelectedClient] = useState("All Clients");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<DateRangeOption>(DATE_RANGE_OPTIONS[1]);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);

  const handleCreateNewWorkflow = () => {
    const blankWorkflow: AutomationWorkflow = {
      id: `wf_${Date.now()}`,
      clientId: "client_1",
      name: "Untitled Automation Workflow",
      status: "Draft",
      version: 1,
      trigger: { type: "webhook", label: "Select Inbound Trigger" },
      channels: ["whatsapp"],
      runs: 0,
      successRate: 100,
      failures: 0,
      lastRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        { id: "node_1", type: "trigger", label: "Inbound Webhook", description: "Triggers when data is received via a webhook URL.", status: "idle", config: {} },
        { id: "node_2", type: "action", label: "Parse Data", description: "Extract and map the incoming data fields.", status: "idle", config: {} },
        { id: "node_3", type: "condition", label: "Filter Condition", description: "Check if the data meets the required criteria.", status: "idle", config: {} },
        { id: "node_4", type: "action", actionId: "send_whatsapp", label: "WhatsApp Reply", description: "Send a template message to the user via WhatsApp.", status: "idle", config: {} },
        { id: "node_5", type: "delay", label: "Wait / Delay", description: "Wait for a specific time before next step.", status: "idle", config: {} },
        { id: "node_6", type: "action", label: "Assign User", description: "Assign the lead to a team member.", status: "idle", config: {} },
        { id: "node_7", type: "action", label: "Update Record", description: "Update lead information in the database.", status: "idle", config: {} },
        { id: "node_8", type: "action", label: "Send Email", description: "Send a confirmation email to the user.", status: "idle", config: {} },
        { id: "node_9", type: "action", label: "Create Task", description: "Create a follow-up task for the assigned user.", status: "idle", config: {} },
      ],
      edges: [
        { id: "e1", source: "node_1", target: "node_2" },
        { id: "e2", source: "node_2", target: "node_3" },
        { id: "e3", source: "node_3", target: "node_4" },
        { id: "e4", source: "node_4", target: "node_5" },
        { id: "e5", source: "node_5", target: "node_6" },
        { id: "e6", source: "node_6", target: "node_7" },
        { id: "e7", source: "node_7", target: "node_8" },
        { id: "e8", source: "node_8", target: "node_9" },
      ]
    };
    setEditingWorkflow(blankWorkflow);
    toast.success("Created new blank workflow. Welcome to Workflow Builder!");
  };

  if (editingWorkflow) {
    return (
      <WorkflowBuilder
        workflow={editingWorkflow}
        onBack={() => setEditingWorkflow(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <AdminPageTitle
          eyebrow="Operations"
          title="Automation"
          description="Automate lead follow-up, notifications and marketing operations."
        />
        
        {/* Top Operations Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Client Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
              className="flex items-center gap-2 border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 shadow-2xs text-[12px] font-medium text-[#111C3A] cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <span className="text-[10.5px] text-[#64748B]">Client:</span>
              <span className="font-bold">{selectedClient}</span>
              <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </button>

            {clientDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 py-1 text-[11.5px] animate-in fade-in zoom-in-95">
                {CLIENT_OPTIONS.map((client) => (
                  <button
                    key={client}
                    type="button"
                    onClick={() => {
                      setSelectedClient(client);
                      setClientDropdownOpen(false);
                      toast.info(`Filtered view for ${client}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <span className={selectedClient === client ? "font-bold text-[#2563EB]" : "text-[#334155]"}>
                      {client}
                    </span>
                    {selectedClient === client && <Check className="size-3.5 text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="flex items-center gap-2 border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 shadow-2xs text-[12px] text-[#111C3A] cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#6B7A94] font-medium leading-tight">{selectedPeriod.label}</span>
                <span className="font-semibold leading-tight text-[11.5px]">{selectedPeriod.dates}</span>
              </div>
              <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 py-1 text-[11.5px] animate-in fade-in zoom-in-95">
                {DATE_RANGE_OPTIONS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(p);
                      setPeriodDropdownOpen(false);
                      toast.info(`Period updated to: ${p.label}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <div>
                      <div className={selectedPeriod.label === p.label ? "font-bold text-[#2563EB]" : "font-medium text-[#111C3A]"}>
                        {p.label}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">{p.dates}</div>
                    </div>
                    {selectedPeriod.label === p.label && <Check className="size-3.5 text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Workflow Button */}
          <WButton
            tone="primary"
            icon={Plus}
            onClick={handleCreateNewWorkflow}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] border-none shadow-md shadow-blue-500/20 rounded-lg px-4 py-2 text-[13px] font-bold cursor-pointer"
          >
            Create Workflow
          </WButton>
        </div>
      </div>
      
      <SubTabs
        ariaLabel="Automation Sections"
        options={TABS}
        value={activeTab}
        onChange={(val) => setActiveTab(val as AutomationTab)}
      />

      <div className="mt-4">
        {activeTab === "overview" && <AutomationOverview onNavigateTab={(val) => setActiveTab(val)} />}
        {activeTab === "workflows" && <WorkflowsPage />}
        {activeTab === "templates" && (
          <TemplatesPage onUseTemplate={(wf) => setEditingWorkflow(wf)} />
        )}
        {activeTab === "runs" && <RunsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </div>
    </div>
  );
}
