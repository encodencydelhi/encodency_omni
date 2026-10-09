"use client";

import { useEffect, useState } from "react";
import { Inbox, Plus, SearchX } from "lucide-react";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "../labels";
import { errorMessage, useMyTickets } from "../hooks";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "../types";
import { useDebounced, useUrlState } from "../url-state";
import { btn, btnPrimary, CountTabs, EmptyState, ListSkeleton, Notice, Pager, SearchBox, Section, Select } from "../ui";
import { CompanyTicketRow } from "./ticket-row";
import { useRaiseTicket } from "./support-shell";

const DEFAULTS = { tab: "all", q: "", priority: "", category: "", sort: "recent", mine: "", page: "1" };
type Tab = "all" | "active" | "waiting" | "resolved" | "closed";

const TAB_QUERY: Record<Tab, Record<string, string>> = {
  all: {},
  active: { group: "active" },
  waiting: { awaiting: "you" },
  resolved: { status: "resolved" },
  closed: { status: "closed" },
};

export function MyTicketsPage() {
  const { values, set, reset, dirty } = useUrlState(DEFAULTS);
  const raise = useRaiseTicket();
  const [text, setText] = useState(values.q);
  const debounced = useDebounced(text);
  useEffect(() => {
    if (debounced !== values.q) set({ q: debounced });
    // `set` changes with the URL; the debounced text is the only trigger we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  // Back/forward or "Clear" changes the URL: keep the box in step.
  const [seenQ, setSeenQ] = useState(values.q);
  if (seenQ !== values.q) {
    setSeenQ(values.q);
    setText(values.q);
  }

  const tab = (values.tab in TAB_QUERY ? values.tab : "all") as Tab;
  const page = Math.max(1, Number(values.page) || 1);
  const query = { ...TAB_QUERY[tab], search: values.q, priority: values.priority, category: values.category, sort: values.sort, mine: values.mine, page, limit: 15 };
  const tickets = useMyTickets(query);
  const counts = tickets.data?.counts;

  return (
    <div className="space-y-2">
      <Section
        title="My Tickets"
        description="Every ticket raised by your Company, with the conversation and the outcome."
        flush
        action={
          <button type="button" className={btnPrimary} onClick={() => raise.open()} disabled={!raise.canRaise}>
            <Plus className="size-3.5" />
            Raise a ticket
          </button>
        }
      >
        <div className="space-y-2.5 border-b border-slate-200 p-3">
          <CountTabs
            label="Ticket status"
            value={tab}
            onChange={(id) => set({ tab: id })}
            tabs={[
              { id: "all", label: "All", count: counts?.all },
              { id: "active", label: "Open", count: counts?.active },
              { id: "waiting", label: "Needs your reply", count: counts?.waiting_on_customer, tone: "amber" },
              { id: "resolved", label: "Resolved", count: counts?.resolved },
              { id: "closed", label: "Closed", count: counts?.closed },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={text} onChange={setText} placeholder="Search by title or ticket number…" />
            <Select label="Priority" value={values.priority} onChange={(value) => set({ priority: value })} options={[{ value: "", label: "All priorities" }, ...TICKET_PRIORITIES.map((p) => ({ value: p as string, label: PRIORITY_LABEL[p] }))]} />
            <Select label="Category" value={values.category} onChange={(value) => set({ category: value })} options={[{ value: "", label: "All categories" }, ...TICKET_CATEGORIES.map((c) => ({ value: c as string, label: CATEGORY_LABEL[c] }))]} />
            <Select label="Sort" value={values.sort} onChange={(value) => set({ sort: value })} options={[{ value: "recent", label: "Latest activity" }, { value: "oldest", label: "Oldest first" }, { value: "priority", label: "Highest priority" }]} />
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={values.mine === "true"} onChange={(event) => set({ mine: event.target.checked ? "true" : "" })} className="size-3.5 accent-red-600" />
              Raised by me
            </label>
            {dirty && (
              <button type="button" className={btn} onClick={reset}>
                Clear
              </button>
            )}
          </div>
        </div>

        {tickets.isError ? (
          <div className="p-4">
            <Notice tone="red" title="Tickets could not be loaded" action={<button type="button" className={btn} onClick={() => void tickets.refetch()}>Try again</button>}>
              {errorMessage(tickets.error)}
            </Notice>
          </div>
        ) : tickets.isLoading ? (
          <ListSkeleton rows={6} />
        ) : tickets.data && tickets.data.items.length === 0 ? (
          dirty || tab !== "all" ? (
            <EmptyState icon={SearchX} title="No tickets match" description="Try another tab or filter, or clear the search." action={<button type="button" className={btn} onClick={reset}>Clear filters</button>} />
          ) : (
            <EmptyState icon={Inbox} title="No tickets yet" description="When you raise a ticket it appears here." action={<button type="button" className={btnPrimary} onClick={() => raise.open()} disabled={!raise.canRaise}><Plus className="size-3.5" />Raise a ticket</button>} />
          )
        ) : (
          <ul className="divide-y divide-slate-100">{tickets.data?.items.map((ticket) => <CompanyTicketRow key={ticket.id} ticket={ticket} />)}</ul>
        )}
        {tickets.data && <Pager page={tickets.data.page} limit={tickets.data.limit} total={tickets.data.total} noun="tickets" onPage={(next) => set({ page: String(next) })} />}
      </Section>
    </div>
  );
}
