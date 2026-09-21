"use client";

import { PencilIcon } from "lucide-react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { Panel } from "@/features/companies/components/primitives";
import { formatInZone, formatSettingValue, formatUtc } from "../data/formatting";
import { getDefinition } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, MaintenanceEntry, SettingValues } from "../data/types";
import { MaintenanceStatusBadge } from "../components/badges";
import { audienceLabels } from "../components/maintenance-banner-host";
import { SectionData, SettingGroup, TablePanel, ViewOnlyNotice } from "../components/section-parts";
import { regionalOf } from "../components/setting-field";
import { useSectionEditor } from "../components/use-section-editor";
import { windowStatus } from "../data/selectors";
import { platformNow } from "@/features/companies/data/clock";

const UNAVAILABLE = "Impact data unavailable until backend integration";

function AnnouncementPreview({ values }: { values: SettingValues }) {
  const enabled = values["maintenance.announcement.enabled"] === true;
  const start = String(values["maintenance.announcement.starts_at"]);
  const end = String(values["maintenance.announcement.ends_at"]);
  const status = windowStatus(start, end, platformNow());
  const zone = regionalOf(values);
  return (
    <Panel title="Announcement Preview" description="The same banner component the shell uses. It shows only to the chosen demo audience, near or during the window, and only while enabled.">
      <AnnouncementBanner
        title={String(values["maintenance.announcement.title"] || "Untitled announcement")}
        message={String(values["maintenance.announcement.message"] || "No message yet.")}
        status={status === "active" ? "active" : "upcoming"}
        window={`${formatUtc(start)} to ${formatUtc(end)}`}
        audience={audienceLabels(Array.isArray(values["maintenance.announcement.audience"]) ? (values["maintenance.announcement.audience"] as string[]) : [])}
        onDismiss={values["maintenance.announcement.dismissible"] === false ? undefined : () => undefined}
      />
      <dl className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
        {[
          ["Live Now", !enabled ? "No - announcement is off" : status === "completed" ? "No - window has passed" : status === "upcoming" ? "Shown within 3 days of the start" : "Yes"],
          ["Dismissable", values["maintenance.announcement.dismissible"] === false ? "No" : "Yes, for the session"],
          ["In Platform Time", formatInZone(start, zone)],
          ["Platform Availability", "Unchanged by this announcement"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-sm border border-border bg-muted/30 px-3 py-2">
            <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[0.8125rem] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function ImpactPreview({ values, active }: { values: SettingValues; active: boolean }) {
  const text = (key: string) => formatSettingValue(getDefinition(key), values[key]);
  const behavior = String(values["maintenance.access.behavior"]);
  const worker = String(values["maintenance.access.worker_impact"]);
  const rows: Array<[string, string]> = [
    ["Affected Companies", UNAVAILABLE],
    ["Affected Users", UNAVAILABLE],
    ["Affected Modules", text("maintenance.access.area")],
    ["Scheduled Publishing", behavior === "read_only" || behavior === "block_new_jobs" || worker === "pause_scheduled_workers" ? "New scheduled publishing would be blocked while restricted." : "Not restricted by the chosen behaviour."],
    ["Automation", worker === "pause_scheduled_workers" ? "Scheduled workers would be paused." : "No automation change configured."],
    ["Sync Jobs", behavior === "block_new_jobs" ? "New syncs would not start." : "No sync change configured."],
    ["API Access", worker === "reject_writes" ? "API writes would be rejected." : "No API change configured."],
    ["Start and End", `${formatUtc(String(values["maintenance.access.starts_at"]))} to ${formatUtc(String(values["maintenance.access.ends_at"]))}`],
    ["Recovery", text("maintenance.access.recovery")],
  ];
  return (
    <Panel title="Access Restriction Impact" description={active ? "What the configured restriction would do once a backend enforces it." : "Shown for review. The restriction is off; turning it on is held for review as a sensitive change."}>
      <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-2 border-b border-border py-1.5 text-[0.8125rem] last:border-b-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={value === UNAVAILABLE ? "text-muted-foreground italic" : "text-foreground"}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-2xs text-muted-foreground">No API, worker or sign-in is stopped by this frontend. Real restriction needs backend enforcement.</p>
    </Panel>
  );
}

function ScheduledTable({ entries, canEdit }: { entries: MaintenanceEntry[]; canEdit: boolean }) {
  return (
    <TablePanel title="Scheduled Maintenance" description="Upcoming, active and completed announcements. Status is evaluated against the demo clock, so it is deterministic.">
      <MiniTable
        caption="Scheduled maintenance"
        rows={entries}
        getKey={(entry) => entry.id}
        empty={<p className="px-3 py-6 text-center text-[0.8125rem] text-muted-foreground">No maintenance is scheduled.</p>}
        columns={[
          { id: "title", header: "Title", cell: (entry) => (<div><p className="font-medium text-foreground">{entry.title}</p><p className="text-2xs text-muted-foreground">{entry.kind === "access_restriction" ? "Access restriction" : "Announcement"}</p></div>) },
          { id: "audience", header: "Audience", hideBelow: "md", cell: (entry) => <span className="text-2xs capitalize text-muted-foreground">{audienceLabels(entry.audience) || "-"}</span> },
          { id: "area", header: "Area", hideBelow: "lg", cell: (entry) => <span className="text-2xs text-muted-foreground">{entry.area}</span> },
          { id: "start", header: "Start", cell: (entry) => <span className="whitespace-nowrap text-2xs tabular">{formatUtc(entry.startsAt)}</span> },
          { id: "end", header: "End", hideBelow: "md", cell: (entry) => <span className="whitespace-nowrap text-2xs tabular">{formatUtc(entry.endsAt)}</span> },
          { id: "status", header: "Status", cell: (entry) => <MaintenanceStatusBadge status={entry.status} /> },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (entry) =>
              entry.editable && canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => document.getElementById(entry.kind === "announcement" ? "setting-maintenance.announcement.title" : "setting-maintenance.access.enabled")?.scrollIntoView({ block: "center", behavior: "smooth" })}>
                  <PencilIcon />Edit
                </Button>
              ) : (
                <Badge tone="neutral">Record</Badge>
              ),
          },
        ]}
      />
    </TablePanel>
  );
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("maintenance", config, pending);
  const restrictionPending = editor.pendingByKey["maintenance.access.enabled"];
  return (
    <div className="space-y-3">
      {!editor.canEdit ? <ViewOnlyNotice section="maintenance" /> : null}
      {editor.banner}
      <AlertBanner tone="info" title="An Announcement Is Not a Maintenance Switch">
        The announcement informs people. The access restriction is a separate policy that only a backend can enforce. Turning on one never turns on the other.
      </AlertBanner>
      <SettingGroup editor={editor} group="announcement" compact />
      <AnnouncementPreview values={editor.values} />
      <SettingGroup editor={editor} group="access" />
      {restrictionPending ? <AlertBanner tone="warning" title="A Restriction Is Waiting for Review">Requested by {restrictionPending.actorName}. It is a pending draft and is not part of the effective configuration.</AlertBanner> : null}
      <ImpactPreview values={editor.values} active={editor.values["maintenance.access.enabled"] === true} />
      <ScheduledTable entries={config.maintenance} canEdit={editor.canEdit} />
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function MaintenanceAvailabilitySection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
