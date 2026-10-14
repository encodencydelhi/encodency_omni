"use client";

/**
 * Per-page measurement tabs for Page Audit: Lighthouse performance (mobile and
 * desktop kept apart), field data for this URL vs origin, Lighthouse
 * accessibility (automated checks only), Search Console page metrics and the
 * Google URL Inspection result. Nothing is estimated; every block names its
 * source and timestamp or says why it is unavailable.
 */

import { toast } from "sonner";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useInspectPage, usePageInspection, usePagePerformance, usePageSearch } from "../../data/hooks";
import { formatMs, formatRelative } from "../../data/selectors";
import type { DeviceMeasurement, PerformanceDeviceBlock } from "../../data/types";
import { Card, Chip, WButton } from "../ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock } from "../ui/states";
import { CruxHistoryChart, CruxStatus, FieldBlockView, LabMetricsGrid, LighthouseScoreRow, SourceBadge, Stamp, UnavailableNotice } from "../ui/measurements";
import { useWebsiteWorkspace } from "../website-workspace";

/** Search Console CTR arrives from the API as percent points (10 = 10%). */
const pct = (v: number) => `${v.toFixed(1)}%`;

function DeviceSection({ label, block, perf }: { label: string; block: PerformanceDeviceBlock; perf: boolean }) {
  const m = block.measured;
  return (
    <Card title={`${label} · Lighthouse`} subtitle={m ? `Lighthouse ${m.lighthouseVersion ?? "version unknown"}` : "Not measured"} action={<Stamp at={m?.measuredAt} />}>
      {block.lastAttempt && block.lastAttempt.status !== "COMPLETED" ? (
        <div className="mb-2">
          <UnavailableNotice
            tone="warn"
            title={`The latest ${label.toLowerCase()} attempt did not complete`}
            body={`${block.lastAttempt.errorMessage ?? "The measurement failed."}${m ? " The last successful measurement is shown below." : ""}`}
          />
        </div>
      ) : null}
      {m ? (
        <div className="space-y-3">
          <LighthouseScoreRow scores={m.scores} />
          {perf ? <LabMetricsGrid lab={m.lab} /> : null}
        </div>
      ) : (
        <EmptyState compact title={`No ${label.toLowerCase()} measurement`} body="Run a performance audit for this page. No value is copied from another page or device." />
      )}
    </Card>
  );
}

export function PagePerformanceTab({ pageId }: { pageId: string }) {
  const { clientId, runScan, scan } = useWebsiteWorkspace();
  const q = usePagePerformance(clientId, pageId);
  const d = q.data;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-3 py-2">
        <p className="text-[11.5px] text-[#5B6B85]">
          Measured for this URL only by PageSpeed Insights. <SourceBadge kind="lab" /> is a simulated load; field data is real Chrome users.
        </p>
        <WButton size="sm" icon={RefreshCw} disabled={scan.isRunning} disabledReason="A scan is already running" onClick={() => runScan("performance", pageId)}>
          Run performance audit for this page
        </WButton>
      </div>
      {q.isLoading ? (
        <SkeletonBlock lines={6} />
      ) : q.error ? (
        <QueryErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : d ? (
        <>
          {!d.psiConfigured ? <UnavailableNotice tone="warn" title="PageSpeed Insights is not configured" body={d.notice ?? "No performance data can be collected until a PageSpeed API key is configured on the server."} /> : null}
          <div className="grid gap-1 lg:grid-cols-2">
            <DeviceSection label="Mobile" block={d.mobile} perf />
            <DeviceSection label="Desktop" block={d.desktop} perf />
          </div>
          {(["mobile", "desktop"] as const).map((dev) => {
            const m = d.mobile.measured && dev === "mobile" ? d.mobile.measured : d.desktop.measured && dev === "desktop" ? d.desktop.measured : null;
            const url = d.crux.urlLevel[dev];
            const origin = d.crux.originLevel[dev] ?? d.crux.originLevel.all;
            return (
              <Card key={dev} title={`Field data · ${dev}`} subtitle="Real Chrome users — separate from the lab run" action={<SourceBadge kind="field-url" />}>
                <div className="space-y-3">
                  <FieldBlockView field={url?.metrics ?? m?.field ?? null} scopeLabel="This exact URL" empty="No URL-level field data. This page does not have enough Chrome traffic to be reported; that is not a failing result." />
                  <CruxStatus snapshot={url} label="Chrome UX Report (URL)" />
                  <div className="border-t border-[#EEF2F8] pt-3">
                    <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-[#28354C]">
                      Whole origin <SourceBadge kind="field-origin" />
                    </p>
                    <FieldBlockView field={origin?.metrics ?? m?.originField ?? null} scopeLabel="Every page on the origin" empty="No origin-level field data." />
                    <CruxHistoryChart points={origin?.history ?? null} title="Origin history (p75)" />
                  </div>
                </div>
              </Card>
            );
          })}
          <PageOpportunities mobile={d.mobile.measured} desktop={d.desktop.measured} />
        </>
      ) : null}
    </div>
  );
}

function PageOpportunities({ mobile, desktop }: { mobile: DeviceMeasurement | null; desktop: DeviceMeasurement | null }) {
  const m = mobile ?? desktop;
  if (!m || m.opportunities.length === 0) return null;
  return (
    <Card title={`Opportunities (${m.device})`} subtitle="Lighthouse's own estimated savings for this URL" action={<SourceBadge kind="lab" />} bodyClassName="p-0">
      <ul className="divide-y divide-[#F2F5FA]">
        {m.opportunities.map((o) => (
          <li key={o.id} className="px-3.5 py-2.5">
            <p className="text-[12px] font-semibold text-[#28354C]">{o.title}</p>
            <p className="text-[10.5px] text-[#6B7A94]">
              {o.savingsMs !== null ? `Estimated saving ${formatMs(o.savingsMs)}` : "No time estimate"}
              {o.displayValue ? ` · ${o.displayValue}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Lighthouse accessibility — automated checks only. Never a WCAG claim. */
export function PageLighthouseAccessibility({ pageId }: { pageId: string }) {
  const { clientId, runScan, scan } = useWebsiteWorkspace();
  const q = usePagePerformance(clientId, pageId);
  const m = q.data?.mobile.measured ?? q.data?.desktop.measured ?? null;
  const score = m?.scores.accessibility ?? null;
  return (
    <Card
      title="Lighthouse accessibility"
      icon={ShieldCheck}
      subtitle="Automated checks only — not a WCAG compliance statement"
      action={
        <WButton size="sm" icon={RefreshCw} disabled={scan.isRunning} disabledReason="A scan is already running" onClick={() => runScan("performance", pageId)}>
          Run audit
        </WButton>
      }
    >
      {q.isLoading ? (
        <SkeletonBlock lines={3} />
      ) : !m || score === null ? (
        <EmptyState compact title="Not verified" body="No Lighthouse accessibility audit exists for this page. Automated checks cover only part of WCAG; manual review is still required either way." />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={score >= 90 ? "good" : score >= 50 ? "warn" : "bad"}>Accessibility {score}/100</Chip>
            <Stamp at={m.measuredAt} />
            <span className="text-[10.5px] text-[#6B7A94]">{m.device} · Lighthouse {m.lighthouseVersion ?? "?"}</span>
          </div>
          {m.accessibilityFailures.length === 0 ? (
            <p className="text-[11.5px] text-[#5B6B85]">Lighthouse reported no failed automated accessibility audits. This does not mean the page is accessible or WCAG compliant.</p>
          ) : (
            <ul className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4]">
              {m.accessibilityFailures.map((f) => (
                <li key={f.id} className="px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#28354C]">
                    {f.title} <span className="font-normal text-[#6B7A94]">· {f.count} element{f.count === 1 ? "" : "s"}</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6B7A94]">{f.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/** Search Console + URL Inspection for one page. */
export function PageSearchAndIndexing({ pageId }: { pageId: string }) {
  const { clientId } = useWebsiteWorkspace();
  const search = usePageSearch(clientId, pageId);
  const inspection = usePageInspection(clientId, pageId);
  const inspect = useInspectPage(clientId, pageId);
  const s = search.data;
  const t = s?.search?.totals ?? null;
  const ins = inspection.data?.inspection ?? null;

  return (
    <div className="space-y-1">
      <Card title="Search Console · this page" icon={Search} subtitle={s?.search ? `${s.search.period.start} → ${s.search.period.end} · ${s.search.property}` : "Page-level search performance"} action={<Stamp at={s?.fetchedAt} prefix={s?.cached ? "Cached" : "Fetched"} />}>
        {search.isLoading ? (
          <SkeletonBlock lines={3} />
        ) : search.error ? (
          <QueryErrorState error={search.error} onRetry={() => void search.refetch()} />
        ) : !s || s.status !== "available" ? (
          <UnavailableNotice tone="warn" title="Search Console data is unavailable" body={s?.reason ?? "Search Console is not connected for this website."} />
        ) : !t ? (
          <EmptyState compact title="No search data for this page" body={s.search?.note ?? "Search Console reported no impressions for this URL in the period. This is not a zero measurement of quality."} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
              {[
                { label: "Clicks", v: t.clicks.toLocaleString(), d: s.search!.deltas?.clicks },
                { label: "Impressions", v: t.impressions.toLocaleString(), d: s.search!.deltas?.impressions },
                { label: "CTR", v: pct(t.ctr), d: s.search!.deltas?.ctr },
                { label: "Avg position", v: t.position.toFixed(1), d: s.search!.deltas?.position },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-[#E6EBF4] bg-white p-2.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{c.label}</p>
                  <p className="mt-1 text-[20px] font-extrabold leading-none text-[#28354C]">{c.v}</p>
                  <p className="mt-1 text-[10px] text-[#6B7A94]">{c.d === null || c.d === undefined ? "No previous period" : `${c.d >= 0 ? "+" : ""}${c.d.toFixed(1)}${c.label === "Avg position" ? "" : c.label === "CTR" ? " pp" : "%"} vs previous period`}</p>
                </div>
              ))}
            </div>
            {s.search!.queries.length > 0 ? (
              <table className="w-full text-left text-[11.5px]">
                <thead className="text-[10px] uppercase tracking-wider text-[#64748B]">
                  <tr><th className="py-1">Query</th><th className="text-right">Clicks</th><th className="text-right">Impr.</th><th className="text-right">CTR</th><th className="text-right">Pos.</th></tr>
                </thead>
                <tbody className="divide-y divide-[#F2F5FA]">
                  {s.search!.queries.slice(0, 10).map((r) => (
                    <tr key={r.query}>
                      <td className="max-w-[260px] truncate py-1 text-[#28354C]">{r.query}</td>
                      <td className="text-right">{r.clicks}</td>
                      <td className="text-right">{r.impressions}</td>
                      <td className="text-right">{pct(r.ctr)}</td>
                      <td className="text-right">{r.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {s.search!.queriesTruncated ? <p className="text-[10.5px] text-[#94A3B8]">Search Console returned a truncated query list.</p> : null}
          </div>
        )}
      </Card>

      <Card
        title="Google index status (URL Inspection)"
        subtitle="Google's own view of this URL — not a ranking claim"
        action={
          <WButton
            size="sm"
            icon={RefreshCw}
            disabled={inspect.isPending || inspection.data?.connected === false}
            disabledReason={inspection.data?.connected === false ? "Search Console is not connected" : "Inspecting…"}
            onClick={() => inspect.mutate(undefined, { onSuccess: () => toast.success("URL inspected"), onError: (e) => toast.error(e instanceof Error ? e.message : "Inspection failed") })}
          >
            Inspect now
          </WButton>
        }
      >
        {inspection.isLoading ? (
          <SkeletonBlock lines={3} />
        ) : !ins ? (
          <EmptyState compact title="Not inspected yet" body={inspection.data?.connected === false ? "Search Console is not connected, so Google cannot be asked about this URL." : "Use “Inspect now” to ask Google how it sees this URL. Each inspection counts against a daily quota."} />
        ) : ins.status !== "inspected" ? (
          <UnavailableNotice tone="warn" title="Inspection did not return a result" body={ins.errorMessage ?? "Google did not return an inspection for this URL."} />
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={ins.verdict === "PASS" ? "good" : ins.verdict === "FAIL" ? "bad" : "muted"}>{ins.verdict ?? "Verdict unavailable"}</Chip>
              <span className="text-[10.5px] text-[#6B7A94]">Inspected {formatRelative(ins.inspectedAt)} · {ins.property}</span>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[11.5px] sm:grid-cols-2">
              {[
                ["Coverage", ins.coverageState],
                ["Indexing", ins.indexingState],
                ["robots.txt", ins.robotsTxtState],
                ["Page fetch", ins.pageFetchState],
                ["Last crawl", ins.lastCrawlTime ? formatRelative(ins.lastCrawlTime) : null],
                ["Google canonical", ins.googleCanonical],
                ["Declared canonical", ins.userCanonical],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 border-b border-[#F2F5FA] py-1">
                  <dt className="text-[#6B7A94]">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-[#28354C]">{(v as string | null) ?? "Not reported"}</dd>
                </div>
              ))}
            </dl>
            {ins.details?.canonicalMismatch ? <p className="text-[11px] text-[#B45309]">Google chose a different canonical than the one declared on the page.</p> : null}
            <p className="text-[10.5px] text-[#94A3B8]">{ins.scopeNote}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
