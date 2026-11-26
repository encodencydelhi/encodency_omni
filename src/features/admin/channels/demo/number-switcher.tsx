"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeWhatsAppApi, type NativeNumber } from "./native-api";
import { selectWhatsAppNumber } from "./number-selection";
import { scopeNumber, whatsappWorkspaceScope } from "./workspace-scope";
import { Field, Modal, control } from "./ui";
import { OPEN_WHATSAPP_SETUP } from "./native-setup-wizard";

const name = (row: NativeNumber) => [row.label, row.displayPhone || `Phone ID ${row.phoneNumberId}`].filter(Boolean).join(" · ");
const statusText = (row: NativeNumber) => (row.status === "ACTIVE" ? "Active" : "Setup pending");

/**
 * A Client can have several WhatsApp numbers (for example Sales and Support). Inbox, contacts, templates, campaigns,
 * automations and reports are separate per number; this bar chooses which number the whole WhatsApp workspace shows.
 */
export function WhatsAppNumberSwitcher({ scope, canConfigure, simulated }: { scope: string; canConfigure: boolean; simulated: boolean }) {
  const queryClient = useQueryClient();
  const [, companyId = "", clientId = ""] = JSON.parse(scope) as string[];
  const chosen = scopeNumber(scope);
  // The list does not depend on the chosen number: ask with the primary scope so a stale choice cannot break it.
  const listScope = whatsappWorkspaceScope(companyId, clientId);
  const numbers = useQuery({ queryKey: ["whatsapp-numbers", companyId, clientId], enabled: !!companyId && !!clientId, queryFn: ({ signal }) => nativeWhatsAppApi.numbers(listScope, signal) });
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<NativeNumber | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: "", wabaId: "", phoneNumberId: "", accessToken: "" });
  const [newLabel, setNewLabel] = useState("");

  const list = Array.isArray(numbers.data) ? numbers.data : [];
  const current = list.find((row) => row.id === chosen) ?? list.find((row) => row.isPrimary) ?? list[0];
  // A remembered number that no longer belongs to this Client: go back to the primary number.
  useEffect(() => { if (chosen && numbers.data && !numbers.data.some((row) => row.id === chosen)) selectWhatsAppNumber(companyId, clientId, ""); }, [chosen, numbers.data, companyId, clientId]);

  if (!list.length && !canConfigure) return null;
  const choose = (id: string) => { const row = list.find((item) => item.id === id); selectWhatsAppNumber(companyId, clientId, row?.isPrimary ? "" : id); };
  const reload = () => queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers", companyId, clientId] });

  const add = async () => {
    setBusy(true);
    try {
      const saved = await nativeWhatsAppApi.configure(listScope, { ...form, label: form.label.trim() || undefined, newNumber: true });
      await reload();
      if (saved.id) selectWhatsAppNumber(companyId, clientId, saved.id);
      toast.success("Number added. Finish its setup: verify, templates, test message, activate.");
      setAdding(false); setForm({ label: "", wabaId: "", phoneNumberId: "", accessToken: "" });
      window.setTimeout(() => window.dispatchEvent(new Event(OPEN_WHATSAPP_SETUP)), 300);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "The number could not be added."); }
    finally { setBusy(false); }
  };
  const update = async (row: NativeNumber, input: { label?: string; primary?: boolean }, done: string) => {
    setBusy(true);
    try {
      await nativeWhatsAppApi.updateNumber(listScope, row.id, input);
      await reload();
      if (input.primary) selectWhatsAppNumber(companyId, clientId, "");
      toast.success(done); setRenaming(null);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "The number could not be updated."); }
    finally { setBusy(false); }
  };
  const fieldsReady = simulated || (/^\d{5,}$/.test(form.wabaId.trim()) && /^\d{5,}$/.test(form.phoneNumberId.trim()) && form.accessToken.trim().length > 20);

  return <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2 text-xs">
    <span className="font-semibold text-slate-600">WhatsApp number</span>
    {list.length > 0 && <select aria-label="WhatsApp number" className={`${control} h-8 w-auto max-w-xs`} value={current?.id ?? ""} onChange={(event) => choose(event.target.value)}>
      {list.map((row) => <option key={row.id} value={row.id}>{name(row)}{row.isPrimary ? " (primary)" : ""} · {statusText(row)}</option>)}
    </select>}
    {list.length > 1 && <span className="text-slate-500">Inbox, contacts, templates and campaigns are separate for each number.</span>}
    {canConfigure && current && <>
      {!current.isPrimary && <Button size="sm" variant="outline" disabled={busy} onClick={() => void update(current, { primary: true }, "Primary number changed.")}>Make primary</Button>}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRenaming(current); setNewLabel(current.label ?? ""); }}>Rename</Button>
    </>}
    {canConfigure && <Button size="sm" variant="outline" disabled={busy} onClick={() => setAdding(true)}>Add another number</Button>}

    <Modal title="Add another WhatsApp number" open={adding} onClose={() => setAdding(false)} dirty={!!(form.wabaId || form.phoneNumberId || form.accessToken)}>
      <div className="grid gap-3 text-sm">
        <p className="text-xs text-slate-600">The new number gets its own inbox, contacts, templates and campaigns. The current number keeps working as it is. After saving, finish the new number&apos;s setup (verify, templates, test message, activate).</p>
        <Field label="Name for this number (e.g. Sales, Support)"><Input value={form.label} maxLength={60} onChange={(event) => setForm({ ...form, label: event.target.value })} /></Field>
        {!simulated && <>
          <Field label="WhatsApp Business Account ID"><Input value={form.wabaId} inputMode="numeric" onChange={(event) => setForm({ ...form, wabaId: event.target.value })} /></Field>
          <Field label="Phone Number ID"><Input value={form.phoneNumberId} inputMode="numeric" onChange={(event) => setForm({ ...form, phoneNumberId: event.target.value })} /></Field>
          <Field label="Access token (stored encrypted)"><Input type="password" autoComplete="off" value={form.accessToken} onChange={(event) => setForm({ ...form, accessToken: event.target.value })} /></Field>
          <p className="text-xs text-slate-500">WhatsApp Manager shows both IDs. The token comes from Business Settings → System users (no expiry, with whatsapp_business_messaging and whatsapp_business_management). Each phone number can serve only one client.</p>
        </>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setAdding(false)}>Cancel</Button><Button disabled={busy || !fieldsReady} onClick={() => void add()}>{busy ? "Adding…" : "Add number"}</Button></div>
      </div>
    </Modal>

    <Modal title="Rename number" open={!!renaming} onClose={() => setRenaming(null)}>
      <div className="grid gap-3 text-sm">
        <Field label="Name (shown only inside Media360)"><Input value={newLabel} maxLength={60} onChange={(event) => setNewLabel(event.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setRenaming(null)}>Cancel</Button><Button disabled={busy || !renaming} onClick={() => renaming && void update(renaming, { label: newLabel }, "Number renamed.")}>Save</Button></div>
      </div>
    </Modal>
  </div>;
}
