"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Lock, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL, EVENT_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "./labels";
import { dateTime, timeAgo } from "./time";
import type { TicketCategory, TicketPriority, TicketStatus } from "./types";
import { Avatar, btnPrimary, textarea } from "./ui";

/* ------------------------------------------------------------ conversation */

export interface ThreadMessage {
  id: string;
  from: "customer" | "support";
  internal?: boolean;
  authorName: string;
  /** The signed-in person wrote it (Company side). */
  isYou?: boolean;
  body: string;
  createdAt: string;
}

/** Plain text with working https links; nothing else is interpreted, so a message can never inject markup. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https:\/\//.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * The ticket conversation. `viewer` decides which side is "mine": on the Company page the customer's messages sit on the right,
 * on the desk the support team's. Internal notes (desk only) span the full width in amber so they are never mistaken for a reply.
 */
export function Conversation({ messages, viewer }: { messages: ThreadMessage[]; viewer: "customer" | "support" }) {
  return (
    <ol className="space-y-3" aria-label="Conversation">
      {messages.map((message) => {
        if (message.internal) {
          return (
            <li key={message.id} className="rounded-sm border border-amber-300 bg-amber-50 p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-amber-900">
                <Lock className="size-3.5" />
                Internal note · {message.authorName}
                <span className="font-medium text-amber-800/80" title={dateTime(message.createdAt)}>
                  {timeAgo(message.createdAt)}
                </span>
                <span className="ml-auto rounded-sm bg-amber-200 px-1.5 py-px text-[10px] font-bold text-amber-900">Only support staff see this</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-amber-950">
                <Linkified text={message.body} />
              </p>
            </li>
          );
        }
        const mine = message.from === viewer;
        return (
          <li key={message.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
            <Avatar name={message.authorName} size={30} tone={message.from === "support" ? 0 : 3} />
            <div className={cn("min-w-0 max-w-[85%]", mine && "text-right")}>
              <div className={cn("mb-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-500", mine && "justify-end")}>
                <span className="text-slate-800">{message.isYou ? "You" : message.authorName}</span>
                {message.from === "support" && <span className="rounded-sm bg-blue-100 px-1.5 py-px text-[10px] font-bold text-blue-700">Support team</span>}
                <span className="font-medium" title={dateTime(message.createdAt)}>
                  {timeAgo(message.createdAt)}
                </span>
              </div>
              <div className={cn("inline-block rounded-sm border px-3.5 py-2.5 text-left text-xs font-medium leading-relaxed", mine ? "border-red-200 bg-red-50 text-slate-900" : "border-slate-200 bg-white text-slate-800")}>
                <p className="whitespace-pre-wrap break-words">
                  <Linkified text={message.body} />
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- composer */

export function Composer({
  value,
  onChange,
  onSend,
  pending,
  placeholder,
  children,
  submitLabel = "Send reply",
  minRows = 4,
  tone = "default",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Resolves when the message was sent (the draft is then cleared); a rejection keeps the draft. */
  onSend: (body: string) => Promise<unknown> | void;
  pending: boolean;
  placeholder: string;
  /** Extra controls on the left of the send button (status picker, canned replies…). */
  children?: ReactNode;
  submitLabel?: string;
  minRows?: number;
  tone?: "default" | "note";
  disabled?: boolean;
}) {
  const trimmed = value.trim();
  const tooLong = value.length > 5000;
  const submit = async () => {
    if (!trimmed || tooLong || pending) return;
    try {
      await onSend(trimmed);
      onChange("");
    } catch {
      /* the caller already told the user; keep the draft */
    }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKey}
        rows={minRows}
        placeholder={placeholder}
        disabled={disabled || pending}
        aria-label={placeholder}
        className={cn(textarea, tone === "note" && "border-amber-300 bg-amber-50/60 focus:border-amber-500 focus:ring-amber-500/20")}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        <div className="flex items-center gap-3">
          <span className={cn("text-[11px] font-medium", tooLong ? "text-rose-600" : "text-slate-400")}>{value.length}/5000 · Ctrl+Enter to send</span>
          <button type="button" className={btnPrimary} onClick={() => void submit()} disabled={!trimmed || tooLong || pending || disabled}>
            <Send className="size-3.5" />
            {pending ? "Sending…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- timeline */

const word = (value: string | null, map: Record<string, string>) => (value ? (map[value] ?? value.replace(/_/g, " ")) : "");

/** One line of the activity trail, in plain words. */
export function describeEvent(event: { kind: string; from: string | null; to: string | null; note: string | null }): string {
  switch (event.kind) {
    case "created":
      return `Ticket raised${event.to ? ` · ${word(event.to, PRIORITY_LABEL)} priority` : ""}`;
    case "status_changed":
      return `Status: ${word(event.from, STATUS_LABEL as Record<TicketStatus, string>)} → ${word(event.to, STATUS_LABEL as Record<TicketStatus, string>)}`;
    case "assigned":
      return event.to === "unassigned" ? `Unassigned${event.from ? ` from ${event.from}` : ""}` : event.to === "self" ? "Took the ticket" : `Assigned to ${event.to}${event.from ? ` (was ${event.from})` : ""}`;
    case "priority_changed":
      return `Priority: ${word(event.from, PRIORITY_LABEL as Record<TicketPriority, string>)} → ${word(event.to, PRIORITY_LABEL as Record<TicketPriority, string>)}`;
    case "category_changed":
      return `Category: ${word(event.from, CATEGORY_LABEL as Record<TicketCategory, string>)} → ${word(event.to, CATEGORY_LABEL as Record<TicketCategory, string>)}`;
    case "reopened":
      return `Reopened${event.note ? `: ${event.note}` : ""}`;
    case "closed":
      return event.note ?? "Closed";
    case "rated":
      return `Rated ${event.to}/5${event.note ? `: “${event.note}”` : ""}`;
    case "replied":
      return event.note === "customer" ? "Customer replied" : "Support replied";
    case "note_added":
      return "Internal note added";
    default:
      return EVENT_LABEL[event.kind] ?? event.kind;
  }
}

export function Timeline({ events }: { events: Array<{ id: string; kind: string; from: string | null; to: string | null; note: string | null; actor: string; createdAt: string }> }) {
  if (events.length === 0) return <p className="text-xs font-medium text-slate-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-3.5 border-l border-slate-200 pl-4">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-300" aria-hidden="true" />
          <p className="text-xs font-semibold text-slate-800">{describeEvent(event)}</p>
          <p className="text-[11px] font-medium text-slate-500">
            {event.actor} · <span title={dateTime(event.createdAt)}>{timeAgo(event.createdAt)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
