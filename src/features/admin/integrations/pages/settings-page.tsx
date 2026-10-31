"use client";

import { useEffect, useState } from "react";
import { BellRing, Database, Download, Lock, Megaphone, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { useUnsavedChanges } from "../integrations-data/hooks";
import { downloadFile, toCsv } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationSettings } from "../integrations-data/types";
import { PageSkeleton } from "../components/blocks";
import { Button, Card, CardHeader, SettingRow, x } from "../components/ui";

const SECTIONS = [
  { id: "upkeep", label: "Connection upkeep", icon: RefreshCw },
  { id: "safety", label: "Disconnect safety", icon: ShieldCheck },
  { id: "ads", label: "Ad budget safety", icon: Megaphone },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "data", label: "Your data", icon: Database },
];

export function SettingsPage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="settings" />;
  return <Settings />;
}

/** Every switch here is applied by the server; none is a preference that nothing reads. */
function Settings() {
  const { data, can, updateSettings } = useIntegrations();
  const saved = data.settings;
  const [draft, setDraft] = useState<IntegrationSettings>(saved);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("upkeep");
  const canEdit = can.canManageSettings.allowed;

  // The draft follows the server's copy only when its content really changed (a save elsewhere), never on a plain reload,
  // so a refresh in the background cannot throw away what is being edited.
  const savedKey = JSON.stringify(saved);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setDraft(JSON.parse(savedKey) as IntegrationSettings);
  }

  const dirty = JSON.stringify(draft) !== savedKey;

  const summarize = () => {
    const parts: string[] = [];
    if (draft.autoRefresh !== saved.autoRefresh) parts.push("automatic renewal");
    if (draft.confirmBeforeDisconnect !== saved.confirmBeforeDisconnect || draft.blockDisconnectWithScheduledPosts !== saved.blockDisconnectWithScheduledPosts) parts.push("disconnect safety");
    if (draft.metaMaxDailyBudget !== saved.metaMaxDailyBudget) parts.push("ad budget limit");
    return `Updated ${parts.join(" and ") || "integration settings"}`;
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

  const update = (patch: Partial<IntegrationSettings>) => setDraft((current) => ({ ...current, ...patch }));

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
            These settings apply to your organization only. Provider credentials, callback URLs and platform limits are managed by Media360 and never shown here.
          </p>
        </Card>

        <Section id="upkeep" title="Connection upkeep" description="What Media360 does by itself to keep logins working" icon={RefreshCw}>
          <SettingRow
            title="Renew access automatically"
            description="About once a day, and when a LinkedIn token is within a week of its end, Media360 renews the logins that can renew themselves (Google Business, YouTube, LinkedIn). A login that was revoked is found early instead of when someone needs it. Meta logins cannot renew themselves; you reconnect them before they end."
            control={<Switch checked={draft.autoRefresh} disabled={!canEdit} onCheckedChange={(autoRefresh) => update({ autoRefresh })} aria-label="Renew access automatically" />}
          />
        </Section>

        <Section id="safety" title="Disconnect safety" description="How careful the console is before it disconnects something that is in use" icon={ShieldCheck}>
          <SettingRow
            title="Ask for a typed confirmation"
            description="When posts are still waiting to go out through an integration, disconnecting it asks you to type “disconnect” first."
            control={<Switch checked={draft.confirmBeforeDisconnect} disabled={!canEdit} onCheckedChange={(confirmBeforeDisconnect) => update({ confirmBeforeDisconnect })} aria-label="Ask for a typed confirmation" />}
          />
          <SettingRow
            title="Block disconnecting while posts are scheduled"
            description="The server refuses to disconnect an integration until the posts waiting to go out through it are cancelled or moved. Without this, disconnecting is allowed after you confirm and those posts fail."
            control={<Switch checked={draft.blockDisconnectWithScheduledPosts} disabled={!canEdit} onCheckedChange={(blockDisconnectWithScheduledPosts) => update({ blockDisconnectWithScheduledPosts })} aria-label="Block disconnecting while posts are scheduled" />}
          />
        </Section>

        <Section id="ads" title="Ad budget safety" description="A ceiling that protects against a budget typed with an extra zero" icon={Megaphone}>
          <SettingRow
            title="Largest daily budget for one Meta campaign or ad set"
            description="Creating, editing or switching on a Meta campaign or ad set with a bigger daily budget is refused by the server. The amount is in whole units of the ad account's own currency (for example rupees, not paise). Enter 0 for no limit."
            control={
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={10_000_000}
                step={1}
                value={draft.metaMaxDailyBudget}
                disabled={!canEdit}
                aria-label="Largest daily budget for one Meta campaign or ad set"
                onChange={(event) => {
                  const next = Math.trunc(Number(event.target.value));
                  if (Number.isFinite(next)) update({ metaMaxDailyBudget: Math.min(10_000_000, Math.max(0, next)) });
                }}
                className="h-8 w-36 rounded-sm border border-[#DDE4ED] bg-white px-2 text-right text-[12px] tabular-nums text-[#172044] disabled:opacity-60"
              />
            }
          />
        </Section>

        <Section id="alerts" title="Alerts" description="Who hears about integration problems, and where" icon={BellRing}>
          <SettingRow
            title="Connection alerts"
            description="Owners and Admins get an in-app notice when an integration needs reconnecting or its access is about to end. E-mail and WhatsApp for these alerts are chosen in Settings → Notifications, under “Channel needs reconnecting”."
            control={
              <Button size="sm" variant="secondary" href="/admin/settings">
                Open Settings
              </Button>
            }
          />
        </Section>

        <DataSection />

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

function DataSection() {
  const { data } = useIntegrations();

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
    <Section id="data" title="Your data" description="What is recorded about your integrations, and taking it with you" icon={Database}>
      <SettingRow
        title="Export connection activity"
        description={`${data.activity.length} recorded ${data.activity.length === 1 ? "event" : "events"} as CSV. The full history stays in the platform audit log.`}
        control={
          <Button size="sm" variant="secondary" icon={Download} disabled={data.activity.length === 0} disabledReason="Nothing has been recorded yet." onClick={exportActivity}>
            Export
          </Button>
        }
      />
    </Section>
  );
}
