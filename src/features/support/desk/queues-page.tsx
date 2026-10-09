"use client";

import Link from "next/link";
import { AlertOctagon, Bookmark, CheckCircle2, Hourglass, Inbox, MessageCircleQuestion, Timer, Trash2, UserCheck, UserX, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL } from "../labels";
import { errorMessage, useDeskQueues } from "../hooks";
import { btn, EmptyState, Notice, Section, Skeleton } from "../ui";
import { useSavedViews } from "./saved-views";

const INBOX = "/super-admin/support/inbox";

const QUEUES: Array<{ id: keyof NonNullable<ReturnType<typeof useDeskQueues>["data"]>["queues"]; queue: string; title: string; hint: string; icon: ComponentType<{ className?: string }>; tone: string }> = [
  { id: "all", queue: "all", title: "All open", hint: "Every ticket that is not solved or closed.", icon: Inbox, tone: "bg-slate-100 text-slate-600" },
  { id: "unassigned", queue: "unassigned", title: "Unassigned", hint: "Nobody owns these yet. Pick them up first.", icon: UserX, tone: "bg-amber-50 text-amber-700" },
  { id: "mine", queue: "mine", title: "Assigned to me", hint: "Tickets you own and still have to move.", icon: UserCheck, tone: "bg-blue-50 text-blue-700" },
  { id: "urgent", queue: "urgent", title: "Urgent", hint: "Highest priority: stopped work or money at risk.", icon: Zap, tone: "bg-rose-50 text-rose-700" },
  { id: "breached", queue: "breached", title: "SLA breached", hint: "Already past a first-reply or solve deadline.", icon: AlertOctagon, tone: "bg-rose-50 text-rose-700" },
  { id: "atRisk", queue: "at_risk", title: "SLA at risk", hint: "Less than a quarter of the time is left.", icon: Timer, tone: "bg-amber-50 text-amber-700" },
  { id: "unanswered", queue: "unanswered", title: "No reply yet", hint: "The customer has not had a first answer.", icon: MessageCircleQuestion, tone: "bg-amber-50 text-amber-700" },
  { id: "waiting", queue: "waiting", title: "Waiting on customer", hint: "We asked a question; the SLA clock is paused.", icon: Hourglass, tone: "bg-slate-100 text-slate-600" },
  { id: "resolved", queue: "resolved", title: "Resolved this week", hint: "Solved or closed in the last 7 days.", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
];

export function DeskQueuesPage() {
  const queues = useDeskQueues();
  const saved = useSavedViews();
  const data = queues.data;

  if (queues.isError) {
    return (
      <Notice tone="red" title="Queues could not be loaded" action={<button type="button" className={btn} onClick={() => void queues.refetch()}>Try again</button>}>
        {errorMessage(queues.error)}
      </Notice>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {QUEUES.map((queue) => (
          <Link key={queue.id} href={`${INBOX}?queue=${queue.queue}`} className="group flex items-start gap-3 rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm", queue.tone)}>
              <queue.icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">{queue.title}</p>
              {data ? <p className="text-2xl font-semibold leading-tight tracking-tight text-slate-900">{data.queues[queue.id]}</p> : <Skeleton className="mt-1 h-7 w-12" />}
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">{queue.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Section title="Open tickets by category" flush>
          {!data ? (
            <Skeleton className="m-4 h-32" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.byCategory.map((row) => (
                <li key={row.category}>
                  <Link href={`${INBOX}?category=${row.category}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition hover:bg-slate-50">
                    <span className="font-semibold text-slate-800">{CATEGORY_LABEL[row.category]}</span>
                    <span className={cn("rounded-sm px-2 py-0.5 font-semibold", row.count > 0 ? "bg-slate-100 text-slate-700" : "text-slate-400")}>{row.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Saved views" description="Your own filter shortcuts, kept in this browser. Create one from the inbox with “Save this view”." flush>
          {saved.views.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved views yet" description="Filter the inbox the way you like (say: urgent billing tickets for one company), then save it to come back with one click." action={<Link href={INBOX} className={btn}>Open the inbox</Link>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {saved.views.map((view) => (
                <li key={view.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link href={`${INBOX}${view.search ? `?${view.search}` : ""}`} className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-800 hover:text-red-700">
                    <Bookmark className="size-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{view.name}</span>
                  </Link>
                  <button type="button" onClick={() => saved.remove(view.id)} aria-label={`Delete view ${view.name}`} className="rounded-sm p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
