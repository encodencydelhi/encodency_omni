"use client";
import { Download, FileText, Loader2, Mail, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { workspaceReportsService, type ReportFormat, type ScheduleInput, type WorkspaceSchedule } from "@/services/admin/workspace-reports.service";
import { useWorkspaceReports } from "../hooks/use-workspace-reports";
import { WEEKDAYS, describeDeliveries, describeSchedule, formatBytes, invalidRecipients, parseRecipients } from "../workspace-report-format";

const TIMEZONES = ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-sm">
      <header className="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E8EDF3] px-3 py-1.5">
        <h2 className="text-[12px] font-semibold text-[#172044]">{title}</h2>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Notice({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  return <p className={cn("rounded-sm border px-3 py-2 text-[12px] leading-5", tone === "warn" ? "border-[#F5D9A8] bg-[#FFF8EB] text-[#7A4B00]" : "border-[#CFE0F8] bg-[#F2F7FF] text-[#27406B]")}>{children}</p>;
}

const small = "h-8 rounded-sm border border-[#DDE4ED] bg-white px-2.5 text-[12px] font-medium text-[#172044] hover:bg-[#F6F8FB] disabled:opacity-50";

export function WorkspaceReportsTab({ clientId, clientName }: { clientId: string | null; clientName: string }) {
  const r = useWorkspaceReports(clientId);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [rangeDays, setRangeDays] = useState("30");
  const [editing, setEditing] = useState<WorkspaceSchedule | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!r.client) {
    return (
      <Panel title="Reports">
        <div className="space-y-2 px-4 py-8 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-sm bg-[#EAF2FF] text-[#3186F3]"><FileText className="size-5" /></span>
          <p className="text-[13px] font-semibold text-[#172044]">Choose a client first</p>
          <p className="mx-auto max-w-md text-[12px] leading-5 text-[#5E6D89]">A report is made for one client, so what is in it (and who can receive it) stays inside that client. Pick a client in the switcher at the top, then come back to this tab.</p>
        </div>
      </Panel>
    );
  }

  const status = r.status.data;
  const files = r.files.data?.items ?? [];
  const schedules = r.schedules.data?.items ?? [];
  const periods = status?.limits.periods ?? [7, 14, 30, 60, 90];

  const generate = async () => {
    try {
      const row = await r.generate.mutateAsync({ format, rangeDays: Number(rangeDays) });
      toast.success(`Report ready: ${row.fileName ?? row.title}`);
    } catch (error) {
      toast.error(messageOf(error, "The report could not be made."));
    }
  };
  const download = async (id: string) => {
    setBusy(id);
    try {
      const { blob, fileName } = await workspaceReportsService.download(r.client!, id);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      toast.error(messageOf(error, "The report could not be downloaded."));
    } finally {
      setBusy(null);
    }
  };
  const act = async (id: string, label: string, run: () => Promise<unknown>, done: string) => {
    setBusy(`${label}:${id}`);
    try {
      await run();
      toast.success(done);
    } catch (error) {
      toast.error(messageOf(error, "That did not work."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {status && !status.email.configured ? <Notice tone="warn">Email cannot be sent for this company yet. {status.email.reason} Reports are still made and kept here, and schedules can notify your owners and admins in the app.</Notice> : null}
      {status && !status.scheduler.enabled ? <Notice tone="warn">{status.scheduler.reason}</Notice> : null}

      <Panel title={`Create a report for ${clientName}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-[#5E6D89]">Period</Label>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-8 w-40 text-[12px]" aria-label="Report period"><SelectValue /></SelectTrigger>
              <SelectContent>{periods.map((p) => <SelectItem key={p} value={String(p)}>Last {p} days</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-[#5E6D89]">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
              <SelectTrigger className="h-8 w-48 text-[12px]" aria-label="Report format"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (to send to the client)</SelectItem>
                <SelectItem value="csv">CSV (for a spreadsheet)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => void generate()} disabled={r.generate.isPending} className="h-8">
            {r.generate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}Generate report
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[#5E6D89]">Built from this client&apos;s leads, deals, published posts and campaigns. Ad spend, reach and engagement live in each channel and are not copied here. Files are kept for {status?.limits.retentionDays ?? 90} days.</p>
      </Panel>

      <Panel title="Reports for this client">
        {r.files.isLoading ? <p className="py-6 text-center text-[12px] text-[#5E6D89]">Loading...</p> : files.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#5E6D89]">No reports yet. Generate one above, or set up a schedule below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead><tr className="border-b border-[#E8EDF3] text-[11px] uppercase tracking-wide text-[#5E6D89]"><th className="py-1.5 pr-3 font-medium">Created</th><th className="pr-3 font-medium">Report</th><th className="pr-3 font-medium">Size</th><th className="pr-3 font-medium">Delivery</th><th className="text-right font-medium">Actions</th></tr></thead>
              <tbody>
                {files.map((f) => {
                  const d = describeDeliveries(f.deliveries);
                  return (
                    <tr key={f.id} className="border-b border-[#F0F3F7] last:border-0 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-[#172044]">{stamp(f.createdAt)}</td>
                      <td className="pr-3"><span className="font-medium text-[#172044]">{f.title}</span><span className="block text-[11px] text-[#5E6D89]">{f.format.toUpperCase()} - last {f.rangeDays} days - {f.scheduled ? "scheduled" : "made by hand"}</span>{f.status === "failed" ? <span className="block text-[11px] text-[#B42318]">{f.errorMessage}</span> : null}</td>
                      <td className="pr-3 whitespace-nowrap text-[#5E6D89]">{formatBytes(f.sizeBytes)}</td>
                      <td className={cn("pr-3 text-[11px]", d.tone === "warn" ? "text-[#B54708]" : "text-[#5E6D89]")}>{f.scheduled ? d.text : "-"}</td>
                      <td className="whitespace-nowrap py-2 text-right">
                        {f.status === "completed" ? <button type="button" className={cn(small, "mr-1.5 inline-flex items-center gap-1")} onClick={() => void download(f.id)} disabled={busy === f.id}>{busy === f.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}Download</button> : null}
                        <button type="button" aria-label="Delete report" className={cn(small, "inline-grid place-items-center px-2")} onClick={() => { if (window.confirm("Delete this report file? This cannot be undone.")) void act(f.id, "delete", () => r.remove.mutateAsync(f.id), "Report deleted"); }}><Trash2 className="size-3" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Scheduled reports" action={<button type="button" className={cn(small, "inline-flex items-center gap-1")} onClick={() => setEditing("new")}><Plus className="size-3" />New schedule</button>}>
        {r.schedules.isLoading ? <p className="py-6 text-center text-[12px] text-[#5E6D89]">Loading...</p> : schedules.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#5E6D89]">No schedules. A schedule makes this report every week or month and emails it to the people you choose.</p>
        ) : (
          <ul className="divide-y divide-[#F0F3F7]">
            {schedules.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[13px] font-semibold text-[#172044]">{s.name} <span className="ml-1 text-[11px] font-normal text-[#5E6D89]">{s.format.toUpperCase()}</span></p>
                  <p className="text-[11px] text-[#5E6D89]">{describeSchedule(s)}</p>
                  <p className="flex items-center gap-1 text-[11px] text-[#5E6D89]"><Mail className="size-3" />{s.recipients.length ? `${s.recipients.length} recipient${s.recipients.length === 1 ? "" : "s"}` : "No email"}{s.deliverInApp ? ", owners and admins notified in the app" : ""}</p>
                  <p className="text-[11px] text-[#5E6D89]">{s.enabled ? `Next run ${stamp(s.nextRunAt)}` : "Paused"}{s.lastRunAt ? ` - last run ${stamp(s.lastRunAt)} (${s.lastStatus ?? "unknown"})` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-[#5E6D89]"><Switch checked={s.enabled} aria-label={`${s.name} enabled`} disabled={busy === `toggle:${s.id}`} onCheckedChange={(enabled) => void act(s.id, "toggle", () => r.updateSchedule.mutateAsync({ id: s.id, body: { enabled } }), enabled ? "Schedule on" : "Schedule paused")} />{s.enabled ? "On" : "Paused"}</label>
                  <button type="button" className={cn(small, "inline-flex items-center gap-1")} disabled={busy === `run:${s.id}`} onClick={() => { if (window.confirm(`Make this report now and email it to ${s.recipients.length} recipient(s)?`)) void act(s.id, "run", () => r.runSchedule.mutateAsync(s.id), "Report made and sent"); }}>{busy === `run:${s.id}` ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}Send now</button>
                  <button type="button" aria-label="Edit schedule" className={cn(small, "inline-grid place-items-center px-2")} onClick={() => setEditing(s)}><Pencil className="size-3" /></button>
                  <button type="button" aria-label="Delete schedule" className={cn(small, "inline-grid place-items-center px-2")} onClick={() => { if (window.confirm(`Delete the schedule "${s.name}"?`)) void act(s.id, "del", () => r.deleteSchedule.mutateAsync(s.id), "Schedule deleted"); }}><Trash2 className="size-3" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing ? (
        <ScheduleDialog
          key={editing === "new" ? "new" : editing.id}
          schedule={editing === "new" ? null : editing}
          periods={periods}
          maxRecipients={status?.limits.recipientsPerSchedule ?? 10}
          emailReady={status?.email.configured ?? false}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (editing === "new") await r.createSchedule.mutateAsync(body);
            else await r.updateSchedule.mutateAsync({ id: editing.id, body });
            toast.success(editing === "new" ? "Schedule created" : "Schedule saved");
          }}
        />
      ) : null}
    </div>
  );
}

function ScheduleDialog({ schedule, periods, maxRecipients, emailReady, onClose, onSave }: { schedule: WorkspaceSchedule | null; periods: number[]; maxRecipients: number; emailReady: boolean; onClose: () => void; onSave: (body: ScheduleInput) => Promise<void> }) {
  const [name, setName] = useState(schedule?.name ?? "");
  const [format, setFormat] = useState<ReportFormat>(schedule?.format ?? "pdf");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">(schedule?.frequency ?? "monthly");
  const [dayOfWeek, setDayOfWeek] = useState(String(schedule?.dayOfWeek ?? 1));
  const [dayOfMonth, setDayOfMonth] = useState(String(schedule?.dayOfMonth ?? 1));
  const [timeOfDay, setTimeOfDay] = useState(schedule?.timeOfDay ?? "09:00");
  const [timezone, setTimezone] = useState(schedule?.timezone ?? "Asia/Kolkata");
  const [rangeDays, setRangeDays] = useState(String(schedule?.rangeDays ?? 30));
  const [recipients, setRecipients] = useState((schedule?.recipients ?? []).join("\n"));
  const [deliverInApp, setDeliverInApp] = useState(schedule?.deliverInApp ?? true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  const submit = async () => {
    const list = parseRecipients(recipients);
    const bad = invalidRecipients(list);
    if (!name.trim()) return setError("Give the schedule a name.");
    if (bad.length) return setError(`These are not valid email addresses: ${bad.join(", ")}`);
    if (list.length > maxRecipients) return setError(`A schedule can email at most ${maxRecipients} people.`);
    if (!list.length && !deliverInApp) return setError("Add an email address or keep the in-app notice on, otherwise nobody receives it.");
    setPending(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), format, frequency, dayOfWeek: frequency === "weekly" ? Number(dayOfWeek) : null, dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : null, timeOfDay, timezone, rangeDays: Number(rangeDays), recipients: list, deliverInApp });
      onClose();
    } catch (caught) {
      setError(messageOf(caught, "The schedule could not be saved."));
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
          <DialogDescription>The report is made on time and sent to the people below. Times follow the timezone you choose.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5"><Label htmlFor="sched-name">Name *</Label><Input id="sched-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Monthly report for the client" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Repeats</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}><SelectTrigger aria-label="Repeats"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Every week</SelectItem><SelectItem value="monthly">Every month</SelectItem></SelectContent></Select></div>
            {frequency === "weekly" ? (
              <div className="space-y-1.5"><Label>On</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}><SelectTrigger aria-label="Day of the week"><SelectValue /></SelectTrigger><SelectContent>{WEEKDAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent></Select></div>
            ) : (
              <div className="space-y-1.5"><Label>On day</Label>
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}><SelectTrigger aria-label="Day of the month"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 28 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div className="space-y-1.5"><Label htmlFor="sched-time">At</Label><Input id="sched-time" type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}><SelectTrigger aria-label="Timezone"><SelectValue /></SelectTrigger><SelectContent>{zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Period covered</Label>
              <Select value={rangeDays} onValueChange={setRangeDays}><SelectTrigger aria-label="Period covered"><SelectValue /></SelectTrigger><SelectContent>{periods.map((p) => <SelectItem key={p} value={String(p)}>Last {p} days</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}><SelectTrigger aria-label="Format"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sched-to">Email it to</Label>
            <Textarea id="sched-to" rows={3} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="client@example.com, boss@example.com" />
            <p className="text-[11px] text-[#5E6D89]">Separate with commas or new lines (up to {maxRecipients}). {emailReady ? "Sent from your company's own mail account." : "Email is not set up for this company yet, so these addresses will be skipped until it is."}</p>
          </div>
          <label className="flex items-center justify-between gap-3 text-[12px] text-[#172044]"><span>Also notify owners and admins in the app</span><Switch checked={deliverInApp} onCheckedChange={setDeliverInApp} aria-label="Notify in the app" /></label>
          {error ? <p role="alert" className="text-[12px] text-[#B42318]">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={pending}>{pending ? <Loader2 className="size-3.5 animate-spin" /> : null}{schedule ? "Save schedule" : "Create schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
