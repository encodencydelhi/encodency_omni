"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, Copy, Check, Download, RotateCcw, ShieldAlert, Lightbulb, Activity,
  ChevronDown, ChevronRight, Code2, Hourglass, MinusCircle, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import type { AutomationRun, AutomationRunStep } from "../../data/types";
import { RunStatusChip, formatDuration } from "../shared";

interface RunDetailsSheetProps {
  run: AutomationRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: (runId: string) => Promise<void>;
  onCancel?: (runId: string) => Promise<void>;
}

function StepIcon({ status }: { status: AutomationRunStep["status"] }) {
  if (status === "Successful") return <CheckCircle2 className="size-5 text-[#10B981]" />;
  if (status === "Failed") return <XCircle className="size-5 text-[#EF4444]" />;
  if (status === "Waiting") return <Hourglass className="size-5 text-[#7C3AED]" />;
  return <MinusCircle className="size-5 text-[#94A3B8]" />;
}

export function RunDetailsSheet({ run, open, onOpenChange, onRetry, onCancel }: RunDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "payload">("timeline");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"retry" | "cancel" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!run) return null;

  const payloadText = JSON.stringify(run.rawWebhookPayload ?? {}, null, 2);

  const act = async (kind: "retry" | "cancel") => {
    const fn = kind === "retry" ? onRetry : onCancel;
    if (!fn) return;
    setBusy(kind);
    try {
      await fn(run.id);
    } finally {
      setBusy(null);
    }
  };

  const copyPayload = async () => {
    await navigator.clipboard.writeText(payloadText);
    setCopied(true);
    toast.success("Payload copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const downloadPayload = () => {
    const url = URL.createObjectURL(new Blob([payloadText], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `run_${run.id}_payload.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-l border-[#E2E8F0] bg-white p-0 shadow-2xl sm:max-w-3xl">
        <SheetHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
              <div className="flex items-center gap-2">
                <span className="rounded border border-[#E2E8F0] bg-white px-2.5 py-1 font-mono text-[12px] font-bold text-[#111C3A]">{run.id.slice(0, 8)}</span>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(run.id); toast.success("Run ID copied"); }} className="rounded p-1 text-[#94A3B8] hover:bg-slate-200/60 hover:text-[#111C3A]" title="Copy run ID">
                  <Copy className="size-3.5" />
                </button>
                <RunStatusChip status={run.status} />
                {run.test ? <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#92400E]">TEST</span> : null}
              </div>
              <div className="flex items-center gap-2">
                {onCancel && (run.status === "Waiting" || run.status === "Running") ? (
                  <button type="button" onClick={() => void act("cancel")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] hover:bg-slate-50 disabled:opacity-50">
                    <Ban className="size-3.5" /> {busy === "cancel" ? "Cancelling..." : "Cancel Run"}
                  </button>
                ) : null}
                {onRetry && (run.status === "Failed" || run.status === "Cancelled") ? (
                  <button type="button" onClick={() => void act("retry")} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-50">
                    <RotateCcw className={`size-3.5 ${busy === "retry" ? "animate-spin" : ""}`} /> {busy === "retry" ? "Retrying..." : "Retry Run"}
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <SheetTitle className="text-[16px] font-bold tracking-tight text-[#111C3A]">{run.workflowName || "Workflow run"}</SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[#64748B]">
                <span>Trigger: <strong className="text-[#334155]">{run.triggerSource || "event"}</strong></span>
                <span>•</span>
                <span>Record: <strong className="text-[#334155]">{run.triggerEntity.label}</strong></span>
                <span>•</span>
                <span>Started: <strong className="text-[#334155]">{new Date(run.startedAt).toLocaleString("en-IN")}</strong></span>
                <span>•</span>
                <span>Duration: <strong className="text-[#334155]">{formatDuration(run.durationMs)}</strong></span>
                {run.resumeAt ? <><span>•</span><span>Resumes: <strong className="text-[#6D28D9]">{new Date(run.resumeAt).toLocaleString("en-IN")}</strong></span></> : null}
                {run.retryOfId ? <><span>•</span><span>Retry of <strong className="font-mono text-[#334155]">{run.retryOfId.slice(0, 8)}</strong></span></> : null}
              </div>
            </div>

            <div className="-mb-4 flex items-center gap-1 border-b border-[#E2E8F0] pt-1">
              {([["timeline", "Execution Timeline", Activity], ["payload", "Trigger Payload", Code2]] as const).map(([key, label, Icon]) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-bold transition-colors ${activeTab === key ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#111C3A]"}`}>
                  <Icon className="size-3.5" /> {label}
                  {key === "timeline" ? <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">{run.steps.length}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="flex-1 space-y-4 overflow-y-auto p-5">
          {activeTab === "timeline" ? (
            <div className="space-y-4">
              {run.errorSummary ? (
                <div className="space-y-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#EF4444]" />
                    <div>
                      <h4 className="text-[13px] font-bold text-[#991B1B]">Failed: {run.errorSummary.code}</h4>
                      <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-[#B91C1C]">{run.errorSummary.message}</p>
                    </div>
                  </div>
                  {run.errorSummary.recommendation ? (
                    <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-white/80 p-3 text-[11.5px] text-[#7F1D1D]">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#D97706]" />
                      <div><strong className="font-bold text-[#991B1B]">How to fix: </strong>{run.errorSummary.recommendation}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Steps</h3>
                <span className="text-[11px] font-medium text-[#64748B]">{run.steps.filter((s) => s.status === "Successful").length} of {run.steps.length} completed</span>
              </div>
              <div className="space-y-2.5">
                {run.steps.map((step, idx) => {
                  const isOpen = expanded[step.id] ?? step.status === "Failed";
                  return (
                    <div key={step.id} className={`rounded-xl border ${step.status === "Failed" ? "border-[#FECACA] bg-[#FFF5F5]" : "border-[#E2E8F0] bg-white"}`}>
                      <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [step.id]: !isOpen }))} className="flex w-full items-center justify-between rounded-xl p-3.5 text-left hover:bg-slate-50/70">
                        <div className="flex items-center gap-3">
                          <StepIcon status={step.status} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Step {idx + 1}</span>
                              <h4 className="text-[12.5px] font-bold text-[#111C3A]">{step.label ?? step.actionId ?? step.nodeId}</h4>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-[#64748B]">
                              <span>{formatDuration(step.durationMs)}</span>
                              {step.retryCount > 0 ? <span>• retried {step.retryCount}x</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${step.status === "Successful" ? "bg-[#ECFDF5] text-[#047857]" : step.status === "Failed" ? "bg-[#FEF2F2] text-[#B91C1C]" : step.status === "Waiting" ? "bg-[#F5F3FF] text-[#6D28D9]" : "bg-slate-100 text-slate-600"}`}>{step.status}</span>
                          {isOpen ? <ChevronDown className="size-4 text-[#94A3B8]" /> : <ChevronRight className="size-4 text-[#94A3B8]" />}
                        </div>
                      </button>
                      {isOpen ? (
                        <div className="space-y-2.5 border-t border-[#E2E8F0]/70 px-3.5 pb-3.5 pt-2 text-[11px]">
                          {step.error ? <div className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-[#B91C1C]"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><div><strong>Error: </strong>{step.error}</div></div> : null}
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {step.input && Object.keys(step.input).length ? (
                              <div>
                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Input</span>
                                <pre className="max-h-[160px] overflow-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 font-mono text-[10px] text-[#334155]">{JSON.stringify(step.input, null, 2)}</pre>
                              </div>
                            ) : null}
                            {step.output && Object.keys(step.output).length ? (
                              <div>
                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Output</span>
                                <pre className="max-h-[160px] overflow-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 font-mono text-[10px] text-[#334155]">{JSON.stringify(step.output, null, 2)}</pre>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#111C3A]">Trigger payload</h3>
                  <p className="text-[11px] text-[#64748B]">The data the run started with.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void copyPayload()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#334155] hover:bg-slate-50">
                    {copied ? <Check className="size-3.5 text-[#10B981]" /> : <Copy className="size-3.5 text-[#64748B]" />} {copied ? "Copied" : "Copy JSON"}
                  </button>
                  <button type="button" onClick={downloadPayload} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#334155] hover:bg-slate-50">
                    <Download className="size-3.5 text-[#64748B]" /> Download
                  </button>
                </div>
              </div>
              <pre className="max-h-[520px] overflow-auto rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 font-mono text-[11px] text-[#1E293B]">{payloadText}</pre>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
