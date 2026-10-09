"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/features/support/labels";
import { errorMessage, useCreateTicket } from "@/features/support/hooks";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketCategory, type TicketPriority, type TicketStatus } from "@/features/support/types";
import { btn, btnPrimary, field, PriorityBadge, Spinner, StatusBadge, textarea } from "@/features/support/ui";
import type { ActionState, AssistantAction } from "./types";

type Draft = Extract<AssistantAction, { type: "ticket_draft" }>;

const cardShell = "mt-2 rounded-sm border border-slate-200 bg-white p-3 text-slate-800 shadow-sm";

export function NavigateCard({ action, state, onOpen }: { action: Extract<AssistantAction, { type: "navigate" }>; state?: ActionState; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`${cardShell} flex w-full items-center justify-between gap-3 text-start transition hover:border-red-300 hover:bg-red-50/40`}>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{state?.navigated ? "Opened" : "Go to"}</span>
        <span className="block truncate text-[13px] font-semibold text-slate-900">{action.label}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-red-600 rtl:rotate-180" />
    </button>
  );
}

export function TicketListCard({ items, onNavigate }: { items: Extract<AssistantAction, { type: "tickets" }>["items"]; onNavigate: () => void }) {
  if (items.length === 0) return <div className={`${cardShell} text-xs font-medium text-slate-500`}>No matching tickets.</div>;
  return (
    <ul className={`${cardShell} divide-y divide-slate-100 p-0`}>
      {items.map((ticket) => (
        <li key={ticket.number}>
          <Link href={`/admin/support/tickets/${ticket.number}`} onClick={onNavigate} className="flex items-center justify-between gap-3 px-3 py-2 transition hover:bg-slate-50">
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-slate-900">#{ticket.number} {ticket.subject}</span>
              <span className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={ticket.status as TicketStatus} customer />
                <PriorityBadge priority={ticket.priority as TicketPriority} />
              </span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-slate-400 rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The assistant only PREPARES a ticket. Nothing is sent until the person presses "Send to support", and the existing
 * ticket endpoint (with its own permission and rate-limit checks) does the creating.
 */
export function TicketDraftCard({ draft, state, onSent, onDismiss, onNavigate }: { draft: Draft; state?: ActionState; onSent: (number: number) => void; onDismiss: () => void; onNavigate: () => void }) {
  const create = useCreateTicket();
  const [subject, setSubject] = useState(draft.subject);
  const [description, setDescription] = useState(draft.description);
  const [category, setCategory] = useState<TicketCategory>(draft.category);
  const [priority, setPriority] = useState<TicketPriority>(draft.priority);
  const [error, setError] = useState<string | null>(null);

  if (state?.ticketNumber) {
    return (
      <div className={`${cardShell} flex items-center gap-3 border-emerald-200 bg-emerald-50/60`}>
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1 text-xs font-medium text-emerald-900">
          <p className="font-semibold">Ticket #{state.ticketNumber} sent to support</p>
          <p className="text-emerald-800/80">You will be notified when the team replies.</p>
        </div>
        <Link href={`/admin/support/tickets/${state.ticketNumber}`} onClick={onNavigate} className={btn}>View</Link>
      </div>
    );
  }
  if (state?.dismissed) return <div className={`${cardShell} text-xs font-medium text-slate-500`}>Ticket draft discarded.</div>;

  const valid = subject.trim().length >= 3 && description.trim().length >= 10;
  const send = async () => {
    setError(null);
    try {
      const ticket = await create.mutateAsync({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        ...(draft.relatedModule ? { relatedModule: draft.relatedModule } : {}),
        ...(draft.relatedUrl ? { relatedUrl: draft.relatedUrl } : {}),
      });
      toast.success(`Ticket #${ticket.number} raised.`);
      onSent(ticket.number);
    } catch (failure) {
      setError(errorMessage(failure, "The ticket could not be sent. Nothing was sent; try again."));
    }
  };

  return (
    <div className={cardShell}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <LifeBuoy className="size-3.5 text-red-600" />
        Ticket for the support team · review, then send
      </div>
      <label className="block text-[11px] font-semibold text-slate-600">
        Title
        <input dir="auto" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} className={`${field} mt-1`} />
      </label>
      <label className="mt-2 block text-[11px] font-semibold text-slate-600">
        What happened
        <textarea dir="auto" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} className={`${textarea} mt-1`} />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Topic
          <select value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)} className={`${field} mt-1`}>
            {TICKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>{CATEGORY_LABEL[value]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          How urgent
          <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className={`${field} mt-1`}>
            {TICKET_PRIORITIES.map((value) => (
              <option key={value} value={value}>{PRIORITY_LABEL[value]}</option>
            ))}
          </select>
        </label>
      </div>
      {(draft.relatedModule || draft.relatedUrl) && <p className="mt-2 text-[11px] font-medium text-slate-500">Page: {draft.relatedModule ?? draft.relatedUrl}</p>}
      {error && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" className={btn} onClick={onDismiss} disabled={create.isPending}>Discard</button>
        <button type="button" className={btnPrimary} onClick={() => void send()} disabled={!valid || create.isPending}>
          {create.isPending ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />}
          Send to support
        </button>
      </div>
    </div>
  );
}

