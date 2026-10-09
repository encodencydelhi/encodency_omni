"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Coins, FileSearch, Gauge, MessageCircleQuestion, MessagesSquare, ShieldAlert, Ticket, TriangleAlert } from "lucide-react";
import { BarList } from "@/features/support/charts";
import { errorMessage } from "@/features/support/hooks";
import { dateTime, timeAgo } from "@/features/support/time";
import { Avatar, Badge, btn, EmptyState, ListSkeleton, Notice, Pager, Section, StatTile } from "@/features/support/ui";
import { ApiError } from "@/types/api";
import { KeywordCloud, UsageChart } from "./charts";
import { ConversationRow } from "./conversation-row";
import { compact, full, ROLE_LABEL } from "./format";
import { useAssistantPerson } from "./hooks";

const LIMIT = 15;

/** One person's whole history with the assistant: totals, what they ask about, and every conversation. */
export function AssistantPersonPage({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const query = useAssistantPerson(userId, { page, limit: LIMIT });
  const data = query.data;
  const notFound = ApiError.isApiError(query.error) && query.error.status === 404;

  return (
    <div className="space-y-2">
      <Link href="/super-admin/assistant/people" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-red-700">
        <ArrowLeft className="size-3.5" />
        All people
      </Link>

      {query.isLoading && <Section title="Loading…" flush><ListSkeleton rows={5} /></Section>}
      {query.isError && (
        <Section title="Person">
          <EmptyState
            icon={FileSearch}
            title={notFound ? "This person has not used the assistant" : "This person could not be loaded"}
            description={notFound ? "There are no chats for them (or they were deleted after the retention period)." : errorMessage(query.error)}
            action={<Link href="/super-admin/assistant/people" className={btn}>Back to people</Link>}
          />
        </Section>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Avatar name={data.person.name} size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold text-slate-900">{data.person.name}</h2>
              <p className="truncate text-xs font-medium text-slate-500">{data.person.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.person.companies.map((company) => (
                  <Badge key={company.id} tone="slate">{company.name} · {ROLE_LABEL[company.role] ?? company.role}</Badge>
                ))}
              </div>
            </div>
            <div className="text-right text-[11px] font-medium text-slate-500">
              <p>First chat: <span className="font-semibold text-slate-800">{dateTime(data.stats.firstChatAt)}</span></p>
              <p>Last active: <span className="font-semibold text-slate-800">{timeAgo(data.stats.lastActiveAt)}</span></p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <StatTile label="Conversations" value={full(data.stats.conversations)} icon={MessagesSquare} tone="blue" />
            <StatTile label="Questions" value={full(data.stats.questions)} icon={MessageCircleQuestion} tone="violet" />
            <StatTile label="Tokens used" value={compact(data.stats.tokens)} icon={Coins} tone="orange" sub={`↑ ${compact(data.stats.promptTokens)} · ↓ ${compact(data.stats.completionTokens)}`} />
            <StatTile label="Avg tokens / chat" value={full(data.stats.avgTokensPerConversation)} icon={Gauge} />
            <StatTile label="Tickets sent" value={full(data.stats.ticketsSent)} icon={Ticket} tone="green" />
            <StatTile label="Failed answers" value={full(data.stats.failedReplies)} icon={TriangleAlert} tone={data.stats.failedReplies > 0 ? "red" : undefined} sub={data.stats.maskedMessages > 0 ? `${data.stats.maskedMessages} secret${data.stats.maskedMessages === 1 ? "" : "s"} masked` : undefined} />
          </div>

          <div className="grid gap-2 xl:grid-cols-3">
            <Section title="Activity, last 30 days" description="Questions per day and tokens used." className="xl:col-span-2">
              <UsageChart data={data.series} height={170} />
            </Section>
            <div className="space-y-2">
              <Section title="Where they ask">
                <BarList color="bg-blue-500" rows={data.pages.map((p) => ({ key: p.id ?? "other", label: p.title, value: p.questions, hint: `${compact(p.tokens)} tokens` }))} empty="No questions yet." />
              </Section>
              <Section title="What they talk about">
                <KeywordCloud words={data.keywords} />
              </Section>
            </div>
          </div>

          <Section title="Their conversations" description="Newest first. Open one to read it word for word." flush>
            {data.conversations.items.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="No conversations" />
            ) : (
              <ul className="divide-y divide-slate-100">{data.conversations.items.map((item) => <ConversationRow key={item.id} item={item} showPerson={false} />)}</ul>
            )}
            <Pager page={data.conversations.page} limit={data.conversations.limit} total={data.conversations.total} noun="conversations" onPage={setPage} />
          </Section>

          {data.stats.maskedMessages > 0 && (
            <Notice tone="amber" title="This person shared sensitive details">
              <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5" />Passwords, keys or card numbers in their messages were removed before saving and before reaching the model.</span>
            </Notice>
          )}
        </>
      )}
    </div>
  );
}
