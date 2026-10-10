import { apiClient } from "@/lib/api/client";
import type { AiAnalytics, ConversationDetail, ConversationItem, DeskRange, Filters, Overview, Paged, PersonDetail, PersonListItem } from "./types";

type Query = Record<string, string | number | undefined>;
const clean = (query: Query): Query => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));
const base = "/super-admin/assistant";

export type KnowledgeCandidate = {
  id: string;
  companyId: string | null;
  kind: string;
  status: string;
  question: string;
  proposedAnswer: string;
  riskLevel: string;
  evidence: Record<string, unknown> | null;
  reviewNote: string | null;
  createdAt: string;
};

export type KnowledgeFaq = {
  id: string;
  scope: string;
  companyId: string | null;
  question: string;
  answer: string;
  status: string;
  category: string | null;
  updatedAt: string;
};

export type LearningJob = {
  id: string;
  kind: string;
  status: string;
  processed: number;
  candidatesCreated: number;
  duplicatesSkipped: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/** Super Admin only: usage and conversations of the in-app assistant. */
export const assistantDeskApi = {
  overview: (range: DeskRange, signal?: AbortSignal) => apiClient.request<Overview>({ method: "GET", path: `${base}/overview`, query: { range }, signal }),
  aiAnalytics: (range: DeskRange, signal?: AbortSignal) => apiClient.request<AiAnalytics>({ method: "GET", path: `${base}/ai-analytics`, query: { range }, signal }),
  filters: (signal?: AbortSignal) => apiClient.request<Filters>({ method: "GET", path: `${base}/filters`, signal }),
  conversations: (query: Query, signal?: AbortSignal) => apiClient.request<Paged<ConversationItem>>({ method: "GET", path: `${base}/conversations`, query: clean(query), signal }),
  conversation: (id: string, signal?: AbortSignal) => apiClient.request<ConversationDetail>({ method: "GET", path: `${base}/conversations/${id}`, signal }),
  people: (query: Query, signal?: AbortSignal) => apiClient.request<Paged<PersonListItem>>({ method: "GET", path: `${base}/people`, query: clean(query), signal }),
  person: (userId: string, query: Query, signal?: AbortSignal) => apiClient.request<PersonDetail>({ method: "GET", path: `${base}/people/${userId}`, query: clean(query), signal }),
  knowledgeCandidates: (signal?: AbortSignal) => apiClient.request<{ items: KnowledgeCandidate[] }>({ method: "GET", path: `${base}/knowledge/candidates`, signal }),
  knowledgeBase: (signal?: AbortSignal) => apiClient.request<{ faqs: KnowledgeFaq[]; jobs: LearningJob[] }>({ method: "GET", path: `${base}/knowledge/base`, signal }),
  runLearning: () => apiClient.request<LearningJob>({ method: "POST", path: `${base}/knowledge/learning-runs/resolved-tickets` }),
  approveCandidate: (id: string, body: { scope: "COMPANY" | "GLOBAL"; question?: string; answer?: string; note?: string }) => apiClient.request<KnowledgeFaq>({ method: "POST", path: `${base}/knowledge/candidates/${id}/approve`, body }),
  rejectCandidate: (id: string, body: { note?: string }) => apiClient.request<{ rejected: true }>({ method: "POST", path: `${base}/knowledge/candidates/${id}/reject`, body }),
  archiveFaq: (id: string, body: { note?: string }) => apiClient.request<{ archived: true }>({ method: "POST", path: `${base}/knowledge/faqs/${id}/archive`, body }),
  seedEvaluationDefaults: () => apiClient.request<{ items: unknown[] }>({ method: "POST", path: `${base}/evaluations/seed-defaults` }),
  runEvaluations: () => apiClient.request<{ id: string; status: string; totalCases: number; passed: number; failed: number }>({ method: "POST", path: `${base}/evaluations/run` }),
};
