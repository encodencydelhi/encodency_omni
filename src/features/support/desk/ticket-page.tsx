"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Building2, CheckCircle2, ExternalLink, Flame, Lock, Mail, MessageSquareReply, UserCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/components/auth-provider";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "../labels";
import { errorMessage, errorReason, useDeskAssign, useDeskCategory, useDeskPriority, useDeskReply, useDeskStaff, useDeskStatus, useDeskTicket } from "../hooks";
import { dateTime, dueText, span } from "../time";
import { Composer, Conversation, Timeline } from "../thread";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type DeskDetail, type SlaClock, type TicketCategory, type TicketPriority, type TicketStatus } from "../types";
import { Avatar, Badge, btn, btnPrimary, CategoryChip, Card, EmptyState, field, Notice, PriorityBadge, Section, Skeleton, SlaBadge, Spinner, StatusBadge, Stars, textarea } from "../ui";
import { CANNED_REPLIES, fillCanned } from "./canned";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <dt className="shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function Clock({ title, clock, status, paused }: { title: string; clock: SlaClock; status: TicketStatus; paused?: boolean }) {
  const open = clock.state === "on_track" || clock.state === "at_risk" || clock.state === "breached";
  const due = dueText(clock.dueAt);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{title}</span>
        <SlaBadge sla={{ state: clock.state, firstResponse: clock, resolution: clock }} withTime={false} />
      </div>
      <p className={cn("text-[11px] font-medium", clock.state === "breached" ? "text-rose-600" : "text-slate-500")}>
        {clock.at ? `${clock.state === "missed" ? "Late: done" : "Done"} ${dateTime(clock.at)} (due ${dateTime(clock.dueAt)})` : paused || status === "waiting_on_customer" ? `Paused while waiting for the customer (due ${dateTime(clock.dueAt)})` : open ? `${due.text} · due ${dateTime(clock.dueAt)}` : `Due ${dateTime(clock.dueAt)}`}
      </p>
    </div>
  );
}

type Mode = "reply" | "note";
type After = "waiting_on_customer" | "in_progress" | "resolved";

export function DeskTicketPage({ number }: { number: number }) {
  const { user } = useAuth();
  const ticket = useDeskTicket(number);
  const staff = useDeskStaff();
  const reply = useDeskReply();
  const assign = useDeskAssign();
  const status = useDeskStatus();
  const priority = useDeskPriority();
  const category = useDeskCategory();
  const [mode, setMode] = useState<Mode>("reply");
  const [draft, setDraft] = useState("");
  const [after, setAfter] = useState<After>("waiting_on_customer");
  const [finalizing, setFinalizing] = useState<null | "resolved" | "closed">(null);
  const [finalMessage, setFinalMessage] = useState("");

  if (ticket.isLoading) {
    return (
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-[480px]" />
      </div>
    );
  }
  if (ticket.isError || !ticket.data) {
    const missing = errorReason(ticket.error) === "ticket_not_found";
    return (
      <Card>
        <EmptyState
          title={missing ? `Ticket #${number} does not exist` : "This ticket could not be loaded"}
          description={missing ? "Check the number, or find it in the inbox." : errorMessage(ticket.error)}
          action={
            <Link href="/super-admin/support/inbox" className={btn}>
              <ArrowLeft className="size-3.5" />
              Back to the inbox
            </Link>
          }
        />
      </Card>
    );
  }

  const t: DeskDetail = ticket.data;
  const closed = t.status === "closed";
  const finished = t.status === "resolved" || closed;
  const mine = t.assignee?.id === user?.id;
  const busy = reply.isPending || assign.isPending || status.isPending || priority.isPending || category.isPending;
  const staffList = staff.data ?? [];

  // A reply on a solved ticket keeps it solved; on a live ticket it moves to the status picked under the box.
  const send = (body: string) => reply.mutateAsync({ number, body, visibility: mode === "note" ? "internal" : "public", nextStatus: mode === "reply" && !finished ? after : undefined });

  const finalize = () => {
    if (!finalizing) return;
    status.mutate({ number, status: finalizing, message: finalMessage.trim() || undefined }, { onSuccess: () => { setFinalizing(null); setFinalMessage(""); } });
  };

  const onStatusChange = (next: TicketStatus) => {
    if (next === t.status) return;
    if (next === "resolved" || next === "closed") setFinalizing(next);
    else status.mutate({ number, status: next });
  };

  return (
    <div className="space-y-2">
      <Link href="/super-admin/support/inbox" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-3.5" />
        Ticket inbox
      </Link>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              Ticket #{t.number}
              <span aria-hidden="true">·</span>
              <Link href={`/super-admin/companies/${t.company.id}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-red-700 hover:underline">
                <Building2 className="size-3" />
                {t.company.name}
              </Link>
            </p>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-slate-900">{t.subject}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
              <CategoryChip category={t.category} />
              <SlaBadge sla={t.sla} />
              {t.unanswered && <Badge tone="red">No reply yet</Badge>}
              {t.reopenCount > 0 && <Badge tone="amber">Reopened {t.reopenCount}×</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {t.priority !== "urgent" && !finished && (
              <button type="button" className={btn} disabled={busy} onClick={() => priority.mutate({ number, priority: "urgent" })} title="Raise to urgent: the SLA deadlines tighten at once">
                <Flame className="size-3.5 text-red-600" />
                Escalate to urgent
              </button>
            )}
            {!mine && !closed && (
              <button type="button" className={btn} disabled={busy || !user} onClick={() => user && assign.mutate({ number, assigneeId: user.id })}>
                <UserCheck className="size-3.5" />
                Assign to me
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Assignee</span>
            <select className={field} value={t.assignee?.id ?? ""} disabled={busy || closed} onChange={(event) => assign.mutate({ number, assigneeId: event.target.value || null })} aria-label="Assignee">
              <option value="">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.open} open)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Status</span>
            <select className={field} value={t.status} disabled={busy} onChange={(event) => onStatusChange(event.target.value as TicketStatus)} aria-label="Status">
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Priority</span>
            <select className={field} value={t.priority} disabled={busy || finished} onChange={(event) => priority.mutate({ number, priority: event.target.value as TicketPriority })} aria-label="Priority">
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Category</span>
            <select className={field} value={t.category} disabled={busy} onChange={(event) => category.mutate({ number, category: event.target.value as TicketCategory })} aria-label="Category">
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {finalizing && (
        <Section title={finalizing === "resolved" ? "Resolve this ticket" : "Close this ticket"} description={finalizing === "resolved" ? "The customer is notified and can reopen it if it is not fixed." : "Closing is final for the customer after 14 days. They are not asked for more input."}>
          <textarea value={finalMessage} onChange={(event) => setFinalMessage(event.target.value)} rows={4} maxLength={5000} className={textarea} placeholder={finalizing === "resolved" ? "Optional message to the customer: what was wrong and what you did…" : "Optional closing message to the customer…"} aria-label="Message to the customer" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} onClick={finalize} disabled={status.isPending}>
              {status.isPending ? <Spinner /> : <CheckCircle2 className="size-3.5" />}
              {finalizing === "resolved" ? "Resolve ticket" : "Close ticket"}
            </button>
            <button type="button" className={btn} onClick={() => setFinalizing(null)}>
              Cancel
            </button>
            {finalMessage.trim() === "" && <span className="text-[11px] font-medium text-slate-500">No message will be sent to the customer.</span>}
          </div>
        </Section>
      )}

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          <Section title="Conversation" description={`${t.messages.filter((m) => !m.internal).length} public message(s) · ${t.messages.filter((m) => m.internal).length} internal note(s)`}>
            <Conversation viewer="support" messages={t.messages} />
          </Section>

          {closed ? (
            <Notice tone="blue" title="This ticket is closed" action={<button type="button" className={btn} onClick={() => status.mutate({ number, status: "open" })} disabled={status.isPending}>Reopen</button>}>
              Reopen it to reply to the customer or add a note.
            </Notice>
          ) : (
            <Section
              title={mode === "reply" ? "Reply to the customer" : "Internal note"}
              description={mode === "reply" ? `Sent to ${t.requester.name}. They are notified.` : "Only support staff can see this."}
              action={
                <div className="flex overflow-hidden rounded-sm border border-slate-300" role="tablist" aria-label="Reply type">
                  <button type="button" role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")} className={cn("inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold", mode === "reply" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    <MessageSquareReply className="size-3.5" />
                    Reply
                  </button>
                  <button type="button" role="tab" aria-selected={mode === "note"} onClick={() => setMode("note")} className={cn("inline-flex h-8 items-center gap-1.5 border-l border-slate-300 px-3 text-xs font-semibold", mode === "note" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    <Lock className="size-3.5" />
                    Internal note
                  </button>
                </div>
              }
            >
              <Composer
                value={draft}
                onChange={setDraft}
                tone={mode === "note" ? "note" : "default"}
                placeholder={mode === "reply" ? "Write your reply…" : "Write a note for the team…"}
                submitLabel={mode === "reply" ? (after === "resolved" ? "Send & resolve" : "Send reply") : "Add note"}
                pending={reply.isPending}
                onSend={send}
              >
                {mode === "reply" && (
                  <>
                    <select
                      className={cn(field, "h-8 w-auto max-w-[190px]")}
                      value=""
                      onChange={(event) => {
                        const canned = CANNED_REPLIES.find((c) => c.id === event.target.value);
                        if (canned) setDraft((current) => (current.trim() ? `${current}\n\n` : "") + fillCanned(canned, t.requester.name));
                      }}
                      aria-label="Insert a canned reply"
                    >
                      <option value="">Insert canned reply…</option>
                      {CANNED_REPLIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.category}: {c.title}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      After sending
                      <select className={cn(field, "h-8 w-auto")} value={after} onChange={(event) => setAfter(event.target.value as After)} aria-label="Status after sending">
                        <option value="waiting_on_customer">Wait for the customer</option>
                        <option value="in_progress">Keep working on it</option>
                        <option value="resolved">Mark as resolved</option>
                      </select>
                    </label>
                  </>
                )}
              </Composer>
            </Section>
          )}

          {t.satisfaction && (
            <Section title="Customer feedback">
              <div className="flex items-center gap-3">
                <Stars value={t.satisfaction.rating} size={18} />
                <span className="text-sm font-semibold text-slate-900">{t.satisfaction.rating}/5</span>
              </div>
              {t.satisfaction.comment && <p className="mt-2 text-xs font-medium text-slate-600">“{t.satisfaction.comment}”</p>}
            </Section>
          )}
        </div>

        <aside className="space-y-2">
          <Section title="Customer">
            <div className="flex items-start gap-3">
              <Avatar name={t.requester.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{t.requester.name}</p>
                <a href={`mailto:${t.requester.email}`} className="inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-slate-600 hover:text-red-700">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{t.requester.email}</span>
                </a>
                {t.requester.role && <p className="mt-0.5 text-[11px] font-semibold capitalize text-slate-500">{t.requester.role} of {t.company.name}</p>}
              </div>
            </div>
            <dl className="mt-3">
              <Row label="Company">
                <Link href={`/super-admin/companies/${t.company.id}`} className="text-red-600 hover:underline">
                  {t.company.name}
                </Link>
              </Row>
              {t.companyOwner && <Row label="Owner">{t.companyOwner.name} · {t.companyOwner.email}</Row>}
              {t.client && <Row label="Client">{t.client.name}</Row>}
              <Row label="Company tickets">
                <Link href={`/super-admin/support/inbox?queue=everything&companyId=${t.company.id}`} className="text-red-600 hover:underline">
                  {t.companyTickets.open} open of {t.companyTickets.total}
                </Link>
              </Row>
            </dl>
          </Section>

          <Section title="SLA clocks" description="Measured from when the ticket was raised.">
            <div className="space-y-3">
              <Clock title="First response" clock={t.sla.firstResponse} status={t.status} />
              <Clock title="Resolution" clock={t.sla.resolution} status={t.status} paused={t.status === "waiting_on_customer"} />
            </div>
          </Section>

          <Section title="Details">
            <dl>
              <Row label="Raised">{dateTime(t.createdAt)}</Row>
              <Row label="First reply">{t.firstResponseAt ? `${dateTime(t.firstResponseAt)} (after ${span(new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime())})` : "Not yet"}</Row>
              {t.resolvedAt && <Row label="Resolved">{dateTime(t.resolvedAt)}</Row>}
              {t.closedAt && <Row label="Closed">{dateTime(t.closedAt)}</Row>}
              {t.relatedModule && <Row label="Area">{t.relatedModule}</Row>}
              {t.relatedUrl && (
                <Row label="Page">
                  <a href={t.relatedUrl} target={t.relatedUrl.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-red-600 hover:underline">
                    {t.relatedUrl}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </Row>
              )}
            </dl>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">Original description</p>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-700">{t.description}</p>
            </div>
          </Section>

          {t.otherTickets.length > 0 && (
            <Section title="Other tickets from this Company" flush>
              <ul className="divide-y divide-slate-100">
                {t.otherTickets.map((other) => (
                  <li key={other.number}>
                    <Link href={`/super-admin/support/tickets/${other.number}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition hover:bg-slate-50">
                      <span className="min-w-0 truncate font-semibold text-slate-800">
                        #{other.number} {other.subject}
                      </span>
                      <StatusBadge status={other.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Timeline">
            <Timeline events={t.events} />
          </Section>
        </aside>
      </div>

      {(reply.isError || status.isError) && (
        <Notice tone="red" title="That did not go through">
          {errorMessage(reply.error ?? status.error)}
        </Notice>
      )}
      {!t.assignee && !finished && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <XCircle className="size-3.5" />
          Nobody owns this ticket. Replying or resolving it assigns it to you.
        </p>
      )}
    </div>
  );
}
