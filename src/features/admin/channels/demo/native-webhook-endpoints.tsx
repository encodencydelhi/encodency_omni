"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmAction } from "@/lib/ui-dialog-store";
import { nativeWhatsAppApi } from "./native-api";
import { Badge, DataTable, Field, Panel } from "./ui";

const EVENT_LABELS: Record<string, string> = {
  "message.status": "Message Status (Sent, Delivered, Read, Failed)",
  "message.received": "Customer Message Received",
  "template.status": "Template Approval Status",
  "contact.consent": "Customer Opt-Out / Opt-In",
};
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "Never");

/**
 * Client-owned callback URLs. The signing secret is shown once, right after creation; only its encrypted form is stored.
 * Events come from the same durable outbox as sending, so a temporary outage on the receiving side is retried for hours.
 */
export function NativeWebhookEndpointsPanel({ scope, canManage }: { scope: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const key = ["whatsapp-native-webhook-endpoints", scope];
  const list = useQuery({ queryKey: key, queryFn: () => nativeWhatsAppApi.webhookEndpoints(scope) });
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => nativeWhatsAppApi.createWebhookEndpoint(scope, { url: url.trim(), events: selected }),
    onSuccess: (created) => { setSecret(created.secret); setUrl(""); setSelected([]); void queryClient.invalidateQueries({ queryKey: key }); toast.success("Webhook Endpoint Added"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const events = list.data?.events ?? [];
  return (
    <Panel title="Event Webhooks">
      <p className="mb-3 text-xs text-slate-500">Send Signed Delivery, Reply And Template Events To Your Own System. Each Request Carries X-Omni-Signature-V2 (HMAC-SHA256 Of Timestamp.Body) So Your Server Can Verify It. Failed Deliveries Are Retried Over Several Hours.</p>
      {secret && (
        <div role="status" className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <p className="font-semibold">Copy Your Signing Secret Now. It Will Not Be Shown Again.</p>
          <code className="mt-1 block break-all select-all">{secret}</code>
          <Button size="xs" variant="outline" className="mt-2" onClick={() => setSecret(null)}>I Have Saved It</Button>
        </div>
      )}
      {list.error ? <p role="alert" className="text-xs text-rose-700">{list.error.message}</p> : list.isLoading ? <p role="status" className="text-xs">Loading Webhooks...</p> : (
        <DataTable
          headers={["URL", "Events", "Last Success", "Last Failure", "Actions"]}
          rows={(list.data?.items ?? []).map((item) => [
            <span key="u" className="break-all">{item.url}</span>,
            item.events.map((event) => EVENT_LABELS[event] ?? event).join(", "),
            when(item.lastSuccessAt),
            item.lastFailureAt ? <Badge key="f">{when(item.lastFailureAt)}</Badge> : "Never",
            <span key="a" className="flex gap-2">
              <Button size="xs" variant="outline" disabled={!canManage} onClick={async () => { try { await nativeWhatsAppApi.testWebhookEndpoint(scope, item.id); toast.success("Test Event Queued"); } catch (error) { toast.error(error instanceof Error ? error.message : "Test failed."); } }}>Send Test</Button>
              <Button size="xs" variant="ghost" disabled={!canManage} onClick={async () => { if (!await confirmAction(`Stop sending events to ${item.url}?`, { title: "Remove Webhook?", confirmLabel: "Remove" })) return; try { await nativeWhatsAppApi.removeWebhookEndpoint(scope, item.id); void queryClient.invalidateQueries({ queryKey: key }); toast.success("Webhook Removed"); } catch (error) { toast.error(error instanceof Error ? error.message : "Removal failed."); } }}>Remove</Button>
            </span>,
          ])}
        />
      )}
      {!list.isLoading && !list.data?.items.length && <p className="mt-2 text-xs text-slate-500">No Webhook Endpoints Yet.</p>}
      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <Field label="HTTPS Endpoint URL"><Input required type="url" maxLength={500} placeholder="https://your-system.example.com/whatsapp-events" value={url} disabled={!canManage} onChange={(event) => setUrl(event.target.value)} /></Field>
        <fieldset disabled={!canManage} className="grid gap-1 text-xs sm:grid-cols-2">
          <legend className="mb-1 font-semibold">Events (None Selected Sends Everything)</legend>
          {events.map((name) => (
            <label key={name} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(name)} onChange={(event) => setSelected(event.target.checked ? [...selected, name] : selected.filter((item) => item !== name))} />
              {EVENT_LABELS[name] ?? name}
            </label>
          ))}
        </fieldset>
        <Button type="submit" size="sm" disabled={!canManage || create.isPending || !url.trim()}>Add Webhook Endpoint</Button>
      </form>
    </Panel>
  );
}
