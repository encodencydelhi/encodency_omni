"use client";

import Link from "next/link";
import { ArrowLeft, Bot, Building2, Clock, Coins, ExternalLink, FileSearch, ShieldAlert, Ticket, Wrench } from "lucide-react";
import { RichText } from "@/features/assistant/rich-text";
import { errorMessage } from "@/features/support/hooks";
import { dateTime, span, timeAgo, timeOfDay } from "@/features/support/time";
import { Avatar, Badge, btn, EmptyState, ListSkeleton, Notice, PriorityBadge, Section, StatusBadge } from "@/features/support/ui";
import type { TicketPriority, TicketStatus } from "@/features/support/types";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { cardLabel, full, ROLE_LABEL, seconds, toolLabel } from "./format";
import { useAssistantConversation } from "./hooks";
import type { ThreadMessage } from "./types";

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-b-0">
      <span className="shrink-0 font-medium text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

function Message({ message, person }: { message: ThreadMessage; person: string }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex gap-3", mine ? "" : "flex-row-reverse")}>
      {mine ? (
        <Avatar name={person} size={32} />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
          <Bot className="size-4" />
        </span>
      )}
      <div className={cn("min-w-0 max-w-[85%]", mine ? "" : "text-right")}>
        <p className={cn("mb-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500", mine ? "" : "flex-row-reverse")}>
          <span className="text-slate-800">{mine ? person : "Assistant"}</span>
          <span className="font-medium text-slate-400">{timeOfDay(message.createdAt)}</span>
          {message.page.id && <span className="rounded-sm bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-600">on {message.page.title}</span>}
        </p>
        <div className={cn("inline-block rounded-sm border px-3 py-2 text-left", mine ? "border-slate-200 bg-white text-slate-800" : message.degraded ? "border-rose-200 bg-rose-50 text-rose-900" : "border-blue-200 bg-blue-50/60 text-slate-800")}>
          {mine ? <p dir="auto" className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{message.content}</p> : <RichText text={message.content} />}
        </div>
        {mine && message.redacted && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <ShieldAlert className="size-3" />
            A password, key or card number was masked before this was saved
          </p>
        )}
        {!mine && (
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5 text-[11px] font-medium text-slate-500">
            {message.degraded && <Badge tone="red">Failed Answer</Badge>}
            {message.tools.map((tool, index) => (
              <Badge key={`${tool}-${index}`} tone="violet">
                <Wrench className="size-3" />
                {toolLabel(tool)}
              </Badge>
            ))}
            {message.cards.map((card, index) => (
              <Badge key={`${card}-${index}`} tone="blue">{cardLabel(card)}{card.includes(":") ? `: ${card.split(":")[1]}` : ""}</Badge>
            ))}
            {message.totalTokens > 0 && <span title={`${full(message.promptTokens)} in, ${full(message.completionTokens)} out`}>{full(message.totalTokens)} tokens</span>}
            {message.model && <span>· {message.model}</span>}
            {message.latencyMs !== null && <span>· {seconds(message.latencyMs)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantConversationPage({ id }: { id: string }) {
  const query = useAssistantConversation(id);
  const data = query.data;
  const notFound = ApiError.isApiError(query.error) && query.error.status === 404;

  return (
    <div className="space-y-2">
      <Link href="/super-admin/assistant/conversations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-red-700">
        <ArrowLeft className="size-3.5" />
        All Conversations
      </Link>

      {query.isLoading && <Section title="Loading Conversation…" flush><ListSkeleton rows={5} /></Section>}

      {query.isError && (
        <Section title="Conversation">
          <EmptyState
            icon={FileSearch}
            title={notFound ? "This Conversation Is Gone" : "The Conversation Could Not Be Loaded"}
            description={notFound ? "It was deleted after the retention period, or the link is wrong." : errorMessage(query.error)}
            action={<Link href="/super-admin/assistant/conversations" className={btn}>Back To The List</Link>}
          />
        </Section>
      )}

      {data && (
        <>
          <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Conversation</p>
            <h2 dir="auto" className="mt-1 text-[15px] font-semibold leading-snug text-slate-900">{data.title}</h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Link href={`/super-admin/assistant/people/${data.person.id}`} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700">
                <Avatar name={data.person.name} size={20} />
                {data.person.name}
              </Link>
              <Badge tone="slate"><Building2 className="size-3" />{data.company.name}</Badge>
              {data.person.role && <Badge tone="blue">{ROLE_LABEL[data.person.role] ?? data.person.role}</Badge>}
              <Badge tone="violet"><Coins className="size-3" />{full(data.tokens)} Tokens</Badge>
              {data.ticketNumber && <Badge tone="green"><Ticket className="size-3" />Ticket #{data.ticketNumber} Sent</Badge>}
              {data.degraded > 0 && <Badge tone="red">{data.degraded} Failed</Badge>}
            </div>
          </div>

          <div className="grid gap-2 xl:grid-cols-3">
            <Section title="Conversation" description={`${data.questions} question${data.questions === 1 ? "" : "s"} · ${data.messages} messages · exactly as saved (secrets already masked)`} className="xl:col-span-2">
              <div className="space-y-5" role="log" aria-label="Conversation">
                {data.thread.map((message) => (
                  <Message key={message.id} message={message} person={data.person.name} />
                ))}
              </div>
            </Section>

            <div className="space-y-2">
              <Section title="Details">
                <KeyValue label="Person">
                  <Link href={`/super-admin/assistant/people/${data.person.id}`} className="hover:text-red-700">{data.person.name}</Link>
                </KeyValue>
                <KeyValue label="Email">{data.person.email}</KeyValue>
                <KeyValue label="Company">{data.company.name}</KeyValue>
                <KeyValue label="Role Then">{data.person.role ? (ROLE_LABEL[data.person.role] ?? data.person.role) : "—"}</KeyValue>
                <KeyValue label="Started On">{data.firstPage.title}</KeyValue>
                <KeyValue label="Started">{dateTime(data.startedAt)}</KeyValue>
                <KeyValue label="Last Message">{timeAgo(data.lastMessageAt)}</KeyValue>
                <KeyValue label="Lasted">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3 text-slate-400" />{span(new Date(data.lastMessageAt).getTime() - new Date(data.startedAt).getTime())}</span>
                </KeyValue>
              </Section>

              <Section title="Tokens">
                <KeyValue label="Sent To The Model">{full(data.promptTokens)}</KeyValue>
                <KeyValue label="Written By The Model">{full(data.completionTokens)}</KeyValue>
                <KeyValue label="Total">{full(data.tokens)}</KeyValue>
                <KeyValue label="Per Answer">{data.questions > 0 ? full(Math.round(data.tokens / data.questions)) : "—"}</KeyValue>
              </Section>

              <Section title="Support Ticket">
                {data.ticket ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-900">#{data.ticket.number} {data.ticket.subject}</p>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={data.ticket.status as TicketStatus} />
                      <PriorityBadge priority={data.ticket.priority as TicketPriority} />
                    </div>
                    <Link href={`/super-admin/support/tickets/${data.ticket.number}`} className={btn}>
                      Open In Support Desk
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-500">No ticket was sent from this conversation.</p>
                )}
              </Section>

              <Notice tone="blue" title="Reading This Was Recorded">
                Opening a conversation is written to the Audit Log with your name, so people&apos;s chats are only read for a reason.
              </Notice>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
