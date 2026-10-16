"use client";

import { useState } from "react";
import { Calendar, Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminPageTitle } from "../shared/admin-page-title";
import { SubTabs } from "../website/components/ui/kit";
import { useAdminContext } from "../shell/admin-context";
import { useUrlState } from "./components/use-url-state";
import type { AutomationRun, AutomationWorkflow } from "./data/types";
import { automationApi } from "./data/automation-api";
import { errorMessage, useAutomationScope, useInvalidateAutomation } from "./data/hooks";
import { WorkflowBuilder } from "./components/builder/workflow-builder";
import { TestRunDialog } from "./components/builder/test-run-dialog";
import { RunDetailsSheet } from "./components/logs/run-details-sheet";
import { PERIOD_OPTIONS, periodRangeLabel } from "./components/shared";
import { AutomationOverview } from "./components/pages/automation-overview";
import { WorkflowsPage } from "./components/pages/workflows-page";
import { TemplatesPage } from "./components/pages/templates-page";
import { RunsPage } from "./components/pages/runs-page";
import { SettingsPage } from "./components/pages/settings-page";
import { ApprovalsPage } from "./components/pages/approvals-page";

type AutomationTab = "overview" | "workflows" | "templates" | "runs" | "approvals" | "settings";
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "workflows", label: "Workflows" },
  { value: "templates", label: "Templates" },
  { value: "runs", label: "Run History" },
  { value: "approvals", label: "Approvals" },
  { value: "settings", label: "Settings" },
];

export interface AutomationPageActions {
  days: number;
  onEdit: (workflow: AutomationWorkflow) => void;
  onCreate: () => void;
  onTest: (workflow: AutomationWorkflow) => void;
  onUseTemplate: (templateId: string) => Promise<void>;
  onOpenRun: (run: AutomationRun) => void;
  onNavigate: (tab: AutomationTab) => void;
}

function blankWorkflow(clientId: string): AutomationWorkflow {
  const now = new Date().toISOString();
  return { id: `draft_${Date.now()}`, clientId, name: "", status: "Draft", version: 0, trigger: { type: "noop", label: "" }, channels: [], runs: 0, successRate: null, failures: 0, createdAt: now, updatedAt: now, nodes: [], edges: [] };
}

export function AutomationPage() {
  const { Clients, selectedProjectId, setSelectedProjectId } = useAdminContext();
  const { clientId, clientName } = useAutomationScope();
  const invalidate = useInvalidateAutomation();
  const [activeTab, setActiveTab] = useUrlState<AutomationTab>("tab", "overview", ["overview", "workflows", "templates", "runs", "approvals", "settings"]);
  const [days, setDays] = useState(30);
  const [editing, setEditing] = useState<{ workflow: AutomationWorkflow; clientId: string } | null>(null);
  const [testTarget, setTestTarget] = useState<AutomationWorkflow | null>(null);
  const [testKey, setTestKey] = useState(0);
  const [openRun, setOpenRun] = useState<AutomationRun | null>(null);

  const requireClient = (): string | null => {
    if (clientId) return clientId;
    toast.error("Select a client first", { description: "Workflows belong to one client. Pick it from the Client menu above." });
    return null;
  };

  const actions: AutomationPageActions = {
    days,
    onEdit: (workflow) => setEditing({ workflow, clientId: workflow.clientId }),
    onCreate: () => {
      const id = requireClient();
      if (id) setEditing({ workflow: blankWorkflow(id), clientId: id });
    },
    onTest: (workflow) => { setTestKey((k) => k + 1); setTestTarget(workflow); },
    onUseTemplate: async (templateId) => {
      const id = requireClient();
      if (!id) return;
      try {
        const workflow = await automationApi.useTemplate(id, templateId);
        invalidate();
        toast.success(`Created “${workflow.name}” as a draft — finish setting it up, then publish`);
        setEditing({ workflow, clientId: id });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    onOpenRun: (run) => setOpenRun(run),
    onNavigate: (tab) => setActiveTab(tab),
  };

  if (editing) {
    return <WorkflowBuilder key={editing.workflow.id} workflow={editing.workflow} clientId={editing.clientId} onBack={() => { setEditing(null); invalidate(); }} />;
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.days === days)?.label ?? `Last ${days} days`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <AdminPageTitle eyebrow="Operations" title="Automation" description="Automate lead follow-up, notifications and CRM work with real, logged workflow runs." />
        <div className="flex flex-wrap items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-[12px] shadow-2xs hover:bg-slate-50">
                <span className="text-[11px] font-medium text-[#64748B]">Client:</span>
                <span className="font-semibold text-[#0F172A]">{clientName}</span>
                <ChevronDown className="size-3.5 text-[#94A3B8]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setSelectedProjectId("all")}>
                <span className="flex-1">All Clients <span className="text-[10px] text-[#94A3B8]">(view only)</span></span>
                {selectedProjectId === "all" ? <Check className="size-3.5 text-[#2563EB]" /> : null}
              </DropdownMenuItem>
              {Clients.length ? <DropdownMenuSeparator /> : null}
              {Clients.map((client) => (
                <DropdownMenuItem key={client.id} onClick={() => setSelectedProjectId(client.id)}>
                  <span className="flex-1 truncate">{client.name}</span>
                  {selectedProjectId === client.id ? <Check className="size-3.5 text-[#2563EB]" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-10 items-center gap-2.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-[12px] shadow-2xs hover:bg-slate-50">
                <Calendar className="size-3.5 text-[#64748B]" />
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] font-medium text-[#64748B]">{periodLabel}</span>
                  <span className="text-[11px] font-semibold text-[#0F172A]">{periodRangeLabel(days)}</span>
                </span>
                <ChevronDown className="size-3.5 text-[#94A3B8]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Period</DropdownMenuLabel>
              {PERIOD_OPTIONS.map((p) => (
                <DropdownMenuItem key={p.days} onClick={() => setDays(p.days)}>
                  <span className="flex-1"><span className="block font-medium">{p.label}</span><span className="text-[10px] text-[#94A3B8]">{periodRangeLabel(p.days)}</span></span>
                  {days === p.days ? <Check className="size-3.5 text-[#2563EB]" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button type="button" onClick={actions.onCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-[12.5px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-[#1D4ED8]">
            <Plus className="size-4" /> Create Workflow
          </button>
        </div>
      </div>

      <SubTabs ariaLabel="Automation sections" options={TABS} value={activeTab} onChange={(val) => setActiveTab(val as AutomationTab)} />

      <div className="mt-1">
        {activeTab === "overview" && <AutomationOverview {...actions} />}
        {activeTab === "workflows" && <WorkflowsPage {...actions} />}
        {activeTab === "templates" && <TemplatesPage {...actions} />}
        {activeTab === "runs" && <RunsPage {...actions} />}
        {activeTab === "approvals" && <ApprovalsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </div>

      {testTarget ? (
        <TestRunDialog key={testKey} open={Boolean(testTarget)} onClose={() => setTestTarget(null)} workflow={testTarget} clientId={testTarget.clientId} onRan={(run) => { invalidate(); setOpenRun(run); }} />
      ) : null}
      <RunDetailsSheet
        run={openRun}
        open={Boolean(openRun)}
        onOpenChange={(open) => { if (!open) setOpenRun(null); }}
        onRetry={async (id) => {
          if (!openRun) return;
          try {
            const run = await automationApi.retryRun(openRun.clientId, id);
            setOpenRun(run);
            invalidate();
            toast.success(`Retry ${run.status.toLowerCase()}`);
          } catch (error) { toast.error(errorMessage(error)); }
        }}
        onCancel={async (id) => {
          try {
            if (!openRun) return;
            const run = await automationApi.cancelRun(openRun.clientId, id);
            setOpenRun(run);
            invalidate();
            toast.success("Run cancelled");
          } catch (error) { toast.error(errorMessage(error)); }
        }}
      />
    </div>
  );
}
