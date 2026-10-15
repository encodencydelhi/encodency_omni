"use client";

import Link from "next/link";
import { CountBars, Donut, SERIES } from "./charts";
import { formatDateTime } from "./format";
import { useDomainAnalytics } from "./monitoring-api";
import type { DomainAnalytics } from "./monitoring-types";
import { Chip, EmptyState, Notice, Section, Skeleton, StatStrip } from "./ui";

const CERT_LABEL: Record<string, string> = { VALID: "Valid", EXPIRING: "Expiring (≤ 30 days)", EXPIRED: "Expired", UNKNOWN: "Not checked / unknown" };

/** Portfolio-level domain charts. Every series is computed from stored rows and check history, never sampled or invented. */
export function DomainAnalyticsSection() {
  const q = useDomainAnalytics();
  if (q.isLoading) return <div className="grid gap-1 lg:grid-cols-3"><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-52" /></div>;
  if (q.isError || !q.data) return <Notice tone="red" title="Domain analytics could not be loaded">{q.error instanceof Error ? q.error.message : "Try again shortly."}</Notice>;
  const d: DomainAnalytics = q.data;
  if (d.totals.domains === 0) return null;
  const hasHistory = d.checkHistory.some((x) => x.dnsOk + x.dnsFailed + x.rdapOk + x.rdapFailed > 0);
  return (
    <div className="space-y-1">
      <StatStrip
        title="Domain summary"
        items={[
          { label: "Domains", value: d.totals.domains },
          { label: "Expiry known", value: d.totals.withKnownExpiry, tone: "green", sub: "Registry or confirmed" },
          { label: "Expiry unknown", value: d.totals.unknownExpiry, tone: d.totals.unknownExpiry ? "amber" : undefined, sub: "Not published / not looked up" },
          { label: "DNSSEC", value: `${d.totals.dnssecSigned} signed`, sub: `${d.totals.dnssecUnsigned} unsigned` },
          { label: "Certificates at risk", value: (d.certificates.EXPIRING ?? 0) + (d.certificates.EXPIRED ?? 0), tone: (d.certificates.EXPIRING ?? 0) + (d.certificates.EXPIRED ?? 0) ? "amber" : undefined, sub: "≤ 30 days or expired" },
        ]}
      />
      <div className="grid gap-1 lg:grid-cols-3">
        <Section title="Expiry timeline" description="Domains by time until registry expiry"><CountBars ariaLabel="Domains grouped by time to expiry" rows={d.expiryWindows} color={SERIES.cpu} height={180} /></Section>
        <Section title="Registrar distribution"><Donut ariaLabel="Domains by registrar" rows={d.registrars} /></Section>
        <Section title="Certificate health" description="Live TLS state of monitored hostnames"><Donut ariaLabel="Certificates by state" rows={Object.entries(d.certificates).map(([k, v]) => ({ label: CERT_LABEL[k] ?? k, value: v }))} /></Section>
      </div>
      <div className="grid gap-1 lg:grid-cols-3">
        <Section title="Portfolio growth" description="Total domains after each month">
          <CountBars ariaLabel="Domain portfolio size over the last 12 months" rows={d.portfolioGrowth.map((m) => ({ label: m.month.slice(5), value: m.total }))} color={SERIES.mem} height={160} />
        </Section>
        <Section title="Lookups completed" description="Registry + DNS checks per day, last 14 days">
          {hasHistory ? <CountBars ariaLabel="Successful lookups per day" rows={d.checkHistory.map((x) => ({ label: x.day.slice(8), value: x.dnsOk + x.rdapOk }))} color={SERIES.rx} height={160} /> : <EmptyState title="No checks recorded yet" />}
        </Section>
        <Section title="Lookup failures" description="Failed registry or DNS checks per day">
          {hasHistory ? <CountBars ariaLabel="Failed lookups per day" rows={d.checkHistory.map((x) => ({ label: x.day.slice(8), value: x.dnsFailed + x.rdapFailed }))} color={SERIES.cpu} height={160} /> : <EmptyState title="No checks recorded yet" />}
        </Section>
      </div>
      <Section title="Recent DNS changes" description="Detected between consecutive snapshots (last 90 days)" flush>
        {d.dnsChanges.length === 0 ? <EmptyState title="No DNS changes detected" description="Changes are recorded when a later check differs from the previous snapshot." /> : (
          <ul className="divide-y divide-slate-100 text-xs">
            {d.dnsChanges.slice(0, 8).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <Link href={`/admin/infrastructure/assets/${c.assetId}`} className="font-semibold normal-case text-slate-900 hover:text-red-700">{c.domain}</Link>
                <span className="flex flex-wrap items-center gap-1.5">{c.types.map((t) => <Chip key={t}>{t}</Chip>)}<span className="text-slate-500">{formatDateTime(c.at)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
