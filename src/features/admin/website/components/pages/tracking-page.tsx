"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, MousePointerClick, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { useOmniTracking, useTrackingMutations, useTrackingSnippet } from "../../data/hooks";
import { formatDateTime, formatNumber } from "../../data/selectors";
import { Card, Chip, SegmentedControl, StatTile, WButton } from "../ui/kit";
import { QueryErrorState, SkeletonBlock } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";

const PERIODS = [{ value: "7d", label: "7 days" }, { value: "28d", label: "28 days" }, { value: "90d", label: "90 days" }];

export function WebsiteTrackingPage() {
  const { clientId } = useWebsiteWorkspace();
  const [period, setPeriod] = useState("28d");
  const tracking = useOmniTracking(clientId, period);
  const snippet = useTrackingSnippet(clientId);
  const mutations = useTrackingMutations(clientId, period);
  const [copied, setCopied] = useState(false);
  const settings = snippet.data?.settings ?? tracking.data?.settings;

  if (tracking.isLoading || snippet.isLoading) return <SkeletonBlock lines={8} />;
  if (tracking.isError) return <QueryErrorState error={tracking.error} onRetry={() => { void tracking.refetch(); }} />;

  const events = tracking.data?.events ?? [];
  const eventCount = events.reduce((sum, item) => sum + item.count, 0);
  const pageViews = events.find((event) => event.name === "page_view")?.count ?? 0;
  const ctas = events.find((event) => event.name === "cta_click")?.count ?? 0;
  const forms = events.find((event) => event.name === "form_submit")?.count ?? 0;
  const scrolls = events.find((event) => event.name === "scroll_depth")?.count ?? 0;

  return (
    <div className="space-y-3">
      <Card title="Omni Tracking" subtitle="First-party, consent-aware event collection. No form values or raw identifiers are stored." icon={ShieldCheck}
        action={<SegmentedControl value={period} options={PERIODS} onChange={(value) => setPeriod(value)} ariaLabel="Tracking period" />}>
        <div className="grid gap-2 md:grid-cols-5">
          <StatTile label="Events" value={formatNumber(eventCount)} tone="violet" />
          <StatTile label="Page views" value={formatNumber(pageViews)} />
          <StatTile label="CTA clicks" value={formatNumber(ctas)} />
          <StatTile label="Forms" value={formatNumber(forms)} />
          <StatTile label="Scroll depth" value={formatNumber(scrolls)} />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card title="Installation" icon={MousePointerClick} subtitle={`Site key ${snippet.data?.siteKey ?? "not created"}`}
          action={<WButton size="sm" icon={RefreshCw} disabled={mutations.verify.isPending} onClick={() => mutations.verify.mutate(undefined, { onSuccess: (res) => toast.success(res.note), onError: () => toast.error("Verification failed") })}>Verify</WButton>}>
          <pre className="max-h-40 overflow-auto rounded-md bg-[#0F172A] p-3 text-[10.5px] leading-relaxed text-[#E2E8F0]"><code>{snippet.data?.snippet ?? ""}</code></pre>
          <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#6B7A94]">
            <span>Last event: {snippet.data?.lastEventAt ? formatDateTime(snippet.data.lastEventAt) : "Never"}</span>
            <span className="flex items-center gap-2"><Chip tone={snippet.data?.status === "installed" ? "good" : "muted"} dot>{snippet.data?.status ?? "pending"}</Chip><WButton size="sm" icon={copied ? Check : Copy} onClick={() => { navigator.clipboard.writeText(snippet.data?.snippet ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>Copy</WButton></span>
          </div>
          <p className="mt-3 rounded-md bg-[#F7F9FC] p-3 text-[11px] leading-relaxed text-[#53627C]">{snippet.data?.disclosure ?? tracking.data?.disclosure}</p>
        </Card>

        <Card title="Privacy Controls" icon={Settings2} subtitle="Changes never deploy a snippet automatically. They only control accepted events.">
          {settings ? <div className="space-y-2">
            <Toggle label="Tracking enabled" value={settings.trackingEnabled} onChange={(v) => mutations.updateSettings.mutate({ trackingEnabled: v })} />
            <Toggle label="Consent required" value={settings.consentRequired} onChange={(v) => mutations.updateSettings.mutate({ consentRequired: v })} />
            <Toggle label="Anonymous mode" value={settings.anonymousMode} onChange={(v) => mutations.updateSettings.mutate({ anonymousMode: v })} />
            <Toggle label="Respect DNT" value={settings.respectDnt} onChange={(v) => mutations.updateSettings.mutate({ respectDnt: v })} />
            <Toggle label="Respect GPC" value={settings.respectGpc} onChange={(v) => mutations.updateSettings.mutate({ respectGpc: v })} />
            <label className="flex items-center justify-between gap-3 rounded-md border border-[#E6EBF4] p-2 text-[12px]"><span>Retention days</span><input type="number" min={7} max={730} defaultValue={settings.retentionDays} onBlur={(e) => mutations.updateSettings.mutate({ retentionDays: Number(e.currentTarget.value) })} className="h-7 w-20 rounded border border-[#DAE1EC] px-2 text-right" /></label>
          </div> : null}
        </Card>
      </div>

      <Card title="Event Dashboard" subtitle="Real persisted events only; no heatmaps or estimated conversion rates.">
        <div className="divide-y divide-[#EEF2F8]">
          {events.length ? events.map((event) => (
            <div key={event.name} className="flex items-center justify-between py-2 text-[12px]">
              <span className="font-semibold text-[#111C3A]">{event.name}</span>
              <span className="text-[#53627C]">{formatNumber(event.count)} events · {formatNumber(event.users)} users</span>
            </div>
          )) : <p className="py-8 text-center text-[12px] text-[#6B7A94]">No tracking events in this range.</p>}
        </div>
      </Card>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-md border border-[#E6EBF4] p-2 text-[12px]"><span>{label}</span><input type="checkbox" checked={value} onChange={(e) => onChange(e.currentTarget.checked)} /></label>;
}
