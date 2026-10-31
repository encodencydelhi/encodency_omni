import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { env } from "@/config/env";

/** Cross-channel report files and schedules of ONE client (`/reports/exports`, `/reports/schedules`). */

export type ReportFormat = "pdf" | "csv";
export type ReportDelivery = { channel: "email" | "in_app"; status: "sent" | "failed" | "skipped"; reason: string | null; recipient: string | null; lastError: string | null; createdAt: string };
export interface WorkspaceReportRow {
  id: string;
  title: string;
  format: ReportFormat;
  rangeDays: number;
  status: "completed" | "failed";
  fileName: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  scheduled: boolean;
  scheduleId: string | null;
  createdAt: string;
  expiresAt: string;
  deliveries?: ReportDelivery[];
}
export interface WorkspaceSchedule {
  id: string;
  name: string;
  format: ReportFormat;
  frequency: "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;
  rangeDays: number;
  recipients: string[];
  deliverInApp: boolean;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastReportId: string | null;
  createdAt: string;
}
export type ScheduleInput = Partial<Omit<WorkspaceSchedule, "id" | "nextRunAt" | "lastRunAt" | "lastStatus" | "lastReportId" | "createdAt">>;
export interface WorkspaceReportStatus {
  scheduler: { enabled: boolean; reason: string | null };
  email: { configured: boolean; via: "company" | "platform" | null; reason: string | null };
  limits: { recipientsPerSchedule: number; schedulesPerClient: number; retentionDays: number; periods: number[]; formats: ReportFormat[] };
}

const headers = (clientId: string) => companyScopeHeaders(getStoredCompanyId(), { "x-client-id": clientId });
const base = "/reports";

export const workspaceReportsService = {
  status: (clientId: string, signal?: AbortSignal) => apiClient.request<WorkspaceReportStatus>({ method: "GET", path: `${base}/exports/status`, headers: headers(clientId), signal }),
  list: (clientId: string, signal?: AbortSignal) => apiClient.request<{ items: WorkspaceReportRow[] }>({ method: "GET", path: `${base}/exports`, headers: headers(clientId), signal }),
  generate: (clientId: string, body: { format: ReportFormat; rangeDays: number }) => apiClient.request<WorkspaceReportRow>({ method: "POST", path: `${base}/exports`, headers: headers(clientId), body }),
  remove: (clientId: string, id: string) => apiClient.request<{ deleted: true }>({ method: "DELETE", path: `${base}/exports/${encodeURIComponent(id)}`, headers: headers(clientId) }),
  schedules: (clientId: string, signal?: AbortSignal) => apiClient.request<{ items: WorkspaceSchedule[] }>({ method: "GET", path: `${base}/schedules`, headers: headers(clientId), signal }),
  createSchedule: (clientId: string, body: ScheduleInput) => apiClient.request<WorkspaceSchedule>({ method: "POST", path: `${base}/schedules`, headers: headers(clientId), body }),
  updateSchedule: (clientId: string, id: string, body: ScheduleInput) => apiClient.request<WorkspaceSchedule>({ method: "PATCH", path: `${base}/schedules/${encodeURIComponent(id)}`, headers: headers(clientId), body }),
  deleteSchedule: (clientId: string, id: string) => apiClient.request<{ deleted: true }>({ method: "DELETE", path: `${base}/schedules/${encodeURIComponent(id)}`, headers: headers(clientId) }),
  runSchedule: (clientId: string, id: string) => apiClient.request<WorkspaceReportRow>({ method: "POST", path: `${base}/schedules/${encodeURIComponent(id)}/run`, headers: headers(clientId), body: {} }),
  /** The file is private: it is fetched with the session cookie and handed to the browser as a blob, never as a public URL. */
  async download(clientId: string, id: string): Promise<{ blob: Blob; fileName: string }> {
    const response = await fetch(`${env.apiBaseUrl}${base}/exports/${encodeURIComponent(id)}/download`, { credentials: "include", headers: { "ngrok-skip-browser-warning": "true", ...headers(clientId) } });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(Array.isArray(body.message) ? body.message.join(" ") : body.message ?? "The report could not be downloaded.");
    }
    const fileName = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? `report-${id}`;
    return { blob: await response.blob(), fileName };
  },
};
