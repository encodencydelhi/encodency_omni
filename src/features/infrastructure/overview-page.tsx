"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Server, ShieldCheck, Terminal } from "lucide-react";
import { CountBars, Donut, MonitoringChart, SERIES } from "./charts";
import { RENEWAL_KIND_LABEL, daysLabel, daysTone, formatDateTime, formatMoney, formatMoneyList, formatRelative, providerName } from "./format";
import { errorMessage, useDashboard } from "./hooks";
import { useFleetMetrics } from "./monitoring-api";
import type { RangeKey } from "./monitoring-types";
import { RangeSelect } from "./server-monitoring";
import { BarList, Chip, DateValue, EmptyState, Notice, Section, Skeleton, StatStrip, btn, btnPrimary } from "./ui";

/** A one-line "nothing here" instead of a tall empty card. */
function Quiet({ children }: { children: string }) {
  return <p className="px-4 py-3 text-xs font-medium normal-case text-slate-500">{children}</p>;
}

export function InfrastructureOverviewPage() {
  const q = useDashboard();
  const d = q.data;
  const [range, setRange] = useState<RangeKey>("24h");
  const monitored = d?.totals.monitoredServers ?? 0;
  const trend = useFleetMetrics(range, monitored > 0);

  if (q.isError) {
    return (
      <Notice tone="red" title="The overview could not be loaded" action={<button type="button" className={btn} onClick={() => void q.refetch()}>Try again</button>}>
        {errorMessage(q.error)}
      </Notice>
    );
  }
  if (q.isLoading || !d) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const t = d.totals;
  const billing = d.billing;

  if (d.inventory.total === 0 && t.connectedProviders === 0) {
    return (
      <Section title="Start your infrastructure inventory" description="Add servers and domains by hand, or connect a provider account to import them.">
        <EmptyState
          icon={Server}
          title="Nothing tracked yet"
          description="Domains are looked up through public registry (RDAP), DNS and TLS data. Servers can be entered manually or imported from Contabo."
          action={
            <>
              <Link href="/admin/infrastructure/domains" className={btnPrimary}>Add a domain</Link>
              <Link href="/admin/infrastructure/servers" className={btn}>Add a server</Link>
              <Link href="/admin/infrastructure/providers" className={btn}>Connect a provider</Link>
            </>
          }
        />
      </Section>
    );
  }

  const unmonitored = t.servers - t.monitoredServers;
  const expiryRows = d.domainExpiryTimeline.map((m) => ({ label: m.month, value: m.count }));
  const hasExpiry = expiryRows.some((r) => r.value > 0);
  const providerRows = d.serverDistribution.byProvider.map((p) => ({ label: providerName(p.provider), value: p.count }));
  const projection = billing?.monthlyProjection ?? [];
  const currencies = new Set(projection.flatMap((m) => m.totals.map((x) => x.currency)));
  const hasProjection = projection.some((m) => m.totals.length > 0);
  const clientRows = d.byClient.filter((c) => c.servers + c.domains > 0);

  return (
    <div className="space-y-1">
      <StatStrip
        title="Infrastructure"
        items={[
          { label: "Servers", value: t.servers, sub: `${t.runningServers} running · ${t.connectedProviders} provider${t.connectedProviders === 1 ? "" : "s"}`, href: "/admin/infrastructure/servers" },
          { label: "Monitored", value: `${t.monitoredServers}/${t.servers}`, sub: unmonitored > 0 ? `${unmonitored} not reporting` : "All reporting", href: "/admin/infrastructure/servers", tone: t.servers > 0 && t.monitoredServers === 0 ? "amber" : undefined },
          { label: "Need attention", value: t.serversNeedingAttention, tone: t.serversNeedingAttention ? "red" : undefined, sub: "Alerts or silent collector", href: "/admin/infrastructure/servers?attention=true" },
          { label: "Domains", value: t.domains, sub: `${t.sslCertificates} SSL certificate${t.sslCertificates === 1 ? "" : "s"}`, href: "/admin/infrastructure/domains" },
          { label: "Expiring ≤ 30 d", value: t.expiringWithin30Days, tone: t.expiringWithin7Days ? "orange" : t.expiringWithin30Days ? "amber" : undefined, sub: `${t.expiringWithin7Days} within 7 days`, href: "/admin/infrastructure/billing?window=30" },
          { label: "Unknown dates", value: t.unknownRenewalDates, tone: t.overdueOrExpired ? "red" : t.unknownRenewalDates ? "amber" : undefined, sub: t.overdueOrExpired ? `${t.overdueOrExpired} overdue` : "No renewal date known", href: "/admin/infrastructure/billing" },
          { label: "Open alerts", value: t.openAlerts, tone: t.openAlerts ? "red" : undefined, href: "/admin/infrastructure/alerts" },
          ...(billing
            ? [
                { label: "Monthly cost", value: formatMoneyList(billing.monthlyEquivalent), sub: billing.excluded.unknownAmount ? `${billing.excluded.unknownAmount} without amount` : "Normalised estimate", href: "/admin/infrastructure/billing" },
                { label: "Due in 30 d", value: formatMoneyList(billing.upcomingPayments30Days), sub: "Confirmed due dates" },
              ]
            : []),
        ]}
      />

      {unmonitored > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium normal-case text-slate-700">
          <span className="flex items-center gap-2"><Activity className="size-3.5 shrink-0 text-slate-400" />{unmonitored} server{unmonitored === 1 ? " is" : "s are"} not sending guest metrics yet. Provider data is shown, but CPU, memory and disk need the optional collector.</span>
          <Link href="/admin/infrastructure/servers" className={btn}><Terminal className="size-3.5" />Open servers</Link>
        </div>
      )}

      {monitored > 0 && (
        <Section title="Server resources" description={`Average across ${trend.data?.serversReporting ?? monitored} monitored server${(trend.data?.serversReporting ?? monitored) === 1 ? "" : "s"} · measured by their collectors`} action={<RangeSelect value={range} onChange={setRange} />}>
          <div className="grid gap-1 lg:grid-cols-3">
            <MonitoringChart ariaLabel="Average CPU usage" data={trend.data?.points ?? []} unit="pct" yMax={100} height={150} series={[{ key: "cpuAvg", label: "CPU", color: SERIES.cpu }]} />
            <MonitoringChart ariaLabel="Average memory and disk usage" data={trend.data?.points ?? []} unit="pct" yMax={100} kind="line" height={150} series={[{ key: "memAvg", label: "Memory", color: SERIES.mem }, { key: "diskMax", label: "Disk (peak)", color: SERIES.disk }]} />
            <MonitoringChart ariaLabel="Network traffic" data={trend.data?.points ?? []} unit="bytesPerSec" height={150} series={[{ key: "netRx", label: "In", color: SERIES.rx }, { key: "netTx", label: "Out", color: SERIES.tx }]} />
          </div>
        </Section>
      )}

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Upcoming renewals" description="Confirmed and registry-reported dates, soonest first" flush action={<Link href="/admin/infrastructure/billing" className={btn}>All renewals</Link>}>
          {d.upcoming.length === 0 ? (
            <Quiet>No dates to show yet. They appear when a registry reports them or you enter them on a subscription.</Quiet>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.upcoming.map((i) => (
                <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/infrastructure/assets/${i.assetId}`} className="truncate text-xs font-semibold normal-case text-slate-900 hover:text-red-700">{i.assetName}</Link>
                    <p className="text-[11px] font-medium text-slate-500">{RENEWAL_KIND_LABEL[i.kind]}{i.amount !== null ? ` · ${formatMoney(i.amount, i.currency)}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <DateValue date={i.date} source={i.source} verified={i.verified} />
                    <Chip tone={daysTone(i.daysRemaining)}>{daysLabel(i.daysRemaining)}</Chip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Needs attention" flush action={<Link href="/admin/infrastructure/alerts" className={btn}>Alerts</Link>}>
          {d.alerts.length === 0 && d.failedChecks.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-xs font-medium normal-case text-slate-600"><ShieldCheck className="size-3.5 text-emerald-600" />No open alerts and no failed checks.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.alerts.map((a) => (
                <li key={a.id} className="px-4 py-2">
                  <div className="flex items-center gap-2"><Chip tone={a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "blue"}>{a.severity}</Chip><span className="truncate text-xs font-semibold normal-case text-slate-900">{a.title}</span></div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{formatDateTime(a.raisedAt)}</p>
                </li>
              ))}
              {d.failedChecks.map((c, i) => (
                <li key={`${c.name}-${i}`} className="px-4 py-2">
                  <div className="flex items-center gap-2"><Chip tone="red">Failed</Chip><span className="truncate text-xs font-semibold normal-case text-slate-900">{c.name} · {c.check}</span></div>
                  {c.detail && <p className="mt-0.5 text-[11px] font-medium normal-case text-slate-500">{c.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {(hasExpiry || providerRows.length > 1 || hasProjection || clientRows.length > 1) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-1">
          {hasExpiry && (
            <Section title="Domain expiry" description="Domains expiring per month, next 12 months">
              <CountBars ariaLabel="Domains expiring per month" rows={expiryRows} formatLabel={(m) => m.slice(5)} height={150} />
            </Section>
          )}
          {providerRows.length > 1 && (
            <Section title="Servers by provider"><Donut ariaLabel="Servers by provider" rows={providerRows} height={120} /></Section>
          )}
          {clientRows.length > 1 && (
            <Section title="By client"><BarList rows={clientRows.map((c) => ({ label: c.name, value: c.servers + c.domains, sub: `${c.servers} servers · ${c.domains} domains${c.monthlyCost?.length ? ` · ${formatMoneyList(c.monthlyCost)}/mo` : ""}` }))} /></Section>
          )}
          {hasProjection && billing && (
            <Section title="Projected payments" description={currencies.size === 1 ? `Per month in ${[...currencies][0]}, from confirmed due dates` : "Per month, per currency"}>
              {currencies.size === 1 ? (
                <CountBars ariaLabel="Projected payments per month" color={SERIES.mem} rows={projection.map((m) => ({ label: m.month, value: m.totals[0]?.amount ?? 0 }))} formatLabel={(m) => m.slice(5)} height={150} />
              ) : (
                <BarList rows={projection.map((m) => ({ label: m.month, value: m.totals.reduce((s, x) => s + x.amount, 0), sub: formatMoneyList(m.totals) })).filter((r) => r.value > 0)} />
              )}
            </Section>
          )}
        </div>
      )}

      {d.recentSync.length > 0 && (
        <Section title="Recent checks" flush>
          <ul className="divide-y divide-slate-100">
            {d.recentSync.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs">
                <span className="font-semibold text-slate-800">{r.kind.replace(/_/g, " ").toLowerCase()} <span className="font-medium text-slate-500">· {r.trigger}</span></span>
                <span className="flex items-center gap-2">
                  {r.error && <span className="max-w-xs truncate text-[11px] font-medium normal-case text-slate-500" title={r.error}>{r.error}</span>}
                  <Chip tone={r.status === "SUCCEEDED" ? "green" : r.status === "PARTIAL" ? "amber" : r.status === "FAILED" ? "red" : "slate"}>{r.status.toLowerCase()}</Chip>
                  <span className="text-slate-500">{formatRelative(r.startedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
