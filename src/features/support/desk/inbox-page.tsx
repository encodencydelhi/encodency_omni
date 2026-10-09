"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Building2, CheckSquare, Inbox, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "../labels";
import { errorMessage, useDeskBulk, useDeskQueues, useDeskStaff, useDeskTickets } from "../hooks";
import { timeAgo } from "../time";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from "../types";
import { useDebounced, useUrlState } from "../url-state";
import { Avatar, Badge, btn, btnPrimary, CategoryChip, CountTabs, EmptyState, field, ListSkeleton, Notice, Pager, PriorityBadge, SearchBox, Section, Select, SlaBadge, Spinner, StatusBadge } from "../ui";
import { useSavedViews } from "./saved-views";

const DEFAULTS = { queue: "all", q: "", status: "", priority: "", category: "", assignee: "", companyId: "", sort: "recent", page: "1" };
export type QueueId = "all" | "unassigned" | "mine" | "urgent" | "breached" | "at_risk" | "waiting" | "unanswered" | "resolved" | "everything";

export const QUEUE_FILTERS: Record<QueueId, Record<string, string | number>> = {
  all: { group: "active" },
  unassigned: { group: "active", assignee: "none" },
  mine: { group: "active", assignee: "me" },
  urgent: { group: "active", priority: "urgent" },
  breached: { sla: "breached" },
  at_risk: { sla: "at_risk" },
  waiting: { status: "waiting_on_customer" },
  unanswered: { unanswered: "true" },
  resolved: { resolvedWithinDays: 7 },
  everything: {},
};

export const QUEUE_LABEL: Record<QueueId, string> = { all: "All open", unassigned: "Unassigned", mine: "Mine", urgent: "Urgent", breached: "SLA breached", at_risk: "SLA at risk", waiting: "Waiting on customer", unanswered: "No reply yet", resolved: "Resolved (7 days)", everything: "Everything" };

export function DeskInboxPage() {
  const { values, set, reset, dirty } = useUrlState(DEFAULTS);
  const queues = useDeskQueues();
  const staff = useDeskStaff();
  const bulk = useDeskBulk();
  const saved = useSavedViews();
  const [text, setText] = useState(values.q);
  const debounced = useDebounced(text);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");

  useEffect(() => {
    if (debounced !== values.q) set({ q: debounced });
    // `set` follows the URL; only the debounced text should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const [seenQ, setSeenQ] = useState(values.q);
  if (seenQ !== values.q) {
    setSeenQ(values.q);
    setText(values.q);
  }

  const queue = (values.queue in QUEUE_FILTERS ? values.queue : "all") as QueueId;
  const page = Math.max(1, Number(values.page) || 1);
  // The queue sets the default filters; any filter picked explicitly overrides the queue's own value for that field.
  const query: Record<string, string | number | undefined> = { ...QUEUE_FILTERS[queue], search: values.q, sort: values.sort, page, limit: 20 };
  for (const key of ["status", "priority", "category", "assignee", "companyId"] as const) if (values[key]) query[key] = values[key];
  const tickets = useDeskTickets(query);
  const items = useMemo(() => tickets.data?.items ?? [], [tickets.data]);
  const q = queues.data?.queues;
  const allSelected = items.length > 0 && items.every((t) => selected.includes(t.number));
  const toggle = (number: number) => setSelected((s) => (s.includes(number) ? s.filter((n) => n !== number) : [...s, number]));
  const clearSelection = () => setSelected([]);

  const run = (input: Parameters<typeof bulk.mutate>[0]) => bulk.mutate(input, { onSuccess: clearSelection });
  const currentSearch = useMemo(() => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (key !== "page" && value && value !== (DEFAULTS as Record<string, string>)[key]) p.set(key, value);
    return p.toString();
  }, [values]);

  return (
    <div className="space-y-2">
      <Section
        title="Ticket Inbox"
        description="Every Company's tickets. Pick a queue, narrow it down, then open a ticket or act on several at once."
        flush
        action={
          saving ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                saved.add(viewName, currentSearch);
                setSaving(false);
                setViewName("");
              }}
            >
              <input autoFocus value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="Name this view" maxLength={40} className={cn(field, "h-8 w-44")} aria-label="View name" />
              <button type="submit" className={btnPrimary} disabled={!viewName.trim()}>
                Save
              </button>
              <button type="button" className={btn} onClick={() => setSaving(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className={btn} onClick={() => setSaving(true)}>
              <Bookmark className="size-3.5" />
              Save this view
            </button>
          )
        }
      >
        <div className="space-y-2.5 border-b border-slate-200 p-3">
          <CountTabs
            label="Queues"
            value={queue}
            onChange={(id) => {
              clearSelection();
              set({ queue: id, status: "", priority: "", assignee: "" });
            }}
            tabs={[
              { id: "all", label: "All open", count: q?.all },
              { id: "unassigned", label: "Unassigned", count: q?.unassigned, tone: "amber" },
              { id: "mine", label: "Mine", count: q?.mine },
              { id: "urgent", label: "Urgent", count: q?.urgent, tone: "red" },
              { id: "breached", label: "SLA breached", count: q?.breached, tone: "red" },
              { id: "at_risk", label: "At risk", count: q?.atRisk, tone: "amber" },
              { id: "waiting", label: "Waiting on customer", count: q?.waiting },
              { id: "unanswered", label: "No reply yet", count: q?.unanswered, tone: "amber" },
              { id: "resolved", label: "Resolved", count: q?.resolved },
              { id: "everything", label: "Everything" },
            ]}
          />
          {saved.views.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Saved views</span>
              {saved.views.map((view) => (
                <span key={view.id} className="inline-flex items-center overflow-hidden rounded-sm border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                  <Link href={`/super-admin/support/inbox${view.search ? `?${view.search}` : ""}`} className="px-2.5 py-1 hover:bg-slate-50">
                    {view.name}
                  </Link>
                  <button type="button" onClick={() => saved.remove(view.id)} aria-label={`Delete view ${view.name}`} className="border-l border-slate-200 px-1.5 py-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={text} onChange={setText} placeholder="Search number, title, company or requester…" />
            <Select label="Status" value={values.status} onChange={(value) => set({ status: value })} options={[{ value: "", label: "Any status" }, ...TICKET_STATUSES.map((s) => ({ value: s as string, label: STATUS_LABEL[s] }))]} />
            <Select label="Priority" value={values.priority} onChange={(value) => set({ priority: value })} options={[{ value: "", label: "Any priority" }, ...TICKET_PRIORITIES.map((p) => ({ value: p as string, label: PRIORITY_LABEL[p] }))]} />
            <Select label="Category" value={values.category} onChange={(value) => set({ category: value })} options={[{ value: "", label: "Any category" }, ...TICKET_CATEGORIES.map((c) => ({ value: c as string, label: CATEGORY_LABEL[c] }))]} />
            <Select label="Assignee" value={values.assignee} onChange={(value) => set({ assignee: value })} options={[{ value: "", label: "Anyone" }, { value: "me", label: "Me" }, { value: "none", label: "Unassigned" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
            <Select label="Sort" value={values.sort} onChange={(value) => set({ sort: value })} options={[{ value: "recent", label: "Latest activity" }, { value: "oldest", label: "Oldest first" }, { value: "priority", label: "Highest priority" }]} />
            {(dirty || values.companyId) && (
              <button type="button" className={btn} onClick={() => { reset(); clearSelection(); }}>
                Clear
              </button>
            )}
          </div>
          {values.companyId && (
            <p className="text-[11px] font-semibold text-slate-600">
              Showing one Company only. <button type="button" className="text-red-600 underline" onClick={() => set({ companyId: "" })}>Show all companies</button>
            </p>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2.5" role="region" aria-label="Bulk actions">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-800">
              <CheckSquare className="size-3.5" />
              {selected.length} selected
            </span>
            <select className={cn(field, "h-8 w-auto")} value={bulkAssignee} onChange={(event) => setBulkAssignee(event.target.value)} aria-label="Assign to">
              <option value="">Assign to…</option>
              <option value="__none">Unassign</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.open} open)
                </option>
              ))}
            </select>
            <button type="button" className={btn} disabled={!bulkAssignee || bulk.isPending} onClick={() => run({ numbers: selected, action: "assign", assigneeId: bulkAssignee === "__none" ? null : bulkAssignee })}>
              {bulk.isPending && <Spinner />}
              Assign
            </button>
            <select className={cn(field, "h-8 w-auto")} defaultValue="" onChange={(event) => { if (event.target.value) run({ numbers: selected, action: "status", status: event.target.value as TicketStatus }); event.target.value = ""; }} aria-label="Set status" disabled={bulk.isPending}>
              <option value="">Set status…</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select className={cn(field, "h-8 w-auto")} defaultValue="" onChange={(event) => { if (event.target.value) run({ numbers: selected, action: "priority", priority: event.target.value as TicketPriority }); event.target.value = ""; }} aria-label="Set priority" disabled={bulk.isPending}>
              <option value="">Set priority…</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            <button type="button" className={cn(btn, "ml-auto")} onClick={clearSelection}>
              Clear selection
            </button>
          </div>
        )}

        {tickets.isError ? (
          <div className="p-4">
            <Notice tone="red" title="Tickets could not be loaded" action={<button type="button" className={btn} onClick={() => void tickets.refetch()}>Try again</button>}>
              {errorMessage(tickets.error)}
            </Notice>
          </div>
        ) : tickets.isLoading ? (
          <ListSkeleton rows={8} />
        ) : items.length === 0 ? (
          dirty || queue !== "all" || values.companyId ? (
            <EmptyState icon={SearchX} title="No tickets in this view" description={queue === "breached" || queue === "at_risk" ? "Nothing is past or close to its deadline. Nice." : "Try another queue or clear the filters."} action={<button type="button" className={btn} onClick={reset}>Back to all open</button>} />
          ) : (
            <EmptyState icon={Inbox} title="The inbox is empty" description="When a Company raises a ticket it appears here and every Super Admin is notified." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" aria-label="Select all on this page" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((t) => t.number))} className="size-3.5 accent-red-600" />
                  </th>
                  <th className="w-16 px-2 py-2.5">#</th>
                  <th className="px-2 py-2.5">Ticket</th>
                  <th className="px-2 py-2.5">Priority</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">SLA</th>
                  <th className="px-2 py-2.5">Assignee</th>
                  <th className="px-2 py-2.5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((ticket) => (
                  <tr key={ticket.id} className={cn("transition hover:bg-slate-50", selected.includes(ticket.number) && "bg-red-50/50")}>
                    <td className="px-3 py-3">
                      <input type="checkbox" aria-label={`Select ticket ${ticket.number}`} checked={selected.includes(ticket.number)} onChange={() => toggle(ticket.number)} className="size-3.5 accent-red-600" />
                    </td>
                    <td className="px-2 py-3 font-semibold tabular-nums text-slate-500">#{ticket.number}</td>
                    <td className="max-w-[420px] px-2 py-3">
                      <Link href={`/super-admin/support/tickets/${ticket.number}`} className="block truncate text-[13px] font-semibold text-slate-900 hover:text-red-700">
                        {ticket.subject}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" />
                          {ticket.company.name}
                        </span>
                        <span>{ticket.createdBy.name}</span>
                        <CategoryChip category={ticket.category} />
                        {ticket.unanswered && <Badge tone="red">No reply yet</Badge>}
                        {ticket.reopenCount > 0 && <Badge tone="amber">Reopened</Badge>}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-2 py-3">
                      <SlaBadge sla={ticket.sla} />
                    </td>
                    <td className="px-2 py-3">
                      {ticket.assignee ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                          <Avatar name={ticket.assignee.name} size={22} />
                          {ticket.assignee.name}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right font-medium text-slate-500">{timeAgo(ticket.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tickets.data && <Pager page={tickets.data.page} limit={tickets.data.limit} total={tickets.data.total} noun="tickets" onPage={(next) => { clearSelection(); set({ page: String(next) }); }} />}
      </Section>
    </div>
  );
}
