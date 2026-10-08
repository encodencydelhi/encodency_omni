"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi } from "@/features/admin/content/live/scheduling-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { calendarApi, type CalendarQuery } from "./calendar-api";

const KEY = ["admin", "calendar"] as const;

export function useCalendar(query: CalendarQuery, enabled = true) {
  const { companyId, isReady } = useTenancyContext();
  return useQuery({
    queryKey: [...KEY, companyId, query],
    queryFn: ({ signal }) => calendarApi.list(companyId, query, signal),
    enabled: enabled && isReady && Boolean(companyId),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

/** Cancels a scheduled post (the existing Client-scoped route, with that post's Client). */
export function useCancelScheduledPost() {
  const { companyId } = useTenancyContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, postId }: { clientId: string; postId: string }) => schedulingApi.cancel(companyId, clientId, postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["admin", "company-overview"] });
    },
  });
}
