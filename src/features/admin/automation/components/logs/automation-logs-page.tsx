"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Play, CheckCircle2, XCircle, Clock, 
  Download, Sparkles, Zap, Radio, TrendingUp, TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageTitle } from "../../../shared/admin-page-title";
import { SubTabs } from "../../../website/components/ui/kit";
import { automationRepository } from "../../data/mock-provider";
import { 
  AutomationRun, AutomationWorkflow, AutomationConsoleLog, AutomationHealthMetrics 
} from "../../data/types";

import { ExecutionTracesTable } from "./execution-traces-table";
import { LiveConsoleStream } from "./live-console-stream";
import { DlqFailuresView } from "./dlq-failures-view";
import { RunDetailsSheet } from "./run-details-sheet";
import { TestWebhookModal } from "./test-webhook-modal";

type LogsTab = "traces" | "console" | "dlq";

export function AutomationLogsPage() {
  const [activeTab, setActiveTab] = useState<LogsTab>("traces");
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<AutomationConsoleLog[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<AutomationHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Inspection Drawer & Test Modal State
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Live streaming simulation state
  const [isStreaming, setIsStreaming] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const clientId = "client_1";
      const [fetchedWorkflows, fetchedRuns, fetchedLogs, fetchedHealth] = await Promise.all([
        automationRepository.getWorkflows(clientId),
        automationRepository.getRuns(clientId),
        automationRepository.getConsoleLogs(),
        automationRepository.getHealthMetrics(),
      ]);

      setWorkflows(fetchedWorkflows);
      setRuns(fetchedRuns);
      setConsoleLogs(fetchedLogs);
      setHealthMetrics(fetchedHealth);
    } catch (error) {
      toast.error("Failed to load automation logs data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic live streaming simulation
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      // Simulate real-time console heartbeat or trace update
      const sampleMessages = [
        { level: "info" as const, source: "meta-webhook", msg: "Inbound webhook heartbeat: active connection OK." },
        { level: "debug" as const, source: "queue-worker", msg: "Worker thread pool: 8 active jobs, memory consumption nominal." },
        { level: "info" as const, source: "aisensy-api", msg: "Pinged WhatsApp Cloud gateway: latency 112ms." },
        { level: "debug" as const, source: "google-business", msg: "Token validation check passed for account loc_8819284." },
      ];
      const randomSample = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      if (randomSample) {
        setConsoleLogs(prev => [
          {
            id: `log_live_${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: randomSample.level,
            source: randomSample.source,
            message: randomSample.msg
          },
          ...prev.slice(0, 100) // cap buffer
        ]);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Open Drawer handler
  const handleSelectRun = (run: AutomationRun) => {
    setSelectedRun(run);
    setIsSheetOpen(true);
  };

  // Open Drawer by ID handler (e.g. from console link)
  const handleSelectRunById = (runId: string) => {
    const found = runs.find(r => r.id === runId);
    if (found) {
      setSelectedRun(found);
      setIsSheetOpen(true);
    } else {
      toast.info(`Run ${runId} trace details are archived or not loaded in memory.`);
    }
  };

  // Single Retry
  const handleRetryRun = async (runId: string) => {
    const updated = await automationRepository.retryRun(runId);
    setRuns(prev => prev.map(r => r.id === runId ? updated : r));
    if (selectedRun?.id === runId) {
      setSelectedRun(updated);
    }
    // reload logs
    const newLogs = await automationRepository.getConsoleLogs();
    setConsoleLogs(newLogs);
  };

  // Bulk Retry
  const handleBulkRetry = async (runIds: string[]) => {
    const updated = await automationRepository.bulkRetryRuns(runIds);
    setRuns(prev => prev.map(r => {
      const match = updated.find(u => u.id === r.id);
      return match || r;
    }));
    const newLogs = await automationRepository.getConsoleLogs();
    setConsoleLogs(newLogs);
  };

  // Send Test Webhook
  const handleTriggerTestWebhook = async (payload: { workflowId: string; eventType: string; payload: Record<string, any> }) => {
    const newRun = await automationRepository.createTestWebhookRun(payload);
    setRuns(prev => [newRun, ...prev]);
    const newLogs = await automationRepository.getConsoleLogs();
    setConsoleLogs(newLogs);
  };

  // Export all runs
  const handleExportAll = (format: "json" | "csv") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(runs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `automation_logs_all_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("All automation runs exported as JSON");
    } else {
      // CSV format
      const headers = ["Run ID", "Workflow", "Status", "Channel", "Trigger Source", "Target Entity", "Started At", "Duration (ms)"];
      const rows = runs.map(r => [
        r.id,
        r.workflowName || "",
        r.status,
        r.channel || "",
        r.triggerSource || "",
        r.triggerEntity.label,
        r.startedAt,
        r.durationMs
      ]);
      const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `automation_logs_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("All automation runs exported as CSV");
    }
  };

  const failedRuns = useMemo(() => {
    return runs.filter(r => r.status === "Failed" || r.status === "Partial Failure");
  }, [runs]);

  const tabsConfig = [
    { value: "traces" as const, label: "Execution Traces", count: runs.length },
    { value: "console" as const, label: "Live Console Stream", count: consoleLogs.length },
    { value: "dlq" as const, label: "Dead Letter Queue (DLQ)", count: failedRuns.length },
  ];

  if (loading && !healthMetrics) {
    return (
      <div className="flex h-72 items-center justify-center text-[13px] text-[#64748B] animate-pulse">
        Loading Automation Logs & Diagnostics...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <AdminPageTitle
          eyebrow="Operations"
          title="Automation Logs & Diagnostics"
          description="Real-time execution traces, webhook payload inspection, and error diagnostics."
        />

        {/* Header Action Tools */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          
          {/* Live Polling Toggle Button */}
          <button
            onClick={() => {
              setIsStreaming(!isStreaming);
              toast.info(isStreaming ? "Live polling paused" : "Live polling resumed");
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11.5px] font-bold shadow-2xs transition-colors ${
              isStreaming
                ? "bg-white border-[#E2E8F0] text-[#111C3A] hover:bg-slate-50"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <span className="relative flex size-2">
              {isStreaming && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full size-2 ${isStreaming ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
            {isStreaming ? "Live Polling (5s)" : "Polling Paused"}
          </button>

          {/* Trigger Test Webhook Button */}
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[11.5px] font-bold text-[#334155] rounded-lg shadow-2xs transition-colors"
          >
            <Sparkles className="size-3.5 text-[#2563EB]" />
            Trigger Test Webhook
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExportAll("csv")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11.5px] font-bold rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
            >
              <Download className="size-3.5" />
              Export Logs (CSV)
            </button>
            <button
              onClick={() => handleExportAll("json")}
              className="px-2 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#334155] text-[11px] font-bold rounded-lg transition-colors"
              title="Export as JSON"
            >
              JSON
            </button>
          </div>

        </div>
      </div>

      {/* KPI Metrics Row */}
      {healthMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          
          {/* 1. Total Executions */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Play className="size-3.5" fill="currentColor" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">Total Runs</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {healthMetrics.totalExecutions.value.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5">
                <TrendingUp className="size-3" /> {healthMetrics.totalExecutions.trend}%
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">vs last 30 days</p>
          </div>

          {/* 2. Success Rate */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">Success Rate</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {healthMetrics.successRate.value}%
              </span>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5">
                <TrendingUp className="size-3" /> {healthMetrics.successRate.trend}%
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">Reliable</p>
          </div>

          {/* 3. Failed & DLQ */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
                <XCircle className="size-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">Failed Runs</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {failedRuns.length}
              </span>
              <span className="text-[11px] font-bold text-[#EF4444] flex items-center gap-0.5">
                <TrendingDown className="size-3" /> {Math.abs(healthMetrics.failedRuns.trend)}%
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">requires review</p>
          </div>

          {/* 4. Active Queue */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                <Clock className="size-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">Queue In-Flight</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {healthMetrics.activeQueue.count}
              </span>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5">
                ~{healthMetrics.activeQueue.avgWaitTime}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">avg processing wait</p>
          </div>

          {/* 5. API Rate Limits */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center shrink-0">
                <Zap className="size-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">API Quota</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {healthMetrics.rateLimits.meta.percentage}%
              </span>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5">
                Healthy
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">remaining quota</p>
          </div>

          {/* 6. Webhook Ingestion */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-7 rounded-lg bg-[#EBF5FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Radio className="size-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-[#64748B] truncate">Ingestion Stream</h4>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-[#111C3A] tracking-tight">
                {healthMetrics.webhookIngestion.eventsPerMin}
              </span>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5">
                ev/m
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">{healthMetrics.webhookIngestion.uptime}% uptime</p>
          </div>

        </div>
      )}

      {/* SubTabs Navigation */}
      <SubTabs<LogsTab>
        ariaLabel="Automation Logs Sections"
        options={tabsConfig}
        value={activeTab}
        onChange={(val: LogsTab) => setActiveTab(val)}
      />

      {/* Active Tab View */}
      <div className="mt-3">
        {activeTab === "traces" && (
          <ExecutionTracesTable
            runs={runs}
            workflows={workflows}
            onSelectRun={handleSelectRun}
            onRetryRun={handleRetryRun}
            onBulkRetry={handleBulkRetry}
          />
        )}

        {activeTab === "console" && (
          <LiveConsoleStream
            logs={consoleLogs}
            isStreaming={isStreaming}
            onToggleStreaming={() => setIsStreaming(!isStreaming)}
            onClearLogs={() => {
              setConsoleLogs([]);
              toast.info("Console buffer cleared.");
            }}
            onSelectRun={handleSelectRunById}
          />
        )}

        {activeTab === "dlq" && (
          <DlqFailuresView
            failedRuns={failedRuns}
            onSelectRun={handleSelectRun}
            onRetryRun={handleRetryRun}
            onBulkRetry={handleBulkRetry}
          />
        )}
      </div>

      {/* Slide-over Inspection Sheet */}
      <RunDetailsSheet
        run={selectedRun}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onRetry={handleRetryRun}
      />

      {/* Test Webhook Modal */}
      <TestWebhookModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        workflows={workflows}
        onTrigger={handleTriggerTestWebhook}
      />

    </div>
  );
}
