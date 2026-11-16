import type { TicketCategory, TicketPriority } from "@/features/support/types";

/** What the server asks the browser to show. Mirrors the backend's `AssistantAction`. */
export type AssistantAction =
  | { type: "navigate"; pageId: string; label: string; path: string; auto: boolean }
  | { type: "ticket_draft"; subject: string; description: string; category: TicketCategory; priority: TicketPriority; relatedModule?: string; relatedUrl?: string }
  | { type: "confirm_action"; proposalId: string; kind: "create_crm_task" | "replay_business_events" | "pause_workflow"; title: string; summary: string; expiresAt: string; draft?: { title: string; description: string; dueDate: string; priority: string }; options?: Array<{ id: string; label: string }> }
  | { type: "tickets"; items: Array<{ number: number; subject: string; status: string; priority: string; awaiting: string | null; updatedAt: string }> };

export interface AssistantBootstrap {
  enabled: boolean;
  role: string | null;
  page: { id: string; title: string; section: string } | null;
  canRaiseTickets: boolean;
  /** The assistant can read counts and statuses of the person's own workspace (never names or messages). */
  dataLookups?: boolean;
  suggestions: string[];
}

export interface AssistantReply {
  reply: string;
  actions: AssistantAction[];
  redacted: boolean;
  degraded: boolean;
  /** Send this back with the next message so the whole chat is one conversation. */
  conversationId: string | null;
  /** Read-only workspace lookups this answer used. */
  lookups?: string[];
  /** Id of the saved answer, used to rate it. */
  messageId?: string | null;
}

export interface AssistantConversationList {
  items: Array<{ id: string; title: string; lastPageId: string | null; messageCount: number; totalTokens: number; lastMessageAt: string; expiresAt: string | null }>;
  nextCursor: string | null;
}

export interface AssistantConversationDetail {
  conversation: { id: string; title: string; lastMessageAt: string; expiresAt: string | null };
  messages: Array<{ id: string; role: "USER" | "ASSISTANT"; content: string; actions: string[]; degraded: boolean; redacted: boolean; createdAt: string }>;
  nextCursor: string | null;
}

/** What happened to an action card after the person used it. */
export interface ActionState {
  /** Ticket number once "Send to support" succeeded. */
  ticketNumber?: number;
  /** The ticket draft was dismissed. */
  dismissed?: boolean;
  /** The page was already opened (guards against re-running an automatic navigation). */
  navigated?: boolean;
  /** A prepared change was confirmed and done. */
  done?: { message: string; href: string | null };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  actions?: AssistantAction[];
  /** Keyed by the action's index in `actions`. */
  state?: Record<number, ActionState>;
  /** The AI could not answer: the human support team is offered instead. */
  degraded?: boolean;
  /** A secret was masked before the message reached the assistant. */
  redacted?: boolean;
  /** Read-only workspace lookups the answer used (shown so people know where numbers come from). */
  lookups?: string[];
  /** The server's id for this answer; present once it is saved, and needed to rate it. */
  serverId?: string;
  /** The person's thumbs up or down on this answer. */
  feedback?: "positive" | "negative";
  /** The request failed (network, limit). Shown as an assistant notice, never sent back as history. */
  notice?: boolean;
}
