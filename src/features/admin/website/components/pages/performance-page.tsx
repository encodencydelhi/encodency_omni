"use client";

/**
 * Performance — real PageSpeed Insights (Lighthouse) runs per URL and device,
 * plus Chrome UX Report field data with an explicit scope.
 *
 * Three measurement kinds are shown separately and labelled, and are never
 * merged into one score: Lighthouse lab, URL-level field data, origin-level
 * field data. A value that was not measured is shown as "Not measured".
 * Recommendations are Lighthouse's own estimated savings — advice for whoever
 * maintains the website; nothing here changes the site.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Download, FileStack, Gauge, Lightbulb, RefreshCw, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWebsitePerformance } from "../../data/hooks";
import { downloadFile, formatMs, formatShortDate, formatWeight, scoreBand, toCsv } from "../../data/selectors";
import type { DeviceMeasurement, PerformanceData } from "../../data/types";
import { Card, Chip, DataTable, Pagination, SegmentedControl, SubTabs, usePagination, useSortedRows, WButton, type Column, type SortState } from "../ui/kit";
import { AXIS_PROPS, GRID_PROPS, makeTooltip, ShareBar } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { CruxHistoryChart, CruxStatus, FieldBlockView, LabMetricsGrid, LighthouseScoreRow, SourceBadge, Stamp, UnavailableNotice } from "../ui/measurements";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type PerfTab = "overview" | "vitals" | "pages" | "resources" | "recommendations";
type DeviceKey = "mobile" | "desktop";

const TABS: { value: PerfTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "vitals", label: "Core Web Vitals" },
  { value: "pages", label: "Pages" },
  { value: "resources", label: "Resources" },
  { value: "recommendations", label: "Opportunities" },
];

const STATUS_COPY: Record<string, { title: string; fallback: string; tone: "muted" | "warn" }> = {
  not_configured: { title: "Performance measurement is not configured", fallback: "PageSpeed Insights is not configured on the server.", tone: "warn" },
  rate_limited: { title: "PageSpeed Insights quota reached", fallback: "The PageSpeed Insights quota was reached. Try again later.", tone: "warn" },
  failed: { title: "The last performance measurement failed", fallback: "The measurement did not complete.", tone: "warn" },
  pending: { title: "No performance measurement yet", fallback: "Run a performance audit to measure this website.", tone: "muted" },
};

export function WebsitePerformancePage() {
  const { clientId, runScan, scan, openFixGuide } = useWebsiteWorkspace();
  const performance = useWebsitePerformance(clientId);
  const [tab, setTab] = useUrlState<PerfTab>("tab", "overview", TABS.map((entry) => entry.value));
  const [device, setDevice] = useUrlState<DeviceKey>("device", "mobile", ["mobile", "desktop"]);

  const data = performance.data;
  const measured = data && data.status === "measured" ? data : null;
  const copy = STATUS_COPY[data?.status ?? "pending"] ?? STATUS_COPY.pending!;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <SubTabs ariaLabel="Performance sections" value={tab} onChange={setTab} options={TABS} />
          <SegmentedControl<DeviceKey>
            ariaLabel="Device"
            size="sm"
            value={device}
            onChange={setDevice}
            options={[
              { value: "mobile", label: "Mobile" },
              { value: "desktop", label: "Desktop" },
            ]}
          />
        </div>
        <WButton size="sm" icon={RefreshCw} disabled={scan.isRunning} disabledReason="A scan is already running" onClick={() => runScan("performance")}>
          Run performance audit
        </WButton>
      </div>

      {performance.isLoading ? (
        <>
          <SkeletonStats count={4} />
          <SkeletonBlock lines={6} />
        </>
      ) : performance.error ? (
        <Card title="Performance">
          <QueryErrorState error={performance.error} onRetry={() => void performance.refetch()} />
        </Card>
      ) : data && !measured ? (
        <Card title="Performance">
          <UnavailableNotice
            title={copy.title}
            body={`${data.reason ?? copy.fallback} We do not show estimated Core Web Vitals, resource weights or savings.`}
            tone={copy.tone}
          />
        </Card>
      ) : measured ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-[#6B7A94]">
            <SourceBadge kind="lab" />
            <span>{measured.source}</span>
            <Stamp at={measured.measuredAt} />
            {measured.audits ? <span>· {measured.audits.pagesAudited} page{measured.audits.pagesAudited === 1 ? "" : "s"} audited</span> : null}
            {measured.headlinePage ? <span>· headline page: <span className="font-mono">{measured.headlinePage.path ?? measured.headlinePage.url}</span></span> : null}
          </div>
          {tab === "overview" ? <OverviewTab data={measured} device={device} /> : null}
          {tab === "vitals" ? <VitalsTab data={measured} device={device} /> : null}
          {tab === "pages" ? <PagesTab data={measured} device={device} /> : null}
          {tab === "resources" ? <ResourcesTab data={measured} device={device} /> : null}
          {tab === "recommendations" ? <OpportunitiesTab data={measured} device={device} onFixGuide={openFixGuide} /> : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function deviceData(data: PerformanceData, device: DeviceKey): DeviceMeasurement | null {
  return data.devices?.[device] ?? null;
}

function MissingDevice({ device }: { device: DeviceKey }) {
  return (
    <Card title={`${device === "mobile" ? "Mobile" : "Desktop"} not measured`}>
      <UnavailableNotice title={`No ${device} measurement for the headline page`} body={`Run a performance audit with ${device} enabled to measure it. Nothing is estimated from the other device.`} />
    </Card>
  );
}

function OverviewTab({ data, device }: { data: PerformanceData; device: DeviceKey }) {
  const d = deviceData(data, device);
  if (!d) return <MissingDevice device={device} />;
  const trend = (data.trend ?? []).filter((t) => t.score !== null);
  return (
    <div className="space-y-1">
      <Card title={`Lighthouse scores · ${device}`} icon={Gauge} subtitle={`${d.path ?? d.url} · Lighthouse ${d.lighthouseVersion ?? "version unknown"}`} action={<Stamp at={d.measuredAt} />}>
        <LighthouseScoreRow scores={d.scores} />
        <p className="mt-2 text-[10.5px] text-[#94A3B8]">
          Accessibility is Lighthouse&apos;s automated checks only — it is not a statement of WCAG compliance. Scores are for this URL on this device and are not averaged with other pages or devices.
          {data.scoreDelta !== null && data.scoreDelta !== undefined
            ? ` Performance changed ${data.scoreDelta >= 0 ? "+" : ""}${data.scoreDelta} since the previous run of this page.`
            : " This is the first recorded run for this page and device, so there is no change to compare."}
        </p>
      </Card>

      <Card title="Lab metrics" icon={Zap} subtitle="Simulated load — not real-user data" action={<SourceBadge kind="lab" />}>
        <LabMetricsGrid lab={d.lab} />
      </Card>

      <Card title="Performance score history" icon={Gauge} subtitle={`${d.path ?? d.url} · real measurements only`}>
        {trend.length < 2 ? (
          <EmptyState compact title="A trend needs two measurements" body="The first run is the baseline. Run another audit later to start a real history." />
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((t) => ({ date: t.date, Score: t.score }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" tickFormatter={(v: string) => formatShortDate(v)} {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} {...AXIS_PROPS} />
                <Tooltip content={makeTooltip((e) => `${e.value}`, (label) => formatShortDate(label))} />
                <Line type="monotone" dataKey="Score" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function VitalsTab({ data, device }: { data: PerformanceData; device: DeviceKey }) {
  const d = deviceData(data, device);
  const crux = data.crux;
  const urlCrux = crux?.urlLevel[device] ?? null;
  const originCrux = crux?.originLevel[device] ?? crux?.originLevel.all ?? null;
  return (
    <div className="space-y-1">
      <Card title="Real-user data for this URL" icon={Gauge} subtitle={`${d?.path ?? d?.url ?? "headline page"} · ${device}`} action={<SourceBadge kind="field-url" />}>
        <div className="space-y-3">
          <FieldBlockView
            field={urlCrux?.metrics ?? d?.field ?? null}
            scopeLabel="Chrome users of this exact URL"
            empty="No field data available for this URL. Chrome has not collected enough real-user visits to report it — this is not a failing score."
          />
          <CruxStatus snapshot={urlCrux} label="Chrome UX Report (URL)" />
        </div>
      </Card>

      <Card title="Real-user data for the whole origin" icon={Boxes} subtitle="Every page on the site together — not a measurement of one page" action={<SourceBadge kind="field-origin" />}>
        <div className="space-y-3">
          <FieldBlockView
            field={originCrux?.metrics ?? d?.originField ?? null}
            scopeLabel={`Chrome users across ${crux?.origin ?? "the origin"}`}
            empty="No origin-level field data available."
          />
          <CruxStatus snapshot={originCrux} label="Chrome UX Report (origin)" />
          <CruxHistoryChart points={originCrux?.history ?? null} title="Origin history (LCP / INP p75)" />
        </div>
      </Card>

      <Card title="Lab metrics" icon={Zap} subtitle="Lighthouse — a simulated load for this URL" action={<SourceBadge kind="lab" />}>
        <LabMetricsGrid lab={d?.lab ?? null} />
        <p className="mt-2 text-[10.5px] text-[#94A3B8]">Interaction to Next Paint (INP) exists only as field data. Lab Total Blocking Time is a different metric and is never shown in its place.</p>
      </Card>

      {crux && !crux.configured ? (
        <UnavailableNotice title="Chrome UX Report API key is not configured" body="Field data above comes from PageSpeed Insights only. Configure CRUX_API_KEY (or allow the Chrome UX Report API on the PageSpeed key) for explicit URL/origin queries and history." />
      ) : null}
    </div>
  );
}

type PageRow = PerformanceData["pages"][number];

function PagesTab({ data, device }: { data: PerformanceData; device: DeviceKey }) {
  const router = useRouter();
  const rows = data.pages;
  const columns: Column<PageRow>[] = [
    {
      key: "path", header: "Page", primary: true, sortValue: (r) => r.path,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[11.5px] text-[#28354C]">{r.path}</p>
          <p className="truncate text-[10px] text-[#94A3B8]">{r.url}</p>
        </div>
      ),
    },
    ...(["mobile", "desktop"] as const).map((dev) => ({
      key: dev, header: dev === "mobile" ? "Mobile" : "Desktop", align: "center" as const, sortValue: (r: PageRow) => r[dev]?.scores.performance ?? -1,
      cell: (r: PageRow) => {
        const v = r[dev]?.scores.performance ?? null;
        return v === null ? <span className="text-[10.5px] text-[#94A3B8]">Not measured</span> : <Chip tone={scoreBand(v)}>{v}</Chip>;
      },
    })),
    { key: "lcp", header: `LCP (lab, ${device})`, align: "right", sortValue: (r) => r[device]?.lab?.lcpMs ?? -1, cell: (r) => (r[device]?.lab?.lcpMs != null ? formatMs(r[device]!.lab!.lcpMs!) : "—") },
    { key: "tbt", header: `TBT (lab, ${device})`, align: "right", sortValue: (r) => r[device]?.lab?.tbtMs ?? -1, cell: (r) => (r[device]?.lab?.tbtMs != null ? formatMs(r[device]!.lab!.tbtMs!) : "—") },
    { key: "field", header: "Field data", align: "center", cell: (r) => (r[device]?.field ? <Chip tone="good">URL</Chip> : r[device]?.originField ? <Chip tone="warn">Origin only</Chip> : <span className="text-[10.5px] text-[#94A3B8]">None</span>) },
    { key: "weight", header: "Transfer", align: "right", sortValue: (r) => r.pageWeightKb ?? -1, cell: (r) => (r.pageWeightKb != null ? formatWeight(r.pageWeightKb) : "—") },
  ];
  const sort: SortState = { key: "path", direction: "asc" };
  const sorted = useSortedRows(rows, columns, sort);
  const pagination = usePagination(sorted.length, 10);

  return (
    <Card
      title={`Audited pages (${rows.length})`}
      icon={FileStack}
      subtitle="Only pages actually sent to PageSpeed Insights appear here; every score is that URL's own"
      action={
        <WButton
          size="sm"
          icon={Download}
          disabled={rows.length === 0}
          disabledReason="Nothing to export"
          onClick={() => {
            downloadFile(
              "performance-pages.csv",
              toCsv(
                ["Page", "URL", "Mobile performance", "Desktop performance", "Mobile LCP ms", "Mobile TBT ms", "Mobile accessibility", "Desktop accessibility"],
                rows.map((r) => [r.path, r.url ?? "", r.mobile?.scores.performance ?? "", r.desktop?.scores.performance ?? "", r.mobile?.lab?.lcpMs ?? "", r.mobile?.lab?.tbtMs ?? "", r.mobile?.scores.accessibility ?? "", r.desktop?.scores.accessibility ?? ""]),
              ),
              "text/csv;charset=utf-8",
            );
            toast.success("Performance pages exported");
          }}
        >
          Export CSV
        </WButton>
      }
      bodyClassName="p-0"
    >
      <DataTable
        columns={columns}
        rows={pagination.slice(sorted)}
        getRowId={(r) => r.pageId}
        onRowClick={(r) => router.push(`/admin/website/pages/${encodeURIComponent(r.pageId)}?tab=performance`)}
        empty={<EmptyState title="No pages audited" body="Run a performance audit to measure pages." />}
      />
      {sorted.length > 0 ? <Pagination page={pagination.page} pageSize={pagination.pageSize} total={sorted.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} /> : null}
    </Card>
  );
}

function ResourcesTab({ data, device }: { data: PerformanceData; device: DeviceKey }) {
  const d = deviceData(data, device);
  if (!d) return <MissingDevice device={device} />;
  const resources = d.resources;
  const total = resources?.totalKb ?? null;
  return (
    <div className="grid gap-1 lg:grid-cols-2">
      <Card title="Resource weight" icon={Boxes} subtitle={`${d.path ?? d.url} · ${device} · ${resources?.requests ?? "?"} requests`} action={<SourceBadge kind="lab" />}>
        {!resources || resources.byType.length === 0 ? (
          <EmptyState compact title="No resource breakdown returned" body="Lighthouse did not return a resource summary for this run." />
        ) : (
          <ShareBar
            ariaLabel="Transfer size by resource type"
            rows={resources.byType.map((r, i) => ({
              label: `${r.label} · ${r.requests} requests`,
              value: formatWeight(r.kb),
              share: total ? Math.round((r.kb / total) * 100) : 0,
              color: ["#2563EB", "#12A06D", "#E29208", "#7C3AED", "#DC3A32"][i % 5] ?? "#2563EB",
            }))}
          />
        )}
      </Card>
      <Card title="Third-party code detected" icon={Zap} subtitle="Only vendors Lighthouse actually observed" bodyClassName="p-0">
        {d.thirdParty.length === 0 ? (
          <EmptyState compact title="No third-party resources reported" body="Lighthouse did not report any third-party transfer for this URL." />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {d.thirdParty.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-[#28354C]">{t.name}</span>
                  <span className="block text-[10.5px] text-[#6B7A94]">{formatWeight(t.kb)} · main thread {formatMs(t.mainThreadMs)}</span>
                </span>
                <Chip tone={t.blockingMs > 250 ? "warn" : "muted"}>{t.blockingMs > 0 ? `Blocks ${formatMs(t.blockingMs)}` : "No blocking"}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function OpportunitiesTab({ data, device, onFixGuide }: { data: PerformanceData; device: DeviceKey; onFixGuide: (id: string) => void }) {
  const d = deviceData(data, device);
  const items = useMemo(() => [...(d?.opportunities ?? [])].sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0)), [d]);
  if (!d) return <MissingDevice device={device} />;
  return (
    <Card title={`Lighthouse opportunities (${items.length})`} icon={Lightbulb} subtitle={`${d.path ?? d.url} · ${device} · savings are Lighthouse's own estimates`} action={<SourceBadge kind="lab" />} bodyClassName="p-0">
      {items.length === 0 ? (
        <EmptyState compact title="No opportunities reported" body="Lighthouse did not report any audit with an estimated time saving for this URL." />
      ) : (
        <ul className="divide-y divide-[#F2F5FA]">
          {items.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#28354C]">{o.title}</p>
                <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">
                  {o.savingsMs !== null ? `Estimated saving ${formatMs(o.savingsMs)}` : "No time estimate"}
                  {o.savingsKb !== null ? ` · ${formatWeight(o.savingsKb)}` : ""}
                  {o.displayValue ? ` · ${o.displayValue}` : ""}
                </p>
              </div>
              <WButton size="sm" onClick={() => onFixGuide(o.id)}>Guide</WButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
