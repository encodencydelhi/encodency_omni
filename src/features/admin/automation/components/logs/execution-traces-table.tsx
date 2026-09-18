"use client";

import { useState, useMemo } from "react";
import { 
  Search, Calendar, Download, RotateCcw, Copy, 
  Share2, MessageCircle, Landmark, Globe2, Bot, Check
} from "lucide-react";
import { toast } from "sonner";
import { AutomationRun, AutomationWorkflow } from "../../data/types";

interface ExecutionTracesTableProps {
  runs: AutomationRun[];
  workflows: AutomationWorkflow[];
  onSelectRun: (run: AutomationRun) => void;
  onRetryRun: (runId: string) => Promise<void>;
  onBulkRetry: (runIds: string[]) => Promise<void>;
}

export function ExecutionTracesTable({
  runs,
  workflows,
  onSelectRun,
  onRetryRun,
  onBulkRetry
}: ExecutionTracesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isFiltered = searchQuery !== "" || selectedWorkflow !== "all" || selectedStatus !== "all" || selectedChannel !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedWorkflow("all");
    setSelectedStatus("all");
    setSelectedChannel("all");
    toast.info("Filters cleared");
  };

  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      if (selectedWorkflow !== "all" && run.workflowId !== selectedWorkflow) return false;
      if (selectedStatus !== "all" && run.status !== selectedStatus) return false;
      if (selectedChannel !== "all" && run.channel !== selectedChannel) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = run.id.toLowerCase().includes(q);
        const matchesWf = (run.workflowName || "").toLowerCase().includes(q);
        const matchesEntity = run.triggerEntity.label.toLowerCase().includes(q) || (run.triggerEntity.subLabel || "").toLowerCase().includes(q);
        const matchesSource = (run.triggerSource || "").toLowerCase().includes(q);
        const matchesErr = (run.errorSummary?.message || "").toLowerCase().includes(q);

        if (!matchesId && !matchesWf && !matchesEntity && !matchesSource && !matchesErr) return false;
      }
      return true;
    });
  }, [runs, selectedWorkflow, selectedStatus, selectedChannel, searchQuery]);

  const toggleSelectRun = (id: string) => {
    setSelectedRunIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRunIds.length === filteredRuns.length) {
      setSelectedRunIds([]);
    } else {
      setSelectedRunIds(filteredRuns.map(r => r.id));
    }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Copied Run ID: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteBulkRetry = async () => {
    if (selectedRunIds.length === 0) return;
    setIsBulkRetrying(true);
    try {
      await onBulkRetry(selectedRunIds);
      toast.success(`Successfully retried ${selectedRunIds.length} runs`);
      setSelectedRunIds([]);
    } catch {
      toast.error("Failed to retry selected runs");
    } finally {
      setIsBulkRetrying(false);
    }
  };

  const handleExportSelected = () => {
    const selectedData = runs.filter(r => selectedRunIds.includes(r.id));
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exported_runs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedData.length} runs to JSON`);
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case "meta":
        return <Share2 className="size-3.5 text-[#1877F2]" />;
      case "whatsapp":
      case "aisensy":
        return <MessageCircle className="size-3.5 text-[#10B981]" />;
      case "google-business":
        return <Landmark className="size-3.5 text-[#F59E0B]" />;
      case "omni-tracking":
        return <Globe2 className="size-3.5 text-[#3B82F6]" />;
      default:
        return <Bot className="size-3.5 text-[#8B5CF6]" />;
    }
  };

  const getStatusBadge = (status: AutomationRun["status"]) => {
    switch (status) {
      case "Successful":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">
            <div className="size-1.5 rounded-full bg-[#10B981]"></div>
            Successful
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">
            <div className="size-1.5 rounded-full bg-[#EF4444]"></div>
            Failed
          </span>
        );
      case "Partial Failure":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
            <div className="size-1.5 rounded-full bg-[#D97706]"></div>
            Partial
          </span>
        );
      case "Running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <div className="size-1.5 rounded-full bg-[#2563EB] animate-ping"></div>
            Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
            <div className="size-1.5 rounded-full bg-[#94A3B8]"></div>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
        
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#111C3A]">
            <Calendar className="size-3.5 text-[#64748B]" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent font-bold text-[#111C3A] focus:outline-none cursor-pointer text-[11.5px]"
            >
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Workflow Filter */}
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#334155] focus:outline-none cursor-pointer hover:bg-slate-50"
          >
            <option value="all">All Workflows</option>
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>{wf.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#334155] focus:outline-none cursor-pointer hover:bg-slate-50"
          >
            <option value="all">All Statuses</option>
            <option value="Successful">Successful</option>
            <option value="Failed">Failed</option>
            <option value="Partial Failure">Partial Failure</option>
            <option value="Running">Running</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#334155] focus:outline-none cursor-pointer hover:bg-slate-50"
          >
            <option value="all">All Channels</option>
            <option value="meta">Meta Ads</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="google-business">Google Business</option>
            <option value="omni-tracking">Omni-Tracking</option>
          </select>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-[11.5px] font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline px-1 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search run ID, contact, phone, error..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[11.5px] w-full sm:w-[280px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

      </div>

      {/* Bulk Actions Floating Banner */}
      {selectedRunIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-blue-900">
              {selectedRunIds.length} run{selectedRunIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedRunIds([])}
              className="text-[11px] font-semibold text-blue-600 hover:underline"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 hover:bg-slate-50 text-[11.5px] font-bold text-blue-700 rounded-lg transition-colors"
            >
              <Download className="size-3.5" />
              Export Selected
            </button>

            <button
              onClick={handleExecuteBulkRetry}
              disabled={isBulkRetrying}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11.5px] font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className={`size-3.5 ${isBulkRetrying ? "animate-spin" : ""}`} />
              Bulk Retry Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Table Shell */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold text-[10.5px]">
              <tr>
                <th className="pl-3.5 pr-2 py-2.5 w-[24px]">
                  <input
                    type="checkbox"
                    checked={selectedRunIds.length === filteredRuns.length && filteredRuns.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2 py-2.5 font-bold">Run ID</th>
                <th className="px-2 py-2.5 font-bold">Workflow</th>
                <th className="px-2 py-2.5 font-bold">Trigger / Source</th>
                <th className="px-2 py-2.5 font-bold">Target Entity</th>
                <th className="px-2 py-2.5 font-bold">Started At</th>
                <th className="px-2 py-2.5 font-bold">Duration</th>
                <th className="px-2 py-2.5 font-bold">Steps</th>
                <th className="px-2 py-2.5 font-bold">Status</th>
                <th className="px-3.5 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="size-8 text-slate-300" />
                      <p className="font-semibold text-[13px] text-[#111C3A]">No execution traces match your filters.</p>
                      <p className="text-[11.5px] text-[#64748B]">Try selecting another workflow, status, or clear the search query.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 text-[11.5px] font-bold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const isSelected = selectedRunIds.includes(run.id);
                  const successSteps = run.steps.filter(s => s.status === "Successful").length;

                  return (
                    <tr
                      key={run.id}
                      onClick={() => onSelectRun(run)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="pl-3.5 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRun(run.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#111C3A] font-bold group-hover:text-[#2563EB]">
                            {run.id}
                          </span>
                          <button
                            onClick={(e) => handleCopyId(e, run.id)}
                            className="p-1 text-[#94A3B8] hover:text-[#111C3A] rounded transition-colors"
                            title="Copy Run ID"
                          >
                            {copiedId === run.id ? <Check className="size-3 text-[#10B981]" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-slate-100 text-slate-700">
                            {getChannelIcon(run.channel)}
                          </div>
                          <div>
                            <div className="font-bold text-[#111C3A] leading-tight">
                              {run.workflowName || "Workflow"}
                            </div>
                            <div className="text-[10px] text-[#64748B] capitalize">
                              {run.channel || "omni"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-2 py-3">
                        <span className="text-[#334155] font-medium">
                          {run.triggerSource || "Webhook"}
                        </span>
                      </td>

                      <td className="px-2 py-3">
                        <div className="max-w-[170px] truncate">
                          <div className="font-bold text-[#111C3A] truncate">{run.triggerEntity.label}</div>
                          {run.triggerEntity.subLabel && (
                            <div className="text-[10px] text-[#64748B] truncate">{run.triggerEntity.subLabel}</div>
                          )}
                        </div>
                      </td>

                      <td className="px-2 py-3 text-[#64748B]">
                        {new Date(run.startedAt).toLocaleString("en-US", { 
                          month: "short", 
                          day: "numeric", 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </td>

                      <td className="px-2 py-3 font-medium text-[#334155]">
                        {run.durationMs < 1000 ? `${run.durationMs}ms` : `${(run.durationMs / 1000).toFixed(1)}s`}
                      </td>

                      <td className="px-2 py-3">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#334155]">
                          {successSteps}/{run.steps.length}
                          {run.status === "Failed" && (
                            <span className="text-[9.5px] text-[#EF4444] font-semibold">(failed)</span>
                          )}
                        </span>
                      </td>

                      <td className="px-2 py-3">
                        {getStatusBadge(run.status)}
                      </td>

                      <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectRun(run)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#2563EB] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors"
                          >
                            Inspect
                          </button>
                          
                          {(run.status === "Failed" || run.status === "Partial Failure") && (
                            <button
                              onClick={() => onRetryRun(run.id)}
                              className="p-1 text-[#64748B] hover:text-[#2563EB] rounded hover:bg-slate-100 transition-colors"
                              title="Retry Run"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>
            Showing <strong className="text-[#111C3A]">{filteredRuns.length}</strong> of <strong className="text-[#111C3A]">{runs.length}</strong> execution runs
          </span>
          <div className="flex items-center gap-2">
            <span>Page 1 of 1</span>
          </div>
        </div>

      </div>

    </div>
  );
}
