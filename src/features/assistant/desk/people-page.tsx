"use client";

import Link from "next/link";
import { useState } from "react";
import { UsersRound } from "lucide-react";
import { errorMessage } from "@/features/support/hooks";
import { timeAgo } from "@/features/support/time";
import { Avatar, Badge, btn, EmptyState, ListSkeleton, Notice, Pager, SearchBox, Section, Select } from "@/features/support/ui";
import { useDebounced, useUrlState } from "@/features/support/url-state";
import { compact, full, RANGE_TABS, ROLE_LABEL } from "./format";
import { useAssistantPeople } from "./hooks";
import type { DeskRange } from "./types";

const DEFAULTS = { q: "", range: "all", sort: "recent", page: "1" };
const LIMIT = 20;

export function AssistantPeoplePage() {
  const { values, set } = useUrlState(DEFAULTS);
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
  const people = useAssistantPeople({ page, limit: LIMIT, search: values.q, range: values.range, sort: values.sort });

  return (
    <Section title="People" description="Everyone who has used the assistant. Open a person to read all their chats." flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <SearchBox value={text} onChange={setText} placeholder="Search by name or email…" className="min-w-[260px]" />
        <Select label="Period" value={values.range} onChange={(value) => set({ range: value })} options={RANGE_TABS.map((tab) => ({ value: tab.id as DeskRange, label: tab.id === "all" ? "Ever" : tab.label }))} />
        <Select label="Sort" value={values.sort} onChange={(value) => set({ sort: value })} options={[{ value: "recent", label: "Recently Active" }, { value: "tokens", label: "Most Tokens" }, { value: "chats", label: "Most Chats" }]} />
      </div>

      {people.isError ? (
        <div className="p-4">
          <Notice tone="red" title="People Could Not Be Loaded" action={<button type="button" className={btn} onClick={() => void people.refetch()}>Try Again</button>}>
            {errorMessage(people.error)}
          </Notice>
        </div>
      ) : people.isLoading ? (
        <ListSkeleton rows={8} />
      ) : people.data && people.data.items.length === 0 ? (
        <EmptyState icon={UsersRound} title="Nobody Here Yet" description={values.q ? "No one matches that name or email." : "People appear once they ask the assistant something."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-2 py-2.5">Company & Role</th>
                <th className="px-2 py-2.5 text-right">Chats</th>
                <th className="px-2 py-2.5 text-right">Questions</th>
                <th className="px-2 py-2.5 text-right">Tokens</th>
                <th className="px-2 py-2.5 text-right">Failed</th>
                <th className="px-4 py-2.5 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.data?.items.map((person) => (
                <tr key={person.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/super-admin/assistant/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar name={person.name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 hover:text-red-700">{person.name}</span>
                        <span className="block truncate text-[11px] font-medium text-slate-500">{person.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {person.companies.slice(0, 2).map((company) => (
                        <Badge key={company.id} tone="slate">{company.name} · {ROLE_LABEL[company.role] ?? company.role}</Badge>
                      ))}
                      {person.companies.length > 2 && <Badge tone="slate">+{person.companies.length - 2}</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{full(person.conversations)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{full(person.questions)}</td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-violet-700">{compact(person.tokens)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{person.failedReplies > 0 ? <span className="font-semibold text-rose-600">{person.failedReplies}</span> : <span className="text-slate-400">0</span>}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-500">{timeAgo(person.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {people.data && <Pager page={people.data.page} limit={people.data.limit} total={people.data.total} noun="people" onPage={(next) => set({ page: String(next) })} />}
    </Section>
  );
}
