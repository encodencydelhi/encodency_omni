"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, LifeBuoy, MessageCircleReply, Plus, Ticket } from "lucide-react";
import { PRIORITY_LABEL } from "../labels";
import { errorMessage, useSupportSummary } from "../hooks";
import { hoursLabel } from "../time";
import { TICKET_PRIORITIES } from "../types";
import { btn, btnPrimary, EmptyState, ListSkeleton, Notice, PriorityBadge, Section, Skeleton, StatTile, Stars } from "../ui";
import { CompanyTicketRow } from "./ticket-row";
import { useRaiseTicket } from "./support-shell";

export function SupportOverviewPage() {
  const summary = useSupportSummary();
  const raise = useRaiseTicket();
  const data = summary.data;

  if (summary.isError) {
    return (
      <Notice tone="red" title="Support could not be loaded" action={<button type="button" className={btn} onClick={() => void summary.refetch()}>Try again</button>}>
        {errorMessage(summary.error)}
      </Notice>
    );
  }

  const empty = data && data.recent.length === 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        {summary.isLoading || !data ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatTile label="Open tickets" value={data.counts.active} sub="Not solved or closed yet" icon={Ticket} href="/admin/support/tickets?tab=active" />
            <StatTile label="Waiting for your reply" value={data.counts.waitingForYou} sub={data.counts.waitingForYou > 0 ? "Support is waiting for you" : "Nothing needs you"} icon={MessageCircleReply} tone={data.counts.waitingForYou > 0 ? "amber" : undefined} href="/admin/support/tickets?tab=waiting" />
            <StatTile label="Resolved · 30 days" value={data.counts.resolvedLast30Days} sub="Tickets solved for you" icon={CheckCircle2} tone="green" href="/admin/support/tickets?tab=resolved" />
            <StatTile label="Our first reply · 30 days" value={hoursLabel(data.averages.firstResponseHours)} sub={data.averages.satisfaction ? `You rated us ${data.averages.satisfaction.toFixed(1)}/5` : "Average time to first reply"} icon={Clock} />
          </>
        )}
      </div>

      {empty ? (
        <Section title="Welcome to Support" description="Anything that is not working, or that you need help with, starts here.">
          <EmptyState
            icon={LifeBuoy}
            title="You have not raised a ticket yet"
            description="Raise a ticket for a problem, a billing question or a request. Our team replies here, and you get a notification each time."
            action={
              <>
                <button type="button" className={btnPrimary} onClick={() => raise.open()} disabled={!raise.canRaise}>
                  <Plus className="size-3.5" />
                  Raise a ticket
                </button>
                <Link href="/admin/support/help" className={btn}>
                  <BookOpen className="size-3.5" />
                  Browse help
                </Link>
              </>
            }
          />
        </Section>
      ) : (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-2">
            {data && data.awaitingYou.length > 0 && (
              <Section title="Needs your reply" description="Support answered and is waiting for you." flush className="border-amber-300">
                <ul className="divide-y divide-slate-100">
                  {data.awaitingYou.map((ticket) => (
                    <CompanyTicketRow key={ticket.id} ticket={ticket} compact />
                  ))}
                </ul>
              </Section>
            )}
            <Section
              title="Recent tickets"
              description="The latest activity on your Company's tickets."
              flush
              action={
                <Link href="/admin/support/tickets" className={btn}>
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            >
              {summary.isLoading || !data ? (
                <ListSkeleton rows={4} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((ticket) => (
                    <CompanyTicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="space-y-2">
            <Section title="How fast we reply" description="Our promise for the first reply and for solving it.">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-slate-500">
                    <th className="pb-2 font-semibold">Priority</th>
                    <th className="pb-2 font-semibold">First reply</th>
                    <th className="pb-2 font-semibold">Solved within</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.policy ?? TICKET_PRIORITIES.map((priority) => ({ priority, firstResponseHours: 0, resolutionHours: 0 }))).map((row) => (
                    <tr key={row.priority}>
                      <td className="py-2">
                        <PriorityBadge priority={row.priority} />
                      </td>
                      <td className="py-2 font-semibold text-slate-800">{data ? `${row.firstResponseHours}h` : "…"}</td>
                      <td className="py-2 font-semibold text-slate-800">{data ? (row.resolutionHours >= 48 ? `${row.resolutionHours / 24} days` : `${row.resolutionHours}h`) : "…"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-500">The clock pauses while a ticket waits for your reply. Choosing {PRIORITY_LABEL.urgent} for something that is not urgent slows real emergencies down for everyone.</p>
            </Section>
            {data?.averages.satisfaction ? (
              <Section title="Your rating of support" description="Average of the tickets you rated in the last 30 days.">
                <div className="flex items-center gap-3">
                  <Stars value={data.averages.satisfaction} size={18} />
                  <span className="text-lg font-semibold text-slate-900">{data.averages.satisfaction.toFixed(1)}</span>
                </div>
              </Section>
            ) : null}
            <Section title="Before you raise a ticket" description="Quick answers often solve it in a minute.">
              <ul className="space-y-1.5 text-xs font-medium text-slate-600">
                <li>• Instagram, Facebook or YouTube not connecting? Check the permissions on the integration page.</li>
                <li>• A scheduled post failed? Open it in Calendar: the reason is shown on the post.</li>
                <li>• Billing question? Your invoices and plan are under Billing.</li>
              </ul>
              <Link href="/admin/support/help" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                Open the Help Center
                <ArrowRight className="size-3.5" />
              </Link>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
