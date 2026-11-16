"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./ui";
import type { ContactFieldDef, Settings } from "./mock-service";

const toKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z]+/, "").slice(0, 30);

/**
 * The extra contact fields this client wants to keep (for example City or Plan). Definitions are per client; values live on each contact
 * and can be used in campaigns as {{n}} = Contact Field. Removing a definition hides it but never deletes stored values.
 */
export function ContactFieldDefsFields({ draft, setDraft, disabled }: { draft: Settings; setDraft: (next: Settings) => void; disabled: boolean }) {
  const defs = draft.contactFields ?? [];
  const setDefs = (next: ContactFieldDef[]) => setDraft({ ...draft, contactFields: next });
  const edit = (index: number, patch: Partial<ContactFieldDef>) => setDefs(defs.map((def, position) => (position === index ? { ...def, ...patch } : def)));
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-3 text-xs md:col-span-2">
      <legend className="px-1 font-semibold">Contact Fields</legend>
      <p className="text-slate-500">Up To 20 Extra Fields. A Key Uses Lowercase Letters, Numbers And Underscores. CSV Imports Fill A Field From A Column Named After Its Key Or Label.</p>
      <div className="space-y-2">
        {defs.map((def, index) => (
          <div key={index} className="grid gap-2 rounded border border-slate-100 p-2 sm:grid-cols-[12rem_1fr_auto]">
            <Field label="Key"><Input maxLength={30} value={def.key} onChange={(event) => edit(index, { key: toKey(event.target.value) })} /></Field>
            <Field label="Label"><Input maxLength={60} value={def.label} onChange={(event) => edit(index, { label: event.target.value })} /></Field>
            <Button type="button" size="xs" variant="ghost" className="self-end" onClick={() => setDefs(defs.filter((_, position) => position !== index))}>Remove</Button>
          </div>
        ))}
        {!defs.length && <p className="text-slate-500">No Custom Contact Fields Yet.</p>}
      </div>
      <Button type="button" size="xs" variant="outline" disabled={defs.length >= 20} onClick={() => setDefs([...defs, { key: "", label: "" }])}>Add Contact Field</Button>
    </fieldset>
  );
}
