"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ENVIRONMENT_LABEL, MODULE_LINKS, NOT_LIVE_NOTICE } from "../data/config";
import { WEBHOOK_QUERY_KEYS, useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import type { WebhookSettings } from "../data/types";
import { FilterControls, optionsFrom, useFilterState } from "./filters";
import { Chip, EmptyRows, ExportButton, FilterBar, JobReference, Notice, Timestamp, humanize } from "./kit";
import { SectionCard } from "./cells";
import { useWebhookData } from "./webhooks-context";

export function ActivitySettingsPage() {
  const { snapshot, environment } = useWebhookData();
  const client = useQueryClient();
  const filters = useFilterState(["type", "endpoint"] as const);
  const [draft, setDraft] = useState<WebhookSettings>(snapshot.settings);
  const [resetOpen, setResetOpen] = useState(false);

  const save = useWebhookMutation(environment, (input: WebhookSettings) => webhooksRepository.updateSettings(environment, input));
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.settings);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    globalThis.addEventListener("beforeunload", handler);
    return () => globalThis.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const entries = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return snapshot.activity.filter((entry) => {
      if (q && !`${entry.message} ${entry.type} ${entry.actorName}`.toLowerCase().includes(q)) return false;
      if (filters.values.type && entry.type !== filters.values.type) return false;
      if (filters.values.endpoint && entry.endpointId !== filters.values.endpoint) return false;
      return true;
    });
  }, [snapshot.activity, filters.query, filters.values]);

  const policies = snapshot.retryPolicies;
  const errors: string[] = [];
  if (draft.defaultTimeoutMs < 1_000 || draft.defaultTimeoutMs > 30_000) errors.push("Default timeout must be between 1,000 and 30,000 ms.");
  if (draft.stalenessWarningMinutes < 5 || draft.stalenessWarningMinutes > 1_440) errors.push("Staleness warning must be between 5 and 1,440 minutes.");

  return (
    <div className="space-y-1">
      <div className="grid gap-1 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Webhook Operational Activity"
          description="Demo activity records. Sensitive administrative changes are recorded centrally in Audit Logs once a backend exists."
          action={<div className="flex gap-2"><ExportButton filename="webhook-activity.csv" rows={entries.map((e) => ({ at: e.at, type: e.type, actor: e.actorName, message: e.message, endpointId: e.endpointId }))} /><Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.auditSensitive}>Audit Logs</Link></Button></div>}
        >
          <div className="-mx-5 -mt-1 mb-2 border-b border-border">
            <FilterBar>
              <FilterControls
                state={filters}
                searchPlaceholder="Search activity..."
                filters={[
                  { key: "type", label: "Type", options: optionsFrom(snapshot.activity.map((a) => a.type), humanize) },
                  { key: "endpoint", label: "Endpoint", options: snapshot.endpoints.map((e) => ({ value: e.id, label: e.name })) },
                ]}
              />
            </FilterBar>
          </div>
          {entries.length === 0 ? <EmptyRows title="No activity matches" /> : (
            <ul className="divide-y divide-border">
              {entries.slice(0, 30).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[0.8125rem] font-medium text-foreground">{humanize(entry.type)} {entry.auditReferenced ? <Chip tone="info">Audit-worthy</Chip> : null} {entry.actorType === "system" ? <Chip>System</Chip> : null}</p>
                    <p className="text-2xs text-muted-foreground">{entry.message}</p>
                    <p className="text-2xs text-muted-foreground">{entry.actorName}</p>
                  </div>
                  <Timestamp iso={entry.at} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-1">
          <SectionCard title="Demo Settings" description={`Saved in this browser session for ${ENVIRONMENT_LABEL[environment]}. Backend enforcement comes later.`}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="set-timeout">Default timeout (ms)</Label><Input id="set-timeout" type="number" min={1000} max={30000} step={500} value={draft.defaultTimeoutMs} onChange={(e) => setDraft({ ...draft, defaultTimeoutMs: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label htmlFor="set-stale">Staleness warning (minutes)</Label><Input id="set-stale" type="number" min={5} max={1440} value={draft.stalenessWarningMinutes} onChange={(e) => setDraft({ ...draft, stalenessWarningMinutes: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-retry">Default retry policy</Label>
                <Select value={draft.defaultRetryPolicyRef} onValueChange={(value) => setDraft({ ...draft, defaultRetryPolicyRef: value, defaultMaxAttempts: policies.find((p) => p.ref === value)?.maxAttempts ?? draft.defaultMaxAttempts })}>
                  <SelectTrigger id="set-retry"><SelectValue /></SelectTrigger>
                  <SelectContent>{policies.map((p) => <SelectItem key={p.ref} value={p.ref}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between gap-3 text-[0.8125rem]"><span><span className="block font-medium">Require HTTPS outside development</span><span className="text-2xs text-muted-foreground">Preliminary frontend check only.</span></span><Switch checked={draft.requireHttpsOutsideDevelopment} onCheckedChange={(value) => setDraft({ ...draft, requireHttpsOutsideDevelopment: value })} /></label>
              <label className="flex items-center justify-between gap-3 text-[0.8125rem]"><span><span className="block font-medium">Sanitized payload preview</span><span className="text-2xs text-muted-foreground">Show the collapsed JSON preview in delivery detail.</span></span><Switch checked={draft.payloadPreviewEnabled} onCheckedChange={(value) => setDraft({ ...draft, payloadPreviewEnabled: value })} /></label>
              {errors.map((message) => <p key={message} className="text-2xs text-danger" role="alert">{message}</p>)}
              {dirty ? <p className="text-2xs text-warning">You have unsaved changes.</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(snapshot.settings)}>Reset</Button>
                <Button disabled={!dirty || errors.length > 0 || save.isPending} onClick={async () => {
                  try { await save.mutateAsync(draft); toast.success("Demo settings saved", { description: NOT_LIVE_NOTICE }); } catch (error) { toast.error(error instanceof Error ? error.message : "Settings could not be saved."); }
                }}>Save Demo Settings</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Monitoring Coverage" description="Demo sources. No production instrumentation is connected.">
            <ul className="divide-y divide-border">
              {snapshot.monitoring.map((source) => (
                <li key={source.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div><p className="text-[0.8125rem] font-medium">{source.name}</p><p className="text-2xs text-muted-foreground">Freshness threshold {source.freshnessThresholdMinutes} min</p></div>
                  <div className="space-y-1 text-right"><Chip tone={source.backendConnected ? "success" : "brand"}>{source.backendConnected ? "Backend connected" : "Demo only"}</Chip><Timestamp iso={source.lastObservedAt} /></div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <SectionCard title="Related Modules" description="Ownership stays with these modules. Webhooks shows summaries and links.">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.integrations}>Integrations</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.apiMonitoring}>API Monitoring</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.systemHealth}>System Health</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.auditSensitive}>Audit Logs</Link></Button>
          </div>
          <p className="mt-3 text-2xs text-muted-foreground">Jobs & Queues: <JobReference jobId={null} /> The route is not built yet.</p>
        </SectionCard>
        <SectionCard title="Demo Data" description="Resets configuration changes made in this browser session for this environment.">
          <Notice tone="info">Endpoints, subscriptions, recovery drafts and settings you created are kept only in memory and are lost on refresh.</Notice>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setResetOpen(true)}>Reset Demo Configuration</Button>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo configuration?"
        description={`This restores the original ${ENVIRONMENT_LABEL[environment]} demo fixtures and discards demo endpoints, subscription edits and recovery drafts. No backend is affected.`}
        confirmLabel="Reset demo configuration"
        variant="destructive"
        onConfirm={async () => {
          await webhooksRepository.resetDemo(environment);
          await client.invalidateQueries({ queryKey: WEBHOOK_QUERY_KEYS.all });
          setDraft(webhooksRepositoryDefaults());
          setResetOpen(false);
          toast.success("Demo configuration reset");
        }}
      />
    </div>
  );
}

import { DEFAULT_SETTINGS } from "../data/config";
function webhooksRepositoryDefaults(): WebhookSettings {
  return { ...DEFAULT_SETTINGS };
}
