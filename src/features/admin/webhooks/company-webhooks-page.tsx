"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Loader2, Pencil, Plus, Send, Trash2, Webhook, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { cn } from "@/lib/utils/cn";
import { companyWebhooksApi, WEBHOOK_EVENTS, type CompanyWebhookEndpoint } from "./api";

const keys = (companyId: string | null) => ({ endpoints: ["company-webhooks", companyId, "endpoints"] as const, deliveries: ["company-webhooks", companyId, "deliveries"] as const });
const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function CompanyWebhooksPage() {
  const { companyId, isReady } = useTenancyContext();
  const queryClient = useQueryClient();
  const queryKeys = keys(companyId);
  const endpoints = useQuery({ queryKey: queryKeys.endpoints, queryFn: () => companyWebhooksApi.endpoints(companyId!), enabled: isReady && Boolean(companyId), retry: false });
  const deliveries = useQuery({ queryKey: queryKeys.deliveries, queryFn: () => companyWebhooksApi.deliveries(companyId!), enabled: isReady && Boolean(companyId), retry: false, refetchInterval: 15_000 });
  const [editing, setEditing] = useState<CompanyWebhookEndpoint | "new" | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.endpoints }), queryClient.invalidateQueries({ queryKey: queryKeys.deliveries })]);
  const test = useMutation({ mutationFn: (id: string) => companyWebhooksApi.test(companyId!, id), onSuccess: async (row) => { await refresh(); if (row.status === "delivered") toast.success("Test webhook delivered"); else toast.error(row.lastError ?? "Test webhook failed"); }, onError: () => toast.error("Could not send the test webhook") });
  const remove = useMutation({ mutationFn: (id: string) => companyWebhooksApi.remove(companyId!, id), onSuccess: async () => { await refresh(); toast.success("Webhook endpoint removed"); }, onError: () => toast.error("Could not remove the endpoint") });

  return (
    <div className="space-y-3">
      <PageHeader title="Webhooks" description="Settings → Integrations → Webhooks. Send signed HTTPS events to systems your company controls." actions={<Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Add endpoint</Button>} />
      {secret ? <SecretNotice secret={secret} onClose={() => setSecret(null)} /> : null}
      {editing ? <EndpointForm companyId={companyId!} endpoint={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={async (createdSecret) => { setEditing(null); if (createdSecret) setSecret(createdSecret); await refresh(); }} /> : null}

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5"><Webhook className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">Endpoints</h2><p className="text-[11px] text-muted-foreground">Secrets are encrypted and shown only when an endpoint is created.</p></div></div>
        {endpoints.isLoading ? <Loading /> : endpoints.error ? <Message text="Webhook endpoints could not be loaded." /> : !endpoints.data?.length ? <Message text="No outgoing webhook endpoints are configured." /> : (
          <div className="divide-y divide-border">
            {endpoints.data.map((endpoint) => <div key={endpoint.id} className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)_auto] md:items-center">
              <div className="min-w-0"><p className="break-all text-[12px] font-medium">{endpoint.url}</p><p className="mt-0.5 break-words text-[10.5px] text-muted-foreground">{endpoint.events.join(" · ")}</p></div>
              <div className="text-[10.5px] text-muted-foreground">Updated {date(endpoint.updatedAt)}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", endpoint.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{endpoint.enabled ? "Enabled" : "Disabled"}</span>
                <Button variant="outline" size="sm" disabled={test.isPending} onClick={() => test.mutate(endpoint.id)}><Send className="size-3.5" />Test</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Edit endpoint" onClick={() => setEditing(endpoint)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete endpoint" disabled={remove.isPending} onClick={() => { if (window.confirm("Delete this webhook endpoint and its delivery history?")) remove.mutate(endpoint.id); }}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </div>)}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2.5"><h2 className="text-sm font-semibold">Recent deliveries</h2><p className="text-[11px] text-muted-foreground">Latest 100 attempts, refreshed every 15 seconds.</p></div>
        {deliveries.isLoading ? <Loading /> : deliveries.error ? <Message text="Webhook deliveries could not be loaded." /> : !deliveries.data?.length ? <Message text="No webhook deliveries yet." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[11px]"><thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Event</th><th className="px-3 py-2 font-medium">Endpoint</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Response</th><th className="px-3 py-2 font-medium">Attempts</th><th className="px-3 py-2 font-medium">Created</th></tr></thead><tbody className="divide-y divide-border">{deliveries.data.map((row) => <tr key={row.id}><td className="break-words px-3 py-2 font-medium">{row.event}</td><td className="max-w-[260px] break-all px-3 py-2 text-muted-foreground">{row.endpoint.url}</td><td className="px-3 py-2"><Status value={row.status} /></td><td className="px-3 py-2">{row.responseCode ?? "—"}</td><td className="px-3 py-2">{row.attempts}</td><td className="px-3 py-2 text-muted-foreground">{date(row.createdAt)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}

function EndpointForm({ companyId, endpoint, onCancel, onSaved }: { companyId: string; endpoint: CompanyWebhookEndpoint | null; onCancel: () => void; onSaved: (secret?: string) => Promise<void> }) {
  const [url, setUrl] = useState(endpoint?.url ?? "");
  const [events, setEvents] = useState<string[]>(endpoint?.events ?? [...WEBHOOK_EVENTS]);
  const [enabled, setEnabled] = useState(endpoint?.enabled ?? true);
  const save = useMutation({ mutationFn: async (): Promise<{ secret?: string }> => { if (endpoint) { await companyWebhooksApi.update(companyId, endpoint.id, { url, events, enabled }); return {}; } const created = await companyWebhooksApi.create(companyId, { url, events, enabled }); return { secret: created.secret }; }, onSuccess: async (result) => { toast.success(endpoint ? "Webhook endpoint updated" : "Webhook endpoint created"); await onSaved(result.secret); }, onError: () => toast.error("Could not save the webhook endpoint") });
  return <section className="space-y-3 rounded-xl border border-border bg-card p-3"><div><h2 className="text-sm font-semibold">{endpoint ? "Edit endpoint" : "Add endpoint"}</h2><p className="text-[11px] text-muted-foreground">Only public HTTPS destinations are contacted. Private and loopback addresses are refused.</p></div><label className="block space-y-1 text-[11px] font-medium">Destination URL<Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhooks/omni" /></label><div><p className="mb-1.5 text-[11px] font-medium">Events</p><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{WEBHOOK_EVENTS.map((event) => <label key={event} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[11px]"><Checkbox checked={events.includes(event)} onCheckedChange={(checked) => setEvents((current) => checked ? [...current, event] : current.filter((item) => item !== event))} /><span className="break-all">{event}</span></label>)}</div></div><label className="flex items-center gap-2 text-[11px] font-medium"><Switch checked={enabled} onCheckedChange={setEnabled} />Enabled</label><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button><Button size="sm" disabled={save.isPending || !url || !events.length} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}Save endpoint</Button></div></section>;
}

function SecretNotice({ secret, onClose }: { secret: string; onClose: () => void }) { return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950"><div className="min-w-0"><p className="font-semibold">Copy this signing secret now. It will not be shown again.</p><code className="break-all">{secret}</code></div><div className="flex gap-1.5"><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(secret); toast.success("Secret copied"); }}><Copy className="size-3.5" />Copy</Button><Button variant="ghost" size="sm" onClick={onClose}>Done</Button></div></div>; }
function Loading() { return <div className="flex items-center gap-2 px-3 py-6 text-[11px] text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</div>; }
function Message({ text }: { text: string }) { return <p className="px-3 py-6 text-[11px] text-muted-foreground">{text}</p>; }
function Status({ value }: { value: string }) { const ok = value === "delivered"; const failed = value === "failed"; return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", ok ? "bg-emerald-50 text-emerald-700" : failed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700")}>{ok ? <CheckCircle2 className="size-3" /> : failed ? <XCircle className="size-3" /> : <Loader2 className="size-3" />}{value}</span>; }
