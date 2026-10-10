"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/types/api";
import { assistantApi } from "./api";
import { historyForServer, MAX_INPUT_CHARS, readStored, storageKey, trimForStorage } from "./text";
import type { ActionState, AssistantAction, ChatMessage } from "./types";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m${Date.now()}${Math.random().toString(16).slice(2)}`);

interface Options {
  userId: string | undefined;
  companyId: string | undefined;
  pathname: string;
  pageTitle: string | undefined;
  /** Opens a page for the person (also closes the assistant). */
  go: (path: string) => void;
}

/**
 * The conversation lives in this tab only (sessionStorage, keyed by person and Company) so it survives closing the
 * modal and page changes, never leaks to another person on the same tab, and is not stored on the server.
 */
export function useAssistantChat({ userId, companyId, pathname, pageTitle, go }: Options) {
  const key = storageKey(userId, companyId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const cid = useRef<string | null>(null);
  const ref = useRef<ChatMessage[]>([]);
  const abort = useRef<AbortController | null>(null);

  // Switching person or Company swaps the whole conversation (done while rendering, not in an effect).
  if (key !== loadedKey) {
    setLoadedKey(key);
    let restored: ChatMessage[] = [];
    let restoredId: string | null = null;
    try {
      restored = key ? readStored(window.sessionStorage.getItem(key)) : [];
      restoredId = key ? window.sessionStorage.getItem(`${key}:cid`) : null;
    } catch {
      restored = [];
    }
    ref.current = restored;
    cid.current = restored.length > 0 ? restoredId : null;
    setMessages(restored);
    setConversationId(cid.current);
  }

  useEffect(() => {
    if (!key) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(trimForStorage(messages)));
      if (conversationId) window.sessionStorage.setItem(`${key}:cid`, conversationId);
      else window.sessionStorage.removeItem(`${key}:cid`);
    } catch {
      // Storage can be blocked; the conversation then simply lasts until the page is reloaded.
    }
  }, [key, messages, conversationId]);

  useEffect(() => {
    if (!companyId || messages.length > 0 || conversationId || pending) return;
    const controller = new AbortController();
    void assistantApi
      .conversations(companyId, controller.signal)
      .then(async (list) => {
        const latest = list.items[0];
        if (!latest || controller.signal.aborted) return;
        const detail = await assistantApi.conversation(companyId, latest.id, controller.signal);
        if (controller.signal.aborted) return;
        const restored: ChatMessage[] = detail.messages.map((message) => ({
          id: message.id,
          role: message.role === "USER" ? "user" : "assistant",
          content: message.content,
          createdAt: new Date(message.createdAt).getTime(),
          degraded: message.degraded,
          redacted: message.redacted,
        }));
        cid.current = detail.conversation.id;
        ref.current = restored;
        setConversationId(detail.conversation.id);
        setMessages(restored);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [companyId, conversationId, messages.length, pending]);

  useEffect(() => {
    if (!companyId || !key || !conversationId) return;
    const controller = new AbortController();
    void assistantApi.conversation(companyId, conversationId, controller.signal).catch(() => {
      if (controller.signal.aborted) return;
      cid.current = null;
      ref.current = [];
      setConversationId(null);
      setMessages([]);
      try {
        window.sessionStorage.removeItem(key);
        window.sessionStorage.removeItem(`${key}:cid`);
      } catch {
        // If storage is unavailable, clearing React state is still enough for this tab.
      }
    });
    return () => controller.abort();
  }, [companyId, conversationId, key]);


  useEffect(() => () => abort.current?.abort(), []);

  const commit = useCallback((update: (current: ChatMessage[]) => ChatMessage[]) => {
    ref.current = update(ref.current);
    setMessages(ref.current);
  }, []);

  const patchState = useCallback(
    (messageId: string, index: number, patch: ActionState) => {
      commit((current) => current.map((message) => (message.id === messageId ? { ...message, state: { ...message.state, [index]: { ...message.state?.[index], ...patch } } } : message)));
    },
    [commit],
  );

  /** A ticket was sent from a card: show it, and tell the server which conversation it came from (best effort). */
  const ticketSent = useCallback(
    (messageId: string, index: number, ticketNumber: number) => {
      patchState(messageId, index, { ticketNumber });
      if (companyId && cid.current) void assistantApi.linkTicket(companyId, { conversationId: cid.current, ticketNumber }).catch(() => undefined);
    },
    [companyId, patchState],
  );

  const open = useCallback(
    (messageId: string, index: number, path: string) => {
      patchState(messageId, index, { navigated: true });
      go(path);
    },
    [go, patchState],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, MAX_INPUT_CHARS);
      if (!content || !companyId || abort.current) return;
      commit((current) => [...current, { id: newId(), role: "user", content, createdAt: Date.now() }]);
      const controller = new AbortController();
      abort.current = controller;
      setPending(true);
      try {
        const reply = await assistantApi.chat(companyId, { path: pathname, locale: typeof navigator !== "undefined" ? navigator.language : undefined, ...(cid.current ? { conversationId: cid.current } : {}), messages: historyForServer(ref.current) }, controller.signal);
        if (reply.conversationId) {
          cid.current = reply.conversationId;
          setConversationId(reply.conversationId);
        }
        const message: ChatMessage = { id: newId(), role: "assistant", content: reply.reply, createdAt: Date.now(), actions: reply.actions, degraded: reply.degraded, redacted: reply.redacted };
        commit((current) => [...current, message]);
        // Only a plain page-open the person explicitly asked for runs by itself; everything else waits for a click.
        const auto = reply.actions.findIndex((action: AssistantAction) => action.type === "navigate" && action.auto);
        const target = reply.actions[auto];
        if (target && target.type === "navigate") open(message.id, auto, target.path);
      } catch (error) {
        if (controller.signal.aborted && !(error instanceof ApiError)) return;
        const limited = ApiError.isApiError(error) && error.reason === "assistant_rate_limited";
        commit((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            content: limited && ApiError.isApiError(error) ? error.message : "I could not reach the assistant just now. Please try again, or send your question to the support team.",
            createdAt: Date.now(),
            notice: true,
            degraded: !limited,
          },
        ]);
      } finally {
        // A reset (or a newer request) may already own the slot; only release what this request took.
        if (abort.current === controller) {
          abort.current = null;
          setPending(false);
        }
      }
    },
    [commit, companyId, open, pathname],
  );

  /** A blank ticket the person fills in (seeded with their last message), for when they would rather talk to people. */
  const startTicket = useCallback(() => {
    const lastUser = [...ref.current].reverse().find((message) => message.role === "user" && !message.notice);
    const relatedUrl = /^\/admin(\/[A-Za-z0-9._~\-/]*)?$/.test(pathname) ? pathname : undefined;
    commit((current) => [
      ...current,
      {
        id: newId(),
        role: "assistant",
        content: "Tell the support team what is wrong. You can edit everything below before sending.",
        createdAt: Date.now(),
        actions: [{ type: "ticket_draft", subject: "", description: lastUser?.content ?? "", category: "technical", priority: "normal", ...(pageTitle ? { relatedModule: pageTitle.slice(0, 60) } : {}), ...(relatedUrl ? { relatedUrl } : {}) }],
      },
    ]);
  }, [commit, pageTitle, pathname]);

  const reset = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setPending(false);
    cid.current = null;
    setConversationId(null);
    commit(() => []);
  }, [commit]);

  return { messages, pending, send, open, patchState, ticketSent, startTicket, reset };
}
