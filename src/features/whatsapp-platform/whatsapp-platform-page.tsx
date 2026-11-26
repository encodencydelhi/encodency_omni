"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, MessageCircle, PauseCircle, PlayCircle, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { STAT_COLORS, type StatColor } from "@/components/shared/stat-color";
import { errorMessage } from "@/features/support/hooks";
import { btn, btnPrimary, field, Spinner } from "@/features/support/ui";
import { whatsappPlatformApi, type ConnectionRow, type PlanLimits, type PlanRow, type PlatformAlert } from "./api";

const KEY = "super-admin-whatsapp";
const number = (value: number) => value.toLocaleString("en-IN");
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color: StatColor }) {
  const tone = STAT_COLORS[color];
  return (
    <div className={cn("rounded-sm border px-3 py-2", tone.card)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className={cn("text-lg font-semibold leading-tight", tone.ink)}>{value}</p>
      {hint && <p className="text-[11px] font-medium text-slate-500">{hint}</p>}
    </div>
  );
}

const qualityTone = (quality: string) => (/^(GREEN|HIGH)$/i.test(quality) ? "text-emerald-700 bg-emerald-50" : /^(YELLOW|MEDIUM)$/i.test(quality) ? "text-amber-700 bg-amber-50" : /^(RED|LOW|FLAGGED)$/i.test(quality) ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100");

const ALERT_TEXT: Record<PlatformAlert["kind"], (details: PlatformAlert["details"]) => string> = {
  QUALITY_LOW: (d) => `Meta rates this number's quality ${String(d.quality ?? "low")}. Sending more marketing can get the number limited.`,
  HIGH_FAILURE_RATE: (d) => `${d.percent ?? "?"}% of messages failed in the last hour (${d.failed ?? 0} of ${d.attempted ?? 0}).`,
  WEBHOOKS_SILENT: (d) => `${d.sentWithoutStatus ?? 0} messages were sent but no status came back from Meta in 2 hours. Check the webhook subscription.`,
  CONNECTION_ERROR: () => "The connection is in error. The client may need to reconnect or re-verify the number.",
};

/** Paise per billable message per Meta category; the estimate on each Client's Billing tab uses these. */
function RateCardSection() {
  const queryClient = useQueryClient();
  const rates = useQuery({ queryKey: [KEY, "rates"], queryFn: ({ signal }) => whatsappPlatformApi.rates(signal) });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => whatsappPlatformApi.saveRates(Object.fromEntries(Object.entries(draft).map(([category, value]) => [category, value.trim() === "" ? null : Number(value)]))),
    onSuccess: () => { toast.success("Rate card saved. New status updates from Meta use these rates."); setDraft({}); void queryClient.invalidateQueries({ queryKey: [KEY, "rates"] }); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const invalid = Object.values(draft).some((value) => value.trim() !== "" && !(Number(value) >= 0 && Number(value) <= 100000));
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-900">WhatsApp rate card</h2>
        <p className="text-[11px] font-medium text-slate-500">Paise per billable message, per category, from Meta’s current India rate card. Meta decides which messages are billable (free service replies cost nothing); the platform multiplies by these rates. Empty means no estimate.</p>
      </div>
      {rates.isError && <p className="px-3 py-3 text-xs font-semibold text-red-700">{errorMessage(rates.error)}</p>}
      {rates.data && (
        <div className="flex flex-wrap items-end gap-3 px-3 py-3">
          {rates.data.items.map((item) => (
            <label key={item.category} className="grid gap-1 text-[11px] font-semibold text-slate-600">
              {item.category.charAt(0) + item.category.slice(1).toLowerCase()} (paise)
              <input className={cn(field, "w-32")} inputMode="decimal" value={draft[item.category] ?? (item.ratePaise === null ? "" : String(item.ratePaise))} onChange={(event) => setDraft({ ...draft, [item.category]: event.target.value })} />
            </label>
          ))}
          <button type="button" className={btnPrimary} disabled={!Object.keys(draft).length || invalid || save.isPending} onClick={() => save.mutate()}><Save className="size-3.5" /> Save rates</button>
        </div>
      )}
    </section>
  );
}

function AlertsSection({ onChanged }: { onChanged: () => void }) {
  const [openOnly, setOpenOnly] = useState(true);
  const alerts = useQuery({ queryKey: [KEY, "alerts", openOnly], queryFn: ({ signal }) => whatsappPlatformApi.alerts(openOnly, signal) });
  const sweep = useMutation({
    mutationFn: () => whatsappPlatformApi.sweep(),
    onSuccess: (result) => { toast.success(`Checked ${result.checked} live numbers: ${result.opened} new, ${result.resolved} resolved.`); onChanged(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <section className="rounded-sm border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <BellRing className="size-4 text-red-600" />
        <h2 className="me-auto text-sm font-semibold text-slate-900">Alerts</h2>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} /> Open only</label>
        <button type="button" className={btn} disabled={sweep.isPending} onClick={() => sweep.mutate()}>{sweep.isPending ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />} Check now</button>
      </div>
      <ul className="divide-y divide-slate-100 text-xs">
        {alerts.isLoading && <li className="px-3 py-4 text-center"><Spinner className="mx-auto size-4" /></li>}
        {alerts.isError && <li className="px-3 py-3 font-semibold text-red-700">{errorMessage(alerts.error)}</li>}
        {alerts.data?.length === 0 && <li className="px-3 py-4 text-center text-slate-500">{openOnly ? "No open alerts. Live numbers are checked every 5 minutes." : "No alerts yet."}</li>}
        {alerts.data?.map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-start gap-2 px-3 py-2">
            <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase", alert.resolvedAt ? "bg-slate-100 text-slate-500" : alert.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>{alert.resolvedAt ? "Resolved" : alert.severity}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{alert.companyName ?? "Company"} · {alert.clientName ?? "Client"}</p>
              <p className="text-slate-600">{ALERT_TEXT[alert.kind]?.(alert.details) ?? alert.kind}</p>
            </div>
            <span className="text-[11px] text-slate-500">Since {when(alert.openedAt)}{alert.resolvedAt ? ` · resolved ${when(alert.resolvedAt)}` : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function usageText(row: ConnectionRow) {
  if (!row.plan) return "No plan";
  const { limits, sentThisMonth, planName } = row.plan;
  if (!limits.enabled) return `${planName ?? "Plan"}: WhatsApp off`;
  return `${number(sentThisMonth)}${limits.maxMessagesPerMonth !== null ? ` / ${number(limits.maxMessagesPerMonth)}` : ""} this month`;
}

/** Holds (kill switch) for one row: pause the Client, pause the whole Company, or release the active hold. */
function HoldControls({ row, onChanged }: { row: ConnectionRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"client" | "company">("client");
  const [reason, setReason] = useState("");
  const create = useMutation({
    mutationFn: () => whatsappPlatformApi.createHold({ companyId: row.companyId, ...(scope === "client" ? { clientId: row.clientId } : {}), reason: reason.trim() }),
    onSuccess: () => { toast.success(scope === "client" ? "Sending paused for this Client." : "Sending paused for the whole Company."); setOpen(false); setReason(""); onChanged(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const release = useMutation({
    mutationFn: () => whatsappPlatformApi.releaseHold(row.hold!.id),
    onSuccess: () => { toast.success("Sending resumed. Waiting messages continue."); onChanged(); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (row.hold) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-red-700">{row.hold.clientId ? "Client paused" : "Company paused"}: {row.hold.reason}</p>
        <button type="button" className={btn} disabled={release.isPending} onClick={() => release.mutate()}>
          {release.isPending ? <Spinner className="size-3.5" /> : <PlayCircle className="size-3.5" />} Resume
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className={btn} onClick={() => setOpen(true)}>
        <PauseCircle className="size-3.5" /> Pause
      </button>
    );
  }
  return (
    <div className="w-64 space-y-1.5 rounded-sm border border-slate-200 bg-white p-2">
      <select value={scope} onChange={(event) => setScope(event.target.value as "client" | "company")} className={field}>
        <option value="client">Only this Client</option>
        <option value="company">Whole Company</option>
      </select>
      <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Reason (shown in audit log)" className={field} />
      <p className="text-[10px] font-medium text-slate-500">Outbound messages wait until resumed. Incoming messages keep arriving.</p>
      <div className="flex justify-end gap-1">
        <button type="button" className={btn} onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={reason.trim().length < 5 || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Spinner className="size-3.5" /> : <PauseCircle className="size-3.5" />} Pause
        </button>
      </div>
    </div>
  );
}

const toLimit = (value: string): number | null => (value.trim() === "" ? null : Math.max(0, Math.floor(Number(value))));

function PlanLimitsRow({ plan, onSaved }: { plan: PlanRow; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(plan.whatsapp.enabled);
  const [numbers, setNumbers] = useState(plan.whatsapp.maxNumbers?.toString() ?? "");
  const [messages, setMessages] = useState(plan.whatsapp.maxMessagesPerMonth?.toString() ?? "");
  const next: PlanLimits = { enabled, maxNumbers: toLimit(numbers), maxMessagesPerMonth: toLimit(messages) };
  const changed = next.enabled !== plan.whatsapp.enabled || next.maxNumbers !== plan.whatsapp.maxNumbers || next.maxMessagesPerMonth !== plan.whatsapp.maxMessagesPerMonth;
  const valid = [numbers, messages].every((value) => value.trim() === "" || /^\d+$/.test(value.trim()));
  const save = useMutation({
    mutationFn: () => whatsappPlatformApi.setPlanLimits(plan.id, next),
    onSuccess: () => { toast.success(`WhatsApp limits saved for ${plan.name}.`); onSaved(); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2 text-xs font-semibold text-slate-900">
        {plan.name}
        {!plan.isActive && <span className="ms-1 text-[10px] font-medium text-slate-400">(inactive)</span>}
        <p className="text-[10px] font-medium text-slate-500">{plan.companies} {plan.companies === 1 ? "company" : "companies"}</p>
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Included
        </label>
      </td>
      <td className="px-3 py-2"><input inputMode="numeric" value={numbers} onChange={(event) => setNumbers(event.target.value)} placeholder="No limit" className={cn(field, "w-28")} /></td>
      <td className="px-3 py-2"><input inputMode="numeric" value={messages} onChange={(event) => setMessages(event.target.value)} placeholder="No limit" className={cn(field, "w-36")} /></td>
      <td className="px-3 py-2 text-right">
        <button type="button" className={btnPrimary} disabled={!changed || !valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Spinner className="size-3.5" /> : <Save className="size-3.5" />} Save
        </button>
      </td>
    </tr>
  );
}

/** Super Admin: every Company's WhatsApp numbers, their health and usage, the kill switch, and per-plan WhatsApp limits. */
export function WhatsAppPlatformPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [mode, setMode] = useState("");
  const [flag, setFlag] = useState("");
  const [page, setPage] = useState(1);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: [KEY] });

  const overview = useQuery({ queryKey: [KEY, "overview"], queryFn: ({ signal }) => whatsappPlatformApi.overview(signal), staleTime: 30_000 });
  const list = useQuery({ queryKey: [KEY, "connections", applied, mode, flag, page], queryFn: ({ signal }) => whatsappPlatformApi.connections({ search: applied, mode, flag, page }, signal) });
  const plans = useQuery({ queryKey: [KEY, "plans"], queryFn: ({ signal }) => whatsappPlatformApi.plans(signal) });

  const o = overview.data;
  const live = o?.connections.filter((row) => row.mode === "META" && row.status === "ACTIVE").reduce((sum, row) => sum + row.count, 0) ?? 0;
  const all = o?.connections.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const red = Object.entries(o?.liveQuality ?? {}).filter(([quality]) => /^(RED|LOW|FLAGGED)$/i.test(quality)).reduce((sum, [, count]) => sum + count, 0);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><MessageCircle className="size-5" /></span>
          <div>
            <h1 className="text-base font-semibold text-slate-900">WhatsApp</h1>
            <p className="text-xs font-medium text-slate-600">Every Company&apos;s WhatsApp numbers, health and usage, the pause switch, and WhatsApp limits per plan. No message content is shown here.</p>
          </div>
        </div>
        <button type="button" className={btn} onClick={refresh}><RefreshCw className="size-3.5" /> Refresh</button>
      </div>

      {overview.isError && <p role="alert" className="text-xs font-semibold text-red-700">{errorMessage(overview.error)}</p>}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
        <Stat color="green" label="Live numbers" value={o ? number(live) : "…"} hint={o ? `${number(all)} connections in total` : undefined} />
        <Stat color="blue" label="Sent, 24 hours" value={o ? number(o.messages.sentLast24h) : "…"} hint={o ? `${number(o.messages.sentThisMonth)} this month` : undefined} />
        <Stat color={o && o.messages.failedLast24h > 0 ? "danger" : "grey"} label="Failed, 24 hours" value={o ? number(o.messages.failedLast24h) : "…"} hint={o ? `${number(o.messages.failedLast7d)} in 7 days` : undefined} />
        <Stat color="violet" label="Received, 24 hours" value={o ? number(o.messages.inboundLast24h) : "…"} />
        <Stat color={red > 0 ? "danger" : "amber"} label="Low quality numbers" value={o ? number(red) : "…"} hint="Quality reported by Meta" />
        <Stat color={o && o.openAlerts > 0 ? "danger" : "grey"} label="Open alerts" value={o ? number(o.openAlerts) : "…"} hint="Checked every 5 minutes" />
        <Stat color={o && o.activeHolds > 0 ? "red" : "grey"} label="Paused" value={o ? number(o.activeHolds) : "…"} hint={o ? `${number(o.unroutedWebhooksLast24h)} unmatched events, ${number(o.failedJobsLast24h)} failed jobs (24 h)` : undefined} />
      </div>

      <AlertsSection onChanged={refresh} />

      <section className="rounded-sm border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <h2 className="me-auto text-sm font-semibold text-slate-900">Numbers</h2>
          <form onSubmit={(event) => { event.preventDefault(); setApplied(search.trim()); setPage(1); }} className="flex gap-1">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Company, client, phone" className={cn(field, "w-56")} />
            <button type="submit" className={btn}>Search</button>
          </form>
          <select value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }} className={cn(field, "w-36")}>
            <option value="">Live and test</option>
            <option value="META">Live (Meta)</option>
            <option value="MOCK">Test (simulated)</option>
          </select>
          <select value={flag} onChange={(event) => { setFlag(event.target.value); setPage(1); }} className={cn(field, "w-40")}>
            <option value="">All</option>
            <option value="attention">Needs attention</option>
            <option value="held">Paused</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Company / Client</th>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Quality</th>
                <th className="px-3 py-2">Last 7 days</th>
                <th className="px-3 py-2">Plan usage</th>
                <th className="px-3 py-2">Last received</th>
                <th className="px-3 py-2">Pause</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700">
              {list.isLoading && <tr><td colSpan={8} className="px-3 py-6 text-center"><Spinner className="mx-auto size-4" /></td></tr>}
              {list.isError && <tr><td colSpan={8} className="px-3 py-4 text-center font-semibold text-red-700">{errorMessage(list.error)}</td></tr>}
              {list.data?.items.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No WhatsApp connections match.</td></tr>}
              {list.data?.items.map((row) => (
                <tr key={row.id} className={cn("border-t border-slate-100 align-top", row.hold && "bg-red-50/40")}>
                  <td className="px-3 py-2"><p className="font-semibold text-slate-900">{row.companyName}</p><p className="text-slate-500">{row.clientName}</p></td>
                  <td className="px-3 py-2"><p className="font-medium">{row.displayPhone || "—"}</p><p className="text-slate-500">{row.businessName || (row.mode === "MOCK" ? "Simulated" : "—")}</p></td>
                  <td className="px-3 py-2"><span className="font-semibold">{row.status}</span><p className="text-[10px] text-slate-500">{row.mode === "META" ? "Live" : "Test"}</p></td>
                  <td className="px-3 py-2"><span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-semibold", qualityTone(row.quality))}>{row.quality}</span></td>
                  <td className="px-3 py-2">{number(row.sentLast7d)} sent{row.failedLast7d > 0 && <span className="ms-1 font-semibold text-red-700">· {number(row.failedLast7d)} failed</span>}</td>
                  <td className="px-3 py-2">{usageText(row)}</td>
                  <td className="px-3 py-2 text-slate-500">{when(row.lastInboundAt)}</td>
                  <td className="px-3 py-2"><HoldControls row={row} onChanged={refresh} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data && list.data.total > list.data.pageSize && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2 text-xs">
            <span className="text-slate-500">Page {page} of {pages}</span>
            <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className={btn} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>

      <section className="rounded-sm border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <ShieldAlert className="size-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-900">WhatsApp limits per plan</h2>
          <p className="text-[11px] font-medium text-slate-500">Empty means no limit. Live numbers are checked when a number is activated; messages are counted when they are sent to Meta, per calendar month. Test (simulated) numbers never count.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Plan</th><th className="px-3 py-2">WhatsApp</th><th className="px-3 py-2">Live numbers</th><th className="px-3 py-2">Messages per month</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {plans.isLoading && <tr><td colSpan={5} className="px-3 py-6 text-center"><Spinner className="mx-auto size-4" /></td></tr>}
              {plans.isError && <tr><td colSpan={5} className="px-3 py-4 text-center text-xs font-semibold text-red-700">{errorMessage(plans.error)}</td></tr>}
              {plans.data?.map((plan) => <PlanLimitsRow key={`${plan.id}:${JSON.stringify(plan.whatsapp)}`} plan={plan} onSaved={refresh} />)}
            </tbody>
          </table>
        </div>
      </section>

      <RateCardSection />
    </div>
  );
}
