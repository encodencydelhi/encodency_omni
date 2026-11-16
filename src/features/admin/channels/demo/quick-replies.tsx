"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./ui";
import type { CannedReply, Settings } from "./mock-service";

const newId = () => `qr-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

/** Quick replies and automatic assignment, edited with the rest of the workspace settings. The server validates every value. */
export function QuickReplyFields({ draft, setDraft, disabled }: { draft: Settings; setDraft: (next: Settings) => void; disabled: boolean }) {
  const replies = draft.cannedReplies ?? [];
  const setReplies = (next: CannedReply[]) => setDraft({ ...draft, cannedReplies: next });
  const edit = (id: string, patch: Partial<CannedReply>) => setReplies(replies.map((reply) => (reply.id === id ? { ...reply, ...patch } : reply)));
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-3 text-xs md:col-span-2">
      <legend className="px-1 font-semibold">Team Inbox: Quick Replies &amp; Assignment</legend>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.autoAssign === true} onChange={(event) => setDraft({ ...draft, autoAssign: event.target.checked })} />
        Automatically Assign New Conversations To Team Members In Turn
      </label>
      <p className="text-slate-500">A Contact That Already Has An Owner Always Keeps It. Viewers Are Never Assigned.</p>
      <div className="space-y-2">
        {replies.map((reply) => (
          <div key={reply.id} className="grid gap-2 rounded border border-slate-100 p-2 sm:grid-cols-[12rem_1fr_auto]">
            <Field label="Title"><Input maxLength={60} value={reply.title} onChange={(event) => edit(reply.id, { title: event.target.value })} /></Field>
            <Field label="Reply (Use {{name}} For The Contact's Name)"><Textarea maxLength={1024} value={reply.body} onChange={(event) => edit(reply.id, { body: event.target.value })} /></Field>
            <Button type="button" size="xs" variant="ghost" className="self-end" onClick={() => setReplies(replies.filter((item) => item.id !== reply.id))}>Remove</Button>
          </div>
        ))}
        {!replies.length && <p className="text-slate-500">No Quick Replies Yet.</p>}
      </div>
      <Button type="button" size="xs" variant="outline" disabled={replies.length >= 50} onClick={() => setReplies([...replies, { id: newId(), title: "", body: "" }])}>Add Quick Reply</Button>
    </fieldset>
  );
}

/** Replaces the {{name}} placeholder. Anything else is inserted exactly as written. */
export function fillQuickReply(body: string, contactName: string | undefined) {
  return body.replace(/\{\{\s*name\s*\}\}/gi, contactName?.trim() || "there");
}
