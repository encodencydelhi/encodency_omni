"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { automationApi, type AutomationSecretInfo } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";

const NAME = /^[a-z][a-z0-9_]{1,39}$/;

/** Encrypted, write-only values that HTTP Request and Slack steps reference as {{secret.name}}. */
export function SecretsCard() {
  const [secrets, setSecrets] = useState<AutomationSecretInfo[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSecrets(await automationApi.listSecrets());
      setDenied(false);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      setSecrets([]);
      setDenied(status === 401 || status === 403);
      if (status !== 401 && status !== 403) toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      await automationApi.putSecret(name.trim(), value);
      toast.success(`Secret “${name.trim()}” saved. Its value is encrypted and cannot be read back.`);
      setName("");
      setValue("");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (secret: AutomationSecretInfo) => {
    if (!window.confirm(`Delete the secret “${secret.name}”? Steps that still use it will fail.`)) return;
    setBusy(true);
    try {
      await automationApi.deleteSecret(secret.name);
      toast.success(`Secret “${secret.name}” deleted`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const nameOk = NAME.test(name.trim());

  return (
    <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><KeyRound className="size-4 text-[#0F172A]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Secrets</h4></div>
      <p className="text-[11px] text-[#64748B]">API keys, bearer tokens and Slack webhook URLs. Values are encrypted, never shown again and never written to run logs. Use them in a step as <code>{"{{secret.name}}"}</code>.</p>
      {denied ? <p className="text-[10.5px] text-slate-500">You do not have permission to manage automation secrets (Owner or Admin required).</p> : (
        <>
          {secrets === null ? <p className="text-[11px] text-[#64748B]">Loading…</p> : secrets.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#CBD5E1] px-3 py-3 text-[11px] text-[#64748B]">No secrets yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {secrets.map((secret) => (
                <li key={secret.name} className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11.5px]">
                  <span className="min-w-0"><code className="font-semibold text-[#1D4ED8]">{`{{secret.${secret.name}}}`}</code> <span className="text-[#94A3B8]">· {secret.hint} · updated {new Date(secret.updatedAt).toLocaleDateString()}</span></span>
                  <button type="button" aria-label={`Delete secret ${secret.name}`} disabled={busy} onClick={() => void remove(secret)} className="grid size-7 place-items-center rounded-md text-[#94A3B8] hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <label className="text-[10.5px] font-semibold">Name
              <input value={name} onChange={(e) => setName(e.target.value.toLowerCase())} placeholder="slack_webhook" maxLength={40} className="mt-1 h-8 w-full rounded-md border border-[#E2E8F0] px-2 text-[11.5px]" />
            </label>
            <label className="text-[10.5px] font-semibold">Value
              <input type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the secret value" className="mt-1 h-8 w-full rounded-md border border-[#E2E8F0] px-2 text-[11.5px]" />
            </label>
            <button type="button" disabled={busy || !nameOk || !value} onClick={() => void save()} className="mt-auto h-8 rounded-md bg-[#2563EB] px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Save secret</button>
          </div>
          {name && !nameOk ? <p className="text-[10.5px] text-red-600">Use lower-case letters, digits and underscores; start with a letter (2 to 40 characters).</p> : <p className="text-[10.5px] text-[#94A3B8]">Saving an existing name replaces its value.</p>}
        </>
      )}
    </div>
  );
}
