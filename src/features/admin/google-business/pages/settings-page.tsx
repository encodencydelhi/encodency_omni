"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Lock,
  MapPin,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Unplug,
  UsersRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { downloadCsv } from "../components/dialogs";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DefinitionRow,
  FormField,
  InternalBadge,
  Meter,
  Notice,
  PageTitle,
  SelectMenu,
  gb,
  tdClass,
  thClass,
} from "../components/ui";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { CAPABILITY_DOCS } from "../lib/capabilities";
import {
  ALL_PERMISSIONS,
  CTA_LABEL,
  GBP_MOCK_MODE,
  PERMISSION_LABEL,
  ROLE_LABEL,
  SCOPE_INFO,
  TIMEZONES,
  VERIFICATION_LABEL,
  gbRoutes,
} from "../lib/constants";
import { dateTime, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { ConnectionInfo, ConnectionState, CtaType, GbpPermission, GbpScope, NotificationSetting, WorkspaceRole, WorkspaceSettings } from "../types";

const SECTIONS: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "connection", label: "Connected account", icon: PlugZap },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "sync", label: "Sync", icon: RefreshCw },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "defaults", label: "Defaults", icon: SlidersHorizontal },
  { id: "team", label: "Team access", icon: UsersRound },
  { id: "activity", label: "Activity log", icon: Activity },
  ...(GBP_MOCK_MODE ? [{ id: "preview", label: "Preview states", icon: FlaskConical }] : []),
  { id: "danger", label: "Danger zone", icon: AlertTriangle },
];

const ROLES: WorkspaceRole[] = ["owner", "manager", "editor", "contributor", "analyst"];

const NOTIFICATION_ROWS: [NotificationSetting, string, string][] = [
  ["newReview", "New review", "Any new review on a managed location"],
  ["lowRatingReview", "Low rating review", "Reviews of 2 stars or fewer"],
  ["replyNeeded", "Reply needed", "Reviews still unanswered after 24 hours"],
  ["locationUpdate", "Location updated", "Google changed a profile field"],
  ["syncFailure", "Sync failure", "A scheduled or manual sync did not complete"],
  ["verificationChange", "Verification change", "Verification approved, pending or suspended"],
  ["permissionExpired", "Permission expired", "The Google connection needs reauthorising"],
  ["duplicateLocation", "Duplicate location", "Google flagged a possible duplicate listing"],
];

export function SettingsPage() {
  const { status } = useGbp();
  if (status === "loading") return null;
  return <Settings />;
}

function Settings() {
  const store = useGbp();
  const { settings, connection, can, updateSettings, updateConnection } = store;
  const [draft, setDraft] = useState<WorkspaceSettings>(settings);
  const [syncDraft, setSyncDraft] = useState<Pick<ConnectionInfo, "autoSync" | "syncFrequency">>({ autoSync: connection.autoSync, syncFrequency: connection.syncFrequency });
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("connection");
  const editable = can.canManageSettings.allowed;

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    const onHash = () => {
      const next = window.location.hash.slice(1);
      if (next) {
        document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(next);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(settings) || syncDraft.autoSync !== connection.autoSync || syncDraft.syncFrequency !== connection.syncFrequency;

  const save = async () => {
    setSaving(true);
    const changed = (Object.keys(draft) as (keyof WorkspaceSettings)[]).filter((key) => JSON.stringify(draft[key]) !== JSON.stringify(settings[key]));
    const ok = changed.length ? await updateSettings(Object.fromEntries(changed.map((key) => [key, draft[key]])), "Google Business settings saved") : true;
    if (ok) {
      updateConnection(syncDraft);
      if (!changed.length) toast.success("Sync settings saved");
    }
    setSaving(false);
    return ok;
  };

  useUnsavedChanges(dirty, save, "Google Business settings");

  return (
    <div className="space-y-1 pb-16">
      <PageTitle title="Settings" description="How the Google Business integration is connected, synced and shared with your team." />
      {!editable && (
        <Notice tone="amber" icon={Lock} title="Read-only">
          {can.canManageSettings.reason}
        </Notice>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="h-fit min-w-0 lg:sticky lg:top-[76px]">
          <Card className="scrollbar-thin flex gap-1 overflow-x-auto p-1.5 lg:flex-col">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition",
                  active === section.id ? "bg-[#E8F0FE] text-[#1967D2]" : "text-[#3C4043] hover:bg-[#F8F9FA]",
                  section.id === "danger" && "text-[#C5221F]",
                  gb.focus,
                )}
              >
                <section.icon className={cn("size-3.5", active === section.id ? "text-[#1A73E8]" : "text-[#80868B]", section.id === "danger" && "text-[#C5221F]")} />
                {section.label}
              </a>
            ))}
          </Card>
        </nav>

        <div className="min-w-0 space-y-1">
          <ConnectionSection />
          <LocationsSection />
          <PermissionsSection />
          <SyncSection syncDraft={syncDraft} setSyncDraft={setSyncDraft} editable={editable} />

          <Section id="notifications" title="Notifications" icon={Bell} description="Which Google Business events notify your team.">
            <div className="scrollbar-thin overflow-x-auto rounded-lg border border-[#E8EAED]">
              <table className="w-full min-w-[460px] text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "static pl-4")}>Event</th>
                    <th className={cn(thClass, "static w-24 text-center")}>In-app</th>
                    <th className={cn(thClass, "static w-24 pr-4 text-center")}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_ROWS.map(([key, label, hint]) => (
                    <tr key={key}>
                      <td className={cn(tdClass, "whitespace-normal pl-4")}>
                        <span className="block font-medium text-[#202124]">{label}</span>
                        <span className="text-[11.5px] text-[#5F6368]">{hint}</span>
                      </td>
                      {(["inApp", "email"] as const).map((channel) => (
                        <td key={channel} className={cn(tdClass, "text-center", channel === "email" && "pr-4")}>
                          <Switch
                            aria-label={`${label} ${channel === "inApp" ? "in-app" : "email"} notifications`}
                            disabled={!editable}
                            checked={draft.notifications[key][channel]}
                            onCheckedChange={(checked) =>
                              setDraft((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: { ...prev.notifications[key], [channel]: checked } } }))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="defaults" title="Defaults" icon={SlidersHorizontal} badge={<InternalBadge label="OmniPlatform defaults" />} description="Pre-filled when your team creates posts and replies.">
            <fieldset disabled={!editable} className="grid gap-1 sm:grid-cols-2">
              <FormField label="Default post button">
                <SelectMenu<CtaType>
                  label="Default call to action"
                  size="md"
                  fullWidth
                  disabled={!editable}
                  value={draft.defaults.postCta}
                  onChange={(value) => setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, postCta: value } }))}
                  options={(Object.keys(CTA_LABEL) as CtaType[]).map((value) => ({ value, label: CTA_LABEL[value] }))}
                />
              </FormField>
              <FormField label="Default post locations">
                <SelectMenu
                  label="Default post locations"
                  size="md"
                  fullWidth
                  disabled={!editable}
                  value={draft.defaults.postLocationScope}
                  onChange={(value) => setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, postLocationScope: value as "all" | "selected" } }))}
                  options={[
                    { value: "selected", label: "Current location only" },
                    { value: "all", label: "All locations", description: "Uses more API quota" },
                  ]}
                />
              </FormField>
              <FormField label="Timezone">
                <SelectMenu
                  label="Timezone"
                  size="md"
                  fullWidth
                  disabled={!editable}
                  value={draft.defaults.timezone}
                  onChange={(value) => setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, timezone: value } }))}
                  options={TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
                />
              </FormField>
              <FormField label="Reply signature" htmlFor="reply-signature" hint="Added to suggested review replies." className="sm:col-span-2">
                <input
                  id="reply-signature"
                  className={gb.input}
                  value={draft.defaults.replySignature}
                  onChange={(event) => setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, replySignature: event.target.value } }))}
                />
              </FormField>
              <div className="sm:col-span-2">
                <label className="flex items-center justify-between gap-1 rounded-lg border border-[#E8EAED] px-3.5 py-3">
                  <span>
                    <span className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
                      Require approval before publishing <InternalBadge label="Approval workflow" />
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#5F6368]">Roles without the publish permission submit posts for review instead.</span>
                  </span>
                  <Switch
                    checked={draft.defaults.requireApproval}
                    disabled={!editable}
                    onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, defaults: { ...prev.defaults, requireApproval: checked } }))}
                    aria-label="Require approval before publishing"
                  />
                </label>
              </div>
            </fieldset>
          </Section>

          <Section id="team" title="Team access" icon={UsersRound} badge={<InternalBadge label="RBAC" />} description="What each workspace role can do. Enforced on every action, not just navigation.">
            <div className="space-y-1">
              <div className="scrollbar-thin overflow-x-auto rounded-lg border border-[#E8EAED]">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className={cn(thClass, "static pl-4")}>Permission</th>
                      {ROLES.map((role) => (
                        <th key={role} className={cn(thClass, "static text-center normal-case tracking-normal")}>
                          {ROLE_LABEL[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_PERMISSIONS.map((permission: GbpPermission) => (
                      <tr key={permission} className="hover:bg-[#F8F9FA]">
                        <td className={cn(tdClass, "pl-4 font-medium text-[#3C4043]")}>{PERMISSION_LABEL[permission]}</td>
                        {ROLES.map((role) => {
                          const locked = role === "owner" || !editable;
                          return (
                            <td key={role} className={cn(tdClass, "text-center")}>
                              <Checkbox
                                aria-label={`${ROLE_LABEL[role]}: ${PERMISSION_LABEL[permission]}`}
                                disabled={locked}
                                checked={draft.rolePermissions[role].includes(permission)}
                                onCheckedChange={(checked) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    rolePermissions: {
                                      ...prev.rolePermissions,
                                      [role]: checked ? [...prev.rolePermissions[role], permission] : prev.rolePermissions[role].filter((item) => item !== permission),
                                    },
                                  }))
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">Members with access</p>
                  <Button size="xs" variant="link" href="/admin/team">
                    Manage team
                  </Button>
                </div>
                <ul className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
                  {store.team.map((member) => (
                    <li key={member.id} className="flex items-center gap-1 px-3.5 py-2.5">
                      <Avatar name={member.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#202124]">
                          {member.name}
                          {member.id === store.currentUser.id && <span className="ml-1.5 text-[11.5px] text-[#80868B]">(you)</span>}
                        </p>
                        <p className="truncate text-[12px] text-[#5F6368]">{member.email}</p>
                      </div>
                      <Badge tone={member.role === "owner" ? "blue" : member.role === "manager" ? "green" : "neutral"}>{ROLE_LABEL[member.role]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-[#5F6368]">Capability map</p>
                <div className="scrollbar-thin overflow-x-auto rounded-lg border border-[#E8EAED]">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr>
                        <th className={cn(thClass, "static pl-4")}>Capability</th>
                        <th className={cn(thClass, "static")}>Source</th>
                        <th className={cn(thClass, "static pr-4")}>Google API</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CAPABILITY_DOCS.map((row) => (
                        <tr key={row.key}>
                          <td className={cn(tdClass, "pl-4 font-medium text-[#202124]")}>{row.label}</td>
                          <td className={cn(tdClass, "text-[11.5px] text-[#5F6368]")}>{row.note}</td>
                          <td className={cn(tdClass, "pr-4")}>
                            {row.googleSupported ? <Badge tone="green">Supported</Badge> : <InternalBadge label="OmniPlatform" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Section>

          <ActivitySection />
          {GBP_MOCK_MODE && <PreviewSection />}
          <DangerSection />
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[240px]" data-gb-no-print>
          <div role="region" aria-label="Unsaved settings" className="flex w-full max-w-[640px] items-center gap-1 rounded-xl border border-[#E8EAED] bg-white px-4 py-2.5 shadow-[0_8px_24px_rgba(60,64,67,0.22)]">
            <AlertTriangle className="size-4 shrink-0 text-[#B06000]" />
            <p className="flex-1 text-[13px] font-medium text-[#202124]">You have unsaved changes</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(settings);
                setSyncDraft({ autoSync: connection.autoSync, syncFrequency: connection.syncFrequency });
              }}
              disabled={saving}
            >
              Discard
            </Button>
            <Button size="sm" variant="primary" loading={saving} gate={can.canManageSettings} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
        </div>
      )}
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
}: {
  id: string;
  title: string;
  description?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-[84px]">
      <CardHeader title={title} description={description} icon={icon} badge={badge} actions={actions} className="border-b border-[#F1F3F4] pb-3" />
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

function ConnectionSection() {
  const { account, connection, can, reconnect, syncLocations } = useGbp();
  const [busy, setBusy] = useState<string | null>(null);
  const disconnected = connection.state === "disconnected";

  const run = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  return (
    <Section id="connection" title="Connected account" icon={PlugZap} description="The Google account and business account this workspace manages.">
      <div className="flex flex-col gap-1 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <dl>
            <DefinitionRow label="Business account">{account?.accountName ?? "-"}</DefinitionRow>
            <DefinitionRow label="Account ID" mono>
              {account?.accountId ?? "-"}
            </DefinitionRow>
            <DefinitionRow label="Google account">{account?.googleAccount ?? "-"}</DefinitionRow>
            <DefinitionRow label="Account type">{account?.type.replace("_", " ").toLowerCase() ?? "-"}</DefinitionRow>
            <DefinitionRow label="Status">
              {disconnected ? "Disconnected" : connection.state === "token_expired" ? "Expired - reconnect required" : "Connected"}
            </DefinitionRow>
            <DefinitionRow label="Last sync">{connection.lastSyncedAt ? `${dateTime(connection.lastSyncedAt)} (${relative(connection.lastSyncedAt)})` : "Never"}</DefinitionRow>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            loading={busy === "sync" || connection.state === "syncing"}
            gate={can.canSyncLocations}
            onClick={() => run("sync", () => syncLocations())}
          >
            Sync now
          </Button>
          <Button
            size="sm"
            variant={disconnected || connection.state === "token_expired" ? "primary" : "secondary"}
            icon={PlugZap}
            loading={busy === "reconnect"}
            gate={can.canManageConnection}
            onClick={() => run("reconnect", reconnect)}
          >
            {disconnected ? "Connect" : "Reconnect"}
          </Button>
          <Button size="sm" variant="secondary" icon={ExternalLink} href={gbRoutes.businessProfileManager} external>
            Business Profile Manager
          </Button>
        </div>
      </div>
    </Section>
  );
}

function LocationsSection() {
  const { locations, setLocationManaged, can } = useGbp();
  const [pending, setPending] = useState<string | null>(null);

  return (
    <Section
      id="locations"
      title="Locations"
      icon={MapPin}
      description="Turn OmniPlatform management off for a location to keep it read-only here."
      actions={
        <Button size="sm" variant="secondary" href={gbRoutes.locations}>
          Open locations
        </Button>
      }
    >
      <ul className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
        {locations.map((location) => (
          <li key={location.locationId} className="flex flex-wrap items-center gap-1 px-3.5 py-2.5">
            <div className="min-w-[200px] flex-1">
              <Link href={gbRoutes.location(location.locationId)} className="text-[13px] font-medium text-[#202124] hover:text-[#1A73E8]">
                {location.profile.title}
              </Link>
              <p className="text-[11.5px] text-[#5F6368]">
                {location.profile.address.locality} · {location.storeCode}
              </p>
            </div>
            <Badge tone={location.verification === "verified" ? "green" : location.verification === "pending" ? "amber" : "red"}>{VERIFICATION_LABEL[location.verification]}</Badge>
            <label className="flex items-center gap-2 text-[12px] text-[#5F6368]">
              Managed here
              <Switch
                checked={location.managed}
                disabled={!can.canManageLocations.allowed || pending === location.locationId}
                aria-label={`Manage ${location.profile.title} in OmniPlatform`}
                onCheckedChange={async (checked) => {
                  setPending(location.locationId);
                  await setLocationManaged(location.locationId, checked);
                  setPending(null);
                }}
              />
            </label>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PermissionsSection() {
  const { scopes, reconnect, can } = useGbp();
  const [busy, setBusy] = useState(false);
  const allScopes = Object.keys(SCOPE_INFO) as GbpScope[];
  const missing = allScopes.filter((scope) => !scopes.includes(scope));

  return (
    <Section
      id="permissions"
      title="Permissions"
      icon={KeyRound}
      description="Google permissions granted to OmniPlatform for this account."
      actions={
        missing.includes("business.manage") ? (
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            gate={can.canManageConnection}
            onClick={async () => {
              setBusy(true);
              await reconnect();
              setBusy(false);
            }}
          >
            Reconnect permissions
          </Button>
        ) : undefined
      }
    >
      {missing.includes("business.manage") && (
        <Notice tone="amber" className="mb-3" title="The main Business Profile permission is missing">
          Reading and managing locations, reviews, posts and media all need this permission.
        </Notice>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {allScopes.map((scope) => {
          const granted = scopes.includes(scope);
          return (
            <li key={scope} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5", granted ? "border-[#E8EAED]" : "border-[#FEEFC3] bg-[#FEF7E0]")}>
              {granted ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#188038]" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-[#B06000]" />}
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
                  {SCOPE_INFO[scope]?.label}
                  <span className="sr-only">{granted ? "granted" : "missing"}</span>
                </span>
                <span className="block text-[12px] leading-4 text-[#5F6368]">{SCOPE_INFO[scope]?.description}</span>
                <code className="mt-1 block text-[10.5px] text-[#80868B]">https://www.googleapis.com/auth/{scope}</code>
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SyncSection({
  syncDraft,
  setSyncDraft,
  editable,
}: {
  syncDraft: Pick<ConnectionInfo, "autoSync" | "syncFrequency">;
  setSyncDraft: (value: Pick<ConnectionInfo, "autoSync" | "syncFrequency">) => void;
  editable: boolean;
}) {
  const { connection, syncLocations, can } = useGbp();
  const share = connection.quotaLimit ? Math.round((connection.quotaUsed / connection.quotaLimit) * 100) : 0;

  return (
    <Section id="sync" title="Sync" icon={RefreshCw} description="Google data is pulled on a schedule to stay inside API quota. Replies, posts and edits are sent immediately.">
      <div className="grid gap-1 lg:grid-cols-2">
        <div className="space-y-1">
          <div className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
            <label className="flex items-center justify-between gap-1 px-3.5 py-3">
              <span>
                <span className="block text-[13px] font-medium text-[#202124]">Auto sync</span>
                <span className="mt-0.5 block text-[12px] text-[#5F6368]">Keep locations, reviews and performance up to date automatically.</span>
              </span>
              <Switch checked={syncDraft.autoSync} disabled={!editable} onCheckedChange={(checked) => setSyncDraft({ ...syncDraft, autoSync: checked })} aria-label="Auto sync" />
            </label>
            <div className="flex items-center justify-between gap-1 px-3.5 py-3">
              <span className="text-[13px] font-medium text-[#202124]">Sync frequency</span>
              <SelectMenu<ConnectionInfo["syncFrequency"]>
                label="Sync frequency"
                disabled={!editable || !syncDraft.autoSync}
                value={syncDraft.syncFrequency}
                onChange={(value) => setSyncDraft({ ...syncDraft, syncFrequency: value })}
                options={[
                  { value: "hourly", label: "Every hour" },
                  { value: "6h", label: "Every 6 hours" },
                  { value: "12h", label: "Every 12 hours" },
                  { value: "daily", label: "Once a day", description: "Lowest quota use" },
                ]}
              />
            </div>
          </div>
          <dl>
            <DefinitionRow label="Last successful sync">{connection.lastSyncedAt ? dateTime(connection.lastSyncedAt) : "Never"}</DefinitionRow>
            <DefinitionRow label="Next scheduled sync">{connection.autoSync && connection.nextSyncAt ? dateTime(connection.nextSyncAt) : "Auto sync is off"}</DefinitionRow>
          </dl>
          <Button size="sm" variant="secondary" icon={RefreshCw} gate={can.canSyncLocations} loading={connection.state === "syncing"} onClick={() => void syncLocations()}>
            Sync now
          </Button>
        </div>
        <div className="rounded-lg border border-[#E8EAED] p-3.5">
          <p className="text-[13px] font-medium text-[#202124]">Daily API quota</p>
          <p className="mt-0.5 text-[12px] text-[#5F6368]">Google Business Profile APIs have a per-project daily limit.</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[22px] font-medium tabular-nums text-[#202124]">{connection.quotaUsed.toLocaleString()}</span>
            <span className="text-[12px] text-[#5F6368]">
              of {connection.quotaLimit.toLocaleString()} · {share}%
            </span>
          </div>
          <Meter value={connection.state === "quota_exceeded" ? 100 : share} tone={connection.state === "quota_exceeded" || share > 90 ? "red" : share > 75 ? "amber" : "green"} className="mt-2 h-2" />
          <ul className="mt-3 space-y-1 text-[12px] text-[#3C4043]">
            <li className="flex justify-between">
              <span>Location sync</span>
              <span className="tabular-nums text-[#5F6368]">~12 units each</span>
            </li>
            <li className="flex justify-between">
              <span>Review reply</span>
              <span className="tabular-nums text-[#5F6368]">1 unit</span>
            </li>
            <li className="flex justify-between">
              <span>Post publish</span>
              <span className="tabular-nums text-[#5F6368]">1 unit per location</span>
            </li>
            <li className="flex justify-between">
              <span>Media upload</span>
              <span className="tabular-nums text-[#5F6368]">2 units</span>
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

function ActivitySection() {
  const { activity, locations } = useGbp();
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(10);

  const rows = useMemo(() => {
    if (filter === "all") return activity;
    if (filter === "profile") return activity.filter((event) => ["profile_edit", "hours_change", "special_hours_change", "category_change", "attribute_change"].includes(event.action));
    if (filter === "reviews") return activity.filter((event) => ["review_reply", "reply_edit", "reply_delete"].includes(event.action));
    if (filter === "posts") return activity.filter((event) => ["post_create", "post_schedule", "post_publish", "post_delete", "approval"].includes(event.action));
    if (filter === "media") return activity.filter((event) => ["media_upload", "media_delete"].includes(event.action));
    return activity.filter((event) => ["location_sync", "permission_change", "connection_change"].includes(event.action));
  }, [activity, filter]);

  return (
    <Section
      id="activity"
      title="Activity log"
      icon={Activity}
      badge={<InternalBadge label="OmniPlatform" />}
      description="Every change made to this Google Business account through OmniPlatform."
      actions={
        <>
          <SelectMenu
            label="Filter activity"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setLimit(10);
            }}
            options={[
              { value: "all", label: "All activity" },
              { value: "profile", label: "Profile changes" },
              { value: "reviews", label: "Reviews" },
              { value: "posts", label: "Posts" },
              { value: "media", label: "Media" },
              { value: "connection", label: "Sync & connection" },
            ]}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() =>
              downloadCsv(
                [
                  ["Time", "User", "Action", "Entity", "Location", "Previous", "New", "Source"],
                  ...rows.map((event) => [
                    event.at,
                    event.actor,
                    event.summary,
                    event.entity.label,
                    locations.find((location) => location.locationId === event.locationId)?.profile.title ?? "",
                    event.previous ?? "",
                    event.next ?? "",
                    event.source,
                  ]),
                ],
                "google-business-activity.csv",
              )
            }
          >
            Export
          </Button>
        </>
      }
    >
      <div className="scrollbar-thin overflow-x-auto rounded-lg border border-[#E8EAED]">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th className={cn(thClass, "static pl-4")}>When</th>
              <th className={cn(thClass, "static")}>User</th>
              <th className={cn(thClass, "static")}>Action</th>
              <th className={cn(thClass, "static")}>Entity</th>
              <th className={cn(thClass, "static")}>Change</th>
              <th className={cn(thClass, "static pr-4")}>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-[#5F6368]">
                  No activity for this filter.
                </td>
              </tr>
            )}
            {rows.slice(0, limit).map((event) => (
              <tr key={event.id} className="hover:bg-[#F8F9FA]">
                <td className={cn(tdClass, "pl-4 text-[12px]")} title={dateTime(event.at)}>
                  {relative(event.at)}
                </td>
                <td className={tdClass}>
                  <span className="flex items-center gap-2">
                    <Avatar name={event.actor} className="size-6 text-[9px]" />
                    {event.actor}
                  </span>
                </td>
                <td className={cn(tdClass, "font-medium text-[#202124]")}>{event.summary}</td>
                <td className={cn(tdClass, "max-w-[200px] truncate")}>
                  {event.entity.type === "location" && event.entity.id ? (
                    <Link href={gbRoutes.location(event.entity.id)} className="text-[#1A73E8] hover:underline">
                      {event.entity.label}
                    </Link>
                  ) : (
                    event.entity.label
                  )}
                </td>
                <td className={cn(tdClass, "max-w-[220px] text-[12px]")}>
                  {event.previous || event.next ? (
                    <span className="block truncate" title={`${event.previous ?? "-"} to ${event.next ?? "-"}`}>
                      <span className="text-[#80868B] line-through">{event.previous ?? "-"}</span> <span className="text-[#202124]">{event.next ?? "-"}</span>
                    </span>
                  ) : (
                    <span className="text-[#80868B]">-</span>
                  )}
                </td>
                <td className={cn(tdClass, "pr-4")}>
                  <Badge tone={event.source === "OmniPlatform" ? "violet" : "neutral"}>{event.source}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="mt-3 text-center">
          <Button size="sm" variant="secondary" onClick={() => setLimit((value) => value + 10)}>
            Show more ({rows.length - limit} remaining)
          </Button>
        </div>
      )}
    </Section>
  );
}

function PreviewSection() {
  const { connection, scopes, role, simulation, simulate, locations, updateConnection } = useGbp();
  const states: { value: ConnectionState; label: string }[] = [
    { value: "connected", label: "Connected" },
    { value: "syncing", label: "Syncing" },
    { value: "sync_failed", label: "Sync failed" },
    { value: "token_expired", label: "Token expired" },
    { value: "quota_exceeded", label: "Quota exceeded" },
    { value: "disconnected", label: "Disconnected" },
  ];

  return (
    <Section
      id="preview"
      title="Preview states"
      icon={FlaskConical}
      badge={<Badge tone="amber">Mock mode only</Badge>}
      description="Exercise permission, connection and failure states before the backend is attached. This section disappears when live data is enabled."
    >
      <div className="grid gap-1 lg:grid-cols-2">
        <div className="space-y-1">
          <FormField label="Connection state">
            <SelectMenu<ConnectionState> label="Connection state" size="md" fullWidth value={connection.state} onChange={simulate.setConnectionState} options={states} />
          </FormField>
          <FormField label="View as role" hint="Changes what you are allowed to do across the workspace.">
            <SelectMenu<WorkspaceRole> label="Role" size="md" fullWidth value={role} onChange={simulate.setRole} options={ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }))} />
          </FormField>
          <FormField label="Verification of first location">
            <SelectMenu
              label="Verification"
              size="md"
              fullWidth
              value={locations[0]?.verification ?? "verified"}
              onChange={(value) => locations[0] && simulate.setVerification(locations[0].locationId, value as "verified" | "pending" | "unverified" | "suspended" | "duplicate")}
              options={[
                { value: "verified", label: "Verified" },
                { value: "pending", label: "Pending" },
                { value: "unverified", label: "Not verified" },
                { value: "suspended", label: "Suspended" },
                { value: "duplicate", label: "Duplicate" },
              ]}
            />
          </FormField>
          <div className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
            <label className="flex items-center justify-between gap-1 px-3.5 py-3">
              <span className="text-[13px] text-[#3C4043]">Fail the next action</span>
              <Switch checked={simulation.failNextAction} onCheckedChange={simulate.setFailNextAction} aria-label="Fail the next action" />
            </label>
            <label className="flex items-center justify-between gap-1 px-3.5 py-3">
              <span className="text-[13px] text-[#3C4043]">Fail data loading</span>
              <Switch checked={simulation.failNextLoad} onCheckedChange={simulate.setFailNextLoad} aria-label="Fail data loading" />
            </label>
            <label className="flex items-center justify-between gap-1 px-3.5 py-3">
              <span className="text-[13px] text-[#3C4043]">Quota above 80%</span>
              <Switch
                checked={connection.quotaUsed / connection.quotaLimit >= 0.8}
                onCheckedChange={(checked) => updateConnection({ quotaUsed: checked ? 8_600 : 2_180 })}
                aria-label="Quota above 80%"
              />
            </label>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] font-medium text-[#3C4043]">Granted OAuth scopes</p>
          <ul className="space-y-1 rounded-lg border border-[#E8EAED] p-2">
            {(Object.keys(SCOPE_INFO) as GbpScope[]).map((scope) => (
              <li key={scope}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[#F8F9FA]">
                  <Checkbox checked={scopes.includes(scope)} onCheckedChange={(checked) => simulate.setScopeGranted(scope, Boolean(checked))} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-[#202124]">{SCOPE_INFO[scope]?.label}</span>
                    <code className="text-[11px] text-[#5F6368]">{scope}</code>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function DangerSection() {
  const { account, connection, disconnect, can } = useGbp();
  const [open, setOpen] = useState(false);

  return (
    <Card id="danger" className="scroll-mt-[84px] border-[#FAD2CF]">
      <CardHeader title={<span className="text-[#C5221F]">Danger zone</span>} icon={ShieldCheck} className="border-b border-[#FAD2CF] pb-3" />
      <div className="flex flex-wrap items-center justify-between gap-1 px-4 py-4">
        <div className="min-w-[240px] flex-1">
          <p className="text-[13px] font-medium text-[#202124]">Disconnect Google Business</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#5F6368]">
            Stops syncing and revokes OmniPlatform access. Scheduled posts will not publish. Your Google Business Profile itself is not affected.
          </p>
        </div>
        <Button variant="dangerSolid" icon={Unplug} gate={can.canManageConnection} disabled={connection.state === "disconnected"} disabledReason="No account is connected" onClick={() => setOpen(true)}>
          Disconnect account
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Disconnect ${account?.accountName ?? "this account"}?`}
        description="OmniPlatform loses access to every location on this account until someone reconnects it."
        affected={[
          "Sync stops and cached data freezes",
          "Scheduled posts and approvals are paused",
          "Team members lose Google Business actions in OmniPlatform",
          "Locations, reviews and photos on Google are not deleted",
        ]}
        confirmText="DISCONNECT"
        confirmLabel="Disconnect account"
        onConfirm={disconnect}
      />
    </Card>
  );
}
