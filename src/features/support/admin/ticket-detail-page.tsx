"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { supportApi } from "../api";
import { CATEGORY_LABEL } from "../labels";
import { errorMessage, errorReason, useMyTicket, useTicketAction } from "../hooks";
import { dateTime, dueText, span } from "../time";
import { Composer, Conversation, Timeline } from "../thread";
import type { TicketDetail } from "../types";
import { Badge, btn, btnPrimary, CategoryChip, Card, ConfirmButton, EmptyState, field, Notice, PriorityBadge, Section, SlaBadge, Skeleton, Spinner, StatusBadge, Stars, textarea } from "../ui";

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <dt className="shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function MyTicketDetailPage({ number }: { number: number }) {
  const ticket = useMyTicket(number);
  const reply = useTicketAction<string>((companyId, body) => supportApi.reply(companyId, number, body), "Reply sent.");
  const reopen = useTicketAction<string | undefined>((companyId, reason) => supportApi.reopen(companyId, number, reason), "Ticket reopened. Support has been notified.");
  const close = useTicketAction<void>((companyId) => supportApi.close(companyId, number), "Ticket closed.");
  const rate = useTicketAction<{ rating: number; comment: string }>((companyId, input) => supportApi.rate(companyId, number, input.rating, input.comment), "Thanks for your feedback!");
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState("");

  if (ticket.isLoading) {
    return (
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (ticket.isError || !ticket.data) {
    const missing = errorReason(ticket.error) === "ticket_not_found";
    return (
      <Card>
        <EmptyState
          title={missing ? "Ticket not found" : "This ticket could not be loaded"}
          description={missing ? "It may belong to another Company, or the number is wrong." : errorMessage(ticket.error)}
          action={
            <Link href="/admin/support/tickets" className={btn}>
              <ArrowLeft className="size-3.5" />
              Back to my tickets
            </Link>
          }
        />
      </Card>
    );
  }

  const t: TicketDetail = ticket.data;
  const resolved = t.status === "resolved";
  const closed = t.status === "closed";
  const firstDue = dueText(t.sla.firstResponse.dueAt);
  const resolutionDue = dueText(t.sla.resolution.dueAt);

  return (
    <div className="space-y-2">
      <Link href="/admin/support/tickets" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-3.5" />
        My tickets
      </Link>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Ticket #{t.number}</p>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-slate-900">{t.subject}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={t.status} customer />
              <PriorityBadge priority={t.priority} />
              <CategoryChip category={t.category} />
              {t.awaiting === "you" && <Badge tone="amber">Needs your reply</Badge>}
              {t.awaiting === "support" && <Badge tone="blue">Waiting for support</Badge>}
              {t.reopenCount > 0 && <Badge tone="slate">Reopened {t.reopenCount}×</Badge>}
            </div>
          </div>
          {!closed && (
            <div className="flex flex-wrap items-center gap-2">
              <ConfirmButton label="Close ticket" confirmLabel="Yes, close it" onConfirm={() => close.mutate()} disabled={close.isPending} />
            </div>
          )}
        </div>
      </Card>

      {resolved && (
        <Notice tone="green" title="Support marked this ticket as resolved">
          Is the problem fixed? If it is, close the ticket (or just leave it). If not, tell us what is still wrong.
          <div className="mt-2 flex flex-wrap gap-2">
            <ConfirmButton label="Yes, close it" confirmLabel="Close ticket" onConfirm={() => close.mutate()} disabled={close.isPending} />
            <button type="button" className={btn} onClick={() => setReopening(true)}>
              <RotateCcw className="size-3.5" />
              No, it is not fixed
            </button>
          </div>
        </Notice>
      )}

      {(reopening || (closed && t.actions.canReopen)) && (
        <Section title="Reopen this ticket" description={closed ? `Closed tickets can be reopened for ${t.actions.reopenWindowDays} days.` : "Tell support what is still wrong."}>
          {reopening || closed ? (
            <div className="space-y-2">
              {!reopening ? (
                <button type="button" className={btn} onClick={() => setReopening(true)}>
                  <RotateCcw className="size-3.5" />
                  Reopen ticket
                </button>
              ) : (
                <>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={300} placeholder="What is still not working? (optional)" className={textarea} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={reopen.isPending}
                      onClick={() =>
                        reopen.mutate(reason.trim() || undefined, {
                          onSuccess: () => {
                            setReopening(false);
                            setReason("");
                          },
                        })
                      }
                    >
                      {reopen.isPending && <Spinner />}
                      Reopen ticket
                    </button>
                    <button type="button" className={btn} onClick={() => setReopening(false)}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </Section>
      )}

      {closed && !t.actions.canReopen && (
        <Notice tone="blue" title="This ticket is closed">
          It was closed more than {t.actions.reopenWindowDays} days ago. If the problem is back, raise a new ticket and mention #{t.number}.
        </Notice>
      )}

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2">
          <Section title="Conversation" description={`${t.messages.length} message${t.messages.length === 1 ? "" : "s"}`}>
            <Conversation viewer="customer" messages={t.messages.map((m) => ({ ...m }))} />
          </Section>

          {t.actions.canReply ? (
            <Section title="Reply" description={t.awaiting === "you" ? "Support is waiting for your answer." : "Add more detail, a screenshot link or an answer."}>
              <Composer value={draft} onChange={setDraft} placeholder="Write your reply…" pending={reply.isPending} onSend={(body) => reply.mutateAsync(body)} />
              {resolved && <p className="mt-2 text-[11px] font-medium text-slate-500">Replying to a resolved ticket reopens it.</p>}
            </Section>
          ) : (
            <Card className="flex items-center gap-2 p-3 text-xs font-medium text-slate-600">
              <Lock className="size-3.5" />
              This ticket is closed, so replies are turned off.
            </Card>
          )}

          {t.actions.canRate && <RatingForm pending={rate.isPending} onSubmit={(rating, comment) => rate.mutate({ rating, comment })} />}
          {t.satisfaction && (
            <Section title="Your feedback">
              <div className="flex items-center gap-3">
                <Stars value={t.satisfaction.rating} size={18} />
                <span className="text-sm font-semibold text-slate-900">{t.satisfaction.rating}/5</span>
              </div>
              {t.satisfaction.comment && <p className="mt-2 text-xs font-medium text-slate-600">“{t.satisfaction.comment}”</p>}
            </Section>
          )}
        </div>

        <aside className="space-y-2">
          <Section title="Details">
            <dl>
              <KeyValue label="Ticket">#{t.number}</KeyValue>
              <KeyValue label="Raised by">{t.createdBy.isYou ? "You" : t.createdBy.name}</KeyValue>
              <KeyValue label="Raised">{dateTime(t.createdAt)}</KeyValue>
              <KeyValue label="Category">{CATEGORY_LABEL[t.category]}</KeyValue>
              {t.client && <KeyValue label="Client">{t.client.name}</KeyValue>}
              {t.relatedModule && <KeyValue label="Area">{t.relatedModule}</KeyValue>}
              {t.relatedUrl && (
                <KeyValue label="Page">
                  {t.relatedUrl.startsWith("/") ? (
                    <Link href={t.relatedUrl} className="inline-flex items-center gap-1 text-red-600 hover:underline">
                      {t.relatedUrl}
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : (
                    <a href={t.relatedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-red-600 hover:underline">
                      {t.relatedUrl}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </KeyValue>
              )}
              <KeyValue label="Handled by">{t.assignee?.name ?? "Not assigned yet"}</KeyValue>
            </dl>
          </Section>

          <Section title="Response times" description="What we promised for a ticket of this priority.">
            <div className="space-y-3 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">First reply</span>
                  <SlaBadge sla={{ ...t.sla, state: t.sla.firstResponse.state }} withTime={false} />
                </div>
                <p className="font-medium text-slate-500">
                  {t.firstResponseAt ? `Answered after ${span(new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime())}` : firstDue.late ? `Late by ${firstDue.text.replace(" overdue", "")}. Support has been alerted.` : `Due in ${firstDue.text.replace(" left", "")}`}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Solved</span>
                  <SlaBadge sla={{ ...t.sla, state: t.sla.resolution.state }} withTime={false} />
                </div>
                <p className={cn("font-medium", resolutionDue.late && !resolved && !closed ? "text-rose-600" : "text-slate-500")}>
                  {resolved || closed ? `Resolved ${t.resolvedAt ? dateTime(t.resolvedAt) : dateTime(t.closedAt)}` : t.status === "waiting_on_customer" ? "Clock paused while we wait for you" : resolutionDue.text}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Timeline">
            <Timeline events={t.events} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function RatingForm({ onSubmit, pending }: { onSubmit: (rating: number, comment: string) => void; pending: boolean }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <Section title="How did we do?" description="One tap helps us improve. You can only rate a ticket once.">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="rounded-sm p-0.5">
            <Star className={cn("size-7 transition", (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="Anything we should know? (optional)" className={cn(field, "mt-3")} />
      <button type="button" className={cn(btnPrimary, "mt-3")} disabled={rating === 0 || pending} onClick={() => onSubmit(rating, comment.trim())}>
        {pending ? <Spinner /> : <CheckCircle2 className="size-3.5" />}
        Submit feedback
      </button>
    </Section>
  );
}
