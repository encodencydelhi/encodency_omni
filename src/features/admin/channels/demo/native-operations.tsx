"use client";
import { StatementReconciliation } from './advanced-controls';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { nativeWhatsAppApi } from "./native-api";
import { NativeReadinessPanel } from "./native-readiness";
import { NativeWebhookEndpointsPanel } from "./native-webhook-endpoints";
import { useCreationWorkspace } from "./creation-session";
import { useWorkspaceAccess } from "./workspace-access";
import { Badge, DataTable, Field, Panel, Select, downloadCsv } from "./ui";
import type { Workspace } from "./mock-service";
import type { UpdateWorkspace } from "./marketing";

export function NativeHistory({ scope, path, title }: { scope: string; path: string; title: string }) {
  const result = useQuery({ queryKey: ["whatsapp-native-history", scope, path], queryFn: () => nativeWhatsAppApi.records<{ id: string; status: string; createdAt?: string; providerOccurredAt?: string; failureCode?: string }>(scope, path), refetchInterval: 5000 });
  return <Panel title={title}>{result.error ? <p role="alert" className="text-xs text-rose-700">{result.error.message}</p> : result.isLoading ? <p role="status" className="text-xs">Loading...</p> : <DataTable headers={["Status", "Time", "Failure"]} rows={(result.data?.items || []).map(row => [row.status, new Date(row.providerOccurredAt || row.createdAt || 0).toLocaleString(), row.failureCode || "—"])} />}</Panel>;
}

export function NativeConversationControls({ scope, contactId }: { scope: string; contactId: string }) {
  const { refresh } = useCreationWorkspace(scope), access = useWorkspaceAccess();
  const query = useQuery({ queryKey: ["whatsapp-native-conversations", scope], queryFn: () => nativeWhatsAppApi.records<{ id: string; contactId: string; status: string; unreadCount: number }>(scope, "/conversations?limit=100"), refetchInterval: 5000 });
  const conversation = query.data?.items.find(item => item.contactId === contactId);
  const [pending, setPending] = useState(false);
  const change = async (data: Record<string, unknown>) => { if (!conversation || pending) return; setPending(true); try { await nativeWhatsAppApi.patch(scope, `/conversations/${conversation.id}`, data); await query.refetch(); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Conversation Update Failed"); } finally { setPending(false); } };
  return conversation ? <div className="my-2 flex flex-wrap items-center gap-2 text-xs"><Badge>{conversation.status}</Badge><span>{conversation.unreadCount} Unread</span><Button size="xs" variant="outline" disabled={!access.canEdit || pending} onClick={() => void change({ read: true })}>Mark Read</Button><Button size="xs" variant="outline" disabled={!access.canEdit || pending} onClick={() => void change({ status: conversation.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}>{conversation.status === 'OPEN' ? "Close Conversation" : "Reopen Conversation"}</Button></div> : null;
}

export function NativeCampaignTrigger({ scope, data, campaignId, templateId }: { scope: string; data: Workspace; campaignId: string; templateId: string }) {
  const [contactId, setContactId] = useState(""), [values, setValues] = useState<Record<string, string>>({}), [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const parameters = [...new Set([...String(data.templates.find(item => item.id === templateId)?.body || "").matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]!))];
  return <div className="space-y-3 rounded border border-slate-200 p-3"><p className="text-xs font-semibold">Simulate An Authorized API Request</p><Field label="Consenting Contact"><select className="h-9 w-full rounded border px-2 text-xs" value={contactId} onChange={event => { setContactId(event.target.value); setRequestKey(crypto.randomUUID()); }}><option value="">Choose Contact</option>{data.contacts.filter(item => item.consent && !item.suppressed).map(item => <option key={item.id} value={item.id}>{item.name} · {item.phone}</option>)}</select></Field>{parameters.map(key => <Field key={key} label={`Value {{${key}}}`}><Input value={values[key] || ""} onChange={event => { setValues(current => ({ ...current, [key]: event.target.value })); setRequestKey(crypto.randomUUID()); }} /></Field>)}<NativeActionButton scope={scope} path={`/campaigns/${campaignId}/trigger`} body={{ confirm: true, contactId, parameters: values, idempotencyKey: requestKey }} label="Trigger Simulated Campaign" disabled={!contactId || parameters.some(key => !values[key]?.trim())} confirmation="Queue this simulated template message for the selected consenting contact? Repeating the same request will not send twice." /></div>;
}

export function NativeActionButton({ scope, path, label, body = {}, disabled = false, confirmation }: { scope: string; path: string; label: string; body?: unknown; disabled?: boolean; confirmation?: string }) {
  const { action } = useCreationWorkspace(scope);
  const [open, setOpen] = useState(false), [pending, setPending] = useState(false);
  const run = async () => { if (pending) return; setPending(true); try { if (await action(path, body)) { setOpen(false); toast.success(`${label} Completed`); } } finally { setPending(false); } };
  return <><Button size="sm" variant="outline" disabled={disabled || pending} onClick={() => { if (confirmation) setOpen(true); else void run(); }}>{pending ? "Processing..." : label}</Button>{confirmation && <ConfirmDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }} title={label} description={confirmation} confirmLabel="Confirm" isPending={pending} onConfirm={() => void run()} />}</>;
}

export function SimulationConnectionButton({ action, disabled = false, deactivate = false }: { action: (path: string, body?: unknown) => Promise<boolean>; disabled?: boolean; deactivate?: boolean }) {
  const [open, setOpen] = useState(false), [pending, setPending] = useState(false);
  const label = deactivate ? "Deactivate Simulation" : "Activate Simulated Connection";
  return <><Button size="sm" variant={deactivate ? "outline" : "default"} disabled={disabled || pending} onClick={() => setOpen(true)}>{label}</Button><ConfirmDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }} title={deactivate ? "Deactivate Simulated WhatsApp?" : "Activate Simulated WhatsApp?"} description={deactivate ? "This will deactivate the selected client's simulated sender and pause its pending campaigns." : "Activate simulated WhatsApp for the client selected in your sidebar. No real messages will be sent."} confirmLabel={deactivate ? "Deactivate" : "Activate Simulation"} isPending={pending} onConfirm={() => { if (pending) return; setPending(true); void action(deactivate ? "/connection/disconnect" : "/connection/activate", deactivate ? undefined : { confirm: true }).then(success => { if (success) setOpen(false); }).finally(() => setPending(false)); }} /></>;
}

export function NativeConnectionPanel({ scope }: { scope: string }) {
  const { envelope, action } = useCreationWorkspace(scope);
  const [failSends, setFailSends] = useState(false), [rejectTemplates, setRejectTemplates] = useState(false), [delay, setDelay] = useState("1000");
  const connection = envelope?.connection, simulated = envelope?.mode === "MOCK", canConfigure = simulated && (envelope?.access.canConfigure ?? false);
  return <div className="space-y-2"><Panel title="WhatsApp Connection" actions={<Badge>{simulated ? "SIMULATED" : "Activation Phase Pending"}</Badge>}>
    <p className="mb-3 text-xs text-slate-500">This Sender Belongs Only To The Client Selected In Your Sidebar.</p>
    <div className="mb-3 grid gap-2 text-xs sm:grid-cols-2"><p>Status: <strong>{connection?.status || "DISCONNECTED"}</strong></p><p>Sender: {connection?.displayPhone || "Not Verified"}</p></div>
    {simulated ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!canConfigure} onClick={() => void action("/connection/verify")}>Verify Simulation</Button><SimulationConnectionButton action={action} disabled={!canConfigure || connection?.status === "ACTIVE"} /><SimulationConnectionButton action={action} deactivate disabled={!canConfigure || connection?.status !== "ACTIVE"} /></div> : <p className="text-xs text-amber-800">Live Meta Setup And Sending Are Not Enabled In This Frontend Phase.</p>}
    {!!Object.keys(connection?.readiness || {}).length && <dl className="mt-4 grid gap-2 rounded border border-slate-100 p-3 text-xs sm:grid-cols-2">{Object.entries(connection?.readiness || {}).filter(([, value]) => typeof value === "boolean").map(([name, value]) => <div key={name} className="flex min-w-0 justify-between gap-3"><dt className="break-words capitalize">{name.replace(/([A-Z])/g, " $1")}</dt><dd className={value ? "text-emerald-700" : "text-amber-700"}>{value ? "Verified" : "Action Required"}</dd></div>)}</dl>}
  </Panel>
    {(envelope?.access.canConfigure ?? false) && <NativeReadinessPanel scope={scope} />}
    {(envelope?.access.canConfigure ?? false) && <NativeWebhookEndpointsPanel scope={scope} canManage />}
    {canConfigure && <Panel title="Simulation Controls"><form className="flex flex-wrap items-end gap-3" onSubmit={async event => { event.preventDefault(); if (await action("/simulate", { kind: "SETTINGS", data: { failSends, rejectTemplates, deliveryDelayMs: Number(delay) } })) toast.success("Simulation Settings Saved"); }}><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={failSends} onChange={event => setFailSends(event.target.checked)} />Simulate Send Rejection</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rejectTemplates} onChange={event => setRejectTemplates(event.target.checked)} />Simulate Template Rejection</label><Field label="Delivery Delay (ms)"><Input type="number" min={0} max={30000} value={delay} onChange={event => setDelay(event.target.value)} /></Field><Button type="submit" size="sm">Save Simulation Settings</Button></form></Panel>}
  </div>;
}

export function NativeBilling({ scope, data, update }: { scope: string; data: Workspace; update: UpdateWorkspace }) {
  const access = useWorkspaceAccess(); const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); const [budget, setBudget] = useState(String(data.settings.budget));
  const usage = useQuery({ queryKey: ["whatsapp-native-usage", scope, period], queryFn: () => nativeWhatsAppApi.usage(scope, period), refetchInterval: 5000 });
  const months = Array.from({ length: 12 }, (_, index) => { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1)).toISOString().slice(0, 7); });
  const rows = usage.data?.items || [], total = rows.reduce((sum, row) => sum + row.estimatedCostMinor, 0);
  return <div className="space-y-2"><Panel title="Billing & Usage" actions={<div className="flex flex-wrap gap-2"><Select label="Report Period" value={period} options={months} onChange={setPeriod} /><Button size="sm" variant="outline" disabled={!usage.data} onClick={() => downloadCsv("whatsapp-usage.csv", [[usage.data?.origin || "", period], ["Category", "Messages", "Currency", "Estimated Minor Units", "Reconciled Minor Units"], ...rows.map(row => [row.category, row.messages, row.currency, row.estimatedCostMinor, row.reconciledCostMinor ?? ""])])}>Export Usage Report</Button></div>}>
    <p className="mb-3 text-xs text-amber-700">{usage.data?.origin === "SIMULATED" ? "SIMULATED Usage — Never A Payable Meta Invoice." : "Usage Ledger — Estimates And Reconciled Charges Are Separate."}</p>
    {usage.error ? <p role="alert" className="text-xs text-rose-700">{usage.error.message}</p> : usage.isLoading ? <p role="status" className="text-xs">Loading Usage...</p> : <DataTable headers={["Category", "Messages", "Estimate", usage.data?.origin === "SIMULATED" ? "Simulated Reconciliation" : "Reconciled"]} rows={rows.map(row => [row.category, row.messages, usage.data?.estimatedCostAvailable ? formatCurrency(row.estimatedCostMinor, row.currency) : "Not Priced", usage.data?.origin === "SIMULATED" && row.simulatedCostMinor != null ? formatCurrency(row.simulatedCostMinor, row.currency) : row.reconciledCostMinor === null ? "Not Reconciled" : formatCurrency(row.reconciledCostMinor, row.currency)])} />}
    <p className="mt-3 text-sm font-semibold">{usage.data?.estimatedCostAvailable ? `Estimated Total: ${formatCurrency(total)}` : "Cost Estimate Unavailable Until Pricing Is Supplied"} · Budget: {formatCurrency(data.settings.budget * 100)}</p>
  </Panel><div className="grid gap-2 md:grid-cols-2"><Panel title="Budget Preferences"><form className="flex flex-wrap items-end gap-2" onSubmit={async event => { event.preventDefault(); if (await update(current => ({ ...current, settings: { ...current.settings, budget: Number(budget) } }))) toast.success("Budget Saved"); }}><Field label="Monthly Budget (INR)"><Input required type="number" min={1} max={10000000} disabled={!(access.canBill ?? access.canManage)} value={budget} onChange={event => setBudget(event.target.value)} /></Field><Button type="submit" size="sm" disabled={!(access.canBill ?? access.canManage)}>Save Budget</Button></form></Panel><Panel title="Billing History" actions={<StatementReconciliation key={`${scope}:${period}`} scope={scope} period={period} onSaved={() => void usage.refetch()} />}><DataTable headers={["Period", "Status", "Reconciled"]} rows={(usage.data?.statements || []).map(row => [row.period, row.status, row.simulatedCostMinor != null ? `${formatCurrency(row.simulatedCostMinor, row.currency)} (Simulated)` : row.reconciledCostMinor === null ? "Not Reconciled" : formatCurrency(row.reconciledCostMinor, row.currency)])} /></Panel></div></div>;
}
