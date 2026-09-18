"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Database,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Link2,
  ListChecks,
  Plug,
  RefreshCw,
  ScrollText,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "../hooks/use-now";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import {
  ALL_PERMISSIONS,
  ALL_SCOPES,
  PERMISSION_HELP,
  PERMISSION_LABEL,
  ROLE_LABEL,
  SCOPE_INFO,
  SYNC_FREQUENCY_LABEL,
  TIMEZONES,
  X_MOCK_MODE,
  xRoutes,
} from "../lib/constants";
import { compact, percent, relative } from "../lib/format";
import { downloadFile, engagementRate, toCsv } from "../x-data/selectors";
import { useX } from "../store/x-store";
import type {
  ConnectionState,
  NotificationKey,
  SyncFrequency,
  WorkspaceRole,
  XPermission,
  XScope,
  XSettings,
} from "../x-data/types";
import { PageSkeleton } from "../components/states";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DefinitionRow,
  FormField,
  InternalBadge,
  Meter,
  SelectMenu,
  SettingRow,
  SourceBadge,
  TagInput,
  VerifiedMark,
  XLogo,
  x,
} from "../components/ui";

const SECTIONS = [
  { id: "connection", label: "Account connection", icon: Plug },
  { id: "sync", label: "Sync", icon: RefreshCw },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "permissions", label: "Team access", icon: Users },
  { id: "rules", label: "Content rules", icon: ScrollText },
  { id: "approvals", label: "Approvals", icon: ListChecks },
  { id: "data", label: "Data & export", icon: Database },
  { id: "danger", label: "Danger zone", icon: AlertTriangle },
];

export function SettingsPage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton variant="settings" />;
  return <Settings canManage={can.canManageSettings.allowed} />;
}

function Settings({ canManage }: { canManage: boolean }) {
  const [active, setActive] = useState("connection");

  // Highlight the section the user is actually looking at.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-1 lg:grid-cols-[212px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className={cn(x.card, "h-max p-1.5 lg:sticky lg:top-3")}>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0 lg:shrink">
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-2 text-[12.5px] font-medium transition",
                  active === section.id ? "bg-[#EFF4FF] text-[#1D4ED8]" : "text-[#3C4A66] hover:bg-[#F1F4F8] hover:text-[#0F1B3D]",
                  section.id === "danger" && active !== section.id && "text-[#C81E2B]",
                  x.focus,
                )}
              >
                <section.icon className="size-3.5 shrink-0" />
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-1">
        {!canManage && (
          <Card className="flex flex-wrap items-center gap-3 border-[#FBE3B6] bg-[#FFFAF0] px-3.5 py-2.5">
            <ShieldAlert className="size-4 shrink-0 text-[#B54708]" />
            <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
              <b className="font-semibold text-[#0F1B3D]">You can view these settings but not change them.</b> Ask a workspace owner for the
              &ldquo;Manage settings&rdquo; permission.
            </p>
            <Button size="sm" variant="secondary" onClick={() => toast.success("Access request sent", { description: "Workspace owners have been notified." })}>
              Request access
            </Button>
          </Card>
        )}

        <ConnectionSection />
        <SyncSection canManage={canManage} />
        <PublishingSection canManage={canManage} />
        <NotificationsSection canManage={canManage} />
        <PermissionsSection canManage={canManage} />
        <ContentRulesSection canManage={canManage} />
        <ApprovalsSection canManage={canManage} />
        <DataSection />
        {X_MOCK_MODE && <PreviewStatesSection />}
        <DangerZone />
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  icon,
  badge,
  actions,
  children,
  className,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Plug;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card id={id} className={cn("scroll-mt-4", className)}>
      <CardHeader title={title} description={description} icon={icon} badge={badge} actions={actions} />
      <div className="border-t border-[#EEF1F5] px-4 py-1">{children}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

function ConnectionSection() {
  const { account, connection, scopes, can, syncNow, reconnect, disconnect } = useX();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState<"sync" | "reconnect" | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const missing = ALL_SCOPES.filter((scope) => !scopes.includes(scope));

  return (
    <>
      <Section
        id="connection"
        title="Account connection"
        description="The X account this workspace publishes from"
        icon={Plug}
        badge={<SourceBadge hint="Profile and permissions come from X." />}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              loading={busy === "sync" || connection.state === "syncing"}
              disabled={connection.state === "disconnected"}
              disabledReason="Connect an account first."
              onClick={async () => {
                setBusy("sync");
                await syncNow();
                setBusy(null);
              }}
            >
              Sync now
            </Button>
            <Button
              size="sm"
              variant="primary"
              gate={can.canManageConnection}
              loading={busy === "reconnect"}
              onClick={async () => {
                setBusy("reconnect");
                await reconnect();
                setBusy(null);
              }}
            >
              {connection.state === "disconnected" ? "Connect account" : "Reconnect"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 py-3 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0F1419] text-white">
                <XLogo className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#0F1B3D]">
                  {account.name}
                  <VerifiedMark kind={account.verified} className="[&_svg]:size-3.5" />
                </p>
                <p className="text-[12px] text-[#6B7890]">{account.handle}</p>
              </div>
              <Button size="xs" variant="secondary" icon={ExternalLink} href={xRoutes.profileOnX(account.handle)} external className="ml-auto">
                Open
              </Button>
            </div>

            <dl className="mt-3 rounded-sm border border-[#E4E9F0] px-3 py-1">
              <DefinitionRow label="Connection status">
                <ConnectionChip state={connection.state} />
              </DefinitionRow>
              <DefinitionRow label="Last sync">{hydrated ? relative(connection.lastSyncedAt) : "…"}</DefinitionRow>
              <DefinitionRow label="Next sync">{hydrated ? relative(connection.nextSyncAt) : "…"}</DefinitionRow>
              <DefinitionRow label="Authorised by">{account.authorisedBy}</DefinitionRow>
              <DefinitionRow label="Account ID" mono>
                {account.id}
              </DefinitionRow>
              <DefinitionRow label="Account type">{account.protected ? "Protected" : "Public"}</DefinitionRow>
            </dl>
            {connection.lastError && (
              <p className="mt-2 flex items-start gap-2 rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] px-2.5 py-2 text-[11.5px] leading-4 text-[#3C4A66]">
                <AlertTriangle className="mt-px size-3.5 shrink-0 text-[#B54708]" />
                {connection.lastError}
              </p>
            )}
          </div>

          <div id="permissions" className="scroll-mt-4">
            <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-[#24324F]">
              Permissions granted on X
              {missing.length > 0 && <Badge tone="amber">{missing.length} missing</Badge>}
            </p>
            <ul className="space-y-1.5">
              {ALL_SCOPES.map((scope) => {
                const granted = scopes.includes(scope);
                return (
                  <li key={scope} className={cn("flex items-start gap-2.5 rounded-sm border px-2.5 py-2", granted ? "border-[#E4E9F0] bg-white" : "border-[#FBE3B6] bg-[#FFFAF0]")}>
                    {granted ? (
                      <CheckCircle2 className="mt-px size-4 shrink-0 text-[#12B76A]" />
                    ) : (
                      <AlertTriangle className="mt-px size-4 shrink-0 text-[#B54708]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-[#0F1B3D]">{SCOPE_INFO[scope].label}</span>
                      <span className="block text-[11.5px] leading-4 text-[#6B7890]">{SCOPE_INFO[scope].description}</span>
                      <code className="mt-0.5 block font-mono text-[10.5px] text-[#98A2B3]">{scope}</code>
                    </span>
                  </li>
                );
              })}
            </ul>
            {missing.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-4 text-[#6B7890]">
                Reconnecting asks X for the full permission set again. Nothing is published or changed during reconnection.
              </p>
            )}
          </div>
        </div>

        <SettingRow
          title="Disconnect this account"
          description="Stops all syncing and publishing. Synced data is kept for 30 days so you can reconnect without losing history."
          control={
            <Button size="sm" variant="danger" gate={can.canManageConnection} onClick={() => setDisconnectOpen(true)}>
              Disconnect
            </Button>
          }
        />
      </Section>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title={`Disconnect ${account.handle}?`}
        description="Publishing, scheduling, replies and syncing all stop immediately. Nothing is deleted from X."
        affected={[
          "Scheduled posts will not publish until you reconnect",
          "Mentions stop syncing into the engagement inbox",
          "Analytics freeze at the last successful sync",
        ]}
        confirmText="disconnect"
        confirmLabel="Disconnect account"
        onConfirm={() => disconnect()}
      />
    </>
  );
}

function ConnectionChip({ state }: { state: ConnectionState }) {
  const meta: Record<ConnectionState, { tone: "green" | "amber" | "red" | "blue" | "neutral"; label: string }> = {
    connected: { tone: "green", label: "Connected" },
    syncing: { tone: "blue", label: "Syncing" },
    sync_failed: { tone: "amber", label: "Sync failed" },
    token_expired: { tone: "red", label: "Connection expired" },
    missing_permission: { tone: "amber", label: "Missing permission" },
    needs_reconnect: { tone: "red", label: "Needs reconnect" },
    rate_limited: { tone: "amber", label: "Rate limited" },
    disconnected: { tone: "neutral", label: "Disconnected" },
  };
  return <Badge tone={meta[state].tone} dot>{meta[state].label}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

function SyncSection({ canManage }: { canManage: boolean }) {
  const { settings, connection, updateSettings } = useX();
  const sync = settings.sync;
  const usage = connection.requestsLimit ? (connection.requestsUsed / connection.requestsLimit) * 100 : 0;

  const save = (patch: Partial<XSettings["sync"]>, summary: string) => void updateSettings({ sync: { ...sync, ...patch } }, summary);

  const toggles: { key: keyof XSettings["sync"]; label: string; description: string }[] = [
    { key: "includeContent", label: "Posts and metrics", description: "Published posts, their engagement and video views." },
    { key: "includeMentions", label: "Mentions and replies", description: "New mentions, replies and quote posts for the inbox." },
    { key: "includeAudience", label: "Audience", description: "Followers, following and profile visit data." },
    { key: "includeAnalytics", label: "Analytics", description: "Daily impression and engagement totals for reporting." },
  ];

  return (
    <Section id="sync" title="Sync" description="How often OmniPlatform pulls fresh data from X" icon={RefreshCw}>
      <SettingRow
        title="Automatic sync"
        description="When off, data only updates when someone presses Sync."
        control={<Switch checked={sync.auto} disabled={!canManage} onCheckedChange={(checked) => save({ auto: checked }, checked ? "Automatic sync turned on" : "Automatic sync turned off")} aria-label="Automatic sync" />}
      />
      <SettingRow
        title="Sync frequency"
        description="More frequent syncing uses more of your X API request budget."
        control={
          <SelectMenu
            label="Sync frequency"
            size="md"
            value={sync.frequency}
            disabled={!canManage || !sync.auto}
            onChange={(value) => save({ frequency: value as SyncFrequency }, `Sync frequency set to ${SYNC_FREQUENCY_LABEL[value as SyncFrequency].toLowerCase()}`)}
            options={(Object.keys(SYNC_FREQUENCY_LABEL) as SyncFrequency[]).map((key) => ({ value: key, label: SYNC_FREQUENCY_LABEL[key] }))}
          />
        }
      />
      {toggles.map((toggle) => (
        <SettingRow
          key={toggle.key}
          title={toggle.label}
          description={toggle.description}
          control={
            <Switch
              checked={sync[toggle.key] as boolean}
              disabled={!canManage}
              onCheckedChange={(checked) => save({ [toggle.key]: checked } as Partial<XSettings["sync"]>, `${toggle.label} ${checked ? "included in" : "excluded from"} sync`)}
              aria-label={toggle.label}
            />
          }
        />
      ))}

      <div className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-[#24324F]">X API usage</p>
          <p className="text-[12px] tabular-nums text-[#6B7890]">
            {compact(connection.requestsUsed)} of {compact(connection.requestsLimit)} requests ({percent(usage, 0)})
          </p>
        </div>
        <Meter value={usage} tone={usage >= 80 ? "amber" : "blue"} className="mt-2 h-2" />
        <p className="mt-1.5 text-[11.5px] leading-4 text-[#6B7890]">
          X counts every read and write against this budget. Above the limit, publishing and replies pause until the window resets
          {connection.rateLimitResetAt ? ` (${relative(connection.rateLimitResetAt)})` : ""}.
        </p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

function PublishingSection({ canManage }: { canManage: boolean }) {
  const { settings, campaigns, updateSettings } = useX();
  const publishing = settings.publishing;
  const [draft, setDraft] = useState(publishing);
  const dirty = JSON.stringify(draft) !== JSON.stringify(publishing);

  const save = async () => updateSettings({ publishing: draft }, "Publishing defaults saved");
  useUnsavedChanges(dirty && canManage, save, "publishing defaults");

  return (
    <Section
      id="publishing"
      title="Publishing defaults"
      description="Applied to every new post created in this workspace"
      icon={Send}
      badge={<InternalBadge hint="These defaults are OmniPlatform's. X has no equivalent settings." />}
      actions={
        dirty ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setDraft(publishing)}>
              Reset
            </Button>
            <Button size="sm" variant="primary" disabled={!canManage} disabledReason="You don't have permission to change settings." onClick={save}>
              Save changes
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-3 py-3 sm:grid-cols-2">
        <FormField label="Timezone" hint="All scheduled times are shown and stored in this timezone.">
          <SelectMenu
            label="Timezone"
            fullWidth
            size="md"
            value={draft.timezone}
            disabled={!canManage}
            onChange={(timezone) => setDraft((current) => ({ ...current, timezone }))}
            options={TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
          />
        </FormField>
        <FormField label="Default posting time" hint="Pre-filled when you open the scheduler.">
          <input
            type="time"
            value={draft.defaultTime}
            disabled={!canManage}
            onChange={(event) => setDraft((current) => ({ ...current, defaultTime: event.target.value }))}
            className={x.input}
          />
        </FormField>
        <FormField label="Default campaign">
          <SelectMenu
            label="Default campaign"
            fullWidth
            size="md"
            value={draft.defaultCampaignId ?? ""}
            disabled={!canManage}
            onChange={(value) => setDraft((current) => ({ ...current, defaultCampaignId: value || null }))}
            placeholder="No campaign"
            options={[{ value: "", label: "No campaign" }, ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))]}
          />
        </FormField>
        <FormField label="Minimum gap between posts" hint="The scheduler warns when two posts land closer than this.">
          <SelectMenu
            label="Minimum gap"
            fullWidth
            size="md"
            value={String(draft.minimumGapMinutes)}
            disabled={!canManage}
            onChange={(value) => setDraft((current) => ({ ...current, minimumGapMinutes: Number(value) }))}
            options={[15, 30, 60, 120, 240].map((value) => ({ value: String(value), label: value >= 60 ? `${value / 60} hour${value === 60 ? "" : "s"}` : `${value} minutes` }))}
          />
        </FormField>
        <FormField label="Default internal tags" className="sm:col-span-2" hint="Added to new posts automatically. Internal only — never sent to X.">
          <TagInput value={draft.defaultTags} onChange={(defaultTags) => setDraft((current) => ({ ...current, defaultTags }))} />
        </FormField>
      </div>

      <SettingRow
        title="Append UTM tracking to links"
        description={
          draft.urlTracking.enabled
            ? `Links get ?utm_source=${draft.urlTracking.source}&utm_medium=${draft.urlTracking.medium} so clicks show up in Analytics.`
            : "Without tracking, clicks from X can't be attributed in your website analytics."
        }
        badge={<Link2 className="size-3.5 text-[#98A2B3]" />}
        control={
          <Switch
            checked={draft.urlTracking.enabled}
            disabled={!canManage}
            onCheckedChange={(enabled) => setDraft((current) => ({ ...current, urlTracking: { ...current.urlTracking, enabled } }))}
            aria-label="Append UTM tracking"
          />
        }
      />
      {draft.urlTracking.enabled && (
        <div className="grid gap-3 py-3 sm:grid-cols-2">
          <FormField label="utm_source">
            <input
              value={draft.urlTracking.source}
              disabled={!canManage}
              onChange={(event) => setDraft((current) => ({ ...current, urlTracking: { ...current.urlTracking, source: event.target.value } }))}
              className={x.input}
            />
          </FormField>
          <FormField label="utm_medium">
            <input
              value={draft.urlTracking.medium}
              disabled={!canManage}
              onChange={(event) => setDraft((current) => ({ ...current, urlTracking: { ...current.urlTracking, medium: event.target.value } }))}
              className={x.input}
            />
          </FormField>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const NOTIFICATION_ROWS: { key: NotificationKey; label: string; description: string }[] = [
  { key: "newMention", label: "New mention", description: "Any new mention, reply or quote post." },
  { key: "highPriorityMention", label: "High priority mention", description: "A mention marked high or urgent in the inbox." },
  { key: "failedPost", label: "Failed post", description: "A scheduled post that X rejected." },
  { key: "publishingFailure", label: "Publishing failure", description: "A publish attempt that didn't complete." },
  { key: "connectionIssue", label: "Connection issue", description: "Expired tokens, missing permissions or a failed sync." },
  { key: "dailySummary", label: "Daily summary", description: "One digest each morning with yesterday's numbers." },
];

function NotificationsSection({ canManage }: { canManage: boolean }) {
  const { settings, updateSettings } = useX();

  const toggle = (key: NotificationKey, channel: "inApp" | "email" | "slack", value: boolean) => {
    void updateSettings(
      { notifications: { ...settings.notifications, [key]: { ...settings.notifications[key], [channel]: value } } },
      "Notification preferences saved",
    );
  };

  return (
    <Section
      id="notifications"
      title="Notifications"
      description="Who hears about what, and where"
      icon={BellRing}
      badge={<InternalBadge hint="Delivered by OmniPlatform, not by X." />}
    >
      <div className="scrollbar-thin overflow-x-auto py-2">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className="w-full py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Event
              </th>
              {["In-app", "Email", "Slack"].map((channel) => (
                <th key={channel} scope="col" className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                  {channel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-[#EEF1F5]">
                <td className="py-2.5 pr-4">
                  <p className="text-[12.5px] font-medium text-[#24324F]">{row.label}</p>
                  <p className="text-[11.5px] leading-4 text-[#6B7890]">{row.description}</p>
                </td>
                {(["inApp", "email", "slack"] as const).map((channel) => (
                  <td key={channel} className="px-3 py-2.5 text-center">
                    <Switch
                      checked={settings.notifications[row.key][channel]}
                      disabled={!canManage}
                      onCheckedChange={(value) => toggle(row.key, channel, value)}
                      aria-label={`${row.label} via ${channel}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pb-3 text-[11.5px] leading-4 text-[#6B7890]">
        Slack delivery uses the workspace-level Slack connection.{" "}
        <a href="/admin/integrations" className="text-[#2563EB] hover:underline">
          Manage integrations
        </a>
        .
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Team access                                                         */
/* ------------------------------------------------------------------ */

function PermissionsSection({ canManage }: { canManage: boolean }) {
  const { settings, team, role, updateSettings, simulate } = useX();
  const roles = Object.keys(settings.rolePermissions) as WorkspaceRole[];

  const toggle = (targetRole: WorkspaceRole, permission: XPermission) => {
    const current = settings.rolePermissions[targetRole];
    const next = current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission];
    void updateSettings(
      { rolePermissions: { ...settings.rolePermissions, [targetRole]: next } },
      `${PERMISSION_LABEL[permission]} ${next.includes(permission) ? "granted to" : "removed from"} ${ROLE_LABEL[targetRole]}`,
    );
  };

  return (
    <Section
      id="permissions-table"
      title="Team access"
      description="What each role can do in the X workspace"
      icon={Users}
      badge={<InternalBadge hint="Roles and permissions are OmniPlatform's. They sit on top of whatever X itself allows." />}
      actions={
        X_MOCK_MODE ? (
          <SelectMenu
            label="Preview as role"
            prefix="Viewing as:"
            value={role}
            onChange={(value) => simulate.setRole(value as WorkspaceRole)}
            options={roles.map((item) => ({ value: item, label: ROLE_LABEL[item] }))}
          />
        ) : undefined
      }
    >
      <div className="scrollbar-thin overflow-x-auto py-2">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className="w-full py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Permission
              </th>
              {roles.map((item) => (
                <th key={item} scope="col" className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                  {ROLE_LABEL[item]}
                  <span className="block text-[10px] font-normal normal-case text-[#98A2B3]">
                    {team.filter((member) => member.role === item).length} member
                    {team.filter((member) => member.role === item).length === 1 ? "" : "s"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-t border-[#EEF1F5]">
                <td className="py-2.5 pr-4">
                  <p className="text-[12.5px] font-medium text-[#24324F]">{PERMISSION_LABEL[permission]}</p>
                  <p className="text-[11.5px] leading-4 text-[#6B7890]">{PERMISSION_HELP[permission]}</p>
                </td>
                {roles.map((item) => {
                  const granted = settings.rolePermissions[item].includes(permission);
                  const locked = item === "owner" && permission === "view_x";
                  return (
                    <td key={item} className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={granted}
                        aria-label={`${PERMISSION_LABEL[permission]} for ${ROLE_LABEL[item]}`}
                        disabled={!canManage || locked}
                        title={locked ? "Owners always keep view access." : undefined}
                        onClick={() => toggle(item, permission)}
                        className={cn(
                          "grid size-6 place-items-center rounded-sm border transition",
                          granted ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#DCE2EA] bg-white text-transparent hover:border-[#C9D1DC]",
                          (!canManage || locked) && "cursor-not-allowed opacity-60",
                          x.focus,
                        )}
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#EEF1F5] py-3">
        <p className="mb-2 text-[12.5px] font-semibold text-[#24324F]">Workspace members</p>
        <ul className="space-y-1">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-[#F8FAFC]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-[#0F1B3D]">{member.name}</span>
                <span className="block truncate text-[11.5px] text-[#6B7890]">{member.email}</span>
              </span>
              <Badge tone={member.role === "owner" ? "violet" : "neutral"}>{ROLE_LABEL[member.role]}</Badge>
              <Button size="xs" variant="secondary" href="/admin/team">
                Manage
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-[#6B7890]">
          Members and roles are managed for the whole workspace in{" "}
          <a href="/admin/team" className="text-[#2563EB] hover:underline">
            Team
          </a>
          . This table only controls what each role can do in X.
        </p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Content rules                                                       */
/* ------------------------------------------------------------------ */

function ContentRulesSection({ canManage }: { canManage: boolean }) {
  const { settings, updateSettings } = useX();
  const rules = settings.contentRules;
  const [draft, setDraft] = useState(rules);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);

  const save = async () => updateSettings({ contentRules: draft }, "Content rules saved");
  useUnsavedChanges(dirty && canManage, save, "content rules");

  return (
    <Section
      id="rules"
      title="Content rules"
      description="Guardrails the composer enforces before a post can go out"
      icon={ScrollText}
      badge={<InternalBadge hint="Enforced by OmniPlatform in the composer. X does not police any of this." />}
      actions={
        dirty ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setDraft(rules)}>
              Reset
            </Button>
            <Button size="sm" variant="primary" disabled={!canManage} disabledReason="You don't have permission to change settings." onClick={save}>
              Save changes
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3 py-3">
        <FormField label="Brand voice reminder" hint="Shown beside the preview every time someone writes a post.">
          <textarea
            value={draft.brandVoice}
            disabled={!canManage}
            rows={3}
            onChange={(event) => setDraft((current) => ({ ...current, brandVoice: event.target.value }))}
            className={x.textarea}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Blocked words" hint="The composer refuses to publish a post containing any of these.">
            <TagInput value={draft.blockedWords} onChange={(blockedWords) => setDraft((current) => ({ ...current, blockedWords }))} placeholder="Add a word and press Enter" />
          </FormField>
          <FormField label="Required hashtags" hint="Offered as a one-click insert in the composer.">
            <TagInput value={draft.requiredTags} onChange={(requiredTags) => setDraft((current) => ({ ...current, requiredTags }))} placeholder="Add a hashtag and press Enter" />
          </FormField>
        </div>
      </div>

      <SettingRow
        title="Require alt text on media"
        description="Posts with images or video can't be published until every attachment has a description."
        control={<Switch checked={draft.requireAltText} disabled={!canManage} onCheckedChange={(requireAltText) => setDraft((current) => ({ ...current, requireAltText }))} aria-label="Require alt text" />}
      />
      <SettingRow
        title="Maximum attachments"
        description="X allows up to four images, or one video, per post."
        control={
          <SelectMenu
            label="Maximum attachments"
            size="md"
            value={String(draft.maxMedia)}
            disabled={!canManage}
            onChange={(value) => setDraft((current) => ({ ...current, maxMedia: Number(value) }))}
            options={[1, 2, 3, 4].map((value) => ({ value: String(value), label: `${value}` }))}
          />
        }
      />
      <SettingRow
        title="Require tracked links"
        description="Warns when a post contains a link without UTM parameters."
        control={<Switch checked={draft.requireTrackedLinks} disabled={!canManage} onCheckedChange={(requireTrackedLinks) => setDraft((current) => ({ ...current, requireTrackedLinks }))} aria-label="Require tracked links" />}
      />
      <SettingRow
        title="Block link shorteners"
        description="Shortened links hide the destination and hurt trust and click-through."
        control={<Switch checked={draft.blockShorteners} disabled={!canManage} onCheckedChange={(blockShorteners) => setDraft((current) => ({ ...current, blockShorteners }))} aria-label="Block link shorteners" />}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

function ApprovalsSection({ canManage }: { canManage: boolean }) {
  const { settings, team, updateSettings, posts } = useX();
  const approvals = settings.approvals;
  const pending = posts.filter((post) => post.approval === "pending").length;

  const toggleMember = (list: "reviewerIds" | "publisherIds", id: string) => {
    const current = approvals[list];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    void updateSettings({ approvals: { ...approvals, [list]: next } }, "Approval roles saved");
  };

  return (
    <Section
      id="approvals"
      title="Approvals"
      description="Require a second pair of eyes before anything goes out"
      icon={ListChecks}
      badge={<InternalBadge hint="Approval is an OmniPlatform workflow. X publishes whatever it is sent." />}
    >
      <SettingRow
        title="Require approval before publishing"
        description={
          approvals.required
            ? `New posts are submitted for review instead of published directly. ${pending} post${pending === 1 ? "" : "s"} waiting now.`
            : "Anyone with publish permission can post straight to X."
        }
        control={
          <Switch
            checked={approvals.required}
            disabled={!canManage}
            onCheckedChange={(required) => void updateSettings({ approvals: { ...approvals, required } }, required ? "Approval requirement turned on" : "Approval requirement turned off")}
            aria-label="Require approval"
          />
        }
      />

      <div className="py-3">
        <p className="mb-2 text-[12.5px] font-semibold text-[#24324F]">How it flows</p>
        <ol className="flex flex-wrap items-center gap-1.5">
          {["Draft", "Pending approval", "Approved", "Scheduled or published"].map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-[#C9D1DC]">→</span>}
              <span
                className={cn(
                  "rounded-sm px-2 py-1 text-[11.5px] font-semibold",
                  index === 0 ? "bg-[#F1F4F8] text-[#475467]" : index === 1 ? "bg-[#FFF7E8] text-[#B54708]" : index === 2 ? "bg-[#ECFAF3] text-[#067647]" : "bg-[#EFF4FF] text-[#1D4ED8]",
                )}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11.5px] leading-4 text-[#6B7890]">
          A reviewer can also <b className="font-medium text-[#3C4A66]">request changes</b> (back to draft with a note) or{" "}
          <b className="font-medium text-[#3C4A66]">reject</b> (closed without publishing). Every decision is kept in the post&apos;s approval
          history.
        </p>
      </div>

      <div className="grid gap-4 border-t border-[#EEF1F5] py-3 sm:grid-cols-2">
        {(
          [
            { key: "reviewerIds" as const, title: "Reviewers", description: "Can approve, request changes or reject." },
            { key: "publisherIds" as const, title: "Publishers", description: "Can send approved posts to X." },
          ]
        ).map((group) => (
          <div key={group.key}>
            <p className="text-[12.5px] font-semibold text-[#24324F]">{group.title}</p>
            <p className="mb-2 text-[11.5px] text-[#6B7890]">{group.description}</p>
            <ul className="space-y-1">
              {team.map((member) => {
                const selected = approvals[group.key].includes(member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selected}
                      disabled={!canManage}
                      onClick={() => toggleMember(group.key, member.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-1.5 text-left transition",
                        selected ? "border-[#2563EB] bg-[#F5F8FF]" : "border-[#E4E9F0] bg-white hover:border-[#C9D1DC]",
                        !canManage && "cursor-not-allowed opacity-60",
                        x.focus,
                      )}
                    >
                      <span className={cn("grid size-4 shrink-0 place-items-center rounded-sm border", selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#C9D1DC] text-transparent")}>
                        <CheckCircle2 className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-[#0F1B3D]">{member.name}</span>
                        <span className="block truncate text-[11px] text-[#6B7890]">{ROLE_LABEL[member.role]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Data & export                                                       */
/* ------------------------------------------------------------------ */

function DataSection() {
  const { posts, mentions, account, memberName, campaignName, retryLoad } = useX();
  const stamp = new Date().toISOString().slice(0, 10);
  const [clearOpen, setClearOpen] = useState(false);

  const done = (filename: string) => toast.success("Export ready", { description: `${filename} has been downloaded.` });

  const exports = [
    {
      label: "Posts",
      description: `${posts.length} posts with their metrics, owner, campaign and tags.`,
      icon: FileSpreadsheet,
      run: () => {
        const name = `x-posts-${stamp}.csv`;
        downloadFile(
          name,
          toCsv(
            posts.map((post) => ({
              id: post.id,
              status: post.status,
              type: post.type,
              text: post.text.replace(/\s+/g, " ").trim(),
              published_at: post.publishedAt ?? "",
              scheduled_at: post.scheduledAt ?? "",
              owner: memberName(post.ownerId),
              campaign: campaignName(post.campaignId),
              approval: post.approval,
              impressions: post.metrics.impressions,
              engagements: post.metrics.engagements,
              engagement_rate: engagementRate(post).toFixed(3),
              likes: post.metrics.likes,
              replies: post.metrics.replies,
              reposts: post.metrics.reposts,
              link_clicks: post.metrics.linkClicks,
            })),
          ),
          "text/csv;charset=utf-8",
        );
        done(name);
      },
    },
    {
      label: "Mentions",
      description: `${mentions.length} mentions with status, priority, owner and response time.`,
      icon: FileSpreadsheet,
      run: () => {
        const name = `x-mentions-${stamp}.csv`;
        downloadFile(
          name,
          toCsv(
            mentions.map((mention) => ({
              id: mention.id,
              at: mention.at,
              author: mention.user.handle,
              author_followers: mention.user.followers,
              text: mention.text.replace(/\s+/g, " ").trim(),
              kind: mention.kind,
              sentiment: mention.sentiment,
              status: mention.status,
              priority: mention.priority,
              assignee: memberName(mention.assigneeId),
              response_minutes: mention.responseMinutes ?? "",
              replies_sent: mention.conversation.filter((message) => message.isUs).length,
            })),
          ),
          "text/csv;charset=utf-8",
        );
        done(name);
      },
    },
    {
      label: "Everything (JSON)",
      description: "A full snapshot of this workspace's X data, ready to hand to another system.",
      icon: FileJson,
      run: () => {
        const name = `x-workspace-${stamp}.json`;
        downloadFile(name, JSON.stringify({ account, posts, mentions, exportedAt: new Date().toISOString() }, null, 2), "application/json");
        done(name);
      },
    },
  ];

  return (
    <>
      <Section id="data" title="Data & export" description="Take your X data out of OmniPlatform at any time" icon={Database}>
        <ul className="py-1">
          {exports.map((item) => (
            <li key={item.label}>
              <SettingRow
                title={item.label}
                description={item.description}
                control={
                  <Button size="sm" variant="secondary" icon={item.icon} onClick={item.run}>
                    Export
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
        {X_MOCK_MODE && (
          <SettingRow
            title="Reload sample data"
            description="Discards changes made in this session and reloads the deterministic sample dataset."
            badge={<InternalBadge label="Sample data" hint="Only available while the workspace is running on mock data." />}
            control={
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => setClearOpen(true)}>
                Reload
              </Button>
            }
          />
        )}
      </Section>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        destructive={false}
        title="Reload the sample dataset?"
        description="Posts, replies, assignments and settings changed in this browser session will be discarded and the original sample data restored."
        confirmLabel="Reload sample data"
        onConfirm={() => {
          retryLoad();
          toast.success("Sample data reloaded");
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Preview states (mock mode only)                                     */
/* ------------------------------------------------------------------ */

function PreviewStatesSection() {
  const { connection, scopes, simulation, simulate } = useX();

  const states: { value: ConnectionState; label: string }[] = [
    { value: "connected", label: "Connected" },
    { value: "syncing", label: "Syncing" },
    { value: "sync_failed", label: "Sync failed" },
    { value: "token_expired", label: "Connection expired" },
    { value: "needs_reconnect", label: "Needs reconnect" },
    { value: "missing_permission", label: "Missing permission" },
    { value: "rate_limited", label: "Rate limited" },
    { value: "disconnected", label: "Disconnected" },
  ];

  return (
    <Section
      id="preview"
      title="Preview states"
      description="Switch the workspace into each state to see how it behaves before the backend exists"
      icon={Sparkles}
      badge={<InternalBadge label="Mock mode only" hint="This panel disappears once a real X backend is attached." />}
      className="border-[#E2D8FD] bg-[#FDFCFF]"
    >
      <SettingRow
        title="Connection state"
        description="Drives the banners, disabled actions and empty states across every tab."
        control={
          <SelectMenu
            label="Connection state"
            size="md"
            value={connection.state}
            onChange={(value) => simulate.setConnectionState(value as ConnectionState)}
            options={states}
          />
        }
      />
      <SettingRow
        title="Granted X permissions"
        description="Remove a permission to see how the capability-gated controls explain themselves."
        control={
          <div className="flex max-w-[380px] flex-wrap justify-end gap-1.5">
            {ALL_SCOPES.map((scope) => {
              const granted = scopes.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  role="switch"
                  aria-checked={granted}
                  onClick={() => simulate.toggleScope(scope as XScope, !granted)}
                  className={cn(
                    "h-7 rounded-sm border px-2 font-mono text-[11px] transition",
                    granted ? "border-[#2563EB] bg-[#EFF4FF] text-[#1D4ED8]" : "border-[#DCE2EA] bg-white text-[#98A2B3] line-through",
                    x.focus,
                  )}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        }
      />
      <SettingRow
        title="Fail the next action"
        description="The next mutation returns an error, so you can check the failure and recovery paths."
        control={<Switch checked={simulation.failNextAction} onCheckedChange={simulate.setFailNextAction} aria-label="Fail the next action" />}
      />
      <SettingRow
        title="Show loading skeletons"
        description="Holds every page in its loading state."
        control={<Switch checked={simulation.loading} onCheckedChange={simulate.setLoading} aria-label="Show loading skeletons" />}
      />
      <SettingRow
        title="Simulate a data load error"
        description="Shows the 'couldn't load your X data' state with its retry path."
        control={<Switch checked={simulation.loadError} onCheckedChange={simulate.setLoadError} aria-label="Simulate a load error" />}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Danger zone                                                         */
/* ------------------------------------------------------------------ */

function DangerZone() {
  const router = useRouter();
  const { account, can, disconnect, retryLoad } = useX();
  const [dialog, setDialog] = useState<"disconnect" | "reset" | "archive" | null>(null);

  const rows = [
    {
      key: "disconnect" as const,
      title: "Disconnect the X account",
      description: "Stops syncing and publishing. Synced data is kept for 30 days.",
      label: "Disconnect",
    },
    {
      key: "reset" as const,
      title: "Reset the X workspace",
      description: "Clears drafts, the schedule queue, inbox assignments, notes and settings. Nothing on X is touched.",
      label: "Reset workspace",
    },
    {
      key: "archive" as const,
      title: "Archive this channel",
      description: "Hides X from the sidebar and stops all background work. Data is kept read-only and can be restored.",
      label: "Archive channel",
    },
  ];

  return (
    <>
      <Card id="danger" className="scroll-mt-4 border-[#FBD5D9]">
        <CardHeader
          title="Danger zone"
          description="Actions here are hard or impossible to undo"
          icon={AlertTriangle}
          className="[&_span:first-child]:bg-[#FEF1F2] [&_span:first-child]:text-[#C81E2B]"
        />
        <div className="border-t border-[#FBD5D9] px-4 py-1">
          {rows.map((row) => (
            <SettingRow
              key={row.key}
              title={row.title}
              description={row.description}
              control={
                <Button size="sm" variant="danger" gate={can.canManageConnection} onClick={() => setDialog(row.key)}>
                  {row.label}
                </Button>
              }
            />
          ))}
        </div>
      </Card>

      <ConfirmDialog
        open={dialog === "disconnect"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Disconnect ${account.handle}?`}
        description="Publishing, scheduling, replies and syncing all stop immediately. Nothing is deleted from X."
        affected={["Scheduled posts will not publish", "Mentions stop syncing", "Analytics freeze at the last sync"]}
        confirmText="disconnect"
        confirmLabel="Disconnect account"
        onConfirm={() => disconnect()}
      />

      <ConfirmDialog
        open={dialog === "reset"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Reset the X workspace?"
        description={`Everything OmniPlatform holds for ${account.handle} is cleared and rebuilt from the next sync. Your posts on X are not affected.`}
        affected={[
          "All drafts are deleted",
          "The scheduling queue is emptied",
          "Inbox priorities, assignments and notes are lost",
          "Settings return to their defaults",
        ]}
        confirmText="reset"
        confirmLabel="Reset workspace"
        onConfirm={() => {
          retryLoad();
          toast.success("X workspace reset", { description: "Data has been rebuilt from the last sync." });
        }}
      />

      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Archive the X channel?"
        description="X is removed from the sidebar and all background syncing stops. Existing data stays available read-only, and an owner can restore the channel later."
        affected={["X disappears from the sidebar for everyone", "Scheduled posts will not publish", "Reporting becomes read-only"]}
        confirmText="archive"
        confirmLabel="Archive channel"
        onConfirm={() => {
          toast.success("X channel archived", {
            description: "An owner can restore it from Integrations.",
            action: { label: "Open integrations", onClick: () => router.push("/admin/integrations") },
          });
        }}
      />
    </>
  );
}
