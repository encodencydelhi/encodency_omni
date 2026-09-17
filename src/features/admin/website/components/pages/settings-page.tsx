"use client";

/**
 * Settings — how often we look, what we look at, who hears about it.
 *
 * The website URL itself is read-only here on purpose: it belongs to the Client
 * Profile, and one module quietly editing another module's record is how two
 * sources of truth start.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  BellRing,
  ExternalLink,
  FileBarChart,
  Globe,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Bug,
  Undo2,
  Unlink,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";
import {
  useArchiveMonitoring,
  useSaveSettings,
  useWebsiteCapabilities,
  useWebsiteSettings,
  useWebsiteTarget,
} from "../../data/hooks";
import {
  CAPABILITY_LABELS,
  INTEGRATION_ORDER,
  integrationStatusLabel,
  integrationTone,
  UNLOCK_MODEL,
} from "../../data/capability-provider";
import { formatDateTime, formatRelative } from "../../data/selectors";
import { WEBSITE_MOCK_MODE } from "../../data/config";
import type { WebsiteCapability, WebsiteSettings } from "../../data/types";
import { WEBSITE_PERMISSIONS } from "../../data/types";
import { Card, Chip, FilterSelect, KeyValue, SubTabs, WButton } from "../ui/kit";
import { QueryErrorState, SkeletonBlock } from "../ui/states";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";
import { useAdminContext } from "@/features/admin/shell/admin-context";

type Section =
  | "website"
  | "crawling"
  | "monitoring"
  | "integrations"
  | "notifications"
  | "team"
  | "reports"
  | "danger";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "crawling", label: "Crawling" },
  { value: "monitoring", label: "Monitoring" },
  { value: "integrations", label: "Integrations" },
  { value: "notifications", label: "Notifications" },
  { value: "team", label: "Team access" },
  { value: "reports", label: "Reports" },
  { value: "danger", label: "Danger zone" },
];

export function WebsiteSettingsPage() {
  const { clientId, clientName, domain, websiteUrl, runScan, scan, openIntegration, navigate, registerUnsavedGuard } =
    useWebsiteWorkspace();
  const { isSidebarCollapsed } = useAdminContext();
  const settings = useWebsiteSettings(clientId);
  const capabilities = useWebsiteCapabilities(clientId);
  const target = useWebsiteTarget(clientId);
  const save = useSaveSettings(clientId);
  const archive = useArchiveMonitoring(clientId);

  const [section, setSection] = useUrlState<Section>("section", "website", SECTIONS.map((entry) => entry.value));

  /**
   * `edits` is null until something is actually changed, so the form always
   * shows the latest saved settings without an effect copying them into state.
   */
  const [edits, setEdits] = useState<WebsiteSettings | null>(null);
  const draft = edits ?? settings.data ?? null;

  const isDirty = useMemo(
    () => Boolean(edits && settings.data && JSON.stringify(edits) !== JSON.stringify(settings.data)),
    [edits, settings.data],
  );

  const handleSave = useCallback(async () => {
    if (!edits) return;
    await save.mutateAsync(edits);
    setEdits(null);
  }, [edits, save]);

  // Let the workspace intercept navigation while edits are pending.
  useEffect(() => {
    if (!isDirty) {
      registerUnsavedGuard(null);
      return;
    }
    registerUnsavedGuard({
      isDirty: () => true,
      save: async () => {
        await handleSave();
        toast.success("Settings saved");
      },
      discard: () => setEdits(null),
    });
    return () => registerUnsavedGuard(null);
  }, [isDirty, handleSave, registerUnsavedGuard]);

  const update = (patch: Partial<WebsiteSettings>) =>
    setEdits((current) => {
      const base = current ?? settings.data;
      return base ? { ...base, ...patch } : current;
    });

  if (settings.isLoading || !draft) {
    return (
      <Card title="Settings">
        <SkeletonBlock lines={10} />
      </Card>
    );
  }

  if (settings.error) {
    return (
      <Card title="Settings">
        <QueryErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-1 pb-16">
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs ariaLabel="Settings sections" value={section} onChange={setSection} options={SECTIONS} />
      </div>

      {section === "website" ? (
        <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card title="Website" icon={Globe} subtitle="Owned by the Client Profile — read-only here">
            <dl className="divide-y divide-[#F2F5FA]">
              <KeyValue label="Client">{clientName}</KeyValue>
              <KeyValue label="Website URL">
                <a
                  href={websiteUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2563EB] hover:underline"
                >
                  {domain}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </KeyValue>
              <KeyValue label="Source">{target.data?.sourceLabel ?? "Client Profile"}</KeyValue>
              <KeyValue label="Ownership">
                <Chip tone={target.data?.verified ? "good" : "muted"}>
                  {target.data?.verified ? "Verified" : "Not verified"}
                </Chip>
              </KeyValue>
              <KeyValue label="Last scanned">{formatRelative(target.data?.lastScannedAt)}</KeyValue>
              <KeyValue label="Next scan">{formatRelative(target.data?.nextScanAt)}</KeyValue>
            </dl>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <WButton icon={Globe} onClick={() => navigate("/admin/projects")}>
                Open Client Profile
              </WButton>
              <WButton icon={ShieldCheck} onClick={() => openIntegration("ownership")}>
                Re-verify
              </WButton>
              <WButton
                tone="primary"
                icon={RefreshCw}
                disabled={scan.isRunning}
                disabledReason="A scan is already running"
                onClick={() => runScan("full-crawl")}
              >
                Re-scan
              </WButton>
            </div>

            <p className="mt-3 rounded-md bg-[#F7F9FC] px-2.5 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
              Changing the URL here would give this client two website records. Edit it once, on the Client Profile, and
              every module follows.
            </p>
          </Card>

          <div className="grid gap-1">
            <Card
              title="What the URL alone lets us do"
              icon={ShieldCheck}
              subtitle="No CMS, server or deploy access is required for any of these"
            >
              <ul className="flex flex-wrap gap-1.5">
                {(Object.keys(CAPABILITY_LABELS) as WebsiteCapability[]).map((key) => (
                  <li key={key}>
                    <Chip tone={capabilities.data?.capabilities[key] ? "good" : "muted"} dot>
                      {CAPABILITY_LABELS[key]}
                    </Chip>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Unlock model" icon={Link2} subtitle="What each integration adds on top" bodyClassName="p-0">
              <ul className="divide-y divide-[#F2F5FA]">
                {UNLOCK_MODEL.map((step) => (
                  <li key={step.key} className="px-3.5 py-2.5">
                    <p className="text-[12px] font-semibold text-[#28354C]">{step.title}</p>
                    <p className="text-[10.5px] text-[#94A3B8]">{step.requires}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {step.unlocks.map((unlock) => (
                        <li key={unlock}>
                          <Chip tone="muted">{unlock}</Chip>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>

            {!WEBSITE_MOCK_MODE ? (
              <Card title="Data mode" icon={AlertTriangle}>
                <p className="text-[11.5px] leading-relaxed text-[#9A5B08]">
                  Live data mode is on and the backing services are not connected, so screens report the missing service
                  rather than showing sample numbers.
                </p>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === "crawling" ? (
        <Card title="Crawling" icon={Bug} subtitle="How deep and how often we walk the site">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <Field label="Crawl frequency" hint="Weekly suits most sites. Daily is for sites that change constantly.">
                <FilterSelect
                  label="Crawl frequency"
                  value={draft.crawl.frequency}
                  onChange={(value) =>
                    update({ crawl: { ...draft.crawl, frequency: value as WebsiteSettings["crawl"]["frequency"] } })
                  }
                  options={[
                    { value: "manual", label: "Manual only" },
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                  ]}
                />
              </Field>

              <Field label="Crawl depth" hint="How many links away from the home page we follow.">
                <NumberInput
                  value={draft.crawl.depth}
                  min={1}
                  max={10}
                  onChange={(depth) => update({ crawl: { ...draft.crawl, depth } })}
                />
              </Field>

              <Field label="Maximum pages" hint="A hard stop, so an unexpected URL explosion cannot run away.">
                <NumberInput
                  value={draft.crawl.maxPages}
                  min={10}
                  max={5000}
                  step={10}
                  onChange={(maxPages) => update({ crawl: { ...draft.crawl, maxPages } })}
                />
              </Field>

              <ToggleRow
                label="Respect robots.txt"
                hint="Strongly recommended. Turning this off means crawling paths the site asked us not to."
                checked={draft.crawl.respectRobots}
                onChange={(respectRobots) => update({ crawl: { ...draft.crawl, respectRobots } })}
              />

              <ToggleRow
                label="Render JavaScript"
                hint="Needed for sites that build their content client-side. Slower and heavier."
                checked={draft.crawl.crawlJs}
                onChange={(crawlJs) => update({ crawl: { ...draft.crawl, crawlJs } })}
              />
            </div>

            <div className="space-y-1">
              <PathList
                label="Include paths"
                hint="Leave as / to crawl the whole site."
                paths={draft.crawl.includePaths}
                onChange={(includePaths) => update({ crawl: { ...draft.crawl, includePaths } })}
              />
              <PathList
                label="Exclude paths"
                hint="Admin areas, search results and anything with infinite URL variations."
                paths={draft.crawl.excludePaths}
                onChange={(excludePaths) => update({ crawl: { ...draft.crawl, excludePaths } })}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {section === "monitoring" ? (
        <Card title="Monitoring" icon={Wifi} subtitle="Availability checks and the thresholds that trigger an alert">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <ToggleRow
                label="Monitoring enabled"
                hint="Checks this website from three regions on the interval below."
                checked={draft.monitoring.enabled}
                onChange={(enabled) => update({ monitoring: { ...draft.monitoring, enabled } })}
              />
              <Field label="Check interval" hint="How often each region requests the home page.">
                <FilterSelect
                  label="Check interval"
                  value={String(draft.monitoring.intervalMinutes)}
                  onChange={(value) =>
                    update({ monitoring: { ...draft.monitoring, intervalMinutes: Number(value) } })
                  }
                  options={[
                    { value: "1", label: "Every minute" },
                    { value: "5", label: "Every 5 minutes" },
                    { value: "15", label: "Every 15 minutes" },
                    { value: "60", label: "Every hour" },
                  ]}
                />
              </Field>
            </div>

            <div className="space-y-1">
              <Field label="Slow response threshold (ms)" hint="Above this, a check is recorded as degraded.">
                <NumberInput
                  value={draft.monitoring.responseTimeThresholdMs}
                  min={200}
                  max={10000}
                  step={100}
                  onChange={(responseTimeThresholdMs) =>
                    update({ monitoring: { ...draft.monitoring, responseTimeThresholdMs } })
                  }
                />
              </Field>
              <Field label="SSL expiry warning (days)" hint="How far ahead of expiry we start warning.">
                <NumberInput
                  value={draft.monitoring.sslExpiryWarningDays}
                  min={3}
                  max={90}
                  onChange={(sslExpiryWarningDays) =>
                    update({ monitoring: { ...draft.monitoring, sslExpiryWarningDays } })
                  }
                />
              </Field>
              <Field label="Uptime alert threshold (%)" hint="Alert when 30-day uptime falls below this.">
                <NumberInput
                  value={draft.monitoring.uptimeAlertThresholdPct}
                  min={90}
                  max={100}
                  step={0.1}
                  onChange={(uptimeAlertThresholdPct) =>
                    update({ monitoring: { ...draft.monitoring, uptimeAlertThresholdPct } })
                  }
                />
              </Field>
            </div>
          </div>
        </Card>
      ) : null}

      {section === "integrations" ? (
        <div className="grid gap-1 lg:grid-cols-2">
          {INTEGRATION_ORDER.map((key) => {
            const integration = capabilities.data?.integrations[key];
            if (!integration) return null;
            const tone = integrationTone(integration.status);
            const connected = tone === "good";
            return (
              <Card
                key={key}
                title={integration.name}
                icon={key === "omniTracking" ? Lock : Link2}
                action={
                  <Chip tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "muted"} dot>
                    {integrationStatusLabel(integration.status)}
                  </Chip>
                }
              >
                <dl className="divide-y divide-[#F2F5FA]">
                  <KeyValue label="Status">{integrationStatusLabel(integration.status)}</KeyValue>
                  <KeyValue label="Property">
                    <span className="font-mono text-[11px]">{integration.property ?? "—"}</span>
                  </KeyValue>
                  <KeyValue label="Last sync">
                    {integration.lastSyncAt ? formatDateTime(integration.lastSyncAt) : "Never"}
                  </KeyValue>
                </dl>
                <p className="mt-2 text-[11px] leading-relaxed text-[#6B7A94]">{integration.detail}</p>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {integration.unlocks.map((unlock) => (
                    <li key={unlock}>
                      <Chip tone={connected ? "good" : "muted"}>{unlock}</Chip>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <WButton tone={connected ? "secondary" : "primary"} icon={Link2} onClick={() => openIntegration(key)}>
                    {connected ? "Manage" : key === "omniTracking" ? "Set up" : "Connect"}
                  </WButton>
                  {connected ? (
                    <WButton tone="danger" icon={Unlink} onClick={() => openIntegration(key)}>
                      Disconnect
                    </WButton>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {section === "notifications" ? (
        <Card
          title="Notifications"
          icon={BellRing}
          subtitle="Who gets told, and through which channel"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F2F5FA]">
            <li className="flex items-center gap-3 bg-[#FAFBFD] px-3.5 py-2">
              <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Event</span>
              <span className="w-14 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                Email
              </span>
              <span className="w-14 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                In-app
              </span>
            </li>
            {draft.notifications.map((notification) => (
              <li key={notification.key} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#28354C]">{notification.label}</p>
                  <p className="text-[10.5px] text-[#6B7A94]">{notification.description}</p>
                </div>
                <span className="flex w-14 justify-center">
                  <Switch
                    aria-label={`Email me about ${notification.label}`}
                    checked={notification.email}
                    onCheckedChange={(checked) =>
                      update({
                        notifications: draft.notifications.map((entry) =>
                          entry.key === notification.key ? { ...entry, email: checked === true } : entry,
                        ),
                      })
                    }
                  />
                </span>
                <span className="flex w-14 justify-center">
                  <Switch
                    aria-label={`Show in-app notifications for ${notification.label}`}
                    checked={notification.inApp}
                    onCheckedChange={(checked) =>
                      update({
                        notifications: draft.notifications.map((entry) =>
                          entry.key === notification.key ? { ...entry, inApp: checked === true } : entry,
                        ),
                      })
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {section === "team" ? (
        <Card
          title="Team access"
          icon={Users}
          subtitle="Who can see and change this website's monitoring"
          bodyClassName="p-0"
        >
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#EEF2F8] bg-[#FAFBFD]">
                  <th scope="col" className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                    Member
                  </th>
                  {WEBSITE_PERMISSIONS.map((permission) => (
                    <th
                      key={permission}
                      scope="col"
                      className="px-2 py-2 text-center text-[9.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]"
                    >
                      {permission}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.team.map((member) => (
                  <tr key={member.id} className="border-b border-[#F1F4F9] last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="text-[11.5px] font-semibold text-[#28354C]">{member.name}</p>
                      <p className="text-[10.5px] text-[#6B7A94]">
                        {member.role} · {member.email}
                      </p>
                    </td>
                    {WEBSITE_PERMISSIONS.map((permission) => (
                      <td key={permission} className="px-2 py-2.5 text-center">
                        <Checkbox
                          aria-label={`${permission} for ${member.name}`}
                          checked={member.permissions.includes(permission)}
                          onCheckedChange={(checked) =>
                            update({
                              team: draft.team.map((entry) =>
                                entry.id === member.id
                                  ? {
                                      ...entry,
                                      permissions:
                                        checked === true
                                          ? [...entry.permissions, permission]
                                          : entry.permissions.filter((value) => value !== permission),
                                    }
                                  : entry,
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {section === "reports" ? (
        <Card title="Reports" icon={FileBarChart} subtitle="Scheduled summaries for the client and the team">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <ToggleRow
                label="Send scheduled reports"
                hint="A summary of health, SEO, performance, issues and uptime."
                checked={draft.reports.scheduleEnabled}
                onChange={(scheduleEnabled) => update({ reports: { ...draft.reports, scheduleEnabled } })}
              />
              <Field label="Frequency" hint="Monthly is usually enough unless the site changes constantly.">
                <FilterSelect
                  label="Report frequency"
                  value={draft.reports.frequency}
                  onChange={(value) =>
                    update({ reports: { ...draft.reports, frequency: value as WebsiteSettings["reports"]["frequency"] } })
                  }
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
              </Field>
              <Field label="Format" hint="CSV is easier to work with; PDF is easier to forward.">
                <FilterSelect
                  label="Report format"
                  value={draft.reports.format}
                  onChange={(value) =>
                    update({ reports: { ...draft.reports, format: value as WebsiteSettings["reports"]["format"] } })
                  }
                  options={[
                    { value: "pdf", label: "PDF" },
                    { value: "csv", label: "CSV" },
                  ]}
                />
              </Field>
            </div>

            <div className="space-y-1">
              <PathList
                label="Recipients"
                hint="Email addresses that receive the scheduled report."
                paths={draft.reports.recipients}
                placeholder="name@example.com"
                onChange={(recipients) => update({ reports: { ...draft.reports, recipients } })}
              />
              <Field label="Sections included" hint="Every section the report will contain.">
                <ul className="flex flex-wrap gap-1.5">
                  {draft.reports.sections.map((sectionName) => (
                    <li key={sectionName}>
                      <Chip tone="info">{sectionName}</Chip>
                    </li>
                  ))}
                </ul>
              </Field>
            </div>
          </div>
        </Card>
      ) : null}

      {section === "danger" ? (
        <div className="grid gap-1 lg:grid-cols-2">
          <Card title="Archive monitoring" icon={Archive}>
            <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">
              Stops scheduled crawls and availability checks for this website. Everything already collected stays, and
              you can turn monitoring back on at any time.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Chip tone={draft.monitoringArchived ? "warn" : "good"} dot>
                {draft.monitoringArchived ? "Archived" : "Active"}
              </Chip>
              <WButton
                tone={draft.monitoringArchived ? "primary" : "danger"}
                icon={Archive}
                disabled={archive.isPending}
                disabledReason="Saving…"
                onClick={() =>
                  archive.mutate(!draft.monitoringArchived, {
                    onSuccess: (updated) => {
                      // The archive toggle saves immediately, so any local edits stay untouched.
                      toast.success(updated.monitoringArchived ? "Monitoring archived" : "Monitoring resumed");
                    },
                    onError: () => toast.error("Could not change monitoring."),
                  })
                }
              >
                {draft.monitoringArchived ? "Resume monitoring" : "Archive monitoring"}
              </WButton>
            </div>
          </Card>

          <Card title="Disconnect integrations" icon={Unlink}>
            <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">
              Removes our access to the connected properties. Everything those integrations unlock goes back to the
              locked state; the crawl-based screens are unaffected.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {INTEGRATION_ORDER.map((key) => {
                const integration = capabilities.data?.integrations[key];
                const connected = integration ? integrationTone(integration.status) === "good" : false;
                return (
                  <WButton
                    key={key}
                    tone={connected ? "danger" : "secondary"}
                    disabled={!connected}
                    disabledReason="This integration is not connected"
                    onClick={() => openIntegration(key)}
                  >
                    {integration?.name ?? key}
                  </WButton>
                );
              })}
            </div>
          </Card>

          <Card title="Website URL" icon={Globe} className="lg:col-span-2">
            <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">
              The website URL cannot be removed from here. It lives on the Client Profile, and removing it there is what
              switches this module off for the client.
            </p>
            <WButton className="mt-3" icon={Globe} onClick={() => navigate("/admin/projects")}>
              Open Client Profile
            </WButton>
          </Card>
        </div>
      ) : null}

      {/* Sticky save bar — only while there is something to save. */}
      {isDirty ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-[#E6EBF4] bg-white/95 px-4 py-2.5 shadow-[0_-2px_8px_rgba(16,24,40,0.06)] backdrop-blur transition-[left] sm:px-6",
            isSidebarCollapsed ? "lg:left-[64px]" : "lg:left-[220px]",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#9A5B08]">
              <AlertTriangle className="size-3.5" aria-hidden />
              You have unsaved changes
            </p>
            <div className="flex items-center gap-1.5">
              <WButton icon={Undo2} onClick={() => setEdits(null)}>
                Cancel
              </WButton>
              <WButton
                tone="primary"
                icon={Save}
                disabled={save.isPending}
                disabledReason="Saving…"
                onClick={() => {
                  void handleSave()
                    .then(() => toast.success("Settings saved"))
                    .catch(() => toast.error("Could not save these settings."));
                }}
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </WButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-semibold text-[#28354C]">{label}</p>
      {children}
      {hint ? <p className="mt-1 text-[10.5px] leading-relaxed text-[#94A3B8]">{hint}</p> : null}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E6EBF4] p-2.5">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold text-[#28354C]">{label}</p>
        {hint ? <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#94A3B8]">{hint}</p> : null}
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isNaN(next)) return;
        onChange(Math.max(min, Math.min(max, next)));
      }}
      className={cn(
        "h-8.5 w-full rounded-md border border-[#DAE1EC] px-2.5 text-[12px] text-[#28354C]",
        "focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20",
      )}
    />
  );
}

function PathList({
  label,
  hint,
  paths,
  onChange,
  placeholder = "/path",
}: {
  label: string;
  hint?: string;
  paths: string[];
  onChange: (paths: string[]) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const trimmed = value.trim();
    if (!trimmed || paths.includes(trimmed)) return;
    onChange([...paths, trimmed]);
    setValue("");
  };

  return (
    <Field label={label} hint={hint}>
      <ul className="mb-1.5 flex flex-wrap gap-1.5">
        {paths.length === 0 ? (
          <li className="text-[11px] text-[#94A3B8]">Nothing added yet.</li>
        ) : (
          paths.map((path) => (
            <li key={path}>
              <span className="inline-flex items-center gap-1 rounded-md border border-[#DAE1EC] bg-white px-2 py-0.5 font-mono text-[10.5px] text-[#28354C]">
                {path}
                <button
                  type="button"
                  aria-label={`Remove ${path}`}
                  onClick={() => onChange(paths.filter((entry) => entry !== path))}
                  className="cursor-pointer rounded text-[#94A3B8] hover:text-[#C0261F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="flex gap-1.5">
        <input
          value={value}
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className={cn(
            "h-8.5 flex-1 rounded-md border border-[#DAE1EC] px-2.5 text-[12px] text-[#28354C]",
            "focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20",
          )}
        />
        <WButton icon={Plus} disabled={!value.trim()} disabledReason="Type a value first" onClick={add}>
          Add
        </WButton>
      </div>
    </Field>
  );
}
