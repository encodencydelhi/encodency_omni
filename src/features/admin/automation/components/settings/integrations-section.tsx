"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Mail, ShieldCheck, Webhook } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { whatsappApi, type WhatsAppConfigState } from "@/features/admin/channels/live/whatsapp-api";
import { IntegrationsSettings } from "../../data/settings-types";
import { webhookEndpoint } from "../../data/automation-api";
import { useAutomationScope, useWorkflows } from "../../data/hooks";

interface IntegrationsSectionProps {
  settings: IntegrationsSettings;
  onChange: (updates: Partial<IntegrationsSettings>) => void;
}

const IP_RULE = /^(\d{1,3}\.){3}\d{1,3}(\/(3[0-2]|[12]?\d))?$|^[0-9a-f:]+$/i;

export function IntegrationsSection({ settings, onChange }: IntegrationsSectionProps) {
  const { clientId } = useAutomationScope();
  const { data: workflows = [] } = useWorkflows(clientId, 30);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfigState | null | "error">(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [ipInput, setIpInput] = useState(settings.ipWhitelist.join(", "));

  useEffect(() => {
    let cancelled = false;
    whatsappApi.getConfig(getStoredCompanyId()).then((c) => { if (!cancelled) setWhatsapp(c); }).catch(() => { if (!cancelled) setWhatsapp("error"); });
    return () => { cancelled = true; };
  }, []);

  const hooks = workflows.flatMap((wf) => {
    const trigger = wf.nodes.find((n) => n.type === "trigger");
    if (!trigger || !["inbound_webhook", "form_submission"].includes(trigger.actionId ?? "")) return [];
    // Tokens are hidden by the API; the endpoint is listed and the token is issued from the workflow builder.
    return [{ wf, kind: trigger.actionId === "form_submission" ? "Form submission" : "Inbound webhook", url: webhookEndpoint(wf.id) }];
  });

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("URL copied");
    window.setTimeout(() => setCopied(null), 1500);
  };

  const ips = ipInput.split(",").map((s) => s.trim()).filter(Boolean);
  const badIps = ips.filter((ip) => !IP_RULE.test(ip));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Link2 className="size-4" /></div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Integrations &amp; webhooks</h3>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Channels the engine sends through, and the secret URLs external systems post to.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <h4 className="border-b border-[#F1F5F9] pb-2 text-[12.5px] font-bold text-[#111C3A]">Sending channels</h4>
        <div className="flex items-start justify-between rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 text-[11px]">
          <div className="flex items-start gap-2.5">
            <FaWhatsapp className="mt-0.5 size-4 text-[#16A34A]" />
            <div>
              <span className="block text-[11.5px] font-bold text-[#111C3A]">WhatsApp (AiSensy)</span>
              <span className="mt-0.5 block text-[10px] text-[#64748B]">
                {whatsapp === null ? "Checking…" : whatsapp === "error" ? "Could not read the WhatsApp configuration." : whatsapp.configured ? `${whatsapp.displayName ?? "Connected account"} · status ${whatsapp.status ?? "unknown"}` : "Not configured. Set it up under Channels → WhatsApp → Settings."}
              </span>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${whatsapp && whatsapp !== "error" && whatsapp.configured && whatsapp.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {whatsapp && whatsapp !== "error" && whatsapp.configured ? (whatsapp.status === "ACTIVE" ? "Connected" : whatsapp.status ?? "Configured") : "Not connected"}
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 text-[11px]">
          <Mail className="mt-0.5 size-4 text-blue-600" />
          <div>
            <span className="block text-[11.5px] font-bold text-[#111C3A]">Email</span>
            <span className="mt-0.5 block text-[10px] text-[#64748B]">Sent through the platform mail server (the same one used for invitations). If it is not configured, email steps fail with a clear error in the run.</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><Webhook className="size-4 text-[#7C3AED]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Workflow webhook URLs</h4></div>
        <p className="text-[11px] text-[#64748B]">Every workflow with an Inbound Webhook or Form Submission trigger gets its own secret URL. It only accepts events while the workflow is Active.</p>
        {!clientId ? (
          <p className="text-[11px] text-[#64748B]">Select a client to see its webhook URLs.</p>
        ) : hooks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#CBD5E1] px-3 py-3 text-[11px] text-[#64748B]">No webhook workflows yet. Create a workflow with an Inbound Webhook or Form Submission trigger and save it.</p>
        ) : (
          <ul className="space-y-2">
            {hooks.map((h) => (
              <li key={h.wf.id} className="rounded-lg border border-[#E2E8F0] p-3">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="font-bold text-[#111C3A]">{h.wf.name} <span className="font-normal text-[#64748B]">· {h.kind}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${h.wf.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{h.wf.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-[#F8FAFC] px-2 py-1.5 text-[10.5px] text-[#475569]">{h.url}</code>
                  <button type="button" aria-label={`Copy URL for ${h.wf.name}`} onClick={() => void copy(h.wf.id, h.url)} className="grid size-8 place-items-center rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50">{copied === h.wf.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><ShieldCheck className="size-4 text-[#10B981]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Webhook IP allow-list</h4></div>
        <p className="text-[11px] text-[#64748B]">Optional. When set, webhook calls from any other IP are rejected (403). Comma-separated IPs or IPv4 ranges such as <code>157.240.0.0/16</code>. Leave empty to accept any IP that has the secret URL.</p>
        <input type="text" value={ipInput} onChange={(e) => setIpInput(e.target.value)} onBlur={() => onChange({ ipWhitelist: ips.filter((ip) => IP_RULE.test(ip)) })} placeholder="e.g. 203.0.113.10, 157.240.0.0/16" className="w-full rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2 font-mono text-[11.5px] focus:border-blue-500 focus:outline-none" />
        {badIps.length ? <p className="text-[10.5px] text-red-600">Not valid (ignored): {badIps.join(", ")}</p> : null}
      </div>
    </div>
  );
}
