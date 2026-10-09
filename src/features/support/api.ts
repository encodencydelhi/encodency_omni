import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type {
  BulkResult,
  CompanyActivity,
  CreateTicketInput,
  DeskActivity,
  DeskDetail,
  DeskItem,
  DeskOverview,
  DeskQueues,
  DeskReports,
  DeskSla,
  DeskWorkload,
  Paged,
  StaffMember,
  SupportSummary,
  TicketCategory,
  TicketDetail,
  TicketList,
  TicketPriority,
  TicketStatus,
} from "./types";

type Query = Record<string, string | number | undefined>;

const clean = (query: Query): Query => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));

/** Company side: `/support/*`, always for the Company the user is working in. */
export const supportApi = {
  summary: (companyId: string, signal?: AbortSignal) => apiClient.request<SupportSummary>({ method: "GET", path: "/support/summary", headers: companyScopeHeaders(companyId), signal }),
  list: (companyId: string, query: Query, signal?: AbortSignal) => apiClient.request<TicketList>({ method: "GET", path: "/support/tickets", query: clean(query), headers: companyScopeHeaders(companyId), signal }),
  activity: (companyId: string, query: Query, signal?: AbortSignal) => apiClient.request<CompanyActivity>({ method: "GET", path: "/support/activity", query: clean(query), headers: companyScopeHeaders(companyId), signal }),
  get: (companyId: string, number: number, signal?: AbortSignal) => apiClient.request<TicketDetail>({ method: "GET", path: `/support/tickets/${number}`, headers: companyScopeHeaders(companyId), signal }),
  create: (companyId: string, body: CreateTicketInput) => apiClient.request<TicketDetail>({ method: "POST", path: "/support/tickets", body, headers: companyScopeHeaders(companyId) }),
  reply: (companyId: string, number: number, body: string) => apiClient.request<TicketDetail>({ method: "POST", path: `/support/tickets/${number}/messages`, body: { body }, headers: companyScopeHeaders(companyId) }),
  reopen: (companyId: string, number: number, reason?: string) => apiClient.request<TicketDetail>({ method: "POST", path: `/support/tickets/${number}/reopen`, body: { reason }, headers: companyScopeHeaders(companyId) }),
  close: (companyId: string, number: number) => apiClient.request<TicketDetail>({ method: "POST", path: `/support/tickets/${number}/close`, headers: companyScopeHeaders(companyId) }),
  rate: (companyId: string, number: number, rating: number, comment?: string) => apiClient.request<TicketDetail>({ method: "POST", path: `/support/tickets/${number}/rating`, body: { rating, comment }, headers: companyScopeHeaders(companyId) }),
};

/** Super Admin side: `/super-admin/support/*`. */
export const deskApi = {
  overview: (signal?: AbortSignal) => apiClient.request<DeskOverview>({ method: "GET", path: "/super-admin/support/overview", signal }),
  queues: (signal?: AbortSignal) => apiClient.request<DeskQueues>({ method: "GET", path: "/super-admin/support/queues", signal }),
  staff: (signal?: AbortSignal) => apiClient.request<StaffMember[]>({ method: "GET", path: "/super-admin/support/staff", signal }),
  sla: (signal?: AbortSignal) => apiClient.request<DeskSla>({ method: "GET", path: "/super-admin/support/sla", signal }),
  workload: (signal?: AbortSignal) => apiClient.request<DeskWorkload>({ method: "GET", path: "/super-admin/support/workload", signal }),
  reports: (range: string, signal?: AbortSignal) => apiClient.request<DeskReports>({ method: "GET", path: "/super-admin/support/reports", query: { range }, signal }),
  activity: (query: Query, signal?: AbortSignal) => apiClient.request<DeskActivity>({ method: "GET", path: "/super-admin/support/activity", query: clean(query), signal }),
  list: (query: Query, signal?: AbortSignal) => apiClient.request<Paged<DeskItem>>({ method: "GET", path: "/super-admin/support/tickets", query: clean(query), signal }),
  get: (number: number, signal?: AbortSignal) => apiClient.request<DeskDetail>({ method: "GET", path: `/super-admin/support/tickets/${number}`, signal }),
  reply: (number: number, body: { body: string; visibility: "public" | "internal"; nextStatus?: TicketStatus }) => apiClient.request<DeskDetail>({ method: "POST", path: `/super-admin/support/tickets/${number}/reply`, body }),
  assign: (number: number, assigneeId: string | null) => apiClient.request<DeskDetail>({ method: "PUT", path: `/super-admin/support/tickets/${number}/assignee`, body: { assigneeId } }),
  setStatus: (number: number, status: TicketStatus, message?: string) => apiClient.request<DeskDetail>({ method: "PUT", path: `/super-admin/support/tickets/${number}/status`, body: { status, message: message || undefined } }),
  setPriority: (number: number, priority: TicketPriority) => apiClient.request<DeskDetail>({ method: "PUT", path: `/super-admin/support/tickets/${number}/priority`, body: { priority } }),
  setCategory: (number: number, category: TicketCategory) => apiClient.request<DeskDetail>({ method: "PUT", path: `/super-admin/support/tickets/${number}/category`, body: { category } }),
  bulk: (body: { numbers: number[]; action: "assign" | "status" | "priority"; assigneeId?: string | null; status?: TicketStatus; priority?: TicketPriority }) => apiClient.request<BulkResult>({ method: "POST", path: "/super-admin/support/tickets/bulk", body }),
};
