"use client";

/**
 * Monitoring — uptime, certificate, DNS, error responses and change detection.
 *
 * Registrar and domain-expiry data is deliberately absent: that needs a WHOIS or
 * RDAP provider we have not connected, and a guessed expiry date on a monitoring
 * screen is worse than no date at all.
 */

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertOctagon,
  CalendarClock,
  Download,
  GitCompareArrows,
  Globe2,
  Info,
  Lock,
  Network,
  RefreshCw,
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
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type MonitoringTab = "overview" | "uptime" | "ssl" | "dns" | "errors" | "changes";

const TABS: { value: MonitoringTab; label: string }[] = [
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
  const [tab, setTab] = useUrlState<MonitoringTab>("tab", "overview", TABS.map((entry) => entry.value));

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

      {monitoring.isLoading ? (
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
            Checked {formatRelative(data.uptime.lastCheckedAt)} · every{" "}
            {formatMinutes(data.uptime.checkIntervalMinutes)} from 3 regions
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Uptime 30d</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">{data.uptime.uptimePct30d.toFixed(2)}%</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Uptime 90d</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">{data.uptime.uptimePct90d.toFixed(2)}%</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Avg response</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">{formatMs(data.uptime.avgResponseMs)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Last downtime</dt>
          <dd className="text-[15px] font-semibold text-[#111C3A]">{formatRelative(data.uptime.lastDowntimeAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function UptimeStrip({ data }: { data: MonitoringData }) {
  const days = data.uptime.dailyStatus.slice(-60);
  return (
    <div>
      <div className="flex items-end gap-[2px]" role="img" aria-label="Daily uptime for the last 60 days">
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
          value={`${data.ssl.daysRemaining} days`}
          sub={formatDate(data.ssl.validTo)}
          icon={Lock}
          tone={data.ssl.daysRemaining < 30 ? "warn" : "good"}
          onClick={() => onTab("ssl")}
        />
        <StatTile
          label="Incidents · 90 days"
          value={data.uptime.incidents.length}
          sub="Down, degraded, timeout or certificate"
          icon={AlertOctagon}
          tone={data.uptime.incidents.length > 2 ? "warn" : "good"}
          onClick={() => onTab("uptime")}
        />
        <StatTile
          label="Error responses"
          value={data.errors.length}
          sub="Distinct failing URLs"
          icon={TriangleAlert}
          tone={data.errors.length > 0 ? "bad" : "good"}
          onClick={() => onTab("errors")}
        />
        <StatTile
          label="Detected changes"
          value={data.changes.length}
          sub="Titles, meta, robots, sitemap"
          icon={GitCompareArrows}
          tone="info"
          onClick={() => onTab("changes")}
        />
      </div>

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Uptime · last 60 days" icon={Activity} subtitle="One bar per day">
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
              body="This website has responded to every check in the monitored window."
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
  const remaining = Math.max(0, Math.min(total, ssl.daysRemaining));

  return (
    <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Certificate" icon={Lock}>
        <div className="mb-3 rounded-xl border border-[#E6EBF4] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">
              Days remaining
            </span>
            <Chip tone={ssl.daysRemaining < 14 ? "bad" : ssl.daysRemaining < 30 ? "warn" : "good"} dot>
              {ssl.daysRemaining < 14 ? "Renew now" : ssl.daysRemaining < 30 ? "Renew soon" : "Healthy"}
            </Chip>
          </div>
          <p className="mt-1 text-[24px] font-semibold tracking-[-0.025em] text-[#111C3A]">{ssl.daysRemaining}</p>
          <Meter
            value={remaining}
            max={total}
            tone={ssl.daysRemaining < 14 ? "bad" : ssl.daysRemaining < 30 ? "warn" : "good"}
            className="mt-2"
            label="Days remaining on certificate"
          />
        </div>

        <dl className="divide-y divide-[#F2F5FA]">
          <KeyValue label="HTTPS">
            <Chip tone={ssl.httpsEnabled ? "good" : "bad"}>{ssl.httpsEnabled ? "Enabled" : "Not enabled"}</Chip>
          </KeyValue>
          <KeyValue label="Certificate status">
            <Chip tone={ssl.certificateValid ? "good" : "bad"}>{ssl.certificateValid ? "Valid" : "Invalid"}</Chip>
          </KeyValue>
          <KeyValue label="Issuer">{ssl.issuer}</KeyValue>
          <KeyValue label="Subject">{ssl.subject}</KeyValue>
          <KeyValue label="Valid from">{formatDate(ssl.validFrom)}</KeyValue>
          <KeyValue label="Valid to">{formatDate(ssl.validTo)}</KeyValue>
          <KeyValue label="Protocol">{ssl.protocol}</KeyValue>
        </dl>
      </Card>

      <div className="grid gap-1">
        <Card title="HTTPS hygiene" icon={ShieldCheck}>
          <dl className="divide-y divide-[#F2F5FA]">
            <KeyValue label="HSTS">
              <Chip tone={ssl.hstsEnabled ? "good" : "warn"}>{ssl.hstsEnabled ? "Enabled" : "Not set"}</Chip>
            </KeyValue>
            <KeyValue label="Pages with mixed content">
              <Chip tone={ssl.mixedContentPages > 0 ? "bad" : "good"}>{ssl.mixedContentPages}</Chip>
            </KeyValue>
          </dl>
          <p className="mt-2 rounded-md bg-[#F7F9FC] px-2.5 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
            Mixed content means an HTTPS page loading an http:// resource. Browsers block or downgrade these, and the
            padlock disappears for visitors.
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

function DnsTab({ data }: { data: MonitoringData }) {
  const dns = data.dns;
  return (
    <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="grid gap-1">
        <Card title="Resolution" icon={Network}>
          <dl className="divide-y divide-[#F2F5FA]">
            <KeyValue label="Resolves">
              <Chip tone={dns.resolves ? "good" : "bad"} dot>
                {dns.resolves ? "Yes" : "No"}
              </Chip>
            </KeyValue>
            <KeyValue label="Resolved IPs">
              <span className="font-mono text-[11px]">{dns.resolvedIps.join(", ")}</span>
            </KeyValue>
            <KeyValue label="Nameservers">
              <span className="font-mono text-[11px]">{dns.nameservers.join(", ")}</span>
            </KeyValue>
          </dl>
        </Card>

        <Card title="Registrar & domain expiry" icon={CalendarClock}>
          <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-[#6B7A94]" aria-hidden />
            <p className="text-[11px] leading-relaxed text-[#6B7A94]">{dns.registrarNote}</p>
          </div>
        </Card>
      </div>

      <Card title="Record health" icon={Globe2} subtitle="Public DNS records we can resolve" bodyClassName="p-0">
        <DataTable
          dense
          columns={[
            {
              key: "type",
              header: "Type",
              cell: (row: MonitoringData["dns"]["records"][number]) => <Chip tone="muted">{row.type}</Chip>,
            },
            {
              key: "name",
              header: "Name",
              primary: true,
              cell: (row: MonitoringData["dns"]["records"][number]) => (
                <span className="font-mono text-[11px] font-semibold text-[#28354C]">{row.name}</span>
              ),
            },
            {
              key: "value",
              header: "Value",
              cell: (row: MonitoringData["dns"]["records"][number]) => (
                <span className="break-all font-mono text-[10.5px] text-[#6B7A94]">{row.value}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              cell: (row: MonitoringData["dns"]["records"][number]) => (
                <Chip tone={checkTone[row.status]}>{row.status === "pass" ? "OK" : "Review"}</Chip>
              ),
            },
          ]}
          rows={dns.records}
          getRowId={(row) => `${row.type}-${row.name}-${row.value}`}
          empty={<EmptyState title="No records resolved" body="DNS lookups returned nothing for this domain." />}
        />
      </Card>
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
