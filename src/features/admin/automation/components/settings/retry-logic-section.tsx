"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { RetrySettings } from "../../data/settings-types";

interface RetryLogicSectionProps {
  settings: RetrySettings;
  onChange: (updates: Partial<RetrySettings>) => void;
}

export function RetryLogicSection({ settings, onChange }: RetryLogicSectionProps) {
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateRetry = () => {
    setIsSimulating(true);
    toast.info("Simulating transient API failure retry curve...", {
      description: `Attempt 1: +${settings.initialDelaySeconds}s delay → Attempt 2: +${settings.initialDelaySeconds * 2}s (jitter applied) → Attempt 3: Final fallback to ${settings.escalationAction.toUpperCase()}`,
    });
    setTimeout(() => {
      setIsSimulating(false);
      toast.success("Retry simulation passed: Circuit held without fatal degradation!");
    }, 1800);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <RotateCcw className="size-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#111C3A]">Auto-Retry Policies & Dead Letter Queue</h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Handle transient network drops gracefully, auto-retry rate-limited API calls, and automatically isolate terminal errors in the DLQ.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSimulateRetry}
          disabled={isSimulating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-white text-[#2563EB] border border-[#BFDBFE] rounded-lg text-[11px] font-bold shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`size-3.5 ${isSimulating ? "animate-spin" : ""}`} />
          {isSimulating ? "Simulating..." : "Test Retry Curve"}
        </button>
      </div>

      {/* Retry Strategy Parameters */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <RotateCcw className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Retry Algorithm & Interval Timers</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Maximum Retry Attempts
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex shrink-0 items-center border border-[#E2E8F0] rounded-lg bg-[#FAFBFD] divide-x divide-[#E2E8F0] overflow-hidden">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChange({ maxRetryAttempts: num })}
                    className={`w-8 h-8 flex items-center justify-center font-mono text-[12px] font-bold transition-colors shrink-0 cursor-pointer ${
                      settings.maxRetryAttempts === num
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-[10.5px] text-[#64748B] whitespace-nowrap">retries before declaring step failure</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1.5">
              Default is 3 attempts. Higher attempts increase execution latency during outages.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Initial Retry Delay</label>
            <select
              value={settings.initialDelaySeconds}
              onChange={(e) => onChange({ initialDelaySeconds: parseInt(e.target.value) || 15 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={5}>5 seconds</option>
              <option value={15}>15 seconds (Recommended)</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Time to wait before the first retry attempt is triggered.
            </p>
          </div>
        </div>

        {/* Retry Algorithm Cards */}
        <div>
          <label className="block text-[11px] font-bold text-[#334155] mb-2">Backoff Algorithm</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: "exponential",
                title: "Exponential Backoff + Jitter",
                badge: "Recommended",
                desc: "Interval doubles each time with randomized variance to prevent thundering herd spikes on third-party APIs.",
              },
              {
                id: "linear",
                title: "Linear Delay",
                badge: "Predictable",
                desc: "Delay increases steadily (e.g., 15s → 30s → 45s) across retry steps.",
              },
              {
                id: "fixed",
                title: "Fixed Interval",
                badge: "Simple",
                desc: "Waits the exact same duration between each retry attempt until exhausted.",
              },
            ].map((alg) => {
              const isSelected = settings.retryAlgorithm === alg.id;
              return (
                <div
                  key={alg.id}
                  onClick={() => onChange({ retryAlgorithm: alg.id as any })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                      : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11.5px] font-bold ${isSelected ? "text-blue-600" : "text-[#111C3A]"}`}>
                        {alg.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white text-[#475569] border border-[#E2E8F0]">
                        {alg.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] leading-relaxed mt-1">{alg.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Classification Policies */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <AlertTriangle className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Error Classification & Short-Circuiting</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start justify-between p-3 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
            <div>
              <span className="font-bold text-[#111C3A] block text-[11.5px]">Auto-Retry on Rate Limit & Server Errors</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                Automatically retries HTTP 429 (Too Many Requests), 500, 502, and 503 gateway responses.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={settings.retryOnRateLimit429}
                onChange={(e) => onChange({ retryOnRateLimit429: e.target.checked, retryOnServerError5xx: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between p-3 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
            <div>
              <span className="font-bold text-[#111C3A] block text-[11.5px]">Immediate Fail on Invalid Payload / Expired Token</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                Short-circuits retries immediately on HTTP 400, 401, or 403 to prevent burning API quota.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={settings.failImmediatelyOnAuthOrBadPayload}
                onChange={(e) => onChange({ failImmediatelyOnAuthOrBadPayload: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Dead Letter Queue Escalation */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <ShieldAlert className="size-4 text-[#EF4444]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Terminal Failure Escalation & DLQ Action</h4>
        </div>

        <p className="text-[11px] text-[#64748B]">
          Choose what happens when all retry attempts are exhausted without successful execution:
        </p>

        <div className="space-y-2.5">
          {[
            {
              id: "dlq",
              title: "Push to Dead Letter Queue (DLQ)",
              desc: "Isolate payload and error dump in the DLQ tab for 1-click manual retry or bulk replay.",
            },
            {
              id: "pause_workflow",
              title: "Pause Entire Workflow Automatically",
              desc: "If failure rate exceeds 20% over the last 50 runs, automatically pause the workflow to prevent spam.",
            },
            {
              id: "trigger_webhook",
              title: "Trigger External Escalation Webhook",
              desc: "Dispatch instant error alert to external Sentry, PagerDuty, or support desk webhook.",
            },
          ].map((item) => {
            const isSelected = settings.escalationAction === item.id;
            return (
              <label
                key={item.id}
                onClick={() => onChange({ escalationAction: item.id as any })}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                    : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="escalationAction"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-1 size-3.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className={`text-[11.5px] font-bold block ${isSelected ? "text-blue-600" : "text-[#111C3A]"}`}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">{item.desc}</span>
                </div>
              </label>
            );
          })}
        </div>

        {settings.escalationAction === "trigger_webhook" && (
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-[#334155] mb-1">Escalation Webhook URL</label>
            <input
              type="url"
              placeholder="https://your-ops.com/webhook/escalate"
              value={settings.escalationWebhookUrl || ""}
              onChange={(e) => onChange({ escalationWebhookUrl: e.target.value })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[11.5px] font-mono text-[#111C3A] focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
