"use client";

import { useState } from "react";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, Copy, Check, Download, 
  RotateCcw, ShieldAlert, Lightbulb, Activity,
  ChevronDown, ChevronRight, Network, Code2
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@/components/ui/sheet";
import { AutomationRun } from "../../data/types";

interface RunDetailsSheetProps {
  run: AutomationRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: (runId: string) => Promise<void>;
}

export function RunDetailsSheet({ run, open, onOpenChange, onRetry }: RunDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "payload" | "http">("timeline");
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    step_1: true,
    step_2: true,
  });

  if (!run) return null;

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const copyToClipboard = (text: string, label = "Copied to clipboard") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const handleCopyPayload = () => {
    if (!run.rawWebhookPayload) return;
    navigator.clipboard.writeText(JSON.stringify(run.rawWebhookPayload, null, 2));
    setCopiedPayload(true);
    toast.success("Webhook payload copied to clipboard");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDownloadPayload = () => {
    if (!run.rawWebhookPayload) return;
    const blob = new Blob([JSON.stringify(run.rawWebhookPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}_payload.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${run.id}_payload.json`);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry(run.id);
      toast.success(`Successfully retried run ${run.id}`);
    } catch (err) {
      toast.error("Failed to retry run");
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: AutomationRun["status"]) => {
    switch (status) {
      case "Successful":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]"><div className="size-1.5 rounded-full bg-[#10B981]"></div>Successful</span>;
      case "Failed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]"><div className="size-1.5 rounded-full bg-[#EF4444]"></div>Failed</span>;
      case "Partial Failure":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]"><div className="size-1.5 rounded-full bg-[#D97706]"></div>Partial Failure</span>;
      case "Running":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]"><div className="size-1.5 rounded-full bg-[#2563EB] animate-ping"></div>Running</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"><div className="size-1.5 rounded-full bg-[#94A3B8]"></div>{status}</span>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl bg-white p-0 flex flex-col shadow-2xl border-l border-[#E2E8F0]">
        
        {/* Header Bar */}
        <SheetHeader className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-[#111C3A] bg-white px-2.5 py-1 rounded border border-[#E2E8F0]">
                  {run.id}
                </span>
                <button 
                  onClick={() => copyToClipboard(run.id, "Run ID copied")} 
                  className="p-1 rounded text-[#94A3B8] hover:text-[#111C3A] hover:bg-slate-200/60 transition-colors"
                  title="Copy Run ID"
                >
                  <Copy className="size-3.5" />
                </button>
                {getStatusBadge(run.status)}
              </div>

              <div className="flex items-center gap-2 mr-8">
                {(run.status === "Failed" || run.status === "Partial Failure") && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11.5px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "Retry Run"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-[16px] font-bold text-[#111C3A] tracking-tight">{run.workflowName || "Workflow Run"}</h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-[#64748B] mt-1 font-medium">
                <span>Trigger: <strong className="text-[#334155]">{run.triggerSource || "Event"}</strong></span>
                <span>•</span>
                <span>Target: <strong className="text-[#334155]">{run.triggerEntity.label}</strong></span>
                <span>•</span>
                <span>Started: <strong className="text-[#334155]">{new Date(run.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong></span>
                <span>•</span>
                <span>Duration: <strong className="text-[#334155]">{run.durationMs < 1000 ? `${run.durationMs}ms` : `${(run.durationMs / 1000).toFixed(1)}s`}</strong></span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-[#E2E8F0] -mb-4 pt-1">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === "timeline" 
                    ? "border-[#2563EB] text-[#2563EB]" 
                    : "border-transparent text-[#64748B] hover:text-[#111C3A]"
                }`}
              >
                <Activity className="size-3.5" />
                Execution Timeline
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold ml-0.5">
                  {run.steps.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("payload")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === "payload" 
                    ? "border-[#2563EB] text-[#2563EB]" 
                    : "border-transparent text-[#64748B] hover:text-[#111C3A]"
                }`}
              >
                <Code2 className="size-3.5" />
                Raw Webhook Payload
              </button>

              <button
                onClick={() => setActiveTab("http")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold border-b-2 transition-colors ${
                  activeTab === "http" 
                    ? "border-[#2563EB] text-[#2563EB]" 
                    : "border-transparent text-[#64748B] hover:text-[#111C3A]"
                }`}
              >
                <Network className="size-3.5" />
                HTTP Dumps
                {run.httpDumps && run.httpDumps.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold ml-0.5">
                    {run.httpDumps.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Body Content */}
        <SheetBody className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: EXECUTION TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              
              {/* Error Callout if Failed */}
              {run.errorSummary && (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="size-5 text-[#EF4444] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13px] font-bold text-[#991B1B]">
                          Execution Failure: {run.errorSummary.code}
                        </h4>
                      </div>
                      <p className="text-[12px] text-[#B91C1C] mt-0.5 font-medium leading-relaxed">
                        {run.errorSummary.message}
                      </p>
                    </div>
                  </div>

                  {run.errorSummary.recommendation && (
                    <div className="rounded-lg bg-white/80 border border-[#FCA5A5] p-3 text-[11.5px] text-[#7F1D1D] flex items-start gap-2">
                      <Lightbulb className="size-4 text-[#D97706] shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-[#991B1B]">Recommended Fix: </strong>
                        {run.errorSummary.recommendation}
                      </div>
                    </div>
                  )}

                  {run.errorSummary.stack && (
                    <div className="mt-2 bg-[#1E293B] text-slate-300 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto">
                      <pre>{run.errorSummary.stack}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Step Flow List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-[#111C3A]">Step-by-Step Node Execution</h3>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {run.steps.filter(s => s.status === "Successful").length} of {run.steps.length} completed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {run.steps.map((step, idx) => {
                    const isExpanded = expandedSteps[step.id] ?? false;
                    return (
                      <div 
                        key={step.id} 
                        className={`rounded-xl border transition-all ${
                          step.status === "Failed" 
                            ? "border-[#FECACA] bg-[#FFF5F5]" 
                            : step.status === "Partial Failure"
                            ? "border-[#FDE68A] bg-[#FFFDF5]"
                            : "border-[#E2E8F0] bg-white"
                        }`}
                      >
                        <div 
                          onClick={() => toggleStep(step.id)}
                          className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50/70 rounded-xl select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-6 rounded-full text-[11px] font-bold">
                              {step.status === "Successful" && <CheckCircle2 className="size-5 text-[#10B981]" />}
                              {step.status === "Failed" && <XCircle className="size-5 text-[#EF4444]" />}
                              {step.status === "Partial Failure" && <AlertTriangle className="size-5 text-[#D97706]" />}
                              {step.status === "Running" && <Clock className="size-5 text-[#2563EB] animate-spin" />}
                              {step.status === "Cancelled" && <XCircle className="size-5 text-[#94A3B8]" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                  Step {idx + 1}
                                </span>
                                <h4 className="text-[12.5px] font-bold text-[#111C3A]">
                                  {step.nodeId === "node_1" ? "Trigger Ingestion" : step.nodeId === "node_2" ? "Action Execution" : step.nodeId === "node_3" ? "Delay / Scheduler" : "CRM Assignment"}
                                </h4>
                              </div>
                              <div className="text-[10.5px] text-[#64748B] flex items-center gap-2 mt-0.5">
                                <span>Duration: <strong>{step.durationMs}ms</strong></span>
                                {step.retryCount > 0 && <span>• Retried: <strong>{step.retryCount}x</strong></span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              step.status === "Successful" ? "bg-[#ECFDF5] text-[#10B981]" :
                              step.status === "Failed" ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-slate-100 text-slate-600"
                            }`}>
                              {step.status}
                            </span>
                            {isExpanded ? <ChevronDown className="size-4 text-[#94A3B8]" /> : <ChevronRight className="size-4 text-[#94A3B8]" />}
                          </div>
                        </div>

                        {/* Step Details Body */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-[#E2E8F0]/70 space-y-2.5 text-[11px]">
                            {step.error && (
                              <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] flex items-start gap-2">
                                <ShieldAlert className="size-4 text-[#EF4444] shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold">Error: </strong>{step.error}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {step.input && Object.keys(step.input).length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1 block">Input Parameters</span>
                                  <pre className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] p-2 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[140px]">
                                    {JSON.stringify(step.input, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {step.output && Object.keys(step.output).length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1 block">Output Response</span>
                                  <pre className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] p-2 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[140px]">
                                    {JSON.stringify(step.output, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: RAW WEBHOOK PAYLOAD */}
          {activeTab === "payload" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#111C3A]">Incoming Webhook Payload</h3>
                  <p className="text-[11px] text-[#64748B]">Raw event captured by the webhook listener.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPayload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[11px] font-bold text-[#334155] rounded-lg shadow-2xs transition-colors"
                  >
                    {copiedPayload ? <Check className="size-3.5 text-[#10B981]" /> : <Copy className="size-3.5 text-[#64748B]" />}
                    {copiedPayload ? "Copied!" : "Copy JSON"}
                  </button>
                  <button
                    onClick={handleDownloadPayload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[11px] font-bold text-[#334155] rounded-lg shadow-2xs transition-colors"
                  >
                    <Download className="size-3.5 text-[#64748B]" />
                    Download
                  </button>
                </div>
              </div>

              {run.rawWebhookPayload ? (
                <div className="relative rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-[#1E293B] font-mono text-[11px] overflow-x-auto shadow-2xs max-h-[500px]">
                  <pre>{JSON.stringify(run.rawWebhookPayload, null, 2)}</pre>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-[#E2E8F0] text-[12px] text-[#64748B]">
                  No raw payload stored for this run.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HTTP DUMPS */}
          {activeTab === "http" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#111C3A]">Third-Party API HTTP Dumps</h3>
                  <p className="text-[11px] text-[#64748B]">Outgoing network requests made to Meta, WhatsApp, or Google APIs.</p>
                </div>
              </div>

              {run.httpDumps && run.httpDumps.length > 0 ? (
                <div className="space-y-3">
                  {run.httpDumps.map((dump) => (
                    <div key={dump.id} className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
                      <div className="bg-[#F8FAFC] px-3.5 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                            dump.method === "GET" ? "bg-blue-100 text-blue-700" :
                            dump.method === "POST" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {dump.method}
                          </span>
                          <span className="text-[11.5px] font-bold text-[#111C3A]">{dump.service}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            dump.statusCode >= 200 && dump.statusCode < 300 
                              ? "bg-[#ECFDF5] text-[#10B981]" 
                              : "bg-[#FEF2F2] text-[#EF4444]"
                          }`}>
                            HTTP {dump.statusCode}
                          </span>
                          <span className="text-[10px] text-[#64748B]">{dump.durationMs}ms</span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2 text-[11px]">
                        <div className="bg-slate-100 px-2.5 py-1.5 rounded font-mono text-[10.5px] text-[#334155] break-all">
                          {dump.endpoint}
                        </div>

                        {dump.requestBody && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#64748B] block mb-1">Request Body</span>
                            <pre className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] p-2.5 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[140px]">
                              {JSON.stringify(dump.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}

                        {dump.responseBody && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#64748B] block mb-1">Response Body</span>
                            <pre className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] p-2.5 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[140px]">
                              {JSON.stringify(dump.responseBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-[#E2E8F0] text-[12px] text-[#64748B]">
                  No external HTTP dumps recorded for this execution.
                </div>
              )}
            </div>
          )}

        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
