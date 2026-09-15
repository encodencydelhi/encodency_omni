"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  FlaskConical,
  KeyRound,
  Lock,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Unplug,
  Upload,
  UsersRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ToggleRow, downloadCsv } from "../components/dialogs";
import { PageSkeleton } from "../components/states";
import { SyncStatus } from "../components/workspace";
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
  TagInput,
  tdClass,
  thClass,
  yt,
} from "../components/ui";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import {
  ALL_SCOPES,
  CATEGORIES,
  LANGUAGES,
  PERMISSION_LABEL,
  ROLE_LABEL,
  SCOPE_INFO,
  TIMEZONES,
  VISIBILITY_LABEL,
  YT_MOCK_MODE,
  ytRoutes,
} from "../lib/constants";
import { dateTime, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { AuditAction, ConnectionInfo, ConnectionState, Visibility, WorkspaceRole, WorkspaceSettings, YouTubePermission } from "../types";

const SECTIONS: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "connection", label: "Connected channel", icon: PlugZap },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "defaults", label: "Publishing defaults", icon: SlidersHorizontal },
  { id: "upload", label: "Upload defaults", icon: Upload },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "moderation", label: "Moderation", icon: ShieldCheck },
  { id: "sync", label: "Sync", icon: RefreshCw },
  { id: "team", label: "Team access", icon: UsersRound },
  { id: "audit", label: "Audit log", icon: Activity },
  ...(YT_MOCK_MODE ? [{ id: "preview", label: "Preview states", icon: FlaskConical }] : []),
  { id: "danger", label: "Danger zone", icon: AlertTriangle },
];

const ROLES: WorkspaceRole[] = ["owner", "manager", "editor", "contributor", "analyst"];
const MATRIX_PERMISSIONS: YouTubePermission[] = [
  "upload_content",
  "publish_content",
  "schedule_content",
  "edit_content",
  "delete_content",
  "approve_content",
  "reply_comments",
  "moderate_comments",
  "manage_playlists",
  "manage_live",
  "view_analytics",
  "view_monetization",
  "manage_connection",
  "manage_settings",
];

export function SettingsPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="detail" />;
  return <Settings />;
}

function Section({ id, title, description, icon, badge, actions, children }: { id: string; title: string; description?: ReactNode; icon: ComponentType<{ className?: string }>; badge?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-[80px]">
      <CardHeader title={title} description={description} icon={icon} badge={badge} actions={actions} className="border-b border-[#EEF1F5] pb-3" />
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

function Settings() {
  const store = useYouTube();
  const { settings, connection, can, updateSettings, updateConnection } = store;
  const [draft, setDraft] = useState<WorkspaceSettings>(settings);
  const [syncDraft, setSyncDraft] = useState<Pick<ConnectionInfo, "autoSync" | "syncFrequency">>({ autoSync: connection.autoSync, syncFrequency: connection.syncFrequency });
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("connection");
  const editable = can.canManageSettings.allowed;

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    const onHash = () => {
      const h = window.location.hash.slice(1);
      if (h) {
        document.getElementById(h)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(h);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings) || syncDraft.autoSync !== connection.autoSync || syncDraft.syncFrequency !== connection.syncFrequency;

  const save = async () => {
    setSaving(true);
    const changed = (Object.keys(draft) as (keyof WorkspaceSettings)[]).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(settings[k]));
    const ok = changed.length ? await updateSettings(Object.fromEntries(changed.map((k) => [k, draft[k]])), "YouTube settings saved") : true;
    if (ok) updateConnection(syncDraft);
    if (ok && !changed.length) toast.success("Sync settings saved");
    setSaving(false);
    return ok;
  };

  const discard = () => {
    setDraft(settings);
    setSyncDraft({ autoSync: connection.autoSync, syncFrequency: connection.syncFrequency });
  };

  useUnsavedChanges(dirty, save, "YouTube settings");

  const setDefaults = <K extends keyof WorkspaceSettings["defaults"]>(k: K, v: WorkspaceSettings["defaults"][K]) => setDraft((d) => ({ ...d, defaults: { ...d.defaults, [k]: v } }));
  const setModeration = <K extends keyof WorkspaceSettings["moderation"]>(k: K, v: WorkspaceSettings["moderation"][K]) => setDraft((d) => ({ ...d, moderation: { ...d.moderation, [k]: v } }));

  return (
    <div className="space-y-1 pb-16">
      <PageTitle title="Settings" description="How the YouTube integration is connected, configured and who can do what." />
      {!editable && <Notice tone="amber" icon={Lock} title="Read-only">{can.canManageSettings.reason}</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="h-fit min-w-0 lg:sticky lg:top-[76px]">
          <Card className="scrollbar-thin flex gap-1 overflow-x-auto p-1.5 lg:flex-col">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={active === s.id ? "true" : undefined}
                className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[12.5px] font-medium transition", active === s.id ? "bg-[#FEF1F2] text-[#0F1B3D]" : "text-[#3C4A66] hover:bg-[#F8FAFC]", s.id === "danger" && "text-[#C81E2B]", yt.focus)}
              >
                <s.icon className={cn("size-3.5", active === s.id ? "text-[#E5202E]" : "text-[#98A2B3]", s.id === "danger" && "text-[#C81E2B]")} />
                {s.label}
              </a>
            ))}
          </Card>
        </nav>

        <div className="min-w-0 space-y-1">
          <ConnectionSection />
          <PermissionsSection />

          <Section id="defaults" title="Publishing defaults" icon={SlidersHorizontal} badge={<InternalBadge label="OmniPlatform defaults" hint="Pre-filled into new uploads. They don't change YouTube Studio's own upload defaults." />} description="Pre-filled for every new upload. Uploaders can change them per video.">
            <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Default visibility">
                <SelectMenu<Visibility> label="Default visibility" size="md" fullWidth disabled={!editable} value={draft.defaults.visibility} onChange={(v) => setDefaults("visibility", v)} options={(["private", "unlisted", "public"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))} />
              </FormField>
              <FormField label="Default category">
                <SelectMenu label="Default category" size="md" fullWidth disabled={!editable} value={draft.defaults.categoryId} onChange={(v) => setDefaults("categoryId", v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
              </FormField>
              <FormField label="Default language">
                <SelectMenu label="Default language" size="md" fullWidth disabled={!editable} value={draft.defaults.language} onChange={(v) => setDefaults("language", v)} options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))} />
              </FormField>
              <FormField label="Timezone">
                <SelectMenu label="Timezone" size="md" fullWidth disabled={!editable} value={draft.defaults.timezone} onChange={(v) => setDefaults("timezone", v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
              </FormField>
              <FormField label="Default playlist" className="sm:col-span-2">
                <SelectMenu label="Default playlist" size="md" fullWidth disabled={!editable} value={draft.defaults.playlistId} onChange={(v) => setDefaults("playlistId", v)} options={[{ value: "", label: "None" }, ...store.playlists.map((p) => ({ value: p.id, label: p.title }))]} />
              </FormField>
              <FormField label="Default tags" className="sm:col-span-2">
                <TagInput value={draft.defaults.tags} onChange={(t) => setDefaults("tags", t)} />
              </FormField>
              <FormField label="Description footer" htmlFor="desc-footer" hint="Appended to every new description — links, credits, hashtags." className="sm:col-span-2" counter={{ value: draft.defaults.descriptionFooter.length, max: 1000 }}>
                <textarea id="desc-footer" rows={3} className={yt.textarea} value={draft.defaults.descriptionFooter} onChange={(e) => setDefaults("descriptionFooter", e.target.value)} />
              </FormField>
            </fieldset>
          </Section>

          <Section id="upload" title="Upload defaults" icon={Upload} badge={<InternalBadge label="OmniPlatform defaults" />} description="Audience and advanced settings applied to new uploads.">
            <fieldset disabled={!editable} className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
              <ToggleRow label="Mark as made for kids" description="Most channels should leave this off. Uploaders must still confirm per video." checked={draft.defaults.madeForKids} disabled={!editable} onChange={(c) => setDefaults("madeForKids", c)} />
              <ToggleRow label="Allow comments" checked={draft.defaults.commentsEnabled} disabled={!editable} onChange={(c) => setDefaults("commentsEnabled", c)} />
              <div className="flex items-center justify-between gap-4 px-3.5 py-3">
                <span>
                  <span className="block text-[13px] font-semibold text-[#0F1B3D]">License</span>
                  <span className="text-[12px] text-[#6B7890]">Applied to new uploads</span>
                </span>
                <SelectMenu<WorkspaceSettings["defaults"]["license"]> label="License" disabled={!editable} value={draft.defaults.license} onChange={(v) => setDefaults("license", v)} options={[{ value: "youtube", label: "Standard YouTube License" }, { value: "creativeCommon", label: "Creative Commons" }]} />
              </div>
            </fieldset>
          </Section>

          <Section id="notifications" title="Notifications" icon={Bell} description="Choose which YouTube events notify you in OmniPlatform and by email.">
            <div className="scrollbar-thin overflow-x-auto rounded-[10px] border border-[#E4E9F0]">
              <table className="w-full min-w-[460px] text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "static pl-4")}>Event</th>
                    <th className={cn(thClass, "static w-24 text-center")}>In-app</th>
                    <th className={cn(thClass, "static w-24 pr-4 text-center")}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["uploadCompleted", "Upload completed", "When processing finishes"],
                    ["publishFailed", "Publish or schedule failed", "Includes processing failures"],
                    ["newComments", "New high-priority comments", "Questions and keyword matches"],
                    ["liveEvents", "Live events", "Starting soon, started, stream failures"],
                    ["syncFailure", "Sync failure & token expiry", "When data stops updating"],
                    ["quotaWarning", "API quota warning", "At 80% of daily quota"],
                  ] as [keyof WorkspaceSettings["notifications"], string, string][]).map(([key, label, hint]) => (
                    <tr key={key}>
                      <td className={cn(tdClass, "whitespace-normal pl-4")}>
                        <span className="block font-medium text-[#0F1B3D]">{label}</span>
                        <span className="text-[11.5px] text-[#6B7890]">{hint}</span>
                      </td>
                      {(["inApp", "email"] as const).map((channel) => (
                        <td key={channel} className={cn(tdClass, "text-center", channel === "email" && "pr-4")}>
                          <Switch
                            aria-label={`${label} ${channel === "inApp" ? "in-app" : "email"} notifications`}
                            disabled={!editable}
                            checked={draft.notifications[key][channel]}
                            onCheckedChange={(c) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, [key]: { ...d.notifications[key], [channel]: c } } }))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="moderation" title="Moderation" icon={ShieldCheck} badge={<InternalBadge label="Internal rules" hint="Applied by OmniPlatform when comments sync. YouTube Studio's own blocked words are managed separately." />} description="How OmniPlatform flags comments and routes content for approval.">
            <div className="space-y-4">
              <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
                <ToggleRow label="High-priority comment alerts" description="Flag questions, volunteer or donation requests for a quick reply." checked={draft.moderation.priorityAlerts} disabled={!editable} onChange={(c) => setModeration("priorityAlerts", c)} />
                <ToggleRow label="Hold comments with links" description="Suggest holding comments containing URLs for review." checked={draft.moderation.holdLinks} disabled={!editable} onChange={(c) => setModeration("holdLinks", c)} />
                <ToggleRow label="Require approval before publishing" description="Roles without Publish permission submit uploads for review." checked={draft.moderation.requireApproval} disabled={!editable} onChange={(c) => setModeration("requireApproval", c)} badge={<InternalBadge label="Approval workflow" />} />
              </div>
              <FormField label="Blocked keywords" hint="Comments containing these are flagged as likely spam in the Comments inbox.">
                <TagInput value={draft.moderation.blockedKeywords} onChange={(t) => setModeration("blockedKeywords", t)} placeholder="Add a keyword and press Enter" />
              </FormField>
            </div>
          </Section>

          <SyncSection syncDraft={syncDraft} setSyncDraft={setSyncDraft} editable={editable} />

          <Section id="team" title="Team access" icon={UsersRound} badge={<InternalBadge label="RBAC" />} description="What each workspace role can do in YouTube. Enforced on every action, not only navigation.">
            <div className="space-y-4">
              <div className="scrollbar-thin overflow-x-auto rounded-[10px] border border-[#E4E9F0]">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className={cn(thClass, "static pl-4")}>Permission</th>
                      {ROLES.map((r) => <th key={r} className={cn(thClass, "static text-center normal-case tracking-normal")}>{ROLE_LABEL[r]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_PERMISSIONS.map((perm) => (
                      <tr key={perm} className="hover:bg-[#F8FAFC]">
                        <td className={cn(tdClass, "pl-4 font-medium text-[#24324F]")}>{PERMISSION_LABEL[perm]}</td>
                        {ROLES.map((role) => {
                          const locked = role === "owner" || !editable;
                          return (
                            <td key={role} className={cn(tdClass, "text-center")}>
                              <Checkbox
                                aria-label={`${ROLE_LABEL[role]}: ${PERMISSION_LABEL[perm]}`}
                                disabled={locked}
                                checked={draft.rolePermissions[role].includes(perm)}
                                onCheckedChange={(c) =>
                                  setDraft((d) => ({
                                    ...d,
                                    rolePermissions: { ...d.rolePermissions, [role]: c ? [...d.rolePermissions[role], perm] : d.rolePermissions[role].filter((p) => p !== perm) },
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
                  <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Members with YouTube access</p>
                  <Button size="xs" variant="link" href="/admin/team">Manage team</Button>
                </div>
                <ul className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
                  {store.team.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <Avatar name={m.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#0F1B3D]">{m.name}{m.id === store.currentUser.id && <span className="ml-1.5 text-[11.5px] text-[#98A2B3]">(you)</span>}</p>
                        <p className="truncate text-[12px] text-[#6B7890]">{m.email}</p>
                      </div>
                      <Badge tone={m.role === "owner" ? "red" : m.role === "manager" ? "blue" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <AuditSection />
          {YT_MOCK_MODE && <PreviewSection />}
          <DangerSection />
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[240px]">
          <div role="region" aria-label="Unsaved settings" className="flex w-full max-w-[640px] items-center gap-3 rounded-sm border border-[#E4E9F0] bg-white px-4 py-2.5 shadow-[0_16px_40px_-12px_rgba(15,27,61,0.3)]">
            <AlertTriangle className="size-4 shrink-0 text-[#B54708]" />
            <p className="flex-1 text-[13px] font-medium text-[#0F1B3D]">You have unsaved changes</p>
            <Button size="sm" variant="ghost" onClick={discard} disabled={saving}>Discard</Button>
            <Button size="sm" variant="primary" loading={saving} gate={can.canManageSettings} onClick={() => void save()}>Save changes</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionSection() {
  const { channel, connection, can, reconnect, syncNow } = useYouTube();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };
  const disconnected = connection.state === "disconnected";
  return (
    <Section id="connection" title="Connected channel" icon={PlugZap} description="The YouTube channel this workspace manages.">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex flex-1 items-center gap-3">
          <Avatar name={channel.title} src={channel.avatarUrl} className="size-12" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#0F1B3D]">{channel.title}</p>
            <p className="text-[12.5px] text-[#6B7890]">{channel.handle}</p>
            <div className="mt-1.5"><SyncStatus compact /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={busy === "sync" || connection.state === "syncing"} disabled={disconnected || connection.state === "token_expired"} disabledReason="Reconnect the channel before syncing" onClick={() => run("sync", syncNow)}>Sync now</Button>
          <Button size="sm" variant={connection.state === "token_expired" || disconnected ? "primary" : "secondary"} icon={PlugZap} loading={busy === "reconnect"} gate={can.canManageConnection} onClick={() => run("reconnect", reconnect)}>{disconnected ? "Connect" : "Reconnect"}</Button>
          <Button size="sm" variant="danger" icon={Unplug} gate={can.canManageConnection} disabled={disconnected} disabledReason="No channel connected" href="#danger">Disconnect</Button>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-8 md:grid-cols-2">
        <div>
          <DefinitionRow label="Channel">{channel.title}</DefinitionRow>
          <DefinitionRow label="Channel ID" mono>{channel.id}</DefinitionRow>
          <DefinitionRow label="Google account">{channel.googleAccount}</DefinitionRow>
        </div>
        <div>
          <DefinitionRow label="Status">{disconnected ? "Disconnected" : connection.state === "token_expired" ? "Expired — reconnect required" : "Connected"}</DefinitionRow>
          <DefinitionRow label="Last sync">{dateTime(connection.lastSyncedAt)}</DefinitionRow>
          <DefinitionRow label="Channel on YouTube"><a href={ytRoutes.channelOnYouTube(channel.handle)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">{channel.customUrl}</a></DefinitionRow>
        </div>
      </dl>
    </Section>
  );
}

function PermissionsSection() {
  const { scopes, reconnect, can } = useYouTube();
  const [busy, setBusy] = useState(false);
  const missing = ALL_SCOPES.filter((s) => !scopes.includes(s));
  return (
    <Section
      id="permissions"
      title="Permissions"
      icon={KeyRound}
      description="Google permissions granted to OmniPlatform for this channel."
      actions={missing.length > 0 && <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={async () => { setBusy(true); await reconnect(); setBusy(false); }}>Reconnect permissions</Button>}
    >
      {missing.length > 0 && <Notice tone="amber" className="mb-3" title={`${missing.length} permission${missing.length > 1 ? "s" : ""} missing`}>Actions that need these permissions are disabled until you reconnect and grant them.</Notice>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {ALL_SCOPES.map((scope) => {
          const granted = scopes.includes(scope);
          return (
            <li key={scope} className={cn("flex items-start gap-2.5 rounded-sm border px-3 py-2.5", granted ? "border-[#E4E9F0]" : "border-[#FBE3B6] bg-[#FFFAF0]")}>
              {granted ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#12B76A]" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-[#B54708]" />}
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]">{SCOPE_INFO[scope].label}<span className="sr-only">{granted ? "granted" : "missing"}</span></span>
                <span className="block text-[12px] leading-4 text-[#6B7890]">{SCOPE_INFO[scope].description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SyncSection({ syncDraft, setSyncDraft, editable }: { syncDraft: Pick<ConnectionInfo, "autoSync" | "syncFrequency">; setSyncDraft: (v: Pick<ConnectionInfo, "autoSync" | "syncFrequency">) => void; editable: boolean }) {
  const { connection, syncNow } = useYouTube();
  const pct = Math.round((connection.quotaUsed / connection.quotaLimit) * 100);
  return (
    <Section id="sync" title="Sync" icon={RefreshCw} description="Channel data is synced to OmniPlatform on a schedule to save API quota. Edits and replies are sent to YouTube immediately.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
            <ToggleRow label="Auto sync" description="Keep stats, comments and analytics up to date automatically." checked={syncDraft.autoSync} disabled={!editable} onChange={(c) => setSyncDraft({ ...syncDraft, autoSync: c })} />
            <div className="flex items-center justify-between gap-4 px-3.5 py-3">
              <span className="text-[13px] font-semibold text-[#0F1B3D]">Sync frequency</span>
              <SelectMenu<ConnectionInfo["syncFrequency"]> label="Sync frequency" disabled={!editable || !syncDraft.autoSync} value={syncDraft.syncFrequency} onChange={(v) => setSyncDraft({ ...syncDraft, syncFrequency: v })} options={[{ value: "hourly", label: "Every hour" }, { value: "6h", label: "Every 6 hours" }, { value: "12h", label: "Every 12 hours" }, { value: "daily", label: "Once a day", description: "Lowest quota use" }]} />
            </div>
          </div>
          <dl>
            <DefinitionRow label="Last successful sync">{dateTime(connection.lastSyncedAt)} ({relative(connection.lastSyncedAt)})</DefinitionRow>
            <DefinitionRow label="Next scheduled sync">{connection.autoSync ? dateTime(connection.nextSyncAt) : "Auto sync is off"}</DefinitionRow>
          </dl>
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={connection.state === "syncing"} disabled={connection.state === "token_expired" || connection.state === "disconnected"} disabledReason="Reconnect the channel first" onClick={() => void syncNow()}>Sync now</Button>
        </div>
        <div className="rounded-[10px] border border-[#E4E9F0] p-3.5">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">Daily API quota</p>
          <p className="mt-0.5 text-[12px] text-[#6B7890]">Resets at midnight Pacific Time.</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[22px] font-semibold tabular-nums text-[#0F1B3D]">{connection.quotaUsed.toLocaleString()}</span>
            <span className="text-[12px] text-[#6B7890]">of {connection.quotaLimit.toLocaleString()} units · {pct}%</span>
          </div>
          <Meter value={connection.state === "quota_exceeded" ? 100 : pct} tone={connection.state === "quota_exceeded" || pct > 90 ? "red" : pct > 75 ? "amber" : "green"} className="mt-2 h-2" />
          <ul className="mt-3 space-y-1 text-[12px] text-[#3C4A66]">
            <li className="flex justify-between"><span>Video upload</span><span className="tabular-nums text-[#6B7890]">1,600 units</span></li>
            <li className="flex justify-between"><span>Metadata edit</span><span className="tabular-nums text-[#6B7890]">50 units</span></li>
            <li className="flex justify-between"><span>Comment reply</span><span className="tabular-nums text-[#6B7890]">50 units</span></li>
            <li className="flex justify-between"><span>Scheduled sync</span><span className="tabular-nums text-[#6B7890]">~40 units</span></li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

const AUDIT_FILTERS: { value: string; label: string; actions?: AuditAction[] }[] = [
  { value: "all", label: "All actions" },
  { value: "content", label: "Content", actions: ["upload", "edit", "delete", "publish", "schedule", "thumbnail", "approval"] },
  { value: "comments", label: "Comments", actions: ["comment_reply", "moderation"] },
  { value: "playlists", label: "Playlists", actions: ["playlist"] },
  { value: "live", label: "Live", actions: ["live"] },
  { value: "connection", label: "Connection & sync", actions: ["reconnect", "sync"] },
  { value: "settings", label: "Settings & permissions", actions: ["settings", "permission"] },
];

function AuditSection() {
  const { audit } = useYouTube();
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(10);
  const rows = useMemo(() => {
    const f = AUDIT_FILTERS.find((x) => x.value === filter);
    return audit.filter((a) => !f?.actions || f.actions.includes(a.action));
  }, [audit, filter]);

  const href = (e: (typeof audit)[number]) =>
    e.entity.type === "video" && e.entity.id ? ytRoutes.video(e.entity.id) : e.entity.type === "playlist" && e.entity.id ? ytRoutes.playlist(e.entity.id) : e.entity.type === "comment" && e.entity.id ? `${ytRoutes.comments}?thread=${e.entity.id}` : e.entity.type === "live" ? ytRoutes.live : null;

  return (
    <Section
      id="audit"
      title="Audit log"
      icon={Activity}
      badge={<InternalBadge label="OmniPlatform" />}
      description="Every important action taken on this channel through OmniPlatform."
      actions={
        <>
          <SelectMenu label="Filter audit log" value={filter} onChange={(v) => { setFilter(v); setLimit(10); }} options={AUDIT_FILTERS.map((f) => ({ value: f.value, label: f.label }))} />
          <Button size="sm" variant="secondary" icon={Download} onClick={() => { downloadCsv([["Time", "User", "Action", "Entity", "Previous", "New", "Source"], ...rows.map((r) => [r.at, r.actor, r.summary, r.entity.label, r.previous ?? "", r.next ?? "", r.source])], "youtube-audit-log.csv"); toast.success("Audit log exported"); }}>Export</Button>
        </>
      }
    >
      <div className="scrollbar-thin overflow-x-auto rounded-[10px] border border-[#E4E9F0]">
        <table className="w-full min-w-[860px] text-left">
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
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-[#6B7890]">No activity for this filter.</td></tr>}
            {rows.slice(0, limit).map((e) => {
              const link = href(e);
              return (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "pl-4 text-[12px]")} title={dateTime(e.at)}>{relative(e.at)}</td>
                  <td className={tdClass}><span className="flex items-center gap-2"><Avatar name={e.actor} className="size-6 text-[9px]" />{e.actor}</span></td>
                  <td className={cn(tdClass, "font-medium text-[#0F1B3D]")}>{e.summary}</td>
                  <td className={cn(tdClass, "max-w-[220px] truncate")}>{link ? <Link href={link} className="text-[#2563EB] hover:underline">{e.entity.label}</Link> : e.entity.label}</td>
                  <td className={cn(tdClass, "max-w-[240px] text-[12px]")}>
                    {e.previous || e.next ? (
                      <span className="block truncate" title={`${e.previous ?? "—"} → ${e.next ?? "—"}`}><span className="text-[#98A2B3] line-through">{e.previous ?? "—"}</span> → <span className="text-[#0F1B3D]">{e.next ?? "—"}</span></span>
                    ) : <span className="text-[#98A2B3]">—</span>}
                  </td>
                  <td className={cn(tdClass, "pr-4")}><Badge tone={e.source === "OmniPlatform" ? "violet" : "neutral"}>{e.source}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <div className="mt-3 text-center"><Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + 10)}>Show more ({rows.length - limit} remaining)</Button></div>}
    </Section>
  );
}

function PreviewSection() {
  const { connection, scopes, features, role, simulation, simulate, updateConnection } = useYouTube();
  const states: { value: ConnectionState; label: string }[] = [
    { value: "connected", label: "Connected" },
    { value: "syncing", label: "Syncing" },
    { value: "sync_failed", label: "Sync failed" },
    { value: "token_expired", label: "Token expired" },
    { value: "quota_exceeded", label: "Quota exceeded" },
    { value: "disconnected", label: "Disconnected" },
  ];
  return (
    <Section id="preview" title="Preview states" icon={FlaskConical} badge={<Badge tone="amber">Mock mode only</Badge>} description="Exercise permission, connection and data states before the backend is attached. This section is removed when live data is enabled.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <FormField label="Connection state">
            <SelectMenu<ConnectionState> label="Connection state" size="md" fullWidth value={connection.state} onChange={simulate.setConnectionState} options={states} />
          </FormField>
          <FormField label="View as role" hint="Changes what you're allowed to do across the workspace.">
            <SelectMenu<WorkspaceRole> label="Role" size="md" fullWidth value={role} onChange={simulate.setRole} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          </FormField>
          <div className="divide-y divide-[#EEF1F5] rounded-[10px] border border-[#E4E9F0]">
            <ToggleRow label="Live streaming enabled" checked={features.liveStreamingEnabled} onChange={(c) => simulate.setFeatures({ liveStreamingEnabled: c })} />
            <ToggleRow label="Monetization enabled" checked={features.monetizationEnabled} onChange={(c) => simulate.setFeatures({ monetizationEnabled: c })} />
            <ToggleRow label="Custom thumbnails enabled" checked={features.customThumbnailsEnabled} onChange={(c) => simulate.setFeatures({ customThumbnailsEnabled: c })} />
            <ToggleRow label="Audience below privacy threshold" checked={simulation.belowPrivacyThreshold} onChange={simulate.setBelowPrivacyThreshold} />
            <ToggleRow label="Fail the next API action" description="Mutations and the next upload fail with an actionable error." checked={simulation.failNextAction} onChange={simulate.setFailNextAction} />
            <ToggleRow label="Fail data loading" description="Shows the page-level load error with retry." checked={simulation.loadError} onChange={simulate.setLoadError} />
            <ToggleRow label="Quota above 80%" description="Shows the quota warning banner." checked={connection.quotaUsed / connection.quotaLimit >= 0.8} onChange={(c) => updateConnection({ quotaUsed: c ? 8_640 : 3_420 })} />
          </div>
          <Button size="sm" variant="secondary" onClick={() => { simulate.setLoading(true); setTimeout(() => simulate.setLoading(false), 1800); }}>Show loading skeletons</Button>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-[#24324F]">Granted OAuth scopes</p>
          <ul className="space-y-1 rounded-[10px] border border-[#E4E9F0] p-2">
            {ALL_SCOPES.map((s) => (
              <li key={s}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-[#F8FAFC]">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={(c) => simulate.toggleScope(s, Boolean(c))} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-[#0F1B3D]">{SCOPE_INFO[s].label}</span>
                    <code className="text-[11px] text-[#6B7890]">{s}</code>
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
  const { channel, connection, disconnect, can } = useYouTube();
  const [open, setOpen] = useState(false);
  return (
    <Card id="danger" className="scroll-mt-[80px] border-[#FBD5D9]">
      <CardHeader title={<span className="text-[#C81E2B]">Danger zone</span>} icon={AlertTriangle} className="border-b border-[#FBD5D9] pb-3" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-[240px] flex-1">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">Disconnect YouTube channel</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">Stops syncing and revokes OmniPlatform&apos;s access. Scheduled uploads from OmniPlatform won&apos;t publish. Your videos on YouTube aren&apos;t affected.</p>
        </div>
        <Button variant="dangerSolid" icon={Unplug} gate={can.canManageConnection} disabled={connection.state === "disconnected"} disabledReason="No channel is connected" onClick={() => setOpen(true)}>Disconnect channel</Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Disconnect “${channel.title}”?`}
        description="OmniPlatform loses access to this channel until someone reconnects it."
        affected={["Sync stops and cached analytics freeze", "Scheduled OmniPlatform uploads and approvals are paused", "Team members lose YouTube actions in OmniPlatform", "Videos, comments and playlists on YouTube are not deleted"]}
        confirmText="DISCONNECT"
        confirmLabel="Disconnect channel"
        onConfirm={disconnect}
      />
    </Card>
  );
}
