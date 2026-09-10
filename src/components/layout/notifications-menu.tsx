"use client";

import { BellIcon, CheckCheckIcon, InboxIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotifications,
} from "@/features/notifications/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { NOTIFICATION_SEVERITY, type NotificationSeverity } from "@/types/domain/notification";

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

export function NotificationsMenu() {
  const { data, isPending } = useUnreadNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.pagination.total ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.5625rem] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[0.8125rem] font-semibold text-foreground">Notifications</p>
            <p className="text-2xs text-muted-foreground">
              {unreadCount === 0 ? "You are all caught up" : `${unreadCount} unread`}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5"
            >
              <CheckCheckIcon />
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-88 overflow-y-auto scrollbar-thin">
          {isPending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Nothing needs your attention"
              description="New platform, billing and security alerts will appear here."
              size="sm"
            />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const body = (
                  <div className="flex gap-3">
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[notification.severity])}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[0.8125rem] font-medium leading-snug text-foreground">
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="pt-0.5 text-2xs text-muted-foreground">
                        {NOTIFICATION_SEVERITY[notification.severity].label} ·{" "}
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={notification.id}>
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => markRead.mutate(notification.id)}
                        className="block px-4 py-3 transition-colors hover:bg-accent"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" asChild className="w-full justify-center">
            <Link href={ROUTES.superAdmin.notifications}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
