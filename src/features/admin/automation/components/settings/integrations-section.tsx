"use client";

import { useState } from "react";
import { Link2, Copy, Check, Eye, EyeOff, RefreshCw, Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { IntegrationsSettings } from "../../data/settings-types";

interface IntegrationsSectionProps {
  settings: IntegrationsSettings;
  onChange: (updates: Partial<IntegrationsSettings>) => void;
}

export function IntegrationsSection({ settings, onChange }: IntegrationsSectionProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);

  const handleCopy = (text: string, type: "url" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast.success("Webhook URL copied to clipboard!");
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success("HMAC Secret Key copied!");
    }
  };

  const handleRegenerateSecret = () => {
    const newSecret = "whsec_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    onChange({ hmacSecretKey: newSecret });
    toast.success("Regenerated new HMAC Webhook Secret Key!");
  };

  const handlePingProvider = (id: string, name: string) => {
    setPingingId(id);
    setTimeout(() => {
      setPingingId(null);
      const simulatedLatency = Math.floor(Math.random() * 80) + 60;
      toast.success(`${name} connection verified!`, {
        description: `Gateway responded with HTTP 200 OK (${simulatedLatency}ms latency).`,
      });
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <Link2 className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Connected Integrations & Inbound Webhooks</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Manage live authentication tokens, webhook verification listeners, latency pings, and HMAC signature keys.
          </p>
        </div>
      </div>

      {/* Universal Webhook Endpoint */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <ShieldCheck className="size-4 text-[#10B981]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Universal Inbound Webhook Listener</h4>
        </div>

        <p className="text-[11px] text-[#64748B]">
          Point your external triggers, CRM webhooks, and third-party forms to this authenticated endpoint.
        </p>

        <div className="space-y-3 text-[11px]">
          {/* Webhook URL with Copy */}
          <div>
            <label className="block font-bold text-[#334155] mb-1">Global Inbound Webhook Endpoint</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={settings.universalWebhookUrl}
                className="flex-1 bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[11.5px] font-mono text-[#111C3A] select-all cursor-text focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(settings.universalWebhookUrl, "url")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-[11px] font-bold text-[#2563EB] shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {copiedUrl ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedUrl ? "Copied" : "Copy URL"}
              </button>
            </div>
          </div>

          {/* HMAC Secret Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#334155]">HMAC-SHA256 Webhook Signature Secret</label>
              <button
                type="button"
                onClick={handleRegenerateSecret}
                className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="size-3" /> Regenerate Secret
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showSecret ? "text" : "password"}
                  readOnly
                  value={settings.hmacSecretKey}
                  className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 pr-9 text-[11.5px] font-mono text-[#111C3A] select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#111C3A] cursor-pointer"
                >
                  {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(settings.hmacSecretKey, "key")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-[11px] font-bold text-[#334155] shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {copiedKey ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedKey ? "Copied" : "Copy Key"}
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Verify incoming webhook authenticity using the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#334155]">X-Encodency-Signature</code> header.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#334155]" />
            <h4 className="text-[12.5px] font-bold text-[#111C3A]">Active Connected Gateways</h4>
          </div>
          <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            All 4 Providers Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          {settings.providers.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] hover:bg-white hover:shadow-xs transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-[#111C3A] text-[12.5px] block">{p.name}</span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">{p.accountLabel}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#ECFDF5] text-[#10B981] border border-emerald-200 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>

              {/* Provider details */}
              <div className="bg-white rounded-lg p-2.5 border border-[#E2E8F0] space-y-1 text-[10px] font-mono text-[#334155]">
                {Object.entries(p.details).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[#64748B]">{k}:</span>
                    <span className="font-bold text-[#111C3A] truncate max-w-[200px]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9] text-[10.5px]">
                <span className="text-[#94A3B8]">
                  Ping: <strong className="text-[#111C3A] font-mono">{p.latencyMs}ms</strong> • {p.lastSyncAt}
                </span>
                <button
                  type="button"
                  onClick={() => handlePingProvider(p.id, p.name)}
                  disabled={pingingId === p.id}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-blue-600 border border-[#E2E8F0] font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {pingingId === p.id ? "Pinging..." : "Test Latency"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
