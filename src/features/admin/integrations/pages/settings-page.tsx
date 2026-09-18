"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Database, Download, GitBranch, Lock, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { FREQUENCY_LABEL, INTEGRATIONS_MOCK_MODE, NOTIFICATION_LABEL, ROLE_LABEL } from "../integrations-data/config";
import { useUnsavedChanges } from "../integrations-data/hooks";
import { downloadFile, toCsv } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationSettings, NotificationKey, OrgRole, SyncFrequency } from "../integrations-data/types";
import { PageSkeleton } from "../components/blocks";
import { Badge, Button, Card, CardHeader, ConfirmDialog, SelectMenu, SettingRow, x } from "../components/ui";

const SECTIONS = [
  { id: "sync", label: "Sync defaults", icon: RefreshCw },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "mapping", label: "Client mapping", icon: GitBranch },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "data", label: "Data handling", icon: Database },
];

export function SettingsPage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="settings" />;
  return <Settings />;
}

function Settings() {
  const { data, can, updateSettings } = useIntegrations();
  const saved = data.settings;
  const [draft, setDraft] = useState<IntegrationSettings>(saved);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("sync");
  const canEdit = can.canManageSettings.allowed;

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const summarize = () => {
    const parts: string[] = [];
    if (JSON.stringify(draft.sync) !== JSON.stringify(saved.sync)) parts.push("sync defaults");
    if (JSON.stringify(draft.notifications) !== JSON.stringify(saved.notifications)) parts.push("notifications");
    if (JSON.stringify(draft.clientMapping) !== JSON.stringify(saved.clientMapping)) parts.push("client mapping rules");
    if (JSON.stringify(draft.security) !== JSON.stringify(saved.security)) parts.push("security");
    if (JSON.stringify(draft.dataHandling) !== JSON.stringify(saved.dataHandling)) parts.push("data handling");
    return `Updated ${parts.join(", ") || "integration settings"}`;
  };

  const save = async () => {
    setSaving(true);
    const ok = await updateSettings(draft, summarize());
    setSaving(false);
    return ok;
  };

  useUnsavedChanges(dirty && canEdit, save, "integration settings");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const update = <K extends keyof IntegrationSettings>(key: K, value: Partial<IntegrationSettings[K]>) =>
    setDraft((current) => ({ ...current, [key]: { ...current[key], ...value } }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className={cn(x.card, "h-max min-w-0 p-1.5 lg:sticky lg:top-3")}>
        <ul className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-2 text-[12.5px] font-medium transition",
                  active === section.id ? "bg-[#EFF4FF] text-[#1D4ED8]" : "text-[#3C4A66] hover:bg-[#F1F4F8]",
                  x.focus,
                )}
              >
                <section.icon className="size-3.5" />
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-1">
        {!canEdit && (
          <Card className="flex items-center gap-3 border-[#FBE3B6] bg-[#FFFAF0] px-3.5 py-2.5">
            <Lock className="size-4 shrink-0 text-[#B54708]" />
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">
              <b className="font-semibold text-[#0F1B3D]">View only.</b> {can.canManageSettings.reason}
            </p>
          </Card>
        )}

        <Card className="flex items-start gap-2.5 border-[#D5E1FD] bg-[#F5F8FF] px-3.5 py-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1D4ED8]" />
          <p className="text-[12px] leading-4 text-[#3C4A66]">
            These settings apply to your organization only. Provider credentials, callback URLs and platform limits are managed by OmniPlatform and never shown here.
          </p>
        </Card>

        {/* Sync defaults */}
        <Section id="sync" title="Sync defaults" description="How new integrations sync unless you change them individually" icon={RefreshCw}>
          <SettingRow
            title="Default sync frequency"
            description="Applied to newly connected integrations. Existing ones keep their own schedule."
            control={
              <SelectMenu<SyncFrequency>
                label="Default sync frequency"
                size="md"
                align="end"
                disabled={!canEdit}
                value={draft.sync.defaultFrequency}
                onChange={(value) => update("sync", { defaultFrequency: value })}
                options={(Object.keys(FREQUENCY_LABEL) as SyncFrequency[]).map((value) => ({ value, label: FREQUENCY_LABEL[value] }))}
              />
            }
          />
          <SettingRow
            title="Retry failed syncs automatically"
            description={draft.sync.retryFailed ? `Up to ${draft.sync.retryAttempts} retries, spaced out over an hour.` : "Failed syncs wait for someone to retry them."}
            control={<Switch checked={draft.sync.retryFailed} disabled={!canEdit} onCheckedChange={(retryFailed) => update("sync", { retryFailed })} aria-label="Retry failed syncs" />}
          />
          {draft.sync.retryFailed && (
            <SettingRow
              title="Retry attempts"
              control={
                <SelectMenu
                  label="Retry attempts"
                  align="end"
                  disabled={!canEdit}
                  value={String(draft.sync.retryAttempts)}
                  onChange={(value) => update("sync", { retryAttempts: Number(value) })}
                  options={[1, 2, 3, 5].map((value) => ({ value: String(value), label: `${value} ${value === 1 ? "retry" : "retries"}` }))}
                />
              }
            />
          )}
          <SettingRow
            title="Manual sync behaviour"
            description="What “Sync now” pulls when someone presses it."
            control={
              <SelectMenu
                label="Manual sync behaviour"
                size="md"
                align="end"
                disabled={!canEdit}
                value={draft.sync.manualSyncBehavior}
                onChange={(value) => update("sync", { manualSyncBehavior: value as IntegrationSettings["sync"]["manualSyncBehavior"] })}
                options={[
                  { value: "incremental", label: "Only what changed", description: "Fast. Recommended." },
                  { value: "full", label: "Everything again", description: "Slower. Use after fixing data problems." },
                ]}
              />
            }
          />
          <SettingRow
            title="Background refresh"
            description="Keep access tokens fresh in the background so connections expire less often."
            control={<Switch checked={draft.sync.backgroundRefresh} disabled={!canEdit} onCheckedChange={(backgroundRefresh) => update("sync", { backgroundRefresh })} aria-label="Background refresh" />}
          />
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Notifications" description="Who hears about integration problems, and where" icon={BellRing}>
          <div className="scrollbar-thin overflow-x-auto py-1">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Event</th>
                  {["In-app", "Email", "Slack"].map((channel) => (
                    <th key={channel} scope="col" className="w-20 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">{channel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(NOTIFICATION_LABEL) as NotificationKey[]).map((key) => (
                  <tr key={key} className="border-t border-[#EEF1F5]">
                    <td className="py-2.5 pr-3">
                      <p className="text-[12.5px] font-medium text-[#24324F]">{NOTIFICATION_LABEL[key].label}</p>
                      <p className="text-[11.5px] leading-4 text-[#6B7890]">{NOTIFICATION_LABEL[key].description}</p>
                    </td>
                    {(["inApp", "email", "slack"] as const).map((channel) => (
                      <td key={channel} className="py-2.5 text-center">
                        <Switch
                          checked={draft.notifications[key][channel]}
                          disabled={!canEdit}
                          onCheckedChange={(value) => setDraft((current) => ({ ...current, notifications: { ...current.notifications, [key]: { ...current.notifications[key], [channel]: value } } }))}
                          aria-label={`${NOTIFICATION_LABEL[key].label} via ${channel === "inApp" ? "in-app" : channel}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pb-2.5 text-[11.5px] text-[#6B7890]">Slack uses your workspace&apos;s existing Slack connection.</p>
        </Section>

        {/* Client mapping */}
        <Section id="mapping" title="Client mapping" description="How external accounts are assigned to your clients" icon={GitBranch}>
          <SettingRow
            title="One external account per client"
            description="Each client can have only one connection per provider — for example one Meta connection for Moksha Sewa."
            control={<Switch checked={draft.clientMapping.oneAccountPerClient} disabled={!canEdit} onCheckedChange={(oneAccountPerClient) => update("clientMapping", { oneAccountPerClient })} aria-label="One account per client" />}
          />
          <SettingRow
            title="Allow multiple resources per provider"
            description="Let one connection include several pages, locations or properties."
            control={<Switch checked={draft.clientMapping.allowMultipleResources} disabled={!canEdit} onCheckedChange={(allowMultipleResources) => update("clientMapping", { allowMultipleResources })} aria-label="Allow multiple resources" />}
          />
          <SettingRow
            title="Primary account"
            description="Which account is used by default when a connection has several."
            control={
              <SelectMenu
                label="Primary account behaviour"
                size="md"
                align="end"
                disabled={!canEdit}
                value={draft.clientMapping.primaryBehavior}
                onChange={(value) => update("clientMapping", { primaryBehavior: value as IntegrationSettings["clientMapping"]["primaryBehavior"] })}
                options={[
                  { value: "first_selected", label: "First one selected" },
                  { value: "ask_every_time", label: "Ask every time" },
                ]}
              />
            }
          />
        </Section>

        {/* Security */}
        <Section id="security" title="Security" description="Who can change connections, and how carefully" icon={ShieldCheck}>
          <SettingRow
            title="Only Organization Admins can connect, disconnect, reconnect and change mapping"
            description={draft.security.orgAdminOnly ? "Managers can still sync. Members can view only." : "Managers can also make connection changes."}
            control={<Switch checked={draft.security.orgAdminOnly} disabled={!canEdit} onCheckedChange={(orgAdminOnly) => update("security", { orgAdminOnly })} aria-label="Only Organization Admins manage connections" />}
          />
          <SettingRow
            title="Confirm before disconnecting critical integrations"
            description="Asks the admin to type “disconnect” when live automations, posts or campaigns depend on it."
            control={<Switch checked={draft.security.confirmCriticalDisconnect} disabled={!canEdit} onCheckedChange={(confirmCriticalDisconnect) => update("security", { confirmCriticalDisconnect })} aria-label="Confirm critical disconnects" />}
          />
          <SettingRow
            title="Require pausing dependent work first"
            description="Blocks disconnecting an integration until its live automations and scheduled items are paused or moved."
            control={<Switch checked={draft.security.requirePauseBeforeDisconnect} disabled={!canEdit} onCheckedChange={(requirePauseBeforeDisconnect) => update("security", { requirePauseBeforeDisconnect })} aria-label="Require pausing dependent work first" />}
          />
        </Section>

        {/* Data */}
        <DataSection draft={draft} canEdit={canEdit} onRetention={(retentionDays) => update("dataHandling", { retentionDays })} />

        {INTEGRATIONS_MOCK_MODE && <PreviewSection />}
        {/* Save bar — sticky inside the content column, so it respects the sidebar at any width. */}
        {dirty && (
          <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-end gap-2 rounded-[10px] border border-[#D5E1FD] bg-white/95 px-3.5 py-2.5 shadow-[0_12px_32px_-12px_rgba(15,27,61,0.3)] backdrop-blur" role="region" aria-label="Unsaved changes">
            <p className="mr-auto text-[12.5px] text-[#3C4A66]">
              <b className="font-semibold text-[#0F1B3D]">Unsaved changes</b> to integration settings
            </p>
            <Button variant="ghost" onClick={() => setDraft(saved)} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" icon={Save} loading={saving} gate={can.canManageSettings} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}

function Section({ id, title, description, icon, children }: { id: string; title: string; description: string; icon: typeof RefreshCw; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardHeader title={title} description={description} icon={icon} />
      <div className="border-t border-[#EEF1F5] px-4">{children}</div>
    </Card>
  );
}

function DataSection({ draft, canEdit, onRetention }: { draft: IntegrationSettings; canEdit: boolean; onRetention: (days: number) => void }) {
  const { data, retryLoad } = useIntegrations();
  const [clearOpen, setClearOpen] = useState(false);

  const exportActivity = () =>
    downloadFile(
      `integration-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        data.activity.map((item) => ({
          time: item.at,
          integration: data.providers.find((provider) => provider.id === item.providerId)?.name ?? "Workspace",
          summary: item.summary,
          client: data.clients.find((client) => client.id === item.clientId)?.name ?? "Organization-wide",
          result: item.result,
          user: item.actor,
        })),
      ),
      "text/csv;charset=utf-8",
    );

  return (
    <Section id="data" title="Data handling" description="How long synced data is kept, and taking it with you" icon={Database}>
      <SettingRow
        title="Sync history retention"
        description="Sync runs and activity older than this are removed. Your provider data itself is unaffected."
        control={
          <SelectMenu
            label="Retention"
            size="md"
            align="end"
            disabled={!canEdit}
            value={String(draft.dataHandling.retentionDays)}
            onChange={(value) => onRetention(Number(value))}
            options={[30, 90, 180, 365].map((days) => ({ value: String(days), label: `${days} days` }))}
          />
        }
      />
      <SettingRow
        title="Export connection activity"
        description={`${data.activity.length} events as CSV.`}
        control={
          <Button size="sm" variant="secondary" icon={Download} onClick={exportActivity}>
            Export
          </Button>
        }
      />
      <SettingRow
        title="Clear local cache"
        description="Reloads connection data from the integration service. Nothing is disconnected."
        control={
          <Button size="sm" variant="secondary" icon={Trash2} onClick={() => setClearOpen(true)}>
            Clear cache
          </Button>
        }
      />
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        destructive={false}
        title="Clear the local integration cache?"
        description={INTEGRATIONS_MOCK_MODE ? "The sample data reloads from scratch, and changes made in this session are discarded." : "Connection data reloads from the integration service."}
        confirmLabel="Clear cache"
        onConfirm={() => {
          retryLoad();
        }}
      />
    </Section>
  );
}

function PreviewSection() {
  const { role, simulation, simulate } = useIntegrations();
  const roles = useMemo(() => Object.keys(ROLE_LABEL) as OrgRole[], []);
  return (
    <Card className="border-[#E2D8FD] bg-[#FDFCFF]">
      <CardHeader
        title="Preview states"
        description="Try each role and failure path before the backend exists"
        icon={Sparkles}
        badge={<Badge tone="violet">Sample data only</Badge>}
      />
      <div className="border-t border-[#EEF1F5] px-4">
        <SettingRow
          title="View as role"
          description="Controls which actions are enabled, and the explanations shown when they aren't."
          control={<SelectMenu label="View as role" size="md" align="end" value={role} onChange={(value) => simulate.setRole(value as OrgRole)} options={roles.map((item) => ({ value: item, label: ROLE_LABEL[item] }))} />}
        />
        <SettingRow title="Fail the next sync" description="The next sync returns an error so you can check the retry path." control={<Switch checked={simulation.failNextSync} onCheckedChange={simulate.setFailNextSync} aria-label="Fail the next sync" />} />
        <SettingRow title="Show loading skeletons" description="Holds every tab in its loading state." control={<Switch checked={simulation.loading} onCheckedChange={simulate.setLoading} aria-label="Show loading skeletons" />} />
        <SettingRow title="Simulate unavailable data" description="Shows the “connection data unavailable” state and its retry." control={<Switch checked={simulation.loadError} onCheckedChange={simulate.setLoadError} aria-label="Simulate unavailable data" />} />
      </div>
    </Card>
  );
}
