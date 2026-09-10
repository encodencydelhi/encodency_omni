"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  notificationService,
  type NotificationListParams,
} from "../services/notification-service";

export function useNotifications(params: NotificationListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: ({ signal }) => notificationService.list(params, signal),
  });
}

/** Feed for the topbar bell: newest unread first, capped to what fits. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list({ unread: true }),
    queryFn: ({ signal }) =>
      notificationService.list({ pageSize: 6, filters: { readState: "unread" } }, signal),
    refetchInterval: 120_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
