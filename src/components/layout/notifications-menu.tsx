"use client";

import { useState } from "react";
import { BellIcon, Check, CheckCheckIcon, InboxIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, canAccessSuperAdmin } from "@/config/routes";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRecentNotifications,
  useUnreadNotifications,
} from "@/features/notifications/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import type { NotificationSeverity } from "@/types/domain/notification";

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

export function NotificationsMenu() {
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const { user } = useAuth();
  const isSuperAdmin = canAccessSuperAdmin(user?.role);

  const unreadQuery = useUnreadNotifications();
  const unreadCount = unreadQuery.data?.pagination.total ?? 0;

  const listQuery = useRecentNotifications(tab);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = listQuery.data?.data ?? [];
  const isPending = listQuery.isPending;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 shadow-xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 cursor-pointer"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <BellIcon className="size-[17px]" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#E20611] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in-75">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] sm:w-[410px] p-0 shadow-2xl border border-slate-200/90 rounded-xl overflow-hidden bg-white z-50">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-slate-900">Notifications</span>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-red-100/80 px-2 py-0.5 text-[11px] font-semibold text-[#E20611]">
                {unreadCount} new
              </span>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1 px-2 hover:bg-slate-200/60"
            >
              <CheckCheckIcon className="size-3.5" />
              <span>Mark all read</span>
            </Button>
          ) : null}
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
              tab === "unread"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 ? (
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", tab === "unread" ? "bg-white/20 text-white" : "bg-red-100 text-[#E20611]")}>
                {unreadCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer",
              tab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
            )}
          >
            All
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {isPending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title={tab === "unread" ? "You're all caught up" : "No notifications"}
              description={
                tab === "unread"
                  ? "No unread notifications right now. Any new platform, campaign or security updates will appear here."
                  : "You haven't received any notifications yet."
              }
              size="sm"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const body = (
                  <div className="flex gap-3 items-start">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        SEVERITY_DOT[notification.severity] ?? "bg-blue-500",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[13px] leading-snug", !notification.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>
                          {notification.title}
                        </p>
                        {!notification.isRead ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead.mutate(notification.id);
                            }}
                            title="Mark as read"
                            className="size-5 rounded grid place-items-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                          >
                            <Check className="size-3" />
                          </button>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span className="capitalize font-medium text-slate-500">{notification.category}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={notification.id} className={cn("transition-colors", !notification.isRead ? "bg-slate-50/50 hover:bg-slate-100/70" : "hover:bg-slate-50")}>
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => {
                          if (!notification.isRead) markRead.mutate(notification.id);
                        }}
                        className="block px-4 py-3"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        onClick={() => {
                          if (!notification.isRead) markRead.mutate(notification.id);
                        }}
                        className={cn("px-4 py-3", !notification.isRead ? "cursor-pointer" : "")}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
          {isSuperAdmin ? (
            <Button variant="ghost" size="sm" asChild className="w-full justify-center text-xs text-slate-600 hover:text-slate-900">
              <Link href={ROUTES.superAdmin.notifications}>View all in Notifications Center</Link>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time workspace notifications</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
