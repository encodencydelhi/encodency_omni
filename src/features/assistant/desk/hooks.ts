"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/types/api";
import { assistantDeskApi } from "./api";
import type { DeskRange } from "./types";

export const ASSISTANT_DESK_KEY = "assistant-desk";
type Query = Record<string, string | number | undefined>;

export const useAssistantOverview = (range: DeskRange) =>
  useQuery({ queryKey: [ASSISTANT_DESK_KEY, "overview", range], queryFn: ({ signal }) => assistantDeskApi.overview(range, signal), placeholderData: keepPreviousData, staleTime: 20_000, refetchInterval: 60_000 });

export const useAssistantFilters = () => useQuery({ queryKey: [ASSISTANT_DESK_KEY, "filters"], queryFn: ({ signal }) => assistantDeskApi.filters(signal), staleTime: 60_000 });

export const useAssistantConversations = (query: Query) =>
  useQuery({ queryKey: [ASSISTANT_DESK_KEY, "conversations", query], queryFn: ({ signal }) => assistantDeskApi.conversations(query, signal), placeholderData: keepPreviousData, staleTime: 10_000 });

export const useAssistantConversation = (id: string) =>
  useQuery({ queryKey: [ASSISTANT_DESK_KEY, "conversation", id], queryFn: ({ signal }) => assistantDeskApi.conversation(id, signal), staleTime: 30_000, retry: (count, error) => (ApiError.isApiError(error) && error.status === 404 ? false : count < 2) });

export const useAssistantPeople = (query: Query) =>
  useQuery({ queryKey: [ASSISTANT_DESK_KEY, "people", query], queryFn: ({ signal }) => assistantDeskApi.people(query, signal), placeholderData: keepPreviousData, staleTime: 15_000 });

export const useAssistantPerson = (userId: string, query: Query) =>
  useQuery({ queryKey: [ASSISTANT_DESK_KEY, "person", userId, query], queryFn: ({ signal }) => assistantDeskApi.person(userId, query, signal), placeholderData: keepPreviousData, staleTime: 15_000, retry: (count, error) => (ApiError.isApiError(error) && error.status === 404 ? false : count < 2) });
