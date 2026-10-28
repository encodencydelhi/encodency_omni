"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAT_COLORS, statColorForLabel, statColorForTone } from "@/components/shared/stat-color";
import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Delivery, OutgoingEndpoint } from "../data/types";
import { WEBHOOK_QUERY_KEYS } from "../data/hooks";
import { superAdminWebhooksApi } from "../live/super-admin-webhooks-api";
import { useWebhookData } from "./webhooks-context";

type View = "overview" | "endpoints" | "deliveries" | "failures";
const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function LiveWebhookConsole({ view }: { view: View }) {
  const { snapshot, environment } = useWebhookData();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: WEBHOOK_QUERY_KEYS.all });
  const toggle = useMutation({ mutationFn: (endpoint: OutgoingEndpoint) => superAdminWebhooksApi.setEndpointState(environment, endpoint.id, endpoint.state === "enabled" ? "disabled" : "enabled", "Super Admin action"), onSuccess: async () => { await refresh(); toast.success("Endpoint state updated"); }, onError: () => toast.error("Could not update the endpoint") });
  const retry = useMutation({ mutationFn: (id: string) => superAdminWebhooksApi.retryDelivery(id), onSuccess: async (result) => { if (!result.ok) return toast.error(result.error ?? "Delivery cannot be retried"); await refresh(); toast.success("Delivery queued for retry"); }, onError: () => toast.error("Could not retry the delivery") });
  const failed = snapshot.deliveries.filter((row) => row.state === "failed");

  if (view === "overview") return <div className="space-y-2"><div className="grid gap-1 sm:grid-cols-3"><Metric label="Endpoints" value={snapshot.endpoints.length} /><Metric label="Enabled" value={snapshot.endpoints.filter((row) => row.state === "enabled").length} /><Metric label="Failed deliveries" value={failed.length} /></div><EndpointTable rows={snapshot.endpoints.slice(0, 8)} onToggle={(row) => toggle.mutate(row)} busy={toggle.isPending} /><DeliveryTable rows={snapshot.deliveries.slice(0, 12)} onRetry={(id) => retry.mutate(id)} busy={retry.isPending} /></div>;
  if (view === "endpoints") return <EndpointTable rows={snapshot.endpoints} onToggle={(row) => toggle.mutate(row)} busy={toggle.isPending} />;
  return <DeliveryTable rows={view === "failures" ? failed : snapshot.deliveries} onRetry={(id) => retry.mutate(id)} busy={retry.isPending} />;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className={`rounded-sm border px-3 py-1.5 ${STAT_COLORS[statColorForLabel(label)].card}`}><p className="text-[10.5px] text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums">{value}</p></div>; }
function EndpointTable({ rows, onToggle, busy }: { rows: OutgoingEndpoint[]; onToggle: (row: OutgoingEndpoint) => void; busy: boolean }) { return <section className="rounded-lg border border-border bg-card"><div className="border-b border-border px-3 py-2"><h2 className="text-sm font-semibold">Endpoints</h2><p className="text-[10.5px] text-muted-foreground">Real encrypted endpoint records. Company admins manage URLs and event subscriptions.</p></div>{!rows.length ? <Empty text="No webhook endpoints configured." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[11px]"><thead className="bg-muted/40 text-muted-foreground"><tr><Head>Destination</Head><Head>Scope</Head><Head>Events</Head><Head>Updated</Head><Head>Enabled</Head></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><Cell><p className="break-all font-medium">{row.destinationUrl}</p><p className="text-muted-foreground">{row.id}</p></Cell><Cell>{row.companyName ?? "Platform"}</Cell><Cell><p className="max-w-[320px] break-words">{row.description || "—"}</p></Cell><Cell>{date(row.updatedAt)}</Cell><Cell><Switch checked={row.state === "enabled"} disabled={busy} onCheckedChange={() => onToggle(row)} aria-label={`Toggle ${row.destinationHost}`} /></Cell></tr>)}</tbody></table></div>}</section>; }
function DeliveryTable({ rows, onRetry, busy }: { rows: Delivery[]; onRetry: (id: string) => void; busy: boolean }) { return <section className="rounded-lg border border-border bg-card"><div className="border-b border-border px-3 py-2"><h2 className="text-sm font-semibold">Recent deliveries</h2><p className="text-[10.5px] text-muted-foreground">Every row is a durable outbox record with its latest outcome.</p></div>{!rows.length ? <Empty text="No deliveries in this view." /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-[11px]"><thead className="bg-muted/40 text-muted-foreground"><tr><Head>Event</Head><Head>Endpoint</Head><Head>Status</Head><Head>HTTP</Head><Head>Attempts</Head><Head>Last outcome</Head><Head /></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><Cell><p className="break-words font-medium">{row.eventKey}</p><p className="text-muted-foreground">{row.id}</p></Cell><Cell><span className="break-all">{row.endpointId}</span></Cell><Cell><Badge tone={row.state === "delivered" ? "success" : row.state === "failed" ? "danger" : "info"}>{row.state.replaceAll("_", " ")}</Badge></Cell><Cell>{row.latestHttpStatus ?? "—"}</Cell><Cell>{row.attemptsUsed} / {row.maxAttempts}</Cell><Cell><p>{date(row.latestAttemptAt ?? row.createdAt)}</p>{row.failureSummary ? <p className="max-w-[280px] break-words text-red-700">{row.failureSummary}</p> : null}</Cell><Cell>{row.state === "failed" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => onRetry(row.id)}><RotateCcw className="size-3.5" />Retry</Button> : null}</Cell></tr>)}</tbody></table></div>}</section>; }
function Head({ children }: { children?: ReactNode }) { return <th className="px-3 py-2 font-medium">{children}</th>; }
function Cell({ children }: { children: ReactNode }) { return <td className="px-3 py-2 align-top">{children}</td>; }
function Empty({ text }: { text: string }) { return <p className="px-3 py-6 text-[11px] text-muted-foreground">{text}</p>; }
