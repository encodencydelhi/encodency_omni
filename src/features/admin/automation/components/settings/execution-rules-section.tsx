"use client";

import { Play, Gauge, Layers, Clock, ShieldCheck } from "lucide-react";
import { ExecutionRulesSettings } from "../../data/settings-types";

interface ExecutionRulesSectionProps {
  settings: ExecutionRulesSettings;
  onChange: (updates: Partial<ExecutionRulesSettings>) => void;
}

export function ExecutionRulesSection({ settings, onChange }: ExecutionRulesSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
          <Play className="size-4" fill="currentColor" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Execution Rules & Throughput Controls</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Govern concurrency limits, rate limiting to prevent third-party 429 bans, contact collision policies, and execution timeouts.
          </p>
        </div>
      </div>

      {/* Concurrency & Rate Limiting */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Gauge className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Concurrency & Rate Limiting</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Maximum Concurrent Runs Per Client
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="50"
                value={settings.maxConcurrentRunsPerClient}
                onChange={(e) => onChange({ maxConcurrentRunsPerClient: parseInt(e.target.value) || 1 })}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <span className="w-12 text-center py-1 rounded bg-[#FAFBFD] border border-[#E2E8F0] font-mono text-[12px] font-bold text-[#111C3A]">
                {settings.maxConcurrentRunsPerClient}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Limits concurrent background worker threads to avoid overwhelming client servers (Range: 1 - 50).
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Global Third-Party API Rate Limiter
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="200"
                value={settings.globalRateLimiterRps}
                onChange={(e) => onChange({ globalRateLimiterRps: parseInt(e.target.value) || 10 })}
                className="w-24 bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12px] font-mono font-bold text-[#111C3A] focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-[11px] font-semibold text-[#64748B]">requests / second (RPS)</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Guards against Meta Graph API and WhatsApp Cloud API 429 throttling limits.
            </p>
          </div>
        </div>
      </div>

      {/* Collision & Contact Policies */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Layers className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Execution Strategy & Contact Collision</h4>
        </div>

        {/* Toggle Parallel */}
        <div className="flex items-start justify-between p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
          <div>
            <span className="font-bold text-[#111C3A] block text-[11.5px]">Allow Parallel Workflows for the Same Contact</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              When enabled, multiple independent workflows (e.g., WhatsApp Welcome + Google Review Alert) can run simultaneously for one lead.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
            <input
              type="checkbox"
              checked={settings.allowParallelWorkflowsSameContact}
              onChange={(e) => onChange({ allowParallelWorkflowsSameContact: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Collision Policy Radio Cards */}
        <div>
          <label className="block text-[11px] font-bold text-[#334155] mb-2">
            Collision Policy (When a new trigger arrives for an actively running contact)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: "queue",
                title: "Queue Sequentially",
                desc: "Hold the new event in the buffer and execute when the active run finishes.",
              },
              {
                id: "cancel_older",
                title: "Cancel Older & Restart",
                desc: "Abort the existing execution and immediately start the fresh workflow instance.",
              },
              {
                id: "skip",
                title: "Skip New Event",
                desc: "Drop the duplicate event and let the current execution finish untouched.",
              },
            ].map((option) => {
              const isSelected = settings.collisionPolicy === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => onChange({ collisionPolicy: option.id as any })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                      : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11.5px] font-bold ${isSelected ? "text-blue-600" : "text-[#111C3A]"}`}>
                        {option.title}
                      </span>
                      <div className={`size-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-600" : "border-[#CBD5E1]"}`}>
                        {isSelected && <div className="size-1.5 rounded-full bg-blue-600" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#64748B] leading-relaxed">{option.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeouts & Idempotency */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Clock className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Timeouts & Idempotency De-duplication</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-[#10B981]" /> Webhook De-duplication Window
            </label>
            <select
              value={settings.deduplicationWindowMinutes}
              onChange={(e) => onChange({ deduplicationWindowMinutes: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes (Recommended)</option>
              <option value={60}>1 hour</option>
              <option value={0}>Disabled (Process all payloads)</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Ignores identical webhook payloads with the same unique event ID within this time frame.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Step Execution Timeout</label>
            <select
              value={settings.stepTimeoutSeconds}
              onChange={(e) => onChange({ stepTimeoutSeconds: parseInt(e.target.value) || 60 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds (Standard)</option>
              <option value={180}>180 seconds (Long-running AI)</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Maximum allowed wait time for individual HTTP, AI, or WhatsApp API steps.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Global Workflow Max Runtime</label>
            <select
              value={settings.workflowMaxRuntimeMinutes}
              onChange={(e) => onChange({ workflowMaxRuntimeMinutes: parseInt(e.target.value) || 30 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes (Default)</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Hard ceiling to terminate runaway loops or stale delay queues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
