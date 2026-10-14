"use client";

/**
 * Monitoring — uptime, certificate, DNS, error responses and change detection.
 *
 * Registrar and domain-expiry data is deliberately absent: that needs a WHOIS or
 * RDAP provider we have not connected, and a guessed expiry date on a monitoring
 * screen is worse than no date at all.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  GitCompareArrows,
  Globe2,
  Info,
  Lock,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils/cn";
import { useWebsiteMonitoring, useWebsiteSettings } from "../../data/hooks";
import {
  checkTone,
  downloadFile,
  formatDate,
  formatDateTime,
  formatMinutes,
  formatMs,
  formatNumber,
  formatRelative,
  formatShortDate,
  toCsv,
} from "../../data/selectors";
import type { ChangeRecord, ErrorSample, MonitoringData, UptimeIncident } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  KeyValue,
  Meter,
  Pagination,
  StatTile,
  SubTabs,
  usePagination,
  WButton,
  type Column,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { WEBSITE_MOCK_MODE } from "../../data/config";
import { MonitoringAlertsTab, MonitoringIncidentsTab, MonitoringLiveTab } from "../ui/monitoring-alerts";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type MonitoringTab = "live" | "incidents" | "alerts" | "overview" | "uptime" | "ssl" | "dns" | "errors" | "changes";

const TABS: { value: MonitoringTab; label: string }[] = [
  { value: "live", label: "Live status" },
  { value: "incidents", label: "Incidents" },
  { value: "alerts", label: "Alerts" },
  { value: "overview", label: "Overview" },
  { value: "uptime", label: "Uptime" },
  { value: "ssl", label: "SSL" },
  { value: "dns", label: "DNS" },
  { value: "errors", label: "Errors" },
  { value: "changes", label: "Changes" },
];

const INCIDENT_LABEL: Record<UptimeIncident["kind"], string> = {
  down: "Down",
  degraded: "Degraded",
  ssl: "Certificate",
  timeout: "Timeout",
};

export function WebsiteMonitoringPage() {
  const { clientId, runScan, scan, navigate } = useWebsiteWorkspace();
  const monitoring = useWebsiteMonitoring(clientId);
  const settings = useWebsiteSettings(clientId);
  const [tab, setTab] = useUrlState<MonitoringTab>("tab", "live", TABS.map((entry) => entry.value));

  const archived = settings.data?.monitoringArchived === true;
  const disabled = settings.data ? !settings.data.monitoring.enabled : false;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs
          ariaLabel="Monitoring sections"
          value={tab}
          onChange={setTab}
          options={TABS.map((entry) => ({
            value: entry.value,
            label: entry.label,
            ...(entry.value === "errors" ? { count: monitoring.data?.errors.length } : {}),
            ...(entry.value === "changes" ? { count: monitoring.data?.changes.length } : {}),
          }))}
        />
        <WButton
          size="sm"
          icon={RefreshCw}
          disabled={scan.isRunning}
          disabledReason="A check is already running"
          onClick={() => runScan("uptime")}
        >
          Check now
        </WButton>
      </div>

      {archived || disabled ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#F5DFB8] bg-[#FDF3E3] px-3 py-2">
          <p className="text-[11.5px] font-medium text-[#9A5B08]">
            {archived
              ? "Monitoring is archived for this website. Historic data is kept; no new checks are running."
              : "Monitoring is switched off for this website. No new checks are running."}
          </p>
          <WButton size="sm" onClick={() => navigate("/admin/website/settings?section=monitoring")}>
            Open monitoring settings
          </WButton>
        </div>
      ) : null}

      {!WEBSITE_MOCK_MODE ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#E6EBF4] bg-[#F7F9FC] px-3 py-2">
          <Info className="mt-0.5 size-4 shrink-0 text-[#4A5A73]" aria-hidden />
          <p className="text-[11.5px] leading-relaxed text-[#4A5A73]">
            Status, certificate and DNS come from a real check run when you open this page. Uptime percentages and
            incidents are computed only from availability checks that were actually recorded (scheduled checks, plus
            the checks made when this page is opened) — see the note under the figures for how many checks they rest on.
          </p>
        </div>
      ) : null}

      {tab === "live" ? <MonitoringLiveTab /> : null}
      {tab === "incidents" ? <MonitoringIncidentsTab /> : null}
      {tab === "alerts" ? <MonitoringAlertsTab /> : null}

      {tab === "live" || tab === "incidents" || tab === "alerts" ? null : monitoring.isLoading ? (
        <>
          <SkeletonStats count={4} />
          <SkeletonBlock lines={6} />
        </>
      ) : monitoring.error ? (
        <Card title="Monitoring">
          <QueryErrorState error={monitoring.error} onRetry={() => void monitoring.refetch()} />
        </Card>
      ) : monitoring.data ? (
        <>
          {tab === "overview" ? <OverviewTab data={monitoring.data} onTab={setTab} /> : null}
          {tab === "uptime" ? <UptimeTab data={monitoring.data} /> : null}
          {tab === "ssl" ? <SslTab data={monitoring.data} /> : null}
          {tab === "dns" ? <DnsTab data={monitoring.data} /> : null}
          {tab === "errors" ? <ErrorsTab data={monitoring.data} /> : null}
          {tab === "changes" ? <ChangesTab data={monitoring.data} /> : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatusBanner({ data }: { data: MonitoringData }) {
  const status = data.uptime.status;
  const tone = status === "live" ? "good" : status === "degraded" ? "warn" : status === "down" ? "bad" : "muted";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5",
        tone === "good"
          ? "border-[#BDE8D6] bg-[#E6F6EF]"
          : tone === "warn"
            ? "border-[#F5DFB8] bg-[#FDF3E3]"
            : tone === "bad"
              ? "border-[#F7CFCC] bg-[#FDECEB]"
              : "border-[#E6EBF4] bg-white",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-lg",
            tone === "good"
              ? "bg-[#12A06D] text-white"
              : tone === "warn"
                ? "bg-[#E29208] text-white"
                : tone === "bad"
                  ? "bg-[#DC3A32] text-white"
                  : "bg-[#94A3B8] text-white",
          )}
        >
          <Wifi className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-[#111C3A]">
            {status === "live" ? "UP" : status === "degraded" ? "DEGRADED" : status === "down" ? "DOWN" : "UNKNOWN"}
          </p>
          <p className="text-[11.5px] text-[#4A5A73]">
            {data.uptime.lastCheckedAt ? `Checked ${formatRelative(data.uptime.lastCheckedAt)}` : "Not checked yet"}
            {data.uptime.checkIntervalMinutes
              ? ` · every ${formatMinutes(data.uptime.checkIntervalMinutes)}`
              : " · no scheduled checks — one-off live check"}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Uptime 30d</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">
            {data.uptime.uptimePct30d === null ? "Not available" : `${data.uptime.uptimePct30d.toFixed(2)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Uptime 90d</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">
            {data.uptime.uptimePct90d === null ? "Not available" : `${data.uptime.uptimePct90d.toFixed(2)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Last downtime</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">
            {data.uptime.lastDowntimeAt
              ? formatRelative(data.uptime.lastDowntimeAt)
              : data.uptime.uptimePct30d === null
                ? "No history"
                : "Never"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function UptimeStrip({ data }: { data: MonitoringData }) {
  const days = data.uptime.dailyStatus.slice(-60);
  if (days.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs font-semibold text-[#28354C]">Availability history</p>
        <p className="mt-1 text-[11px] text-[#6B7A94]">Availability history starts after scheduled checks complete.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-end gap-[2px]" role="img" aria-label="Daily uptime for recorded checks">
        {days.map((day) => {
          const tone = day.uptimePct >= 99.9 ? "bg-[#12A06D]" : day.uptimePct >= 99 ? "bg-[#E29208]" : "bg-[#DC3A32]";
          return (
            <span
              key={day.date}
              title={`${formatDate(day.date)} · ${day.uptimePct.toFixed(2)}%${day.incidents > 0 ? ` · ${day.incidents} incident` : ""}`}
              className={cn("h-7 flex-1 rounded-[2px]", tone)}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#94A3B8]">
        <span>{formatDate(days[0]?.date ?? null)}</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-[#12A06D]" /> 99.9%+
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-[#E29208]" /> 99–99.9%
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-[#DC3A32]" /> &lt; 99%
          </span>
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

function OverviewTab({ data, onTab }: { data: MonitoringData; onTab: (tab: MonitoringTab) => void }) {
  const failingHeaders = data.securityHeaders.filter((header) => header.status !== "pass");

  return (
    <div className="space-y-1">
      <StatusBanner data={data} />

      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <StatTile
          label="Certificate expires"
          value={data.ssl.daysRemaining === null ? "Not checked" : `${data.ssl.daysRemaining} days`}
          best="> 90 days"
          sub={formatDate(data.ssl.validTo)}
          icon={Lock}
          tone={data.ssl.daysRemaining === null ? "muted" : data.ssl.daysRemaining < 30 ? "warn" : "good"}
          onClick={() => onTab("ssl")}
        />
        <StatTile
          label="Incidents · 90 days"
          value={data.uptime.incidents.length}
          best="0"
          sub="Down, degraded, timeout or certificate"
          icon={AlertOctagon}
          tone={data.uptime.incidents.length > 2 ? "warn" : "good"}
          onClick={() => onTab("uptime")}
        />
        <StatTile
          label="Error responses"
          value={data.errors.length}
          best="0"
          sub="Distinct failing URLs"
          icon={TriangleAlert}
          tone={data.errors.length > 0 ? "bad" : "good"}
          onClick={() => onTab("errors")}
        />
        <StatTile
          label="Detected changes"
          value={data.changes.length}
          best="0 unintended"
          sub="Titles, meta, robots, sitemap"
          icon={GitCompareArrows}
          tone="info"
          onClick={() => onTab("changes")}
        />
      </div>

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card
          title="Availability history"
          icon={Activity}
          subtitle="Each bar records whether the website was reachable that day · last 60 days"
        >
          <UptimeStrip data={data} />
          <div className="mt-4">
            <ChartLegend
              className="mb-1"
              items={[{ key: "responseMs", label: "Response time (ms)", color: SERIES_COLORS[0] }]}
            />
            <div className="h-[168px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.uptime.responseTrend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={26} />
                  <YAxis {...AXIS_PROPS} width={44} />
                  <Tooltip content={makeTooltip((entry) => formatMs(entry.value), (label) => formatDate(label))} />
                  <Line
                    type="monotone"
                    dataKey="responseMs"
                    name="Response time"
                    stroke={SERIES_COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card
          title="Security hygiene"
          icon={ShieldCheck}
          subtitle="Public response headers only — this is hygiene, not a penetration test"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F2F5FA]">
            {data.securityHeaders.map((header) => (
              <li key={header.header} className="px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] font-semibold text-[#28354C]">{header.header}</span>
                  <Chip tone={checkTone[header.status]}>
                    {header.present ? "Present" : header.status === "error" ? "Missing" : "Not set"}
                  </Chip>
                </div>
                {header.value ? (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-[#6B7A94]">{header.value}</p>
                ) : (
                  <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">{header.recommendation}</p>
                )}
              </li>
            ))}
          </ul>
          {failingHeaders.length > 0 ? (
            <p className="border-t border-[#EEF2F8] bg-[#FAFBFD] px-3.5 py-2 text-[10.5px] text-[#6B7A94]">
              {failingHeaders.length} of {data.securityHeaders.length} headers need attention. These are set at the
              server or CDN by whoever hosts the site.
            </p>
          ) : null}
        </Card>
      </div>

      <Card title={`Downtime incidents (${data.uptime.incidents.length})`} icon={AlertOctagon} bodyClassName="p-0">
        {data.uptime.incidents.length === 0 ? (
          <EmptyState title="No downtime recorded" body="No outages have been observed. Only checks that actually ran against this site are listed — background monitoring is not enabled yet." compact />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {data.uptime.incidents.slice(0, 8).map((incident) => (
              <li key={incident.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-semibold text-[#28354C]">{formatDateTime(incident.startedAt)}</span>
                  <span className="block truncate text-[10.5px] text-[#6B7A94]">{incident.note}</span>
                </span>
                <Chip tone={incident.kind === "down" ? "bad" : "warn"}>{formatMinutes(incident.durationMinutes)}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function UptimeTab({ data }: { data: MonitoringData }) {
  const columns: Column<UptimeIncident>[] = [
    {
      key: "started",
      header: "Started",
      primary: true,
      sortValue: (row) => row.startedAt,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-[#28354C]">{formatDateTime(row.startedAt)}</p>
          <p className="text-[10.5px] text-[#6B7A94]">{formatRelative(row.startedAt)}</p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      cell: (row) => (
        <Chip tone={row.kind === "down" ? "bad" : row.kind === "degraded" ? "warn" : "info"} dot>
          {INCIDENT_LABEL[row.kind]}
        </Chip>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      sortValue: (row) => row.durationMinutes,
      cell: (row) => formatMinutes(row.durationMinutes),
    },
    {
      key: "status",
      header: "HTTP",
      align: "center",
      cell: (row) => (row.httpStatus ? <Chip tone="muted">{row.httpStatus}</Chip> : <span>—</span>),
    },
    { key: "note", header: "What happened", hideOnMobile: true, cell: (row) => <span className="text-[11px] text-[#6B7A94]">{row.note}</span> },
  ];

  return (
    <div className="space-y-1">
      <StatusBanner data={data} />

      <Card title="Uptime history" icon={Activity} subtitle="Last 60 days">
        <UptimeStrip data={data} />
      </Card>

      <Card
        title={`Incidents (${data.uptime.incidents.length})`}
        icon={AlertOctagon}
        action={
          <WButton
            size="sm"
            icon={Download}
            disabled={data.uptime.incidents.length === 0}
            disabledReason="No incidents to export"
            onClick={() => {
              downloadFile(
                "uptime-incidents.csv",
                toCsv(
                  ["Started", "Ended", "Duration (min)", "Type", "HTTP", "Note"],
                  data.uptime.incidents.map((incident) => [
                    incident.startedAt,
                    incident.endedAt,
                    incident.durationMinutes,
                    incident.kind,
                    incident.httpStatus,
                    incident.note,
                  ]),
                ),
              );
              toast.success("Incidents exported");
            }}
          >
            Export
          </WButton>
        }
        bodyClassName="p-0"
      >
        <DataTable
          columns={columns}
          rows={data.uptime.incidents}
          getRowId={(row) => row.id}
          empty={
            <EmptyState
              title="No incidents recorded"
              body="No outages have been observed for this website. Incidents appear here once scheduled checks are running."
              icon={ShieldCheck}
            />
          }
        />
      </Card>
    </div>
  );
}

function SslTab({ data }: { data: MonitoringData }) {
  const ssl = data.ssl;
  const total = 90;
  const days = ssl.daysRemaining;
  const remaining = days === null ? 0 : Math.max(0, Math.min(total, days));
  const daysTone = days === null ? "muted" : days < 14 ? "bad" : days < 30 ? "warn" : "good";

  return (
    <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Certificate" icon={Lock}>
        <div className="mb-3 rounded-xl border border-[#E6EBF4] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">
              Days remaining
            </span>
            <Chip tone={daysTone} dot>
              {days === null
                ? "Not checked"
                : days < 14
                  ? "Renew now"
                  : days < 30
                    ? "Renew soon"
                    : "Healthy"}
            </Chip>
          </div>
          <p className="mt-1 text-[24px] font-semibold tracking-[-0.025em] text-[#111C3A]">
            {days === null ? "—" : days}
          </p>
          <Meter
            value={remaining}
            max={total}
            tone={daysTone}
            className="mt-2"
            label="Days remaining on certificate"
          />
        </div>

        <dl className="divide-y divide-[#F2F5FA]">
          <KeyValue label="HTTPS">
            {ssl.httpsEnabled === null ? (
              <Chip tone="muted">Unknown</Chip>
            ) : (
              <Chip tone={ssl.httpsEnabled ? "good" : "bad"}>{ssl.httpsEnabled ? "Enabled" : "Not enabled"}</Chip>
            )}
          </KeyValue>
          <KeyValue label="Certificate status">
            {ssl.certificateValid === null ? (
              <Chip tone="muted">Not checked</Chip>
            ) : (
              <Chip tone={ssl.certificateValid ? "good" : "bad"}>{ssl.certificateValid ? "Valid" : "Invalid"}</Chip>
            )}
          </KeyValue>
          <KeyValue label="Issuer">{ssl.issuer ?? "—"}</KeyValue>
          <KeyValue label="Subject">{ssl.subject}</KeyValue>
          <KeyValue label="Valid from">{formatDate(ssl.validFrom)}</KeyValue>
          <KeyValue label="Valid to">{formatDate(ssl.validTo)}</KeyValue>
          <KeyValue label="Protocol">{ssl.protocol ?? "—"}</KeyValue>
        </dl>
        {!WEBSITE_MOCK_MODE ? (
          <p className="mt-3 rounded-md bg-[#F7F9FC] px-2.5 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
            Certificate details are read from a real TLS handshake against this domain during the check. A field shows
            “Not checked” when the handshake could not be completed.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-1">
        <Card title="HTTPS hygiene" icon={ShieldCheck}>
          <dl className="divide-y divide-[#F2F5FA]">
            <KeyValue label="HSTS">
              {ssl.hstsEnabled === null ? (
                <Chip tone="muted">Unknown</Chip>
              ) : (
                <Chip tone={ssl.hstsEnabled ? "good" : "warn"}>{ssl.hstsEnabled ? "Enabled" : "Not set"}</Chip>
              )}
            </KeyValue>
            <KeyValue label="Pages with mixed content">
              {ssl.mixedContentPages === null ? (
                <Chip tone="muted">Not checked</Chip>
              ) : (
                <Chip tone={ssl.mixedContentPages > 0 ? "bad" : "good"}>{ssl.mixedContentPages}</Chip>
              )}
            </KeyValue>
          </dl>
          <p className="mt-2 rounded-md bg-[#F7F9FC] px-2.5 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
            Mixed content means an HTTPS page loading an http:// resource. Browsers block or downgrade these, and the
            padlock disappears for visitors. This probe does not render subresources, so the count shows “Not checked”.
          </p>
        </Card>

        <Card title="Security headers" icon={ShieldCheck} bodyClassName="p-0">
          <ul className="divide-y divide-[#F2F5FA]">
            {data.securityHeaders.map((header) => (
              <li key={header.header} className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="truncate font-mono text-[11px] text-[#28354C]">{header.header}</span>
                <Chip tone={checkTone[header.status]}>{header.present ? "Present" : "Missing"}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function DnsCopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied to clipboard" : `${label}: ${text}`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#94A3B8] transition-colors hover:bg-[#EEF2F8] hover:text-[#28354C] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB]"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="size-3 text-[#12A06D]" /> : <Copy className="size-3" />}
    </button>
  );
}

function DnsTab({ data }: { data: MonitoringData }) {
  const dns = data.dns;
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Unique record types present in data
  const recordTypes = useMemo(() => {
    const types = Array.from(new Set(dns.records.map((r) => r.type)));
    return types.sort();
  }, [dns.records]);

  // Counts by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dns.records.length };
    dns.records.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [dns.records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return dns.records.filter((rec) => {
      const matchesType =
        selectedType === "all" || rec.type.toLowerCase() === selectedType.toLowerCase();
      const matchesQuery =
        !searchQuery.trim() ||
        rec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [dns.records, selectedType, searchQuery]);

  // DNS-related changes from history
  const dnsChanges = useMemo(() => {
    return (data.changes || []).filter(
      (c) =>
        c.field.toLowerCase().includes("dns") ||
        c.field.toLowerCase().includes("nameserver") ||
        c.field.toLowerCase().includes("record"),
    );
  }, [data.changes]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Badge tone for DNS record types
  const getRecordTone = (type: string): "info" | "warn" | "good" | "violet" | "muted" => {
    switch (type.toUpperCase()) {
      case "A":
      case "AAAA":
        return "info";
      case "MX":
        return "violet";
      case "TXT":
        return "warn";
      case "CNAME":
        return "info";
      case "NS":
        return "good";
      default:
        return "muted";
    }
  };

  const extractPriority = (type: string, value: string): string => {
    if (type.toUpperCase() === "MX") {
      const match = value.match(/^(\d+)\s+/);
      if (match) return match[1] ?? "—";
    }
    return "—";
  };

  return (
    <div className="space-y-2">
      {/* A. Compact DNS Summary KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Resolution Status"
          value={dns.resolves === null ? "Not checked" : dns.resolves ? "Resolving" : "Failing"}
          tone={dns.resolves === null ? "muted" : dns.resolves ? "good" : "bad"}
          icon={Network}
          sub={dns.resolves ? "Public DNS verified" : "Resolution failed"}
        />
        <StatTile
          label="DNS Records"
          value={dns.records.length}
          tone="info"
          icon={Globe2}
          sub="Resolved active records"
        />
        <StatTile
          label="Resolved IPs"
          value={dns.resolvedIps.length}
          tone="good"
          icon={Server}
          sub="Edge IP addresses"
        />
        <StatTile
          label="Nameservers"
          value={dns.nameservers.length}
          tone="violet"
          icon={ShieldCheck}
          sub="Authoritative servers"
        />
        <StatTile
          label="Last Checked"
          value={data.uptime.lastCheckedAt ? formatRelative(data.uptime.lastCheckedAt) : "Live on load"}
          tone="muted"
          icon={CalendarClock}
          sub={data.uptime.lastCheckedAt ? formatDate(data.uptime.lastCheckedAt) : "Real-time probe"}
        />
      </div>

      {/* B. DNS Resolution Section */}
      <Card
        title="DNS Resolution Infrastructure"
        icon={Network}
        subtitle="Live query responses against public resolvers (8.8.8.8, 1.1.1.1)"
        bodyClassName="p-3.5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {/* Resolved IPs */}
          <div className="rounded-xl border border-[#E6EBF4] bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
                Resolved IP Addresses
              </span>
              <Chip tone={dns.resolvedIps.length > 0 ? "good" : "warn"} dot>
                {dns.resolvedIps.length} {dns.resolvedIps.length === 1 ? "IP" : "IPs"}
              </Chip>
            </div>
            {dns.resolvedIps.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5">
                {dns.resolvedIps.map((ip) => (
                  <li
                    key={ip}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-mono font-semibold text-[#111C3A]">{ip}</span>
                    <DnsCopyButton text={ip} label="Copy IP" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-[#94A3B8]">No resolved IP addresses reported.</p>
            )}
          </div>

          {/* Nameservers */}
          <div className="rounded-xl border border-[#E6EBF4] bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
                Authoritative Nameservers
              </span>
              <Chip tone={dns.nameservers.length > 0 ? "violet" : "warn"} dot>
                {dns.nameservers.length} NS
              </Chip>
            </div>
            {dns.nameservers.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5">
                {dns.nameservers.map((ns) => (
                  <li
                    key={ns}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="truncate font-mono font-semibold text-[#111C3A]">{ns}</span>
                    <DnsCopyButton text={ns} label="Copy Nameserver" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-[#94A3B8]">No nameservers found.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2 text-[11px] text-[#6B7A94]">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#12A06D]" aria-hidden />
            Public resolution active via Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1).
          </span>
          {data.uptime.lastCheckedAt ? (
            <span className="text-[#94A3B8]">Verified {formatDateTime(data.uptime.lastCheckedAt)}</span>
          ) : null}
        </div>
      </Card>

      {/* C. DNS Records Table with Filters, Priority, TTL, and Truncation */}
      <Card
        title="DNS Records"
        icon={Globe2}
        subtitle={`${filteredRecords.length} records resolved`}
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 rounded-md border border-[#DEE5EF] bg-white pl-8 pr-2.5 text-[11px] text-[#111C3A] placeholder-[#94A3B8] transition-all focus:w-48 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Filter by type">
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
                  selectedType === "all"
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F1F4F9] text-[#4A5A73] hover:bg-[#E2E8F0]",
                )}
              >
                All ({typeCounts.all})
              </button>
              {recordTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
                    selectedType.toUpperCase() === t.toUpperCase()
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#F1F4F9] text-[#4A5A73] hover:bg-[#E2E8F0]",
                  )}
                >
                  {t} ({typeCounts[t] ?? 0})
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F8] bg-[#FAFBFD] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
                <th className="px-3.5 py-2.5 w-20">Type</th>
                <th className="px-3.5 py-2.5 w-32">Name</th>
                <th className="px-3.5 py-2.5 w-20 text-center">Priority</th>
                <th className="px-3.5 py-2.5 min-w-[280px]">Value</th>
                <th className="px-3.5 py-2.5 w-20 text-center">TTL</th>
                <th className="px-3.5 py-2.5 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-center text-[#6B7A94]">
                    No DNS records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => {
                  const rowKey = `${row.type}-${row.name}-${row.value}`;
                  const isExpanded = Boolean(expandedKeys[rowKey]);
                  const isLong = row.value.length > 40;
                  const priority = extractPriority(row.type, row.value);
                  const ttl = (row as { ttl?: number | string }).ttl ?? "Auto";

                  return (
                    <tr key={rowKey} className="transition-colors hover:bg-[#F8FAFC]">
                      {/* Type */}
                      <td className="px-3.5 py-2.5 align-top">
                        <Chip tone={getRecordTone(row.type)} className="font-mono font-bold">
                          {row.type}
                        </Chip>
                      </td>

                      {/* Name */}
                      <td className="px-3.5 py-2.5 align-top font-mono font-semibold text-[#111C3A]">
                        {row.name}
                      </td>

                      {/* Priority */}
                      <td className="px-3.5 py-2.5 align-top text-center font-mono text-[#6B7A94]">
                        {priority}
                      </td>

                      {/* Value with Expand and Copy */}
                      <td className="px-3.5 py-2.5 align-top">
                        <div className="flex items-start gap-1.5">
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "font-mono text-[10.5px] text-[#28354C]",
                                isExpanded ? "break-all" : "block truncate",
                              )}
                              title={row.value}
                            >
                              {row.value}
                            </span>
                            {isLong ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(rowKey)}
                                className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#2563EB] hover:underline"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-3" /> Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-3" /> Show full record
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                          <DnsCopyButton text={row.value} label="Copy value" />
                        </div>
                      </td>

                      {/* TTL */}
                      <td className="px-3.5 py-2.5 align-top text-center font-mono text-[10.5px] text-[#6B7A94]">
                        {ttl}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 align-top text-center">
                        <Chip tone={checkTone[row.status]}>
                          {row.status === "pass" ? "OK" : "Review"}
                        </Chip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* D. Registrar and Expiry Section & E. DNS Change History */}
      <div className="grid gap-2 lg:grid-cols-2">
        {/* D. Registrar & Domain Expiry */}
        <Card title="Registrar & Domain Expiry" icon={CalendarClock} bodyClassName="p-3.5">
          <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-[#6B7A94]" aria-hidden />
            <div>
              <p className="text-[12px] font-medium text-[#28354C]">
                Registrar and domain expiry information is not configured.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6B7A94]">
                {dns.registrarNote ||
                  "WHOIS/RDAP provider is not connected. Encodency reports verified DNS data only and will not show a guessed expiry date."}
              </p>
            </div>
          </div>
        </Card>

        {/* E. DNS Change History */}
        <Card title="DNS Change History" icon={GitCompareArrows} bodyClassName="p-3.5">
          {dnsChanges.length > 0 ? (
            <ul className="divide-y divide-[#F1F5F9]">
              {dnsChanges.map((chg) => (
                <li key={chg.id} className="py-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#111C3A]">{chg.field}</span>
                    <span className="text-[10px] text-[#94A3B8]">{formatRelative(chg.detectedAt)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10.5px]">
                    <span className="line-through text-[#DC3A32]">{chg.previous}</span>
                    <span>→</span>
                    <span className="font-medium text-[#12A06D]">{chg.current}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-[#E6EBF4] bg-[#F8FAFC] p-3 text-[11px] text-[#6B7A94]">
              <Info className="mt-0.5 size-4 shrink-0 text-[#6B7A94]" aria-hidden />
              <div>
                <p className="font-medium text-[#28354C]">No DNS changes recorded</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6B7A94]">
                  DNS change history is actively monitored across automated scan runs. Any addition, modification, or removal of DNS records will appear here.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ErrorsTab({ data }: { data: MonitoringData }) {
  const pagination = usePagination(data.errors.length, 10);

  const columns: Column<ErrorSample>[] = [
    {
      key: "path",
      header: "URL",
      primary: true,
      sortValue: (row) => row.path,
      cell: (row) => <span className="truncate font-mono text-[11px] font-semibold text-[#28354C]">{row.path}</span>,
    },
    {
      key: "status",
      header: "Failure",
      cell: (row) => (
        <Chip tone={typeof row.status === "number" && row.status < 500 ? "warn" : "bad"}>
          {typeof row.status === "number" ? row.status : row.status.replace("-", " ")}
        </Chip>
      ),
    },
    {
      key: "occurrences",
      header: "Occurrences",
      align: "right",
      sortValue: (row) => row.occurrences,
      cell: (row) => formatNumber(row.occurrences),
    },
    {
      key: "referrer",
      header: "Linked from",
      hideOnMobile: true,
      cell: (row) => <span className="font-mono text-[10.5px] text-[#6B7A94]">{row.referrer ?? "Direct / unknown"}</span>,
    },
    {
      key: "lastSeen",
      header: "Last seen",
      sortValue: (row) => row.lastSeenAt,
      cell: (row) => <span className="text-[11px] text-[#6B7A94]">{formatRelative(row.lastSeenAt)}</span>,
    },
  ];

  return (
    <Card
      title={`Error responses (${data.errors.length})`}
      icon={TriangleAlert}
      subtitle="4xx, 5xx, timeouts and redirect loops seen during checks and crawls"
      action={
        <WButton
          size="sm"
          icon={Download}
          disabled={data.errors.length === 0}
          disabledReason="No errors to export"
          onClick={() => {
            downloadFile(
              "error-responses.csv",
              toCsv(
                ["URL", "Failure", "Occurrences", "First seen", "Last seen", "Linked from"],
                data.errors.map((error) => [
                  error.path,
                  String(error.status),
                  error.occurrences,
                  error.firstSeenAt,
                  error.lastSeenAt,
                  error.referrer,
                ]),
              ),
            );
            toast.success("Error list exported");
          }}
        >
          Export
        </WButton>
      }
      bodyClassName="p-0"
    >
      <DataTable
        columns={columns}
        rows={pagination.slice(data.errors)}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            title="No error responses"
            body="Every URL we requested returned a successful response."
            icon={ShieldCheck}
          />
        }
      />
      {data.errors.length > 0 ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={data.errors.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      ) : null}
    </Card>
  );
}

function ChangesTab({ data }: { data: MonitoringData }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ChangeRecord[]>();
    for (const change of data.changes) {
      const key = formatDate(change.detectedAt);
      map.set(key, [...(map.get(key) ?? []), change]);
    }
    return [...map.entries()];
  }, [data.changes]);

  if (data.changes.length === 0) {
    return (
      <Card title="Change detection" icon={GitCompareArrows}>
        <EmptyState
          title="No changes detected"
          body="Titles, meta descriptions, H1s, canonicals, robots.txt and the sitemap are compared between crawls. Nothing has changed since the first crawl."
        />
      </Card>
    );
  }

  return (
    <Card
      title={`Detected changes (${data.changes.length})`}
      icon={GitCompareArrows}
      subtitle="Compared between consecutive crawls of the same URL"
      bodyClassName="p-0"
    >
      <ol className="divide-y divide-[#F2F5FA]">
        {grouped.map(([date, changes]) => (
          <li key={date} className="px-3.5 py-3">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">{date}</p>
            <ul className="space-y-2.5">
              {changes.map((change) => (
                <li key={change.id} className="rounded-xl border border-[#E6EBF4] p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={change.impact === "positive" ? "good" : change.impact === "negative" ? "bad" : "muted"}>
                      {change.field}
                    </Chip>
                    <span className="font-mono text-[10.5px] text-[#6B7A94]">
                      {change.path === "site" ? "Site-wide" : change.path}
                    </span>
                    <span className="ml-auto text-[10.5px] text-[#94A3B8]">{formatRelative(change.detectedAt)}</span>
                  </div>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    <div className="rounded-md bg-[#FDECEB] px-2.5 py-1.5">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.04em] text-[#C0261F]">Previous</p>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] text-[#4A5A73]">
                        {change.previous || "(empty)"}
                      </p>
                    </div>
                    <div className="rounded-md bg-[#E6F6EF] px-2.5 py-1.5">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.04em] text-[#0B7A55]">Current</p>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] text-[#4A5A73]">
                        {change.current || "(empty)"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Card>
  );
}
