"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { deskApi, supportApi } from "./api";
import type { CreateTicketInput, TicketCategory, TicketDetail, TicketPriority, TicketStatus } from "./types";

/** One cache namespace per side so a mutation can refresh every list, count and chart that depends on a ticket. */
export const COMPANY_KEY = "support";
export const DESK_KEY = "support-desk";

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return ApiError.isApiError(error) && error.message ? error.message : fallback;
}

export function errorReason(error: unknown): string | null {
  return ApiError.isApiError(error) ? (error.reason ?? null) : null;
}

/* --------------------------------------------------------------- Company */

export function useCompanyScope() {
  const { companyId, isReady } = useTenancyContext();
  return { companyId, ready: isReady && Boolean(companyId) };
}

export function useSupportSummary() {
  const { companyId, ready } = useCompanyScope();
  return useQuery({ queryKey: [COMPANY_KEY, companyId, "summary"], enabled: ready, queryFn: ({ signal }) => supportApi.summary(companyId, signal), staleTime: 15_000 });
}

export function useMyTickets(query: Record<string, string | number | undefined>) {
  const { companyId, ready } = useCompanyScope();
  return useQuery({ queryKey: [COMPANY_KEY, companyId, "list", query], enabled: ready, queryFn: ({ signal }) => supportApi.list(companyId, query, signal), placeholderData: keepPreviousData, staleTime: 10_000 });
}

export function useCompanyActivity(page: number) {
  const { companyId, ready } = useCompanyScope();
  return useQuery({ queryKey: [COMPANY_KEY, companyId, "activity", page], enabled: ready, queryFn: ({ signal }) => supportApi.activity(companyId, { page, limit: 20 }, signal), placeholderData: keepPreviousData, staleTime: 10_000 });
}

export function useMyTicket(number: number) {
  const { companyId, ready } = useCompanyScope();
  return useQuery({ queryKey: [COMPANY_KEY, companyId, "ticket", number], enabled: ready && Number.isFinite(number), queryFn: ({ signal }) => supportApi.get(companyId, number, signal), staleTime: 5_000, retry: (count, error) => (ApiError.isApiError(error) && error.status === 404 ? false : count < 2) });
}

/** Runs a Company-side ticket action, shows the result and refreshes everything that shows tickets. */
export function useTicketAction<TInput>(run: (companyId: string, input: TInput) => Promise<TicketDetail>, success: string) {
  const { companyId } = useCompanyScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(companyId, input),
    onSuccess: (ticket) => {
      queryClient.setQueryData([COMPANY_KEY, companyId, "ticket", ticket.number], ticket);
      void queryClient.invalidateQueries({ queryKey: [COMPANY_KEY, companyId] });
      if (success) toast.success(success);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCreateTicket() {
  return useTicketAction<CreateTicketInput>((companyId, input) => supportApi.create(companyId, input), "");
}

/* ------------------------------------------------------------------ Desk */

const DESK_STALE = 15_000;

export const useDeskOverview = () => useQuery({ queryKey: [DESK_KEY, "overview"], queryFn: ({ signal }) => deskApi.overview(signal), staleTime: DESK_STALE, refetchInterval: 60_000 });
export const useDeskQueues = () => useQuery({ queryKey: [DESK_KEY, "queues"], queryFn: ({ signal }) => deskApi.queues(signal), staleTime: DESK_STALE, refetchInterval: 60_000 });
export const useDeskStaff = () => useQuery({ queryKey: [DESK_KEY, "staff"], queryFn: ({ signal }) => deskApi.staff(signal), staleTime: 60_000 });
export const useDeskSla = () => useQuery({ queryKey: [DESK_KEY, "sla"], queryFn: ({ signal }) => deskApi.sla(signal), staleTime: DESK_STALE, refetchInterval: 60_000 });
export const useDeskWorkload = () => useQuery({ queryKey: [DESK_KEY, "workload"], queryFn: ({ signal }) => deskApi.workload(signal), staleTime: DESK_STALE });
export const useDeskReports = (range: string) => useQuery({ queryKey: [DESK_KEY, "reports", range], queryFn: ({ signal }) => deskApi.reports(range, signal), staleTime: 30_000, placeholderData: keepPreviousData });
export const useDeskActivity = (query: Record<string, string | number | undefined>) => useQuery({ queryKey: [DESK_KEY, "activity", query], queryFn: ({ signal }) => deskApi.activity(query, signal), placeholderData: keepPreviousData, staleTime: DESK_STALE });
export const useDeskTickets = (query: Record<string, string | number | undefined>) =>
  useQuery({ queryKey: [DESK_KEY, "list", query], queryFn: ({ signal }) => deskApi.list(query, signal), placeholderData: keepPreviousData, staleTime: 10_000, refetchInterval: 30_000 });
export const useDeskTicket = (number: number) =>
  useQuery({ queryKey: [DESK_KEY, "ticket", number], enabled: Number.isFinite(number), queryFn: ({ signal }) => deskApi.get(number, signal), staleTime: 5_000, refetchInterval: 20_000, retry: (count, error) => (ApiError.isApiError(error) && error.status === 404 ? false : count < 2) });

function useDeskMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>, success: string | ((result: TResult) => string)) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (result) => {
      const detail = result as unknown as { number?: number };
      if (detail && typeof detail === "object" && "messages" in (result as object) && typeof detail.number === "number") queryClient.setQueryData([DESK_KEY, "ticket", detail.number], result);
      void queryClient.invalidateQueries({ queryKey: [DESK_KEY] });
      const message = typeof success === "function" ? success(result) : success;
      if (message) toast.success(message);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export const useDeskReply = () => useDeskMutation((input: { number: number; body: string; visibility: "public" | "internal"; nextStatus?: TicketStatus }) => deskApi.reply(input.number, { body: input.body, visibility: input.visibility, nextStatus: input.nextStatus }), (t) => (t.messages.at(-1)?.internal ? "Internal note added." : "Reply sent to the customer."));
export const useDeskAssign = () => useDeskMutation((input: { number: number; assigneeId: string | null }) => deskApi.assign(input.number, input.assigneeId), (t) => (t.assignee ? `Assigned to ${t.assignee.name}.` : "Ticket unassigned."));
export const useDeskStatus = () => useDeskMutation((input: { number: number; status: TicketStatus; message?: string }) => deskApi.setStatus(input.number, input.status, input.message), "Status updated.");
export const useDeskPriority = () => useDeskMutation((input: { number: number; priority: TicketPriority }) => deskApi.setPriority(input.number, input.priority), "Priority updated. SLA deadlines were recalculated.");
export const useDeskCategory = () => useDeskMutation((input: { number: number; category: TicketCategory }) => deskApi.setCategory(input.number, input.category), "Category updated.");
export const useDeskBulk = () => useDeskMutation((input: Parameters<typeof deskApi.bulk>[0]) => deskApi.bulk(input), (r) => `${r.updated} ticket${r.updated === 1 ? "" : "s"} updated${r.skipped.length ? `, ${r.skipped.length} skipped` : ""}.`);
