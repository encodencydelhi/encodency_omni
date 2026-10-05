"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  KeyRound,
  Link2,
  Minus,
  PlugZap,
  RefreshCw,
  Unplug,
  UsersRound,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PageSkeleton } from "../components/states";
import { LinkChannelDialog } from "../components/link-channel-dialog";
import { SyncStatus } from "../components/workspace";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, DefinitionRow, InternalBadge, Notice, PageTitle, tdClass, thClass, yt } from "../components/ui";
import { ROLE_CAPABILITIES, hasRbac, type RbacCapability } from "../lib/capabilities";
import { GRANTED_INFO, GRANTED_KEYS, ytRoutes } from "../lib/constants";
import { dateTime, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { CompanySystemRole } from "@/types/domain/auth";
import type { GrantedKey } from "../types";

const SECTIONS: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "connection", label: "Connected Channel", icon: PlugZap },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "sync", label: "Sync", icon: RefreshCw },
  { id: "team", label: "Team Access", icon: UsersRound },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
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
  const [active, setActive] = useState("connection");

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

  return (
    <div className="space-y-1 pb-16">
      <PageTitle title="Settings" description="How the YouTube integration is connected, which permissions it holds and who can do what." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings Sections" className="h-fit min-w-0 lg:sticky lg:top-[76px]">
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

          <SyncSection />
          <TeamSection />

          <DangerSection />
        </div>
      </div>
    </div>
  );
}

function ConnectionSection() {
  const { channel, connection, rawConnection, can, startConsent, syncNow, isSyncing } = useYouTube();
  const [busy, setBusy] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    await fn();
    setBusy(null);
  };
  const disconnected = connection.state === "disconnected";
  const notMapped = connection.state === "not_mapped";
  const status = disconnected ? "Not connected" : notMapped ? "Connected to the company, not linked to this client" : connection.state === "token_expired" ? "Expired — reconnect required" : connection.state === "sync_failed" ? "Needs attention" : connection.state === "quota_exceeded" ? "Quota reached" : "Connected";
  return (
    <Section id="connection" title="Connected Channel" icon={PlugZap} description="The YouTube channel this client manages.">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex flex-1 items-center gap-3">
          <Avatar name={channel.title} src={channel.avatarUrl || undefined} className="size-12" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#0F1B3D]">{channel.title}</p>
            <p className="text-[12.5px] text-[#6B7890]">{channel.handle || channel.id || "No channel linked"}</p>
            <div className="mt-1.5"><SyncStatus compact /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={busy === "sync" || isSyncing} gate={can.canManageConnection} disabled={disconnected || notMapped || connection.state === "token_expired"} disabledReason="Connect and link the channel before syncing" onClick={() => run("sync", syncNow)}>Sync now</Button>
          <Button size="sm" variant={connection.state === "token_expired" || disconnected ? "primary" : "secondary"} icon={PlugZap} loading={busy === "reconnect"} gate={can.canManageConnection} onClick={() => run("reconnect", () => startConsent())}>{disconnected ? "Connect" : "Reconnect"}</Button>
          {notMapped && <Button size="sm" variant="primary" icon={Link2} gate={can.canManageConnection} onClick={() => setLinkOpen(true)}>Link channel</Button>}
          <Button size="sm" variant="danger" icon={Unplug} gate={can.canManageConnection} disabled={disconnected} disabledReason="No channel connected" href="#danger">Disconnect</Button>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-8 md:grid-cols-2">
        <div>
          <DefinitionRow label="Channel">{channel.title}</DefinitionRow>
          <DefinitionRow label="Channel ID" mono>{channel.id || "—"}</DefinitionRow>
          <DefinitionRow label="Google Account">{channel.googleAccount ?? rawConnection?.googleAccountName ?? "—"}</DefinitionRow>
        </div>
        <div>
          <DefinitionRow label="Status">{status}</DefinitionRow>
          <DefinitionRow label="Last Sync">{connection.lastSyncedAt ? dateTime(connection.lastSyncedAt) : "Not synced yet"}</DefinitionRow>
          <DefinitionRow label="Channel On YouTube">
            {channel.id ? <a href={ytRoutes.channelOnYouTube(channel)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">{channel.customUrl || channel.id}</a> : "—"}
          </DefinitionRow>
        </div>
      </dl>
      <LinkChannelDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </Section>
  );
}

function PermissionsSection() {
  const { granted, startConsent, can } = useYouTube();
  const [busy, setBusy] = useState<GrantedKey | null>(null);
  const missing = GRANTED_KEYS.filter((k) => !granted?.[k]);
  const grant = async (key: GrantedKey) => {
    const consent = GRANTED_INFO[key].consent;
    if (busy) return;
    setBusy(key);
    // Only the NAMED capability is sent; the server owns the mapping to Google scopes.
    await startConsent(consent ?? undefined);
    setBusy(null);
  };
  return (
    <Section id="permissions" title="Permissions" icon={KeyRound} description="Google permissions granted to OmniPlatform for this channel. Each can be granted on its own.">
      {missing.length > 0 && <Notice tone="amber" className="mb-3" title={`${missing.length} permission${missing.length > 1 ? "s" : ""} missing`}>Actions that need these permissions are disabled until you grant them. Granting one keeps the others.</Notice>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {GRANTED_KEYS.map((key) => {
          const ok = Boolean(granted?.[key]);
          const info = GRANTED_INFO[key];
          return (
            <li key={key} className={cn("flex items-start gap-2.5 rounded-sm border px-3 py-2.5", ok ? "border-[#E4E9F0]" : "border-[#FBE3B6] bg-[#FFFAF0]")}>
              {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#12B76A]" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-[#B54708]" />}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]">{info.label}<span className="sr-only">{ok ? "granted" : "missing"}</span></span>
                <span className="block text-[12px] leading-4 text-[#6B7890]">{info.description}</span>
                {!ok && info.consent && (
                  <Button size="xs" variant="primary" className="mt-2" loading={busy === key} gate={can.canManageConnection} onClick={() => void grant(key)}>Grant permission</Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SyncSection() {
  const { connection, can, syncNow, isSyncing } = useYouTube();
  return (
    <Section id="sync" title="Sync" icon={RefreshCw} description="Channel data is read from YouTube when you open a page and cached briefly to save quota. Edits and replies are sent to YouTube immediately.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <dl>
            <DefinitionRow label="Last Successful Sync">{connection.lastSyncedAt ? `${dateTime(connection.lastSyncedAt)} (${relative(connection.lastSyncedAt)})` : "Not synced yet"}</DefinitionRow>
          </dl>
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={isSyncing} gate={can.canManageConnection} disabled={connection.state === "token_expired" || connection.state === "disconnected" || connection.state === "not_mapped"} disabledReason="Connect and link the channel first" onClick={() => void syncNow()}>Sync now</Button>
        </div>
      </div>
    </Section>
  );
}

const MATRIX: { label: string; capability: RbacCapability }[] = [
  { label: "View Channel, Videos And Analytics", capability: "integrations:read" },
  { label: "Edit Videos, Playlists and Comments, Create Live Events", capability: "content:write" },
  { label: "Upload, Publish, Schedule, Go Live", capability: "content:publish" },
  { label: "Delete, Remove Comments, Sync, Stream Keys, Connection", capability: "integrations:write" },
];
const ROLES: { role: CompanySystemRole; label: string }[] = [
  { role: "VIEWER", label: "Viewer" },
  { role: "MANAGER", label: "Manager" },
  { role: "ADMIN", label: "Admin" },
  { role: "OWNER", label: "Owner" },
];

function TeamSection() {
  const { role } = useYouTube();
  return (
    <Section id="team" title="Team Access" icon={UsersRound} badge={<InternalBadge label="RBAC" />} description="What each company role can do in YouTube. Enforced by the platform on every action, not only in the navigation.">
      <div className="space-y-4">
        <div className="scrollbar-thin overflow-x-auto rounded-[10px] border border-[#E4E9F0]">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static pl-4")}>Capability</th>
                {ROLES.map((r) => <th key={r.role} className={cn(thClass, "static text-center normal-case tracking-normal")}>{r.label}{role === r.role ? " (you)" : ""}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.capability} className="hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "whitespace-normal pl-4 font-medium text-[#24324F]")}>{row.label}</td>
                  {ROLES.map((r) => (
                    <td key={r.role} className={cn(tdClass, "text-center")}>
                      {ROLE_CAPABILITIES[r.role].includes(row.capability) ? <Check className="mx-auto size-4 text-[#12B76A]" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-[#C9D1DC]" aria-label="Not Allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-[#6B7890]">{role ? `Your role: ${ROLES.find((r) => r.role === role)?.label}. ${hasRbac(role, "content:publish") ? "You can publish." : "You can't publish or upload."}` : "Your role couldn't be determined."}</p>
          <Button size="xs" variant="link" href="/admin/team">Manage Team</Button>
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
          <p className="text-[13px] font-semibold text-[#0F1B3D]">Disconnect YouTube</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">Removes the company&apos;s YouTube connection, so every client that uses it loses access in OmniPlatform. Scheduled publishes from OmniPlatform won&apos;t run. Your videos on YouTube aren&apos;t affected.</p>
        </div>
        <Button variant="dangerSolid" icon={Unplug} gate={can.canManageConnection} disabled={connection.state === "disconnected"} disabledReason="No channel is connected" onClick={() => setOpen(true)}>Disconnect YouTube</Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Disconnect “${channel.title}”?`}
        description="OmniPlatform loses access to this company's YouTube account until someone reconnects it."
        affected={["Syncing, publishing and replies stop for every client using this connection", "Scheduled OmniPlatform publishes won't run", "Videos, comments and playlists on YouTube are not deleted"]}
        confirmText="DISCONNECT"
        confirmLabel="Disconnect YouTube"
        onConfirm={disconnect}
      />
    </Card>
  );
}
