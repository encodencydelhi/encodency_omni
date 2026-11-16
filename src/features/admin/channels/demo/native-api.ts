import { HttpTransport } from "@/lib/api/http-transport";
import { env } from "@/config/env";
import type { Workspace } from "./mock-service";
import type { WhatsAppOverviewAnalytics, WhatsAppAnalyticsQuery } from "../live/whatsapp-api";
import type { AIRequest, AIResult } from "./ai-model";

export const nativeWhatsAppEnabled = env.dataSource === "api" && process.env.NEXT_PUBLIC_WHATSAPP_V2_BACKEND !== "false";
const transport = new HttpTransport();
const root = "/integrations/whatsapp/v2";
const modeByScope = new Map<string, "MOCK" | "META">();
/** The real mode of a workspace once its snapshot has loaded (so screens never call a live account "simulated"). */
export const nativeModeFor = (scope: string) => modeByScope.get(scope);
function assertMockScope(scope: string) { if (modeByScope.get(scope) !== "MOCK") throw new Error("Live Meta operations are not enabled in this frontend phase. Select a simulated workspace."); }
export interface NativeConnection {
  configured: boolean; status: string; mode: "MOCK" | "META"; origin: "SIMULATED" | "META";
  revision: number; readiness: Record<string, boolean | string>; displayPhone?: string; hasAccessToken?: boolean;
}
export interface NativeEnvelope {
  mode: "MOCK" | "META"; origin: "SIMULATED" | "META"; revision: number;
  connection: NativeConnection; workspace: Workspace;
  access: { canEdit: boolean; canManage: boolean; canSend: boolean; canConfigure: boolean; canBill: boolean };
  agents: { id: string; name: string }[];
}
export interface NativeChange { entity: string; action: "SAVE" | "DELETE"; id?: string; data: Record<string, unknown>; }
export function nativeScopeHeaders(scope: string): Record<string, string> {
  const parsed: unknown = JSON.parse(scope);
  if (!Array.isArray(parsed) || parsed[0] !== "whatsapp" || !parsed[1] || !parsed[2]) throw new Error("Select an authorized company and client first.");
  return { "x-company-id": String(parsed[1]), "x-client-id": String(parsed[2]) };
}
function request<T>(scope: string, method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", path: string, body?: unknown, signal?: AbortSignal, query?: Record<string, string | undefined>) {
  return transport.request<T>({ method, path: root + path, body, signal, headers: nativeScopeHeaders(scope), query });
}
function normalizeEnvelope(scope: string, envelope: NativeEnvelope) { modeByScope.set(scope, envelope.mode); envelope.workspace.messages = envelope.workspace.messages.map(message => ({ ...message, time: new Date(message.createdAt || message.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) })); envelope.workspace.campaigns = envelope.workspace.campaigns.map(campaign => { if (!campaign.scheduledAt) return campaign; const date = new Date(campaign.scheduledAt); return { ...campaign, scheduledAt: new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }; }); return envelope; }
export const nativeWhatsAppApi = {
  records: <T>(scope: string, path: string) => request<{ items: T[] }>(scope, "GET", path),
  patch: (scope: string, path: string, data: Record<string, unknown>) => { assertMockScope(scope); return request<unknown>(scope, "PATCH", path, { data }); },
  async snapshot(scope: string, signal?: AbortSignal) { return normalizeEnvelope(scope, await request<NativeEnvelope>(scope, "GET", "/workspace", undefined, signal)); },
  async mutate(scope: string, expectedRevision: number, changes: NativeChange[]) { assertMockScope(scope); return normalizeEnvelope(scope, await request<NativeEnvelope>(scope, "PUT", "/workspace", { expectedRevision, changes })); },
  command: <T = unknown>(scope: string, path: string, body: unknown = {}) => { assertMockScope(scope); return request<T>(scope, "POST", path, body); },
  remove: (scope: string, path: string) => { assertMockScope(scope); return request<unknown>(scope, "DELETE", path); },
  action: (scope: string, path: string, body: unknown = {}) => { assertMockScope(scope); return request<unknown>(scope, "POST", path, body); },
  analytics: (scope: string, query: WhatsAppAnalyticsQuery = {}, signal?: AbortSignal) => request<WhatsAppOverviewAnalytics>(scope, "GET", "/analytics/overview", undefined, signal, query as Record<string, string | undefined>),
  // Webhook endpoint management is configuration, not a provider operation, so it is available in every mode.
  webhookEndpoints: (scope: string) => request<{ items: NativeWebhookEndpoint[]; events: string[] }>(scope, "GET", "/webhook-endpoints"),
  createWebhookEndpoint: (scope: string, input: { url: string; events: string[] }) => request<NativeWebhookEndpoint & { secret: string }>(scope, "POST", "/webhook-endpoints", input),
  testWebhookEndpoint: (scope: string, id: string) => request<{ queued: boolean }>(scope, "POST", `/webhook-endpoints/${encodeURIComponent(id)}/test`, {}),
  removeWebhookEndpoint: (scope: string, id: string) => request<{ removed: boolean }>(scope, "DELETE", `/webhook-endpoints/${encodeURIComponent(id)}`),
  // Deleting removes the template at the provider too, so it stays limited to simulation until live changes are authorised.
  removeTemplate: (scope: string, id: string) => { assertMockScope(scope); return request<{ id: string; deleted: boolean }>(scope, "DELETE", `/templates/${encodeURIComponent(id)}`); },
  linkTracking: (scope: string) => request<{ baseUrl: string | null }>(scope, "GET", "/link-tracking"),
  campaignReport: (scope: string, id: string) => request<CampaignReport>(scope, "GET", `/campaigns/${encodeURIComponent(id)}/report`),
  campaignRecipients: (scope: string, id: string, query: { page: number; limit: number; status?: string; query?: string }) => request<{ total: number; page: number; limit: number; items: CampaignRecipientRow[] }>(scope, "GET", `/campaigns/${encodeURIComponent(id)}/recipients`, undefined, undefined, { page: String(query.page), limit: String(query.limit), status: query.status, query: query.query }),
  campaignExport: (scope: string, id: string) => request<{ filename: string; rows: string[][] }>(scope, "GET", `/campaigns/${encodeURIComponent(id)}/export`),
  campaignEstimate: (scope: string, id: string) => request<CampaignEstimate>(scope, "GET", `/campaigns/${encodeURIComponent(id)}/estimate`),
  // A test send is a real send in live mode, so it stays limited to simulation until live sending is authorised.
  campaignTest: (scope: string, id: string, input: { phone: string; ownNumberConfirmed: boolean }) => { assertMockScope(scope); return request<{ messageId: string; status: string }>(scope, "POST", `/campaigns/${encodeURIComponent(id)}/test`, input); },
  stopCampaignSeries: (scope: string, id: string) => request<{ id: string; stoppedJobs: number }>(scope, "POST", `/campaigns/${encodeURIComponent(id)}/stop-series`, {}),
  campaignRetarget: (scope: string, id: string, input: { segment: "FAILED" | "NOT_DELIVERED" | "NOT_READ" | "READ_NO_REPLY" | "REPLIED" | "CLICKED"; name?: string }) => request<{ id: string; name: string; recipients: number; segment: string }>(scope, "POST", `/campaigns/${encodeURIComponent(id)}/retarget`, input),
  diagnostics: (scope: string) => request<NativeDiagnostics>(scope, "GET", "/diagnostics"),
  usage: (scope: string, period?: string) => request<NativeUsage>(scope, "GET", "/billing/usage", undefined, undefined, { period }),
  async upload(scope: string, file: File) { assertMockScope(scope); const form = new FormData(); form.append("file", file); return request<{ id: string; name: string; mimeType: string; bytes: number }>(scope, "POST", "/media/upload", form); },
  removeMedia: (scope: string, id: string) => { assertMockScope(scope); return request<unknown>(scope, "DELETE", `/media/${encodeURIComponent(id)}`); },
  async mediaUrl(scope: string, id: string) {
    assertMockScope(scope);
    const response = await fetch(`${env.apiBaseUrl}${root}/media/${encodeURIComponent(id)}/download`, { credentials: "include", headers: nativeScopeHeaders(scope), cache: "no-store" });
    if (!response.ok) throw new Error("This attachment could not be downloaded. Check access and provider availability.");
    return URL.createObjectURL(await response.blob());
  },
  async ai(scope: string, input: AIRequest, signal?: AbortSignal): Promise<AIResult> {
    const result = await request<Omit<AIResult, "scope"> & { provider: "mock" | "openai" }>(scope, "POST", "/ai/suggestions", { task: input.task, prompt: input.prompt, tone: input.tone, language: input.language, contactId: input.targetContactId, includeContext: !!input.context, ...(input.context?.draft ? { context: { draft: input.context.draft } } : {}) }, signal);
    return { ...result, scope: input.scope };
  },
};
export interface CampaignReport { origin: "SIMULATED" | "META"; campaign: { id: string; name: string; kind: string; status: string; scheduledAt: string | null; activatedAt: string | null; completedAt: string | null; template: { name: string; category: string; language: string } | null }; funnel: { total: number; pending: number; sent: number; delivered: number; read: number; replied: number; clicked: number; failed: number; suppressed: number; cancelled: number }; rates: { delivery: number; read: number; reply: number; click: number; failure: number }; failureReasons: { code: string | null; reason: string; count: number }[]; buttons: { kind: "URL_CLICK" | "QUICK_REPLY"; label: string; events: number; contacts: number }[]; replyWindowDays: number }
export interface CampaignRecipientRow { contactId: string; name: string; phone: string; status: string; failureCode: string | null; failureReason: string; messageId: string | null; providerMessageId: string | null; lastStatusAt: string | null }
export interface CampaignEstimate { origin: "SIMULATED" | "META"; recipients: number; category: string | null; available: boolean; currency: string | null; perMessageMinor: number | null; totalMinor: number | null; note: string }
export interface NativeWebhookEndpoint { id: string; url: string; events: string[]; active: boolean; lastSuccessAt: string | null; lastFailureAt: string | null; createdAt: string }
export interface NativeDiagnostics { mode: "MOCK" | "META"; origin: "SIMULATED" | "META"; ready: boolean; checks: { key: string; ok: boolean; required: boolean; hint: string }[] }
export interface NativeUsage { origin: "SIMULATED" | "META"; period: string; currency: string; budgetMinor: number; estimatedCostAvailable: boolean; payable: boolean; items: { category: string; currency: string; messages: number; simulatedCostMinor?: number | null; estimatedCostMinor: number; reconciledCostMinor: number | null }[]; statements: { id: string; period: string; currency: string; status: string; estimatedCostMinor: number; simulatedCostMinor?: number | null; reconciledCostMinor: number | null }[]; }

export function workspaceChanges(before: Workspace, after: Workspace): NativeChange[] {
  const changes: NativeChange[] = [];
  for (const entity of ["contacts", "templates", "campaigns", "workflows", "flows", "media", "messages"] as const) {
    const old = new Map(before[entity].map(row => [row.id, row])); const next = new Map(after[entity].map(row => [row.id, row]));
    for (const [id, row] of next) if (JSON.stringify(row) !== JSON.stringify(old.get(id))) {
      const data = { ...row } as Record<string, unknown>;
      if (entity === "campaigns") { if (data.scheduledAt) data.scheduledAt = new Date(String(data.scheduledAt)).toISOString(); data.timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone; }
      changes.push({ entity, action: "SAVE", id, data });
    }
    for (const id of old.keys()) if (!next.has(id) && ["contacts", "media"].includes(entity)) changes.push({ entity, action: "DELETE", id, data: {} });
  }
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) changes.push({ entity: "settings", action: "SAVE", data: { ...after.settings } });
  if (JSON.stringify(before.replyDrafts || {}) !== JSON.stringify(after.replyDrafts || {})) changes.push({ entity: "replyDrafts", action: "SAVE", data: { ...after.replyDrafts } });
  return changes;
}
