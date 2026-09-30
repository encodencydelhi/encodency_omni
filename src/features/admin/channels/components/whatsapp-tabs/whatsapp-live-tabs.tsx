"use client";

import { Fragment, useState } from "react";
import { AlertCircle, FileText, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { whatsappApi, describeWhatsAppFailure, type WhatsAppConfigPayload, type WhatsAppConfigState, type WhatsAppMessage, type WhatsAppMessageStatus, type WhatsAppTemplate } from "../../live/whatsapp-api";
import type { ProviderOverview } from "@/features/admin/integrations/live/integrations-api";

const MESSAGE_STATUSES: WhatsAppMessageStatus[] = ["QUEUED", "SENDING", "SENT", "DELIVERED", "READ", "FAILED", "REJECTED", "OUTCOME_UNKNOWN"];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function StatusLabel({ status }: { status: string }) {
  const color = status === "READ" || status === "DELIVERED" || status === "SENT" || status === "ENABLED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "FAILED" || status === "REJECTED" || status === "OUTCOME_UNKNOWN"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold", color)}>{status.replaceAll("_", " ")}</span>;
}

function ErrorRow({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="alert">
      <span>{error}</span>
      <button type="button" className="shrink-0 font-semibold underline" onClick={onRetry}>Retry</button>
    </div>
  );
}

const MESSAGE_POLL_INTERVAL_MS = 1500;
const MESSAGE_POLL_BUDGET_MS = 10000;

/**
 * Fire-and-forget watcher: the POST /messages call only queues the message, so
 * the outcome (SENT vs REJECTED) lands a moment later. Polls the single message
 * for at most ~10s and surfaces exactly one toast for whatever it settles on.
 */
function watchMessageOutcome(companyId: string, clientId: string, messageId: string) {
  const deadline = Date.now() + MESSAGE_POLL_BUDGET_MS;
  let lastStatus: WhatsAppMessageStatus = "QUEUED";
  void (async () => {
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, MESSAGE_POLL_INTERVAL_MS));
      let message: WhatsAppMessage;
      try {
        message = await whatsappApi.getMessage(companyId, clientId, messageId);
      } catch {
        continue; // transient read failure — keep trying until the budget runs out
      }
      lastStatus = message.status;
      if (message.status === "SENT" || message.status === "DELIVERED" || message.status === "READ") {
        toast.success("WhatsApp message sent", { description: `AiSensy accepted it — status ${message.status}.` });
        return;
      }
      if (message.status === "FAILED" || message.status === "REJECTED") {
        toast.error("WhatsApp message was not accepted", {
          description: describeWhatsAppFailure(message.failureReasonCode) ?? `Provider rejected the message (${message.failureReasonCode ?? "no reason code"}).`,
        });
        return;
      }
      if (message.status === "OUTCOME_UNKNOWN") {
        toast.warning("WhatsApp delivery outcome unknown", {
          description: "AiSensy did not answer in time. The message may still be delivered — check Messages.",
        });
        return;
      }
    }
    toast.warning("WhatsApp send is still in progress", {
      description: `Last status: ${lastStatus.replaceAll("_", " ")}. Delivery updates continue in Messages.`,
    });
  })();
}

export function OverviewTab({
  loading,
  error,
  onRetry,
  status,
  templates,
  messages,
  onTabChange,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  status: ProviderOverview | null;
  templates: WhatsAppTemplate[];
  messages: WhatsAppMessage[];
  onTabChange: (tab: string) => void;
}) {
  const enabled = templates.filter((template) => template.status === "ENABLED").length;
  const queued = messages.filter((message) => message.status === "QUEUED" || message.status === "SENDING").length;
  const delivered = messages.filter((message) => message.status === "DELIVERED" || message.status === "READ").length;
  const failures = messages.filter((message) => message.status === "FAILED" || message.status === "REJECTED" || message.status === "OUTCOME_UNKNOWN").length;
  const metrics: Array<[string, number | string, string]> = [
    ["Enabled templates", enabled, `Of ${templates.length} registered for this Client`],
    ["Queued / sending", queued, `Of ${messages.length} returned messages`],
    ["Delivered / read", delivered, `Of ${messages.length} returned messages`],
    ["Failed / unknown", failures, `Of ${messages.length} returned messages`],
  ];

  return (
    <div className="space-y-4 pt-3">
      <ErrorRow error={error} onRetry={onRetry} />
      <section className="flex flex-col gap-3 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">WhatsApp provider</h2>
          <p className="mt-1 text-xs text-slate-600">{status?.reason ?? (status?.state === "connected" ? "AiSensy is configured and an enabled template is available." : "Configure AiSensy to enable template management and message sends.")}</p>
        </div>
        <StatusLabel status={status?.state?.toUpperCase() ?? "STATUS UNAVAILABLE"} />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(([label, value, note]) => (
          <div key={label} className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : value}</p>
            <p className="mt-1 text-[11px] text-slate-400">{note}</p>
          </div>
        ))}
      </div>

      <section className="border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-xs font-bold uppercase text-slate-800">Template registry</h2>
            <p className="mt-1 text-xs text-slate-500">Scoped to the currently selected Client.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onTabChange("Templates")}><FileText /> Manage templates</Button>
        </header>
        {templates.length ? (
          <div className="divide-y divide-slate-100">
            {templates.slice(0, 5).map((template) => (
              <div key={template.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{template.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{template.language} · {template.variables.length} variable(s)</p>
                </div>
                <StatusLabel status={template.status} />
              </div>
            ))}
          </div>
        ) : <p className="px-4 py-6 text-sm text-slate-500">{loading ? "Loading templates…" : "No templates are registered for this Client."}</p>}
      </section>
    </div>
  );
}

export function TemplatesTab({
  templates,
  loading,
  error,
  onRetry,
  onOpenModal,
}: {
  templates: WhatsAppTemplate[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenModal: (modal: string) => void;
}) {
  return (
    <div className="space-y-3 pt-3">
      <ErrorRow error={error} onRetry={onRetry} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Client templates</h2>
          <p className="mt-1 text-xs text-slate-500">The backend stores a local template registry; provider approval and discovery are not exposed here.</p>
        </div>
        <Button onClick={() => onOpenModal("create-template")}><Plus /> Add template</Button>
      </div>
      <section className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Language</th><th className="px-3 py-3">Variables</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{template.name}</td>
                <td className="px-3 py-3 text-slate-600">{template.category ?? "—"}</td>
                <td className="px-3 py-3 text-slate-600">{template.language}</td>
                <td className="px-3 py-3 text-slate-600">{template.variables.join(", ") || "None"}</td>
                <td className="px-3 py-3"><StatusLabel status={template.status} /></td>
                <td className="px-3 py-3 text-slate-500">{formatDate(template.updatedAt)}</td>
              </tr>
            ))}
            {!loading && templates.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No templates yet. Add one to begin.</td></tr>}
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading templates…</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ConversationsTab({
  messages,
  templates,
  loading,
  error,
  onRetry,
  status,
  onStatusChange,
  onRefresh,
  onViewMessage,
}: {
  messages: WhatsAppMessage[];
  templates: WhatsAppTemplate[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  status: WhatsAppMessageStatus | "ALL";
  onStatusChange: (status: WhatsAppMessageStatus | "ALL") => void;
  onRefresh: () => void;
  onViewMessage: (id: string) => void;
}) {
  const templateNames = new Map(templates.map((template) => [template.id, template.name]));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    const willExpand = expandedId !== id;
    setExpandedId(willExpand ? id : null);
    // Only a fresh GET /messages/:id when a row is opened — collapsing is local.
    if (willExpand) onViewMessage(id);
  };

  return (
    <div className="space-y-3 pt-3">
      <ErrorRow error={error} onRetry={onRetry} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Outbound message status</h2>
          <p className="mt-1 text-xs text-slate-500">Delivery status updates arrive through the configured AiSensy webhook.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(value) => onStatusChange(value as WhatsAppMessageStatus | "ALL")}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {MESSAGE_STATUSES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh messages" aria-label="Refresh messages"><RefreshCw /></Button>
        </div>
      </div>
      <section className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr><th className="px-4 py-3">Recipient</th><th className="px-3 py-3">Template</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Last update</th><th className="px-3 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {messages.map((message) => {
              const expanded = expandedId === message.id;
              return (
                <Fragment key={message.id}>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">{message.destinationPhone}</td>
                    <td className="px-3 py-3 text-slate-600">{templateNames.get(message.templateId) ?? message.templateId}</td>
                    <td className="px-3 py-3"><StatusLabel status={message.status} /></td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(message.createdAt)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(message.readAt ?? message.deliveredAt ?? message.sentAt ?? message.failedAt)}</td>
                    <td className="px-3 py-3"><button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => toggleRow(message.id)}>{expanded ? "Hide" : "Details"}</button></td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
                        Provider message: {message.providerMessageId ?? "Not assigned"} · Failure:{" "}
                        {message.failureReasonCode
                          ? `${describeWhatsAppFailure(message.failureReasonCode)} (${message.failureReasonCode})`
                          : "None"}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && messages.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No messages match this filter.</td></tr>}
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading message history…</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function whatsappSettingsKey(companyId: string) {
  return `encodency:whatsapp-config:${companyId}`;
}

function readWhatsAppSettings(companyId: string): { displayName: string; apiBaseUrl: string; senderId: string } {
  if (!companyId || typeof window === "undefined") return { displayName: "", apiBaseUrl: "", senderId: "" };
  try {
    const raw = window.localStorage.getItem(whatsappSettingsKey(companyId));
    if (!raw) return { displayName: "", apiBaseUrl: "", senderId: "" };
    const parsed = JSON.parse(raw) as Partial<{ displayName: string; apiBaseUrl: string; senderId: string }>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      apiBaseUrl: typeof parsed.apiBaseUrl === "string" ? parsed.apiBaseUrl : "",
      senderId: typeof parsed.senderId === "string" ? parsed.senderId : "",
    };
  } catch {
    return { displayName: "", apiBaseUrl: "", senderId: "" };
  }
}

export function SettingsTab({
  companyId,
  config,
  loading,
  error,
  onRetry,
  onSaved,
}: {
  companyId: string;
  config: WhatsAppConfigState | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSaved: () => void;
}) {
  // The backend is the source of truth for every non-secret field; localStorage only
  // paints the form before the first `GET /integrations/whatsapp/config` resolves.
  const cached = readWhatsAppSettings(companyId);
  const [displayName, setDisplayName] = useState(config?.displayName ?? cached.displayName);
  const [apiBaseUrl, setApiBaseUrl] = useState(config?.apiBaseUrl ?? cached.apiBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [senderId, setSenderId] = useState(config?.senderId ?? cached.senderId);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const configured = Boolean(config?.configured && config?.hasApiKey);
  const apiKeyRequired = !configured;

  const test = async () => {
    if (!companyId) {
      toast.error("Select a Company before testing WhatsApp.");
      return;
    }
    const apiBaseUrlValue = apiBaseUrl.trim();
    if (!apiBaseUrlValue) {
      toast.error("Enter the AiSensy API base URL to test.");
      return;
    }
    setTesting(true);
    try {
      const result = await whatsappApi.testConfig(companyId, {
        apiBaseUrl: apiBaseUrlValue,
        ...(apiKey ? { apiKey } : {}),
      });
      if (result.ok) {
        toast.success("AiSensy connection works", { description: result.message });
      } else {
        toast.error("AiSensy connection failed", { description: result.message });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to test the AiSensy connection.");
    } finally {
      setTesting(false);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyId) {
      toast.error("Select a Company before configuring WhatsApp.");
      return;
    }
    if (apiKeyRequired && !apiKey) {
      toast.error("Enter the AiSensy API key to complete the first setup.");
      return;
    }
    setSaving(true);
    const payload: WhatsAppConfigPayload = {
      apiBaseUrl: apiBaseUrl.trim(),
      ...(apiKey ? { apiKey } : {}),
      ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
      ...(senderId.trim() ? { senderId: senderId.trim() } : {}),
      ...(webhookSecret ? { webhookSecret } : {}),
    };
    try {
      const result = await whatsappApi.configure(companyId, payload);
      try {
        window.localStorage.setItem(
          whatsappSettingsKey(companyId),
          JSON.stringify({ displayName: payload.displayName ?? "", apiBaseUrl: payload.apiBaseUrl, senderId: payload.senderId ?? "" }),
        );
      } catch {
        // Storage unavailable (private mode / quota) — settings simply won't prefill.
      }
      setApiKey("");
      setWebhookSecret("");
      toast.success("AiSensy configuration saved", { description: `Provider status: ${result.status}.` });
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save WhatsApp configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return <div className="mx-auto mt-3 max-w-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading WhatsApp configuration…</div>;
  }

  return (
    <form onSubmit={save} className="mx-auto mt-3 max-w-3xl space-y-4 border border-slate-200 bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-bold text-slate-900">AiSensy connection</h2>
        <p className="mt-1 text-xs text-slate-500">Configuration is Company-scoped. Secrets are write-only and are never loaded back into the form.</p>
      </div>
      <ErrorRow error={error} onRetry={onRetry} />
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className={cn("size-2 rounded-full", configured ? "bg-emerald-500" : "bg-amber-500")} />
        {configured ? "Provider configuration is active" : "Provider setup required"}
        {config?.status ? <span className="text-slate-400">· {config.status}</span> : null}
      </div>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
        Display name
        <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} placeholder="AiSensy workspace" />
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
        API base URL
        <Input type="url" required value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://backend.aisensy.com" />
        <span className="block font-normal text-slate-500">
          The AiSensy API host, not the website: https://backend.aisensy.com. The backend appends /campaign/t1/api/v2 to this URL for every send.
        </span>
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
        API key{" "}
        <span className="font-normal text-slate-400">
          {apiKeyRequired ? "(required for the first setup — write-only)" : "(stored · leave blank to keep the saved key)"}
        </span>
        <Input type="password" required={apiKeyRequired} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="new-password" maxLength={4000} />
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
        Sender ID <span className="font-normal text-slate-400">(optional)</span>
        <Input value={senderId} onChange={(event) => setSenderId(event.target.value)} maxLength={120} />
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
        Webhook signing secret <span className="font-normal text-slate-400">(optional)</span>
        <Input type="password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} autoComplete="new-password" maxLength={4000} />
        <span className="block font-normal text-amber-700">
          {config?.hasWebhookSecret
            ? "A secret is saved. Replacing it requires re-entering the value; leaving this blank removes the stored secret."
            : "The backend replaces the saved webhook secret on every save; leaving this blank removes any existing secret."}
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={test} disabled={testing || saving || !companyId}>
          {testing ? "Testing…" : "Test connection"}
        </Button>
        <Button type="submit" disabled={saving || testing || !companyId || Boolean(error)}>{saving ? "Saving…" : "Save configuration"}</Button>
      </div>
    </form>
  );
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  companyId,
  clientId,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  clientId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [providerTemplateId, setProviderTemplateId] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState("UTILITY");
  const [variables, setVariables] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setName("");
    setProviderTemplateId("");
    setLanguage("en");
    setCategory("UTILITY");
    setVariables("");
    setBody("");
    setFooter("");
    onClose();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const variableNames = variables.split(",").map((value) => value.trim()).filter(Boolean);
    setSaving(true);
    try {
      await whatsappApi.upsertTemplate(companyId, clientId, {
        name: name.trim(),
        language,
        category,
        variables: variableNames,
        ...(providerTemplateId.trim() ? { providerTemplateId: providerTemplateId.trim() } : {}),
        ...(body.trim() ? { body: body.trim() } : {}),
        ...(footer.trim() ? { footer: footer.trim() } : {}),
      });
      toast.success("Template saved to the Client registry.");
      close();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-white">
        <DialogTitle className="text-base font-bold">Add WhatsApp template</DialogTitle>
        <DialogDescription className="text-xs">Register a template already approved and available in AiSensy. Saving here does not submit it for provider approval.</DialogDescription>
        <form onSubmit={submit} className="space-y-3 pt-2">
          <label className="block space-y-1 text-xs font-semibold">Template name<Input required pattern="[a-zA-Z0-9_.-]{1,120}" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold">Provider template ID <span className="font-normal text-slate-400">(optional)</span><Input value={providerTemplateId} onChange={(event) => setProviderTemplateId(event.target.value)} maxLength={160} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold">Language code<Input required value={language} onChange={(event) => setLanguage(event.target.value)} pattern="[a-z]{2,3}([_-][A-Za-z0-9]{2,8})?" /></label>
            <label className="block space-y-1 text-xs font-semibold">Category<Input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} /></label>
          </div>
          <label className="block space-y-1 text-xs font-semibold">Variable names <span className="font-normal text-slate-400">(comma-separated; e.g. first_name, date)</span><Input value={variables} onChange={(event) => setVariables(event.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold">Body preview<Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={4} /></label>
          <label className="block space-y-1 text-xs font-semibold">Footer preview <span className="font-normal text-slate-400">(optional)</span><Input value={footer} onChange={(event) => setFooter(event.target.value)} maxLength={1000} /></label>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={saving || !companyId || !clientId}>{saving ? "Saving…" : "Save template"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SendTemplateModal({
  isOpen,
  onClose,
  companyId,
  clientId,
  templates,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  clientId: string;
  templates: WhatsAppTemplate[];
  onSent: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [destinationPhone, setDestinationPhone] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const selected = templates.find((template) => template.id === templateId) ?? templates[0];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    try {
      const result = await whatsappApi.sendMessage(companyId, clientId, {
        templateId: selected.id,
        destinationPhone: destinationPhone.trim(),
        variables: Object.fromEntries(selected.variables.map((name) => [name, variables[name] ?? ""])),
      });
      toast.info("WhatsApp message queued", { description: `Current status: ${result.status}. Checking delivery…` });
      // The POST only queues; the AiSensy outcome arrives moments later.
      watchMessageOutcome(companyId, clientId, result.id);
      setDestinationPhone("");
      setVariables({});
      onClose();
      onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue WhatsApp message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-white">
        <DialogTitle className="text-base font-bold">Send template message</DialogTitle>
        <DialogDescription className="text-xs">This creates one queued outbound message. It does not send a broadcast.</DialogDescription>
        {!templates.length ? (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle className="size-4 shrink-0" />Add an enabled template and configure AiSensy before sending.</div>
        ) : (
          <form onSubmit={submit} className="space-y-3 pt-2">
            <label className="block space-y-1 text-xs font-semibold">Approved template
              <Select value={selected?.id} onValueChange={(value) => { setTemplateId(value); setVariables({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name} · {template.language}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="block space-y-1 text-xs font-semibold">Recipient phone<Input required type="tel" value={destinationPhone} onChange={(event) => setDestinationPhone(event.target.value)} placeholder="+14155550100" /></label>
            {selected?.variables.map((variable) => (
              <label key={variable} className="block space-y-1 text-xs font-semibold">{variable}<Input required value={variables[variable] ?? ""} onChange={(event) => setVariables((current) => ({ ...current, [variable]: event.target.value }))} /></label>
            ))}
            {selected?.body && <div className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{selected.body}</div>}
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={sending || !companyId || !clientId}><Send />{sending ? "Queuing…" : "Queue message"}</Button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
