import { apiClient } from "@/lib/api/client";
import type { ConversationDetail, ConversationItem, DeskRange, Filters, Overview, Paged, PersonDetail, PersonListItem } from "./types";

type Query = Record<string, string | number | undefined>;
const clean = (query: Query): Query => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));
const base = "/super-admin/assistant";

/** Super Admin only: usage and conversations of the in-app assistant. */
export const assistantDeskApi = {
  overview: (range: DeskRange, signal?: AbortSignal) => apiClient.request<Overview>({ method: "GET", path: `${base}/overview`, query: { range }, signal }),
  filters: (signal?: AbortSignal) => apiClient.request<Filters>({ method: "GET", path: `${base}/filters`, signal }),
  conversations: (query: Query, signal?: AbortSignal) => apiClient.request<Paged<ConversationItem>>({ method: "GET", path: `${base}/conversations`, query: clean(query), signal }),
  conversation: (id: string, signal?: AbortSignal) => apiClient.request<ConversationDetail>({ method: "GET", path: `${base}/conversations/${id}`, signal }),
  people: (query: Query, signal?: AbortSignal) => apiClient.request<Paged<PersonListItem>>({ method: "GET", path: `${base}/people`, query: clean(query), signal }),
  person: (userId: string, query: Query, signal?: AbortSignal) => apiClient.request<PersonDetail>({ method: "GET", path: `${base}/people/${userId}`, query: clean(query), signal }),
};
