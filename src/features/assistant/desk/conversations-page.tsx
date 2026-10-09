"use client";

import { useState } from "react";
import { MessagesSquare, X } from "lucide-react";
import { errorMessage } from "@/features/support/hooks";
import { btn, EmptyState, ListSkeleton, Notice, Pager, SearchBox, Section, Select } from "@/features/support/ui";
import { useDebounced, useUrlState } from "@/features/support/url-state";
import { ConversationRow } from "./conversation-row";
import { RANGE_TABS } from "./format";
import { useAssistantConversations, useAssistantFilters } from "./hooks";
import type { DeskRange } from "./types";

/** Filters live in the URL (`company`, `user`, `on` = page asked on) so other screens can link straight into a filtered list. */
const DEFAULTS = { q: "", company: "", user: "", on: "", flag: "", range: "all", sort: "recent", page: "1" };
const LIMIT = 20;

export function AssistantConversationsPage() {
  const { values, set, reset, dirty } = useUrlState(DEFAULTS);
  const [text, setText] = useState(values.q);
  const debounced = useDebounced(text);
  const [seenQ, setSeenQ] = useState(values.q);
  if (seenQ !== values.q) {
    setSeenQ(values.q);
    setText(values.q);
  }
  const [committed, setCommitted] = useState(debounced);
  if (committed !== debounced) {
    setCommitted(debounced);
    if (debounced !== values.q) set({ q: debounced });
  }

  const page = Math.max(1, Number(values.page) || 1);
  const filters = useAssistantFilters();
  const list = useAssistantConversations({ page, limit: LIMIT, search: values.q, companyId: values.company, userId: values.user, pageId: values.on, flag: values.flag, range: values.range, sort: values.sort });
  const company = filters.data?.companies.find((item) => item.id === values.company);

  return (
    <div className="space-y-2">
      <Section
        title="Conversations"
        description="Every chat people had with the assistant. Open one to read it word for word."
        flush
        action={
          dirty && (
            <button type="button" className={btn} onClick={() => { setText(""); reset(); }}>
              <X className="size-3.5" />
              Clear Filters
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          <SearchBox value={text} onChange={setText} placeholder="Search chats, people, companies…" className="min-w-[260px]" />
          <Select
            label="Company"
            value={values.company}
            onChange={(value) => set({ company: value })}
            options={[{ value: "", label: "All Companies" }, ...(filters.data?.companies ?? []).map((item) => ({ value: item.id, label: `${item.name} (${item.conversations})` })), ...(values.company && !company ? [{ value: values.company, label: "Selected Company" }] : [])]}
          />
          <Select label="Asked On Page" value={values.on} onChange={(value) => set({ on: value })} options={[{ value: "", label: "Any Page" }, ...(filters.data?.pages ?? []).map((item) => ({ value: item.id ?? "", label: item.title }))]} />
          <Select label="Show" value={values.flag} onChange={(value) => set({ flag: value })} options={[{ value: "", label: "All Chats" }, { value: "ticket", label: "Sent A Ticket" }, { value: "degraded", label: "Had A Failed Answer" }, { value: "redacted", label: "Secret Was Masked" }]} />
          <Select label="Period" value={values.range} onChange={(value) => set({ range: value })} options={RANGE_TABS.map((tab) => ({ value: tab.id as DeskRange, label: tab.label }))} />
          <Select label="Sort" value={values.sort} onChange={(value) => set({ sort: value })} options={[{ value: "recent", label: "Latest First" }, { value: "tokens", label: "Most Tokens" }, { value: "messages", label: "Longest Chats" }]} />
        </div>

        {values.user && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-blue-50/50 px-4 py-2 text-xs font-medium text-blue-900">
            <span>Showing the chats of one person.</span>
            <button type="button" className="font-semibold underline" onClick={() => set({ user: "" })}>Show Everyone</button>
          </div>
        )}

        {list.isError ? (
          <div className="p-4">
            <Notice tone="red" title="Conversations Could Not Be Loaded" action={<button type="button" className={btn} onClick={() => void list.refetch()}>Try Again</button>}>
              {errorMessage(list.error)}
            </Notice>
          </div>
        ) : list.isLoading ? (
          <ListSkeleton rows={8} />
        ) : list.data && list.data.items.length === 0 ? (
          <EmptyState icon={MessagesSquare} title={dirty ? "No Chats Match These Filters" : "No Conversations Yet"} description={dirty ? "Try a different word, period or company." : "Chats appear here as soon as people use Help & Support."} action={dirty ? <button type="button" className={btn} onClick={() => { setText(""); reset(); }}>Clear Filters</button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">{list.data?.items.map((item) => <ConversationRow key={item.id} item={item} />)}</ul>
        )}
        {list.data && <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} noun="conversations" onPage={(next) => set({ page: String(next) })} />}
      </Section>
    </div>
  );
}
