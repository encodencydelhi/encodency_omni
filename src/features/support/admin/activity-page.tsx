"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, CheckCircle2, Headset, MessageCircle, RotateCcw, Star, Ticket, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { errorMessage, useCompanyActivity } from "../hooks";
import { dateTime, timeAgo } from "../time";
import { describeEvent } from "../thread";
import { btn, EmptyState, ListSkeleton, Notice, Pager, Section } from "../ui";

const ICONS: Record<string, { icon: typeof Activity; className: string }> = {
  created: { icon: Ticket, className: "bg-blue-50 text-blue-600" },
  replied: { icon: MessageCircle, className: "bg-violet-50 text-violet-600" },
  status_changed: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" },
  closed: { icon: CheckCircle2, className: "bg-slate-100 text-slate-600" },
  reopened: { icon: RotateCcw, className: "bg-amber-50 text-amber-700" },
  rated: { icon: Star, className: "bg-amber-50 text-amber-600" },
  assigned: { icon: UserCheck, className: "bg-cyan-50 text-cyan-700" },
};

export function SupportActivityPage() {
  const [page, setPage] = useState(1);
  const activity = useCompanyActivity(page);

  return (
    <Section title="Activity" description="Everything that happened on your tickets, newest first." flush>
      {activity.isError ? (
        <div className="p-4">
          <Notice tone="red" title="Activity could not be loaded" action={<button type="button" className={btn} onClick={() => void activity.refetch()}>Try again</button>}>
            {errorMessage(activity.error)}
          </Notice>
        </div>
      ) : activity.isLoading ? (
        <ListSkeleton rows={8} />
      ) : activity.data && activity.data.items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Replies, status changes and ratings on your tickets show up here." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {activity.data?.items.map((item) => {
            const meta = ICONS[item.kind] ?? { icon: item.isSupport ? Headset : Activity, className: "bg-slate-100 text-slate-600" };
            return (
              <li key={item.id}>
                <Link href={`/admin/support/tickets/${item.ticket.number}`} className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm", meta.className)}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">{describeEvent(item)}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                      #{item.ticket.number} · {item.ticket.subject}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[11px] font-medium text-slate-500">
                    <p className="font-semibold text-slate-700">{item.actor}</p>
                    <p title={dateTime(item.createdAt)}>{timeAgo(item.createdAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {activity.data && <Pager page={activity.data.page} limit={activity.data.limit} total={activity.data.total} noun="events" onPage={setPage} />}
    </Section>
  );
}
