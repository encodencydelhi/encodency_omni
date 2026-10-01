"use client";

import { Fragment, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileText,
  Megaphone,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import {
  whatsappApi,
  describeWhatsAppFailure,
  type WhatsAppCampaignItem,
  type WhatsAppConfigPayload,
  type WhatsAppConfigState,
  type WhatsAppContactGrowthPoint,
  type WhatsAppContactItem,
  type WhatsAppMessage,
  type WhatsAppMessageStatus,
  type WhatsAppOverviewAnalytics,
  type WhatsAppTemplate,
  type WhatsAppTemplateAnalyticsItem,
  type WhatsAppWebhookHealth,
} from "../../live/whatsapp-api";
import { useCreateWhatsAppCampaign, useRetryWhatsAppMessage, useSyncWhatsAppTemplates } from "../../live/whatsapp-hooks";
import type { ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { WhatsAppOverviewInsights } from "./whatsapp-overview-insights";
import { WhatsAppCampaignsView } from "./whatsapp-campaigns-view";
import { WhatsAppTemplatesView } from "./whatsapp-templates-view";
import { WhatsAppContactsView } from "./whatsapp-contacts-view";

const MESSAGE_STATUSES: WhatsAppMessageStatus[] = [
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "REJECTED",
  "OUTCOME_UNKNOWN",
];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function StatusLabel({ status }: { status: string }) {
  const color =
    status === "READ" ||
    status === "DELIVERED" ||
    status === "SENT" ||
    status === "ENABLED" ||
    status === "ACTIVE" ||
    status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAILED" || status === "REJECTED" || status === "OUTCOME_UNKNOWN"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : status === "RUNNING" || status === "SENDING" || status === "QUEUED"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold", color)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function ErrorRow({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div
      className="flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
      role="alert"
    >
      <span>{error}</span>
      <button type="button" className="shrink-0 font-semibold underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

const MESSAGE_POLL_INTERVAL_MS = 1500;
const MESSAGE_POLL_BUDGET_MS = 10000;

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
        continue;
      }
      lastStatus = message.status;
      if (message.status === "SENT" || message.status === "DELIVERED" || message.status === "READ") {
        toast.success("WhatsApp message sent", { description: `AiSensy accepted it — status ${message.status}.` });
        return;
      }
      if (message.status === "FAILED" || message.status === "REJECTED") {
        toast.error("WhatsApp message was not accepted", {
          description:
            describeWhatsAppFailure(message.failureReasonCode) ??
            `Provider rejected the message (${message.failureReasonCode ?? "no reason code"}).`,
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
  overviewAnalytics,
  onTabChange,
  companyId,
  clientId,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  status: ProviderOverview | null;
  templates: WhatsAppTemplate[];
  messages: WhatsAppMessage[];
  overviewAnalytics?: WhatsAppOverviewAnalytics | null;
  onTabChange: (tab: string) => void;
  companyId?: string;
  clientId?: string;
}) {
  return (
    <div className="space-y-4 pt-1">
      <ErrorRow error={error} onRetry={onRetry} />
      <WhatsAppOverviewInsights
        overviewAnalytics={overviewAnalytics ?? null}
        status={status}
        templates={templates}
        messages={messages}
        loading={loading}
        onTabChange={onTabChange}
        companyId={companyId}
        clientId={clientId}
      />
    </div>
  );
}

export function CampaignsTab({
  campaigns,
  loading,
  error,
  onRetry,
  onOpenModal,
}: {
  campaigns: WhatsAppCampaignItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenModal?: (modal: string) => void;
}) {
  return (
    <WhatsAppCampaignsView
      campaigns={campaigns}
      loading={loading}
      error={error}
      onRetry={onRetry}
      onOpenModal={onOpenModal}
    />
  );
}

export function TemplatesTab({
  companyId,
  clientId,
  templates,
  loading,
  error,
  onRetry,
  onOpenModal,
}: {
  companyId?: string;
  clientId?: string;
  templates: WhatsAppTemplateAnalyticsItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenModal: (modal: string) => void;
}) {
  const syncMutation = useSyncWhatsAppTemplates();

  const handleSync = async () => {
    if (!companyId || !clientId) {
      toast.error("Select a Company and Client before syncing templates.");
      return;
    }
    try {
      const res = await syncMutation.mutateAsync({ companyId, clientId });
      toast.success("Templates synced from AiSensy", {
        description: `Synced ${res.synced} approved template(s) (${res.created} new, ${res.updated} updated).`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync templates from AiSensy.");
    }
  };

  return (
    <WhatsAppTemplatesView
      templates={templates}
      loading={loading}
      error={error}
      onRetry={onRetry}
      onOpenModal={onOpenModal}
      onSyncAiSensy={handleSync}
      syncing={syncMutation.isPending}
    />
  );
}

export function ContactsTab({
  contacts,
  growthTimeline = [],
  loading,
  error,
  onRetry,
}: {
  contacts: WhatsAppContactItem[];
  growthTimeline?: WhatsAppContactGrowthPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <WhatsAppContactsView
      contacts={contacts}
      growthTimeline={growthTimeline}
      loading={loading}
      error={error}
      onRetry={onRetry}
    />
  );
}

export function ConversationsTab({
  companyId,
  clientId,
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
  companyId: string;
  clientId: string;
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
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const retryMutation = useRetryWhatsAppMessage();

  const toggleRow = (id: string) => {
    const willExpand = expandedId !== id;
    setExpandedId(willExpand ? id : null);
    if (willExpand) onViewMessage(id);
  };

  const handleRetry = async (messageId: string) => {
    if (!companyId || !clientId) return;
    setRetryingId(messageId);
    try {
      await retryMutation.mutateAsync({ companyId, clientId, messageId });
      toast.success("Message queued for retry", {
        description: "Delivery status will update once processed by AiSensy.",
      });
      onRefresh();
    } catch (err) {
      toast.error("Retry failed", {
        description: err instanceof Error ? err.message : "Unable to retry message.",
      });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <ErrorRow error={error} onRetry={onRetry} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Outbound Message Logs & Delivery Tracking</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Realtime delivery statuses (Queued, Sent, Delivered, Read, Failed) updated via webhook.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(value) => onStatusChange(value as WhatsAppMessageStatus | "ALL")}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {MESSAGE_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Refresh messages"
            aria-label="Refresh messages"
            className="h-8 w-8"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>
      <section className="overflow-x-auto border border-slate-200 bg-white rounded-sm shadow-2xs">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-3 py-3">Template</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Last Update</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {messages.map((message) => {
              const expanded = expandedId === message.id;
              const isFailed = message.status === "FAILED" || message.status === "REJECTED";
              return (
                <Fragment key={message.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 font-mono text-[11.5px]">{message.destinationPhone}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {templateNames.get(message.templateId) ?? message.templateId}
                    </td>
                    <td className="px-3 py-3">
                      <StatusLabel status={message.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-[11px]">{formatDate(message.createdAt)}</td>
                    <td className="px-3 py-3 text-slate-500 text-[11px]">
                      {formatDate(message.readAt ?? message.deliveredAt ?? message.sentAt ?? message.failedAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        className="font-semibold text-emerald-700 hover:underline"
                        onClick={() => toggleRow(message.id)}
                      >
                        {expanded ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50/80 px-4 py-3 text-[11px] text-slate-700">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1.5">
                            <p>
                              <span className="font-semibold text-slate-800">Provider Message ID:</span>{" "}
                              {message.providerMessageId ? (
                                <code className="rounded bg-slate-200/70 px-1 py-0.5 text-[10.5px]">
                                  {message.providerMessageId}
                                </code>
                              ) : (
                                "Not assigned"
                              )}
                            </p>
                            {message.failureReasonCode && (
                              <p className="text-rose-600 font-medium">
                                <span>Failure Reason:</span>{" "}
                                {message.failureReasonDetail ?? describeWhatsAppFailure(message.failureReasonCode)} (
                                {message.failureReasonCode})
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-600">
                              <span>
                                <strong>Created:</strong> {formatDate(message.createdAt)}
                              </span>
                              <span>
                                <strong>Sent:</strong> {formatDate(message.sentAt)}
                              </span>
                              <span>
                                <strong>Delivered:</strong> {formatDate(message.deliveredAt)}
                              </span>
                              <span>
                                <strong>Read:</strong> {formatDate(message.readAt)}
                              </span>
                              {message.failedAt && (
                                <span className="text-rose-600">
                                  <strong>Failed:</strong> {formatDate(message.failedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isFailed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={retryingId === message.id}
                              onClick={() => handleRetry(message.id)}
                            >
                              <RefreshCw
                                className={cn("size-3.5 mr-1.5", retryingId === message.id && "animate-spin")}
                              />
                              {retryingId === message.id ? "Retrying..." : "Retry send"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && messages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No messages match this filter.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Loading message history…
                </td>
              </tr>
            )}
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
  webhookHealth,
  loading,
  error,
  onRetry,
  onSaved,
}: {
  companyId: string;
  config: WhatsAppConfigState | null;
  webhookHealth?: WhatsAppWebhookHealth | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSaved: () => void;
}) {
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
          JSON.stringify({
            displayName: payload.displayName ?? "",
            apiBaseUrl: payload.apiBaseUrl,
            senderId: payload.senderId ?? "",
          }),
        );
      } catch {
        // Storage unavailable
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
    return (
      <div className="mx-auto mt-3 max-w-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 rounded-sm">
        Loading WhatsApp configuration…
      </div>
    );
  }

  return (
    <div className="mx-auto mt-2 max-w-3xl space-y-4">
      <form onSubmit={save} className="space-y-4 border border-slate-200 bg-white p-4 sm:p-6 rounded-sm shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">AiSensy Connection & Credentials</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configuration is Company-scoped. Secrets are write-only and are never loaded back into the form.
          </p>
        </div>
        <ErrorRow error={error} onRetry={onRetry} />
        <div
          className={cn(
            "flex items-center justify-between rounded-md border p-3 text-xs",
            configured ? "border-emerald-200 bg-emerald-50/70 text-emerald-900" : "border-amber-200 bg-amber-50/70 text-amber-900",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <span className={cn("size-2.5 rounded-full shrink-0", configured ? "bg-emerald-500" : "bg-amber-500")} />
            <span>{configured ? "AiSensy is Connected & Active" : "AiSensy Setup Required"}</span>
            {config?.status ? <span className="text-slate-400 font-normal">({config.status})</span> : null}
          </div>
          {configured && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
              Persistent for Company
            </span>
          )}
        </div>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          Display name
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={120}
            placeholder="AiSensy workspace"
          />
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          API base URL
          <Input
            type="url"
            required
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder="https://backend.aisensy.com"
          />
          <span className="block font-normal text-slate-500">
            The AiSensy API host, not the website: https://backend.aisensy.com. The backend appends /campaign/t1/api/v2 to
            this URL for every send.
          </span>
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>API key</span>
            {config?.hasApiKey && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-3" /> Securely Saved & Encrypted
              </span>
            )}
          </div>
          <Input
            type="password"
            required={apiKeyRequired}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="new-password"
            maxLength={4000}
            placeholder={config?.hasApiKey ? "•••••••••••••••••••••••••••••••• (Saved — leave blank to keep)" : "Enter AiSensy API key"}
          />
          <span className="block font-normal text-slate-500">
            {apiKeyRequired
              ? "Required for initial setup — write-only and encrypted at rest in the database."
              : "Your API key is already safely saved in the database. You do NOT need to re-enter it unless updating."}
          </span>
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          Sender ID <span className="font-normal text-slate-400">(optional)</span>
          <Input value={senderId} onChange={(event) => setSenderId(event.target.value)} maxLength={120} />
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>Webhook signing secret <span className="font-normal text-slate-400">(optional)</span></span>
            {config?.hasWebhookSecret && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-3" /> Secret Configured
              </span>
            )}
          </div>
          <Input
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            autoComplete="new-password"
            maxLength={4000}
            placeholder={config?.hasWebhookSecret ? "•••••••••••••••• (Saved — leave blank to keep)" : "Optional webhook secret"}
          />
          <span className="block font-normal text-slate-500">
            {config?.hasWebhookSecret
              ? "A webhook signing secret is currently saved. Leave blank to keep the existing secret."
              : "Optional: AiSensy will sign webhook event deliveries with this secret for validation."}
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={test} disabled={testing || saving || !companyId}>
            {testing ? "Testing…" : "Test connection"}
          </Button>
          <Button type="submit" disabled={saving || testing || !companyId || Boolean(error)}>
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </form>

      {/* Webhook Configuration & Health Card */}
      <section className="border border-slate-200 bg-white p-4 sm:p-6 rounded-sm shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Webhook Diagnostics & Delivery URL</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure this webhook URL in your AiSensy dashboard to receive realtime delivery and read receipts.
            </p>
          </div>
          <StatusLabel status={webhookHealth?.status === "ACTIVE" ? "ACTIVE" : "AWAITING EVENTS"} />
        </div>

        <div className="mt-4 rounded bg-slate-50 p-3 font-mono text-xs text-slate-800 border border-slate-200">
          <code>POST /integrations/whatsapp/webhook</code>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="border border-slate-100 p-3 bg-slate-50/50 rounded">
            <span className="text-slate-500 font-medium">Total Webhook Events Recorded:</span>
            <p className="mt-1 text-base font-bold text-slate-900">{webhookHealth?.totalEventsReceived ?? 0}</p>
          </div>
          <div className="border border-slate-100 p-3 bg-slate-50/50 rounded">
            <span className="text-slate-500 font-medium">Last Event Processed:</span>
            <p className="mt-1 text-base font-bold text-slate-900">
              {webhookHealth?.lastReceivedAt ? formatDate(webhookHealth.lastReceivedAt) : "None recorded"}
            </p>
          </div>
        </div>
      </section>
    </div>
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
    const variableNames = variables
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
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
        <DialogTitle className="text-base font-bold">Add WhatsApp Template</DialogTitle>
        <DialogDescription className="text-xs">
          Register a template already approved and available in AiSensy. Saving here does not submit it for provider
          approval.
        </DialogDescription>
        {!clientId ? (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="size-4 shrink-0" />
            {companyId
              ? "Templates are saved per Client. Pick a Client in the notice above the tabs, then reopen this form."
              : "Select a Company before adding a template."}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 pt-2">
            <label className="block space-y-1 text-xs font-semibold">
              Template name
              <Input
                required
                pattern="[a-zA-Z0-9_.-]{1,120}"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold">
              Provider template ID <span className="font-normal text-slate-400">(optional)</span>
              <Input
                value={providerTemplateId}
                onChange={(event) => setProviderTemplateId(event.target.value)}
                maxLength={160}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold">
                Language code
                <Input
                  required
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  pattern="[a-z]{2,3}([_-][A-Za-z0-9]{2,8})?"
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold">
                Category
                <Input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-semibold">
              Variable names{" "}
              <span className="font-normal text-slate-400">(comma-separated; e.g. first_name, date)</span>
              <Input value={variables} onChange={(event) => setVariables(event.target.value)} />
            </label>
            <label className="block space-y-1 text-xs font-semibold">
              Body preview
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={4} />
            </label>
            <label className="block space-y-1 text-xs font-semibold">
              Footer preview <span className="font-normal text-slate-400">(optional)</span>
              <Input value={footer} onChange={(event) => setFooter(event.target.value)} maxLength={1000} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !companyId || !clientId}>
                {saving ? "Saving…" : "Save template"}
              </Button>
            </div>
          </form>
        )}
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
  campaigns = [],
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  clientId: string;
  templates: WhatsAppTemplate[];
  campaigns?: WhatsAppCampaignItem[];
  onSent: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [campaignId, setCampaignId] = useState("none");
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
        campaignId: campaignId !== "none" ? campaignId : undefined,
      });
      toast.info("WhatsApp message queued", { description: `Current status: ${result.status}. Checking delivery…` });
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
        <DialogTitle className="text-base font-bold">Send Template Message</DialogTitle>
        <DialogDescription className="text-xs">
          This creates one queued outbound message. It does not send a broadcast.
        </DialogDescription>
        {!templates.length ? (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="size-4 shrink-0" />
            Add an enabled template and configure AiSensy before sending.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 pt-2">
            <label className="block space-y-1 text-xs font-semibold">
              Approved template
              <Select
                value={selected?.id}
                onValueChange={(value) => {
                  setTemplateId(value);
                  setVariables({});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} · {template.language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {campaigns.length > 0 && (
              <label className="block space-y-1 text-xs font-semibold">
                Link to Campaign (optional)
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign (Direct broadcast / test)</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <label className="block space-y-1 text-xs font-semibold">
              Recipient phone
              <Input
                required
                type="tel"
                value={destinationPhone}
                onChange={(event) => setDestinationPhone(event.target.value)}
                placeholder="+14155550100"
              />
            </label>
            {selected?.variables.map((variable) => (
              <label key={variable} className="block space-y-1 text-xs font-semibold">
                {variable}
                <Input
                  required
                  value={variables[variable] ?? ""}
                  onChange={(event) =>
                    setVariables((current) => ({ ...current, [variable]: event.target.value }))
                  }
                />
              </label>
            ))}
            {selected?.body && (
              <div className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {selected.body}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !companyId || !clientId}>
                <Send className="size-4 mr-1" />
                {sending ? "Queuing…" : "Queue message"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  companyId,
  clientId,
  templates = [],
  contacts = [],
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  clientId: string;
  templates?: WhatsAppTemplate[];
  contacts?: WhatsAppContactItem[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [broadcastNow, setBroadcastNow] = useState(templates.length > 0);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [manualPhones, setManualPhones] = useState("");
  const [includeAllContacts, setIncludeAllContacts] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const createMutation = useCreateWhatsAppCampaign();

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates[0];

  const parsedManual = manualPhones
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const totalRecipientsCount =
    parsedManual.length + (includeAllContacts ? contacts.length : 0);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    let recipients: string[] = [];
    if (broadcastNow && selectedTemplate) {
      const contactPhones = includeAllContacts
        ? contacts.map((c) => c.phone).filter(Boolean)
        : [];
      recipients = [...new Set([...parsedManual, ...contactPhones])];

      if (recipients.length === 0) {
        toast.error("Please enter at least one recipient phone number to send the broadcast.");
        return;
      }
    }

    try {
      const res = await createMutation.mutateAsync({
        companyId,
        clientId,
        name: name.trim(),
        status,
        templateId: broadcastNow && selectedTemplate ? selectedTemplate.id : undefined,
        recipients: broadcastNow && recipients.length > 0 ? recipients : undefined,
        variables: broadcastNow && selectedTemplate ? variables : undefined,
      });

      if (res.sent > 0) {
        toast.success(`Campaign "${name.trim()}" Broadcast Launched!`, {
          description: `Dispatched ${res.sent} message(s) via AiSensy to your recipient list. Delivery tracking is active!`,
        });
      } else {
        toast.success(`Campaign "${name.trim()}" Created`, {
          description: `Campaign registered. You can now track outbound messages under this campaign.`,
        });
      }

      setName("");
      setStatus("ACTIVE");
      setManualPhones("");
      setIncludeAllContacts(false);
      setVariables({});
      onClose();
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !createMutation.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-white">
        <DialogTitle className="text-base font-bold flex items-center gap-2">
          <Megaphone className="size-5 text-indigo-600" />
          Create & Launch WhatsApp Campaign
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          Set up your marketing broadcast, select your approved Meta template, and dispatch messages to your audience.
        </DialogDescription>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
            Campaign Name
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diwali Flash Sale 2026 / VIP Customer Welcome"
              className="text-xs"
            />
          </label>

          {/* Broadcast Mode Toggle */}
          <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-800">Campaign Execution</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBroadcastNow(true)}
                className={cn(
                  "p-2.5 rounded-sm border text-left transition-all",
                  broadcastNow
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="block text-[11px] font-bold text-indigo-700">🚀 Send Broadcast Now</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Dispatch template messages directly to WhatsApp recipients.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBroadcastNow(false)}
                className={cn(
                  "p-2.5 rounded-sm border text-left transition-all",
                  !broadcastNow
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="block text-[11px] font-bold text-slate-700">📋 Register Campaign Only</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Create a campaign bucket to attach messages via API later.
                </span>
              </button>
            </div>
          </div>

          {broadcastNow && (
            <div className="space-y-3.5 border-t border-slate-100 pt-3">
              {templates.length === 0 ? (
                <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">No approved templates found in client registry</p>
                  <p className="text-[11px] text-amber-800">
                    Go to the <strong>Templates</strong> tab and click <strong>Sync from AiSensy</strong> to pull your approved templates first.
                  </p>
                </div>
              ) : (
                <>
                  <label className="block space-y-1 text-xs font-semibold text-slate-700">
                    Select Approved Template
                    <Select
                      value={selectedTemplate?.id}
                      onValueChange={(val) => {
                        setTemplateId(val);
                        setVariables({});
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.name} · {t.language} ({t.category ?? "MARKETING"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  {/* Template Variable Inputs */}
                  {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                    <div className="space-y-2 rounded-sm border border-slate-200 bg-slate-50/50 p-2.5">
                      <p className="text-[11px] font-semibold text-slate-700 uppercase">
                        Template Variables
                      </p>
                      {selectedTemplate.variables.map((varName) => (
                        <label key={varName} className="block space-y-1 text-xs font-medium text-slate-700">
                          {varName}
                          <Input
                            required
                            placeholder={`Value for {{${varName}}}`}
                            value={variables[varName] ?? ""}
                            onChange={(e) =>
                              setVariables((cur) => ({ ...cur, [varName]: e.target.value }))
                            }
                            className="h-8 text-xs bg-white"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Body Preview */}
                  {selectedTemplate?.body && (
                    <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Message Preview</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedTemplate.body}</p>
                    </div>
                  )}

                  {/* Recipients Selection */}
                  <label className="block space-y-1 text-xs font-semibold text-slate-700">
                    Recipient Phone Numbers
                    <Textarea
                      required={!includeAllContacts}
                      rows={3}
                      placeholder="+919876543210, +919812345678 (comma or line separated)"
                      value={manualPhones}
                      onChange={(e) => setManualPhones(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <p className="text-[11px] text-slate-400 font-normal">
                      Enter the WhatsApp numbers who will receive this broadcast. Include country code (e.g. +91).
                    </p>
                  </label>

                  {contacts.length > 0 && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={includeAllContacts}
                        onChange={(e) => setIncludeAllContacts(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Also send to all ({contacts.length}) saved Client Contacts</span>
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !name.trim() || !companyId || !clientId}
            >
              {createMutation.isPending ? (
                "Launching Broadcast…"
              ) : broadcastNow ? (
                totalRecipientsCount > 0 ? (
                  `🚀 Launch & Send to (${totalRecipientsCount}) Recipients`
                ) : (
                  "🚀 Launch Campaign Broadcast"
                )
              ) : (
                "Register Campaign"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
