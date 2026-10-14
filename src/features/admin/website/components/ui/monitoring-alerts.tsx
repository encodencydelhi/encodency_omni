"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, AlertOctagon, BellRing, Clock, Mail, MessageCircle, Save, Send, ShieldCheck } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { useMonitoringOverview, useSaveSettings, useSendTestAlert, useWebsiteSettings } from "../../data/hooks";
import { formatDateTime, formatRelative } from "../../data/selectors";
import type { AlertDeliveryView, AlertRuleKey, AlertSettings, MonitoringIncident, MonitoringOverview, UptimeWindowStat, WebsiteSettings } from "../../data/types";
import { Card, Chip, WButton } from "./kit";
import { AXIS_PROPS, GRID_PROPS, makeTooltip } from "./charts";
import { EmptyState, QueryErrorState, SkeletonBlock } from "./states";
import { useWebsiteWorkspace } from "../website-workspace";

const STATE_COPY = {
  up: { label: "Operational", tone: "good" },
  down: { label: "Down", tone: "bad" },
  degraded: { label: "Checking a failure", tone: "warn" },
  paused: { label: "Monitoring paused", tone: "muted" },
  unknown: { label: "No checks yet", tone: "muted" },
} as const;

const LIFECYCLE: Record<string, { label: string; tone: "warn" | "bad" | "good" | "muted" | "info" }> = {
  SUSPECTED: { label: "Suspected down", tone: "warn" },
  CONFIRMED: { label: "Confirmed down", tone: "bad" },
  ONGOING: { label: "Ongoing", tone: "bad" },
  RECOVERED: { label: "Recovered", tone: "info" },
  RESOLVED: { label: "Resolved", tone: "good" },
};

const RULE_LABEL: Record<AlertRuleKey, { label: string; hint: string }> = {
  siteDown: { label: "Website down", hint: "After the outage is confirmed by consecutive failed checks." },
  siteRecovered: { label: "Website recovered", hint: "When the site answers again after a confirmed outage." },
  ssl: { label: "SSL expiring or expired", hint: "At the warning window and at 14 / 7 / 3 / 1 days, then on expiry." },
  dns: { label: "DNS records changed", hint: "When address or name-server records differ from the last observation." },
  seoCritical: { label: "New critical SEO issue", hint: "After a crawl finds critical issues not seen before." },
  perfRegression: { label: "Verified performance regression", hint: "Only when two measured Lighthouse runs of one page differ by the threshold." },
  crawlFailure: { label: "Crawl failed", hint: "When a crawl ends in failure after its retries." },
  monitoringFailure: { label: "Monitoring failing", hint: "When scheduled checks themselves cannot run repeatedly." },
  integrationDisconnected: { label: "GA4 / Search Console disconnected", hint: "When an integration is disconnected." },
};

const DELIVERY_COPY: Record<string, string> = {
  accepted_by_mail_server: "Accepted by the mail server",
  queued_with_whatsapp: "Handed to WhatsApp",
  quiet_hours: "Held back: quiet hours",
  not_configured: "Not configured",
  no_recipient: "No recipient",
  template_not_selected: "No WhatsApp template chosen",
  template_not_approved: "Template not approved",
  template_not_found: "Template not found",
  template_variables_unmapped: "Template variables could not be filled",
  provider_not_connected: "WhatsApp provider not connected",
  retries_exhausted: "Failed after retries",
  permanent_error: "Permanent error",
  queue_unavailable: "Queue unavailable",
};

const durationLabel = (ms: number | null) => {
  if (ms === null) return "—";
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
};

/* ------------------------------------------------------------------ */
/* Live status + windows                                                */
/* ------------------------------------------------------------------ */

function WindowCard({ label, w }: { label: string; w: UptimeWindowStat }) {
  return (
    <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
      {w.insufficient || w.uptimePct === null ? (
        <p className="mt-1.5 text-[12px] font-semibold text-[#94A3B8]">Insufficient monitoring history</p>
      ) : (
        <p className={cn("mt-1 text-[22px] font-extrabold leading-none", w.uptimePct >= 99.9 ? "text-[#0B7A55]" : w.uptimePct >= 99 ? "text-[#9A5B08]" : "text-[#C0261F]")}>{w.uptimePct.toFixed(w.uptimePct === 100 ? 0 : 2)}%</p>
      )}
      <p className="mt-1.5 text-[10.5px] text-[#6B7A94]">
        {w.checks} check{w.checks === 1 ? "" : "s"}
        {w.avgResponseMs !== null ? ` · avg ${w.avgResponseMs} ms` : ""}
        {w.checks > 0 && w.coveragePct < 100 ? ` · history covers ${w.coveragePct}% of this window` : ""}
      </p>
    </div>
  );
}

export function MonitoringLiveStrip({ o }: { o: MonitoringOverview }) {
  const s = STATE_COPY[o.status.state];
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF4] bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <Chip tone={s.tone} dot>{s.label}</Chip>
          <span className="text-[11.5px] text-[#4A5A73]">
            {o.status.lastCheckAt ? <>Last check <span title={formatDateTime(o.status.lastCheckAt)}>{formatRelative(o.status.lastCheckAt)}</span>{o.status.lastHttpStatus ? ` · HTTP ${o.status.lastHttpStatus}` : " · no response"}{o.status.lastResponseMs !== null ? ` · ${o.status.lastResponseMs} ms` : ""}</> : "No check has been recorded yet."}
          </span>
          {o.status.lastSuccessAt ? <span className="text-[11.5px] text-[#4A5A73]">Last successful check <span title={formatDateTime(o.status.lastSuccessAt)}>{formatRelative(o.status.lastSuccessAt)}</span></span> : null}
        </div>
        <span className="text-[11px] text-[#6B7A94]">
          {o.coverage.scheduled ? `Checked every ${o.coverage.intervalMinutes} min` : o.coverage.reason ?? "Scheduled checks are off"} · {o.coverage.locations[0]?.name}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <WindowCard label="Uptime · 24 hours" w={o.uptime.h24} />
        <WindowCard label="Uptime · 7 days" w={o.uptime.d7} />
        <WindowCard label="Uptime · 30 days" w={o.uptime.d30} />
        <WindowCard label="Uptime · 90 days" w={o.uptime.d90} />
      </div>
      <p className="px-1 text-[10.5px] text-[#94A3B8]">
        Computed only from recorded checks{o.coverage.firstCheckAt ? ` since ${formatDateTime(o.coverage.firstCheckAt)}` : ""}. {o.coverage.locations[0]?.note}
      </p>
    </div>
  );
}

export function ResponseHistory({ o }: { o: MonitoringOverview }) {
  const data = o.responseSeries.filter((p) => p.avgMs !== null).map((p) => ({ at: p.at, Average: p.avgMs, Peak: p.maxMs }));
  return (
    <Card title="Response time · last 24 hours" icon={Activity} subtitle="Hourly average and peak from recorded checks">
      {data.length < 2 ? (
        <EmptyState compact title="Insufficient monitoring history" body="Response-time history appears once at least two hours of checks have been recorded." />
      ) : (
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="at" tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {...AXIS_PROPS} />
              <YAxis unit=" ms" {...AXIS_PROPS} />
              <Tooltip content={makeTooltip((e) => `${e.value} ms`, (l) => new Date(l).toLocaleString())} />
              <Line type="monotone" dataKey="Average" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="Peak" stroke="#E29208" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Incidents                                                            */
/* ------------------------------------------------------------------ */

function IncidentRow({ i }: { i: MonitoringIncident }) {
  const l = LIFECYCLE[i.status] ?? { label: i.status, tone: "muted" as const };
  return (
    <li className="px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={l.tone}>{l.label}</Chip>
        {i.falsePositive ? <Chip tone="muted">Transient — recovered before confirmation</Chip> : null}
        {i.escalated ? <Chip tone="warn">Escalated</Chip> : null}
        <span className="text-[11.5px] font-semibold text-[#28354C]">Started {formatDateTime(i.startedAt)}</span>
        <span className="text-[11px] text-[#6B7A94]">· {i.status === "RESOLVED" || i.status === "RECOVERED" ? `lasted ${durationLabel(i.durationMs)}` : `down for ${durationLabel(i.durationMs)} so far`}</span>
      </div>
      <p className="mt-1 text-[11.5px] text-[#4A5A73]">
        {i.reason ?? "No reason recorded"} · {i.failedChecks} failed check{i.failedChecks === 1 ? "" : "s"}
        {i.confirmedAt ? ` · confirmed ${formatRelative(i.confirmedAt)}` : ""}
        {i.recoveredAt ? ` · recovered ${formatRelative(i.recoveredAt)}` : ""}
      </p>
      <p className="mt-0.5 font-mono text-[10.5px] text-[#94A3B8]">{i.url} · observed from {i.location}</p>
    </li>
  );
}

export function IncidentsPanel({ o }: { o: MonitoringOverview }) {
  return (
    <div className="space-y-1">
      {o.activeIncident ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#F0C9C6] bg-[#FDF4F3] px-3.5 py-3">
          <AlertOctagon className="mt-0.5 size-4 shrink-0 text-[#C0261F]" aria-hidden />
          <div>
            <p className="text-[12.5px] font-semibold text-[#8A1B16]">
              {o.activeIncident.status === "SUSPECTED" ? "A possible outage is being verified" : o.activeIncident.status === "RECOVERED" ? "Recovered — confirming stability" : "Active incident"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#8A3A36]">
              {o.activeIncident.reason ?? "No response"} · since {formatDateTime(o.activeIncident.startedAt)} · {durationLabel(o.activeIncident.durationMs)}
            </p>
          </div>
        </div>
      ) : null}
      <Card title={`Incident history (${o.incidents.length})`} icon={AlertOctagon} subtitle="Every outage with its lifecycle, duration and where it was observed" bodyClassName="p-0">
        {o.incidents.length === 0 ? (
          <EmptyState compact title="No incidents recorded" body="Incidents appear here when scheduled checks fail. Nothing has been recorded for this website." />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">{o.incidents.map((i) => <IncidentRow key={i.id} i={i} />)}</ul>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alerts: channels, rules, history                                      */
/* ------------------------------------------------------------------ */

function DeliveryChip({ d }: { d: AlertDeliveryView }) {
  const label = d.channel === "in_app" ? "In-app" : d.channel === "email" ? "Email" : "WhatsApp";
  const text =
    d.status === "sent" ? (d.channel === "email" ? "accepted by mail server" : "delivered in-app")
      : d.status === "handed_off" ? `handed to WhatsApp${d.providerStatus ? ` · ${d.providerStatus.toLowerCase()}` : ""}`
        : d.status === "queued" ? "sending…"
          : d.status === "failed" ? `failed${d.attempts ? ` after ${d.attempts} attempt${d.attempts === 1 ? "" : "s"}` : ""}`
            : DELIVERY_COPY[d.reason ?? ""] ?? "skipped";
  const tone = d.status === "sent" || d.status === "handed_off" ? "good" : d.status === "failed" ? "bad" : d.status === "queued" ? "info" : "muted";
  return (
    <span title={d.error ?? undefined} className="inline-flex">
      <Chip tone={tone}>{label}: {text}{d.recipient ? ` (${d.recipient})` : ""}</Chip>
    </span>
  );
}

function ChannelCards({ o }: { o: MonitoringOverview }) {
  const c = o.channels;
  return (
    <div className="grid gap-1 lg:grid-cols-3">
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-[#28354C]"><BellRing className="size-4 text-[#2563EB]" aria-hidden />In-app</p>
        <p className="mt-1.5"><Chip tone={c.inApp.enabled ? "good" : "muted"} dot>{c.inApp.enabled ? "Active" : "Off"}</Chip></p>
        <p className="mt-1.5 text-[10.5px] text-[#6B7A94]">Sent to the company owners and admins.</p>
      </div>
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-[#28354C]"><Mail className="size-4 text-[#2563EB]" aria-hidden />Email</p>
        <p className="mt-1.5"><Chip tone={c.email.active ? "good" : c.email.enabled ? "warn" : "muted"} dot>{c.email.active ? "Active" : c.email.enabled ? "Enabled, not usable" : "Off"}</Chip></p>
        <p className="mt-1.5 text-[10.5px] text-[#6B7A94]">
          {!c.email.smtpConfigured ? "The mail server (SMTP) is not configured on this platform, so no email can be sent." : c.email.usesOwners ? "No recipients added: company owners and admins are used." : `${c.email.recipients} recipient${c.email.recipients === 1 ? "" : "s"}.`}
        </p>
      </div>
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-[#28354C]"><MessageCircle className="size-4 text-[#2563EB]" aria-hidden />WhatsApp</p>
        <p className="mt-1.5"><Chip tone={c.whatsapp.active ? "good" : c.whatsapp.enabled ? "warn" : "muted"} dot>{c.whatsapp.active ? "Active" : c.whatsapp.enabled ? "Enabled, not usable" : "Off"}</Chip></p>
        <p className="mt-1.5 text-[10.5px] text-[#6B7A94]">
          {!c.whatsapp.template ? "Choose an approved WhatsApp template to enable alerts." : !c.whatsapp.template.approved ? `Template “${c.whatsapp.template.name}” is not approved by WhatsApp, so nothing will be sent.` : !c.whatsapp.template.connected ? "The WhatsApp provider connection is not active." : c.whatsapp.recipients === 0 ? "Add at least one phone number." : `Template “${c.whatsapp.template.name}” · ${c.whatsapp.recipients} number${c.whatsapp.recipients === 1 ? "" : "s"}.`}
        </p>
      </div>
    </div>
  );
}

const TIMEZONES = ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const field = "w-full rounded-md border border-[#DEE5EF] bg-white px-2.5 py-1.5 text-[12px] text-[#28354C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2F5FA] py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#28354C]">{label}</p>
        {hint ? <p className="text-[10.5px] text-[#6B7A94]">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function AlertSettingsEditor({ o }: { o: MonitoringOverview }) {
  const { clientId } = useWebsiteWorkspace();
  const settings = useWebsiteSettings(clientId);
  const save = useSaveSettings(clientId);
  const [draft, setDraft] = useState<AlertSettings>(o.alertSettings);
  const [interval, setIntervalMinutes] = useState<number>(o.coverage.intervalMinutes);
  const [emails, setEmails] = useState(o.alertSettings.recipients.emails.join(", "));
  const [phones, setPhones] = useState(o.alertSettings.recipients.phones.join(", "));
  const [escEmails, setEscEmails] = useState(o.alertSettings.escalation.emails.join(", "));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(o.alertSettings);
    setIntervalMinutes(o.coverage.intervalMinutes);
    setEmails(o.alertSettings.recipients.emails.join(", "));
    setPhones(o.alertSettings.recipients.phones.join(", "));
    setEscEmails(o.alertSettings.escalation.emails.join(", "));
  }, [o, dirty]);

  const change = (patch: Partial<AlertSettings>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const split = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  const approved = useMemo(() => o.channels.whatsapp.availableTemplates.filter((t) => t.approved), [o]);

  const onSave = () => {
    if (!settings.data) return;
    const next: WebsiteSettings = {
      ...settings.data,
      monitoring: {
        ...settings.data.monitoring,
        intervalMinutes: interval,
        alerts: { ...draft, recipients: { emails: split(emails), phones: split(phones) }, escalation: { ...draft.escalation, emails: split(escEmails) } },
      },
    };
    save.mutate(next, {
      onSuccess: () => { setDirty(false); toast.success("Alert settings saved", { description: "Scheduling and alert behaviour use these values from the next check." }); },
      onError: (e) => toast.error("Could not save alert settings", { description: e instanceof Error ? e.message : undefined }),
    });
  };

  return (
    <Card
      title="Alert rules and channels"
      icon={ShieldCheck}
      subtitle="Saved settings drive the real scheduler and alert delivery"
      action={
        <WButton size="sm" tone="primary" icon={Save} disabled={!dirty || save.isPending || !settings.data} disabledReason={!dirty ? "No changes" : "Saving…"} onClick={onSave}>
          Save changes
        </WButton>
      }
      bodyClassName="p-4"
    >
      <div className="grid gap-x-8 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Monitoring</p>
          <Row label="Check interval" hint="How often the website is checked.">
            <select className={field} value={interval} onChange={(e) => { setIntervalMinutes(Number(e.target.value)); setDirty(true); }} aria-label="Check interval">
              {[1, 5, 15, 60].map((m) => <option key={m} value={m}>Every {m} min</option>)}
            </select>
          </Row>
          <Row label="Confirm an outage after" hint="Consecutive failed checks before alerting (avoids false alarms).">
            <select className={field} value={draft.confirmationChecks} onChange={(e) => change({ confirmationChecks: Number(e.target.value) })} aria-label="Confirmation checks">
              {[2, 3, 4].map((n) => <option key={n} value={n}>{n} failed checks</option>)}
            </select>
          </Row>
          <Row label="Repeat-alert cooldown" hint="The same alert is not repeated inside this time.">
            <select className={field} value={draft.cooldownMinutes} onChange={(e) => change({ cooldownMinutes: Number(e.target.value) })} aria-label="Cooldown">
              {[15, 30, 60, 180, 720, 1440].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} h` : `${m} min`}</option>)}
            </select>
          </Row>
          <Row label="Performance regression threshold" hint="Lighthouse score points lost between two measured runs.">
            <select className={field} value={draft.perfRegressionPoints} onChange={(e) => change({ perfRegressionPoints: Number(e.target.value) })} aria-label="Regression threshold">
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} points</option>)}
            </select>
          </Row>

          <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Channels</p>
          <Row label="In-app notifications"><Switch aria-label="In-app alerts" checked={draft.channels.inApp} onCheckedChange={(v) => change({ channels: { ...draft.channels, inApp: v === true } })} /></Row>
          <Row label="Email" hint={o.channels.email.smtpConfigured ? undefined : "SMTP is not configured on this platform."}>
            <Switch aria-label="Email alerts" checked={draft.channels.email} onCheckedChange={(v) => change({ channels: { ...draft.channels, email: v === true } })} />
          </Row>
          <div className="py-2">
            <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="alert-emails">Email recipients <span className="font-normal text-[#94A3B8]">(comma separated; empty = owners and admins)</span></label>
            <input id="alert-emails" className={cn(field, "mt-1")} value={emails} onChange={(e) => { setEmails(e.target.value); setDirty(true); }} placeholder="ops@yourcompany.com, tech@yourcompany.com" />
          </div>
          <Row label="WhatsApp" hint="Only a WhatsApp-approved template is ever used.">
            <Switch aria-label="WhatsApp alerts" checked={draft.channels.whatsapp} onCheckedChange={(v) => change({ channels: { ...draft.channels, whatsapp: v === true } })} />
          </Row>
          <div className="space-y-2 py-2">
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="wa-template">WhatsApp template</label>
              <select id="wa-template" className={cn(field, "mt-1")} value={draft.whatsappTemplateId ?? ""} onChange={(e) => change({ whatsappTemplateId: e.target.value || null })}>
                <option value="">— none —</option>
                {approved.map((t) => <option key={t.id} value={t.id}>{t.name} (approved)</option>)}
              </select>
              {approved.length === 0 ? <p className="mt-1 text-[10.5px] text-[#9A5B08]">No approved WhatsApp templates exist for this client yet.</p> : null}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="wa-phones">WhatsApp numbers <span className="font-normal text-[#94A3B8]">(international format)</span></label>
              <input id="wa-phones" className={cn(field, "mt-1")} value={phones} onChange={(e) => { setPhones(e.target.value); setDirty(true); }} placeholder="+919876543210" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Alert rules</p>
          {(Object.keys(RULE_LABEL) as AlertRuleKey[]).map((key) => (
            <Row key={key} label={RULE_LABEL[key].label} hint={RULE_LABEL[key].hint}>
              <Switch aria-label={RULE_LABEL[key].label} checked={draft.rules[key]} onCheckedChange={(v) => change({ rules: { ...draft.rules, [key]: v === true } })} />
            </Row>
          ))}

          <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Quiet hours</p>
          <Row label="Hold email and WhatsApp alerts" hint="In-app alerts are still recorded.">
            <Switch aria-label="Quiet hours" checked={draft.quietHours.enabled} onCheckedChange={(v) => change({ quietHours: { ...draft.quietHours, enabled: v === true } })} />
          </Row>
          {draft.quietHours.enabled ? (
            <div className="grid gap-2 py-2 sm:grid-cols-3">
              <div><label className="text-[11px] font-semibold text-[#28354C]" htmlFor="qh-start">From</label><input id="qh-start" type="time" className={cn(field, "mt-1")} value={draft.quietHours.start} onChange={(e) => change({ quietHours: { ...draft.quietHours, start: e.target.value } })} /></div>
              <div><label className="text-[11px] font-semibold text-[#28354C]" htmlFor="qh-end">To</label><input id="qh-end" type="time" className={cn(field, "mt-1")} value={draft.quietHours.end} onChange={(e) => change({ quietHours: { ...draft.quietHours, end: e.target.value } })} /></div>
              <div><label className="text-[11px] font-semibold text-[#28354C]" htmlFor="qh-tz">Time zone</label>
                <select id="qh-tz" className={cn(field, "mt-1")} value={draft.quietHours.timezone} onChange={(e) => change({ quietHours: { ...draft.quietHours, timezone: e.target.value } })}>
                  {[...new Set([draft.quietHours.timezone, ...TIMEZONES])].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Row label="Still send critical alerts" hint="Website down and SSL expired.">
                  <Switch aria-label="Allow critical alerts in quiet hours" checked={draft.quietHours.allowCritical} onCheckedChange={(v) => change({ quietHours: { ...draft.quietHours, allowCritical: v === true } })} />
                </Row>
              </div>
            </div>
          ) : null}

          <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Escalation</p>
          <Row label="Escalate an unrecovered outage" hint="One extra alert to the contacts below.">
            <Switch aria-label="Escalation" checked={draft.escalation.enabled} onCheckedChange={(v) => change({ escalation: { ...draft.escalation, enabled: v === true } })} />
          </Row>
          {draft.escalation.enabled ? (
            <div className="grid gap-2 py-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="esc-min">After</label>
                <select id="esc-min" className={cn(field, "mt-1")} value={draft.escalation.afterMinutes} onChange={(e) => change({ escalation: { ...draft.escalation, afterMinutes: Number(e.target.value) } })}>
                  {[10, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="esc-emails">Escalation emails</label>
                <input id="esc-emails" className={cn(field, "mt-1")} value={escEmails} onChange={(e) => { setEscEmails(e.target.value); setDirty(true); }} placeholder="manager@yourcompany.com" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function AlertHistory({ o }: { o: MonitoringOverview }) {
  const { clientId } = useWebsiteWorkspace();
  const test = useSendTestAlert(clientId);
  return (
    <Card
      title={`Alert history (${o.alerts.length})`}
      icon={BellRing}
      subtitle="What was raised, and what happened on each channel"
      action={
        <WButton
          size="sm"
          icon={Send}
          disabled={test.isPending}
          onClick={() => test.mutate(undefined, { onSuccess: () => toast.success("Test alert raised", { description: "Check the delivery results below." }), onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the test alert") })}
        >
          Send test alert
        </WButton>
      }
      bodyClassName="p-0"
    >
      {o.alerts.length === 0 ? (
        <EmptyState compact title="No alerts raised yet" body="Alerts appear here when an outage is confirmed, a certificate nears expiry, or another rule fires." />
      ) : (
        <ul className="divide-y divide-[#F2F5FA]">
          {o.alerts.map((a) => (
            <li key={a.id} className="px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={a.severity === "critical" ? "bad" : a.severity === "high" ? "warn" : a.severity === "medium" ? "info" : "muted"}>{a.type.replace(/_/g, " ")}</Chip>
                <span className="text-[12px] font-semibold text-[#28354C]">{a.title}</span>
                <span className="text-[10.5px] text-[#94A3B8]" title={formatDateTime(a.createdAt)}>{formatRelative(a.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-[11.5px] text-[#4A5A73]">{a.message}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {a.deliveries.length ? a.deliveries.map((d) => <DeliveryChip key={d.id} d={d} />) : <Chip tone="muted">No channel was enabled</Chip>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tab bodies                                                            */
/* ------------------------------------------------------------------ */

export function MonitoringLiveTab() {
  const { clientId } = useWebsiteWorkspace();
  const q = useMonitoringOverview(clientId);
  if (q.isLoading) return <SkeletonBlock lines={6} />;
  if (q.error) return <Card title="Live monitoring"><QueryErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>;
  if (!q.data) return null;
  return (
    <div className="space-y-1">
      <MonitoringLiveStrip o={q.data} />
      <ResponseHistory o={q.data} />
      {q.data.activeIncident ? <IncidentsPanel o={{ ...q.data, incidents: [q.data.activeIncident] }} /> : null}
      <Card title="Coverage" icon={Clock} bodyClassName="p-3.5">
        <ul className="space-y-1 text-[11.5px] text-[#4A5A73]">
          <li>{q.data.coverage.totalChecks.toLocaleString()} availability checks recorded in the last 90 days.</li>
          <li>{q.data.coverage.scheduled ? `Scheduled every ${q.data.coverage.intervalMinutes} minutes.` : q.data.coverage.reason ?? "Scheduled checks are not running."}</li>
          <li>{q.data.coverage.locations[0]?.name}. {q.data.coverage.locations[0]?.note}</li>
        </ul>
      </Card>
    </div>
  );
}

export function MonitoringIncidentsTab() {
  const { clientId } = useWebsiteWorkspace();
  const q = useMonitoringOverview(clientId);
  if (q.isLoading) return <SkeletonBlock lines={6} />;
  if (q.error) return <Card title="Incidents"><QueryErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>;
  return q.data ? <IncidentsPanel o={q.data} /> : null;
}

export function MonitoringAlertsTab() {
  const { clientId } = useWebsiteWorkspace();
  const q = useMonitoringOverview(clientId);
  if (q.isLoading) return <SkeletonBlock lines={8} />;
  if (q.error) return <Card title="Alerts"><QueryErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>;
  if (!q.data) return null;
  return (
    <div className="space-y-1">
      <ChannelCards o={q.data} />
      <AlertSettingsEditor o={q.data} />
      <AlertHistory o={q.data} />
    </div>
  );
}
