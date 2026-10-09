import type { ChatMessage } from "./types";

export const MAX_INPUT_CHARS = 1500;
const MAX_STORED_MESSAGES = 40;
const MAX_HISTORY_SENT = 12;

/* ------------------------------------------------------------ rich text */

export type Inline = { kind: "text" | "bold" | "code"; text: string };
export type Block = { kind: "p"; inlines: Inline[] } | { kind: "ul" | "ol"; items: Inline[][] };

/** `**bold**` and `` `code` `` only. Everything else stays plain text, so nothing the model writes can become markup. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
  let last = 0;
  for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
    if (match.index > last) out.push({ kind: "text", text: line.slice(last, match.index) });
    out.push(match[1] !== undefined ? { kind: "bold", text: match[1] } : { kind: "code", text: match[2]! });
    last = match.index + match[0].length;
  }
  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  return out;
}

/** Paragraphs, bullet lists (`-`, `*`, `•`) and numbered lists (`1.` or `1)`). Headings and tables are shown as text. */
export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: "p", inlines: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };
  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    const numbered = /^\s*\d{1,2}[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const kind = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1]!;
      const previous = blocks[blocks.length - 1];
      if (previous && previous.kind === kind) previous.items.push(parseInline(text));
      else blocks.push({ kind, items: [parseInline(text)] });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/* --------------------------------------------------------------- history */

/** The conversation as the server expects it: only real turns, the latest few, never notices or empty text. */
export function historyForServer(messages: ChatMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => !message.notice && message.content.trim() !== "")
    .slice(-MAX_HISTORY_SENT)
    .map((message) => ({ role: message.role, content: message.content }));
}

/** What is kept in the tab between page loads: recent messages only. */
export function trimForStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES);
}

export function readStored(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is ChatMessage => Boolean(item) && typeof item === "object" && ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") && typeof (item as ChatMessage).content === "string" && typeof (item as ChatMessage).id === "string")
      .slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

export function storageKey(userId: string | undefined, companyId: string | undefined): string | null {
  return userId && companyId ? `omni.assistant.v1:${userId}:${companyId}` : null;
}

/** Right-to-left scripts (Arabic, Hebrew, Urdu, Persian) get a right-aligned bubble even inside an LTR page. */
export function isRtl(text: string): boolean {
  const strong = /[\p{Script=Arabic}\p{Script=Hebrew}]|[A-Za-zऀ-ॿঀ-৿஀-௿぀-ヿ一-鿿가-힯]/u.exec(text);
  return strong ? /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(strong[0]) : false;
}
