"use client";

import { useState } from "react";
import { ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AutomationRun } from "../../data/types";

interface DlqFailuresViewProps {
  failedRuns: AutomationRun[];
  onSelectRun: (run: AutomationRun) => void;
  onRetryRun: (runId: string) => Promise<void>;
  onBulkRetry: (runIds: string[]) => Promise<void>;
}

export function DlqFailuresView({
  failedRuns,
  onSelectRun,
  onRetryRun,
  onBulkRetry
}: DlqFailuresViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === failedRuns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(failedRuns.map(r => r.id));
    }
  };

  const handleRetrySingle = async (runId: string) => {
    setRetryingId(runId);
    try {
      await onRetryRun(runId);
      toast.success(`Run ${runId} successfully re-queued and executed!`);
      setSelectedIds(prev => prev.filter(id => id !== runId));
    } catch {
      toast.error("Retry failed.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.length === 0) return;
    setIsRetryingAll(true);
    try {
      await onBulkRetry(selectedIds);
      toast.success(`Successfully retried ${selectedIds.length} failed runs!`);
      setSelectedIds([]);
    } catch {
      toast.error("Bulk retry failed.");
    } finally {
      setIsRetryingAll(false);
    }
  };

  if (failedRuns.length === 0) {
    return (
      <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-12 text-center shadow-sm space-y-3">
        <div className="size-12 rounded-full bg-[#10B981] text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="size-6" />
        </div>
        <h3 className="text-[16px] font-bold text-[#065F46]">Dead Letter Queue is Empty</h3>
        <p className="text-[12px] text-[#047857] max-w-md mx-auto">
          All automation executions are passing healthy! No runs have failed or been routed to the dead letter queue in the selected window.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* DLQ Banner */}
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-[#991B1B]">
                Dead Letter Queue (DLQ) & Diagnostic Failures
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10.5px] font-bold bg-[#EF4444] text-white">
                {failedRuns.length} Failed
              </span>
            </div>
            <p className="text-[11.5px] text-[#B91C1C] mt-0.5">
              Executions that encountered unrecoverable API rate limits, invalid phone schema, or external service errors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkRetry}
              disabled={isRetryingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`size-3.5 ${isRetryingAll ? "animate-spin" : ""}`} />
              Retry Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={() => onBulkRetry(failedRuns.map(r => r.id))}
            disabled={isRetryingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#FECACA] hover:bg-red-50/60 text-[#B91C1C] text-[12px] font-bold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className="size-3.5 text-[#EF4444]" />
            Retry All Failures
          </button>
        </div>
      </div>

      {/* Table of Failed Runs */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-semibold text-[10.5px]">
              <tr>
                <th className="pl-3.5 pr-2 py-2.5 w-[24px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === failedRuns.length && failedRuns.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2 py-2.5">Run ID</th>
                <th className="px-2 py-2.5">Workflow</th>
                <th className="px-2 py-2.5">Failed Node / Step</th>
                <th className="px-2 py-2.5">Error Code & Diagnosis</th>
                <th className="px-2 py-2.5">Failed At</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {failedRuns.map((run) => {
                const isSelected = selectedIds.includes(run.id);
                const failedStep = run.steps.find(s => s.status === "Failed" || s.status === "Partial Failure");
                const stepIndex = run.steps.findIndex(s => s.status === "Failed" || s.status === "Partial Failure");

                return (
                  <tr 
                    key={run.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <td className="pl-3.5 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(run.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    <td className="px-2 py-3">
                      <button
                        onClick={() => onSelectRun(run)}
                        className="font-mono text-[#2563EB] hover:underline font-bold"
                      >
                        {run.id}
                      </button>
                    </td>

                    <td className="px-2 py-3">
                      <div className="font-bold text-[#111C3A]">{run.workflowName}</div>
                      <div className="text-[10px] text-[#64748B]">{run.triggerSource}</div>
                    </td>

                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">
                        Step {stepIndex !== -1 ? stepIndex + 1 : "?"} of {run.steps.length}
                      </span>
                    </td>

                    <td className="px-2 py-3 max-w-[340px] truncate">
                      <div className="font-bold text-[#991B1B]">
                        {run.errorSummary?.code || "STEP_EXECUTION_FAILURE"}
                      </div>
                      <div className="text-[10.5px] text-[#64748B] truncate" title={run.errorSummary?.message || failedStep?.error}>
                        {run.errorSummary?.message || failedStep?.error || "Unknown error"}
                      </div>
                    </td>

                    <td className="px-2 py-3 text-[#64748B]">
                      {new Date(run.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </td>

                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectRun(run)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#334155] border border-[#E2E8F0] hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Inspect Trace
                        </button>

                        <button
                          onClick={() => handleRetrySingle(run.id)}
                          disabled={retryingId === run.id}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#2563EB] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <RotateCcw className={`size-3 ${retryingId === run.id ? "animate-spin" : ""}`} />
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
