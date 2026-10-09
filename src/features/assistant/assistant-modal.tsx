"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, BotMessageSquare, Headphones, LifeBuoy, RotateCcw, ShieldCheck, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NavigateCard, TicketDraftCard, TicketListCard } from "./cards";
import { RichText } from "./rich-text";
import { isRtl, MAX_INPUT_CHARS } from "./text";
import type { AssistantBootstrap, ChatMessage } from "./types";
import type { useAssistantChat } from "./use-assistant-chat";

type Chat = ReturnType<typeof useAssistantChat>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: Chat;
  bootstrap: AssistantBootstrap | undefined;
  bootstrapLoading: boolean;
  firstName: string | undefined;
  /** Seeds the composer when the modal is opened with a question. */
  draft: string;
  onDraftChange: (value: string) => void;
  onNavigate: () => void;
}

function Bubble({ message, chat, bootstrap, onNavigate }: { message: ChatMessage; chat: Chat; bootstrap: AssistantBootstrap | undefined; onNavigate: () => void }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex w-full flex-col", mine ? "items-end" : "items-start")}>
      <div className={cn("max-w-[88%] rounded-sm px-3 py-2", mine ? "bg-red-600 text-white" : message.notice ? "border border-amber-200 bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-800")}>
        {mine ? <p dir="auto" className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{message.content}</p> : <RichText text={message.content} />}
      </div>
      {!mine && message.redacted && <p className="mt-1 text-[11px] font-medium text-slate-500">Passwords, keys or card numbers in your last message were hidden for your safety.</p>}
      {!mine && (
        <div className="w-full max-w-[94%]">
          {message.actions?.map((action, index) => {
            const state = message.state?.[index];
            if (action.type === "navigate") return <NavigateCard key={index} action={action} state={state} onOpen={() => chat.open(message.id, index, action.path)} />;
            if (action.type === "tickets") return <TicketListCard key={index} items={action.items} onNavigate={onNavigate} />;
            return (
              <TicketDraftCard
                key={index}
                draft={action}
                state={state}
                onSent={(number) => chat.ticketSent(message.id, index, number)}
                onDismiss={() => chat.patchState(message.id, index, { dismissed: true })}
                onNavigate={onNavigate}
              />
            );
          })}
          {message.degraded && bootstrap?.canRaiseTickets !== false && !message.actions?.length && (
            <button type="button" onClick={chat.startTicket} className="mt-2 inline-flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100">
              <Headphones className="size-3.5" />
              Send This To The Support Team
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantModal({ open, onOpenChange, chat, bootstrap, bootstrapLoading, firstName, draft, onDraftChange, onNavigate }: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [composing, setComposing] = useState(false);
  const disabled = bootstrap?.enabled === false;
  const canRaise = bootstrap?.canRaiseTickets !== false;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat.messages, chat.pending, open]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft, open]);

  const submit = (text: string) => {
    if (!text.trim() || chat.pending || disabled) return;
    onDraftChange("");
    void chat.send(text);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line. Never send while an input method (Hindi, Chinese, Japanese...) is composing.
    if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(draft);
    }
  };

  const empty = chat.messages.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl outline-none",
            "inset-0 sm:inset-auto sm:bottom-4 sm:left-4 sm:h-[min(700px,calc(100dvh-2rem))] sm:w-[440px] sm:rounded-sm lg:left-[236px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        >
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-red-50 text-red-600 ring-1 ring-red-100">
              <BotMessageSquare className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[14px] font-semibold leading-tight text-slate-900">OmniPlatform Assistant</DialogTitle>
              <DialogDescription className="truncate text-[11px] font-medium text-slate-500">
                {bootstrap?.page ? `You are on ${bootstrap.page.title}` : "Ask me how to use the platform"} · any language
              </DialogDescription>
            </div>
            <button type="button" onClick={chat.reset} disabled={empty} aria-label="Start a new chat" title="New Chat" className="grid size-8 place-items-center rounded-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40">
              <RotateCcw className="size-4" />
            </button>
            <DialogPrimitive.Close aria-label="Close assistant" className="grid size-8 place-items-center rounded-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>

          <div role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
            {empty && (
              <div className="space-y-4">
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[14px] font-semibold text-slate-900">{firstName ? `Hi ${firstName}, how can I help?` : "Hi, how can I help?"}</p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                    Ask about any page, what your role can do, or why something is limited. If I cannot fix it, I will prepare a ticket for our support team.
                  </p>
                </div>
                {disabled && (
                  <p role="status" className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    The assistant is not switched on for this workspace yet. You can still send your question to the support team.
                  </p>
                )}
                {!disabled && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{bootstrap?.page ? `Popular On ${bootstrap.page.title}` : "Try Asking"}</p>
                    <div className="flex flex-wrap gap-2">
                      {bootstrapLoading && !bootstrap && <span className="h-8 w-48 animate-pulse rounded-sm bg-slate-100" />}
                      {bootstrap?.suggestions.map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => submit(suggestion)} className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-start text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700">
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="flex items-start gap-2 text-[11px] font-medium leading-relaxed text-slate-500">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  I cannot see your clients, posts or numbers, and I never need your passwords or keys. Please do not share them. Chats are saved so our support team can review them and improve the help.
                </p>
              </div>
            )}

            {chat.messages.map((message) => (
              <Bubble key={message.id} message={message} chat={chat} bootstrap={bootstrap} onNavigate={onNavigate} />
            ))}

            {chat.pending && (
              <div className="flex items-start" role="status" aria-label="The assistant is typing">
                <div className="flex items-center gap-1 rounded-sm bg-slate-100 px-3 py-3">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <footer className="border-t border-slate-200 bg-white px-3 pb-3 pt-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={chat.startTicket}
                disabled={!canRaise}
                title={canRaise ? undefined : "Your role can read tickets but not raise them. Ask an Owner, Admin or Manager."}
                className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LifeBuoy className="size-3.5" />
                Talk To The Support Team
              </button>
              <Link href="/admin/support/tickets" onClick={onNavigate} className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700">
                <Ticket className="size-3.5" />
                My Tickets
              </Link>
            </div>
            <div className={cn("flex items-end gap-2 rounded-sm border bg-white p-1.5 transition focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/15", disabled ? "border-slate-200 opacity-60" : "border-slate-300")}>
              <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
              <textarea
                id="assistant-input"
                ref={input}
                dir="auto"
                rows={1}
                value={draft}
                disabled={disabled}
                maxLength={MAX_INPUT_CHARS}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={onKeyDown}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                placeholder={disabled ? "Assistant is off" : "Ask in any language…"}
                className={cn("max-h-[120px] min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-snug text-slate-900 outline-none placeholder:text-slate-400", isRtl(draft) && "text-right")}
              />
              <button type="button" onClick={() => submit(draft)} disabled={!draft.trim() || chat.pending || disabled} aria-label="Send message" className="grid size-8 shrink-0 place-items-center rounded-sm bg-red-600 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] font-medium text-slate-400">
              AI answers can be wrong. Chats are saved for our support team. For billing, data or account problems, send a ticket.
              {draft.length > MAX_INPUT_CHARS - 200 && <span className="ms-1 font-semibold text-amber-600">{MAX_INPUT_CHARS - draft.length} left</span>}
            </p>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
