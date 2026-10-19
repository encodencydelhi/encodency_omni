"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Mail, ShieldCheck, Webhook } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { whatsappApi, type WhatsAppConfigState } from "@/features/admin/channels/live/whatsapp-api";
import type { IntegrationsSettings } from "../../data/settings-types";
import { automationApi, type CompanySmtpSettings, webhookEndpoint } from "../../data/automation-api";
import { useAutomationScope, useWorkflows } from "../../data/hooks";
import { SecretsCard } from "./secrets-card";
import { WhatsAppCatalogCard } from "./whatsapp-catalog-card";

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
  const [smtp, setSmtp] = useState<CompanySmtpSettings | null>(null);
  const [smtpError, setSmtpError] = useState<{ denied: boolean; detail: string } | null>(null);
  const [smtpReload, setSmtpReload] = useState(0);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpBusy, setSmtpBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    whatsappApi.getConfig(getStoredCompanyId()).then((c) => { if (!cancelled) setWhatsapp(c); }).catch(() => { if (!cancelled) setWhatsapp("error"); });
    automationApi.smtpSettings().then((value) => { if (!cancelled) { setSmtp(value); setSmtpError(null); } }).catch((error: unknown) => {
      if (cancelled) return;
      const status = (error as { status?: number })?.status;
      setSmtp(null);
      setSmtpError({ denied: status === 401 || status === 403, detail: error instanceof Error ? error.message : "The server did not answer." });
    });
    return () => { cancelled = true; };
  }, [smtpReload]);

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
  const updateSmtp = (updates: Partial<CompanySmtpSettings>) => setSmtp((current) => current ? { ...current, ...updates } : current);
  const saveSmtp = async () => {
    if (!smtp) return;
    setSmtpBusy(true);
    try {
      const next = await automationApi.saveSmtpSettings({ enabled: smtp.enabled, host: smtp.host, port: smtp.port, secure: smtp.secure, fromEmail: smtp.fromEmail, fromName: smtp.fromName, fallbackPolicy: smtp.fallbackPolicy, expectedRevision: smtp.revision, ...(smtpUsername ? { username: smtpUsername } : {}), ...(smtpPassword ? { password: smtpPassword } : {}) });
      setSmtp(next); setSmtpUsername(""); setSmtpPassword(""); toast.success("Company SMTP settings saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "SMTP settings could not be saved."); } finally { setSmtpBusy(false); }
  };
  const checkSmtp = async () => {
    setSmtpBusy(true);
    try { const r = await automationApi.checkSmtpConnection(); toast.success(`${r.message} (${r.host}:${r.port})`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The SMTP connection check failed."); } finally { setSmtpBusy(false); }
  };
  const verifySmtp = async () => {
    setSmtpBusy(true);
    try { setSmtp(await automationApi.verifySmtpSettings()); toast.success("SMTP connection verified and test email sent"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "SMTP verification failed."); } finally { setSmtpBusy(false); }
  };

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
        <div className="space-y-3 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 text-[11px]">
          <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 size-4 text-blue-600" />
          <div>
            <span className="block text-[11.5px] font-bold text-[#111C3A]">Company SMTP</span>
            <span className="mt-0.5 block text-[10px] text-[#64748B]">Credentials are encrypted and never returned. Platform SMTP is used only when explicitly allowed.</span>
          </div>
          </div>
          {smtp ? <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10.5px] font-semibold">SMTP Host<input value={smtp.host} onChange={(e) => updateSmtp({ host: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">Port<input type="number" min={1} max={65535} value={smtp.port} onChange={(e) => updateSmtp({ port: Number(e.target.value) })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">From Email<input type="email" value={smtp.fromEmail} onChange={(e) => updateSmtp({ fromEmail: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">From Name<input value={smtp.fromName} onChange={(e) => updateSmtp({ fromName: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">SMTP Username<input autoComplete="off" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder={smtp.credentialHint ?? "SMTP username"} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">New Password<input type="password" autoComplete="new-password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={smtp.usernameConfigured ? "Leave blank to keep existing" : "SMTP password"} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2" /></label>
            <label className="text-[10.5px] font-semibold">Fallback Policy<select value={smtp.fallbackPolicy} onChange={(e) => updateSmtp({ fallbackPolicy: e.target.value as CompanySmtpSettings["fallbackPolicy"] })} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2"><option value="DENY">No Platform Fallback</option><option value="ALLOW_PLATFORM">Allow Platform SMTP</option></select></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={smtp.enabled} onChange={(e) => updateSmtp({ enabled: e.target.checked })} />Enabled</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={smtp.secure} onChange={(e) => updateSmtp({ secure: e.target.checked })} />Implicit TLS</label>
            {[25, 587, 2525].includes(smtp.port) && smtp.secure ? <p className="sm:col-span-2 rounded-md bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-800" role="status">Port {smtp.port} uses STARTTLS: turn <strong>Implicit TLS off</strong>. Implicit TLS is for port 465.</p> : null}
            {smtp.port === 465 && !smtp.secure ? <p className="sm:col-span-2 rounded-md bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-800" role="status">Port 465 uses Implicit TLS: turn <strong>Implicit TLS on</strong>.</p> : null}
            <div className="sm:col-span-2 flex items-center justify-between gap-2"><span className={smtp.lastVerificationOk ? "text-emerald-700" : "text-amber-700"}>{smtp.lastVerificationOk ? `Verified ${smtp.verifiedAt ? new Date(smtp.verifiedAt).toLocaleString() : ""}` : "Not Verified"}</span><div className="flex gap-2"><button disabled={smtpBusy} onClick={() => void saveSmtp()} className="rounded-md border px-3 py-1.5 font-semibold">Save SMTP</button><button disabled={smtpBusy || !smtp.configured} onClick={() => void checkSmtp()} title="Connects and logs in with the saved settings. Sends no email." className="rounded-md border px-3 py-1.5 font-semibold disabled:opacity-50">Check Connection</button><button disabled={smtpBusy || !smtp.configured} onClick={() => void verifySmtp()} className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Verify &amp; Send Test</button></div></div>
          </div> : smtpError?.denied ? <p className="text-[10.5px] text-slate-500">You do not have permission to manage integrations (Owner or Admin required).</p> : <p className="flex items-center gap-2 text-[10.5px] text-slate-500">{smtpError ? `SMTP settings could not be loaded (${smtpError.detail}). This is often a brief server restart.` : "Loading SMTP settings..."}{smtpError ? <button type="button" onClick={() => setSmtpReload((n) => n + 1)} className="rounded-md border px-2 py-1 font-semibold text-slate-700">Retry</button> : null}</p>}
        </div>
      </div>

      <WhatsAppCatalogCard clientId={clientId} />

      <SecretsCard />

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
