"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Bell, BookText, Clock, Gauge, ShieldCheck, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EVENT_LABEL } from "../labels";
import { errorMessage, useDeskActivity, useDeskSla } from "../hooks";
import { describeEvent } from "../thread";
import { dateTime, timeAgo } from "../time";
import { Avatar, Badge, btn, CountTabs, EmptyState, ListSkeleton, Notice, Pager, PriorityBadge, Section, Select } from "../ui";
import { CANNED_REPLIES } from "./canned";

type View = "activity" | "settings";

export function DeskActivityPage() {
  const [view, setView] = useState<View>("activity");
  return (
    <div className="space-y-2">
      <CountTabs<View>
        label="Activity and settings"
        value={view}
        onChange={setView}
        tabs={[
          { id: "activity", label: "Activity feed" },
          { id: "settings", label: "Settings & rules" },
        ]}
      />
      {view === "activity" ? <ActivityFeed /> : <DeskSettings />}
    </div>
  );
}

function ActivityFeed() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const activity = useDeskActivity({ page, limit: 25, kind });

  return (
    <Section
      title="Activity feed"
      description="Every action on every ticket: who did what, newest first."
      flush
      action={
        <Select
          label="Event type"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
          options={[{ value: "", label: "All events" }, ...Object.entries(EVENT_LABEL).map(([value, label]) => ({ value, label }))]}
        />
      }
    >
      {activity.isError ? (
        <div className="p-4">
          <Notice tone="red" title="Activity could not be loaded" action={<button type="button" className={btn} onClick={() => void activity.refetch()}>Try again</button>}>
            {errorMessage(activity.error)}
          </Notice>
        </div>
      ) : activity.isLoading ? (
        <ListSkeleton rows={8} />
      ) : activity.data && activity.data.items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity" description="Actions on tickets appear here as they happen." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {activity.data?.items.map((item) => (
            <li key={item.id}>
              <Link href={`/super-admin/support/tickets/${item.ticket.number}`} className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                <Avatar name={item.actor} size={30} tone={item.actorIsStaff ? 0 : 3} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900">
                    {item.actor} <span className="font-medium text-slate-500">· {describeEvent(item)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                    #{item.ticket.number} {item.ticket.subject} · {item.ticket.company}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[11px] font-medium text-slate-500" title={dateTime(item.createdAt)}>
                  {timeAgo(item.createdAt)}
                  {item.actorIsStaff && <Badge tone="blue" className="ml-2">Staff</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {activity.data && <Pager page={activity.data.page} limit={activity.data.limit} total={activity.data.total} noun="events" onPage={setPage} />}
    </Section>
  );
}

function DeskSettings() {
  const sla = useDeskSla();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-2 xl:grid-cols-2">
      <Section title="SLA targets" description="Fixed in this version; shown to customers on their Support page." flush>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-2 py-2.5">First response</th>
              <th className="px-4 py-2.5">Resolution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(sla.data?.policy ?? []).map((row) => (
              <tr key={row.priority}>
                <td className="px-4 py-2.5">
                  <PriorityBadge priority={row.priority} />
                </td>
                <td className="px-2 py-2.5 font-semibold text-slate-800">{row.firstResponseHours} h</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{row.resolutionHours} h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="How the desk works" description="The rules the system applies for you.">
        <ul className="space-y-3 text-xs font-medium leading-relaxed text-slate-600">
          {[
            { icon: Bell, title: "Notifications", text: "Every Super Admin is notified when a ticket is raised. The assignee (or the whole desk if nobody owns it) hears about customer replies and reopenings; the customer hears about replies and resolution; an assignee hears when a ticket is assigned to them." },
            { icon: UserCheck, title: "Ownership", text: "The first person to send a public reply or resolve an unowned ticket takes it. Assigning an open ticket moves it to In progress. Only active Super Admins can own tickets." },
            { icon: Clock, title: "SLA clocks", text: "Both clocks run from the time the ticket was raised. Waiting for the customer pauses the resolution clock. A public reply stops the first-response clock. At risk means less than 25% of the window is left." },
            { icon: Gauge, title: "Limits", text: "A person can raise 5 tickets per hour. A customer can reopen a solved ticket any time and a closed one for 14 days. Messages are limited to 5,000 characters." },
            { icon: ShieldCheck, title: "Privacy", text: "Internal notes are stored with the ticket but never sent to the Company's routes. Customers see your name with a “Support team” badge on replies and as the person handling the ticket." },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-slate-600">
                <item.icon className="size-3.5" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{item.title}</span>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Canned replies" description="Insert one from the reply box of any ticket; {name} becomes the customer's first name." className="xl:col-span-2" flush>
        <ul className="divide-y divide-slate-100">
          {CANNED_REPLIES.map((reply) => {
            const expanded = open === reply.id;
            return (
              <li key={reply.id}>
                <button type="button" onClick={() => setOpen(expanded ? null : reply.id)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-900">
                    <BookText className="size-3.5 text-slate-400" />
                    {reply.title}
                  </span>
                  <Badge>{reply.category}</Badge>
                </button>
                {expanded && <pre className={cn("mx-4 mb-3 whitespace-pre-wrap rounded-sm border border-slate-200 bg-slate-50 p-3 font-sans text-xs font-medium leading-relaxed text-slate-700")}>{reply.body}</pre>}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
