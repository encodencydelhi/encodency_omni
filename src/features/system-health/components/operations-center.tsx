"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileJson,
  Filter,
  HeartPulse,
  Info,
  Layers3,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import { STAFF_MEMBERS } from "@/features/internal-team/data/mock-data";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/config/routes";
import { SYSTEM_HEALTH_CAPABILITIES } from "../data/capabilities";
import { buildSystemHealthSnapshot } from "../data/mock-provider";
import { makeIncident, transitionLabel } from "../data/repository";
import {
  activeIncidents,
  dependenciesForService,
  derivePlatformState,
  environmentLabel,
  incidentsForService,
  observationFor,
  serviceHealth,
  sortServicesByAttention,
  sourceFreshness,
  summaryKpis,
} from "../data/selectors";
import type {
  DependencyRecord,
  HealthEnvironment,
  IncidentPriority,
  IncidentRecord,
  IncidentState,
  MonitoringFreshness,
  ObservedHealth,
  ServiceRecord,
  SystemHealthSnapshotV2,
} from "../data/types";

const BASE = ROUTES.superAdmin.systemHealth;
const TABS = [
  { label: "Overview", href: BASE },
  { label: "Services", href: `${BASE}/services` },
  { label: "Dependencies", href: `${BASE}/dependencies` },
  { label: "Incidents", href: `${BASE}/incidents` },
  { label: "Impact & Availability", href: `${BASE}/impact-availability` },
  { label: "Maintenance", href: `${BASE}/maintenance` },
  { label: "Activity & Monitoring", href: `${BASE}/activity-monitoring` },
] as const;

const healthTone: Record<ObservedHealth, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  unavailable: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

const freshnessTone: Record<MonitoringFreshness, string> = {
  fresh: "border-sky-200 bg-sky-50 text-sky-700",
  stale: "border-amber-200 bg-amber-50 text-amber-800",
  never_reported: "border-slate-200 bg-slate-100 text-slate-600",
};

const priorityTone: Record<IncidentPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const stateTone: Record<IncidentState, string> = {
  investigating: "border-amber-200 bg-amber-50 text-amber-800",
  identified: "border-blue-200 bg-blue-50 text-blue-700",
  monitoring_recovery: "border-sky-200 bg-sky-50 text-sky-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function ButtonLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={cn("inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50", className)}>{children}</Link>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div>
        <h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Never reported";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Calcutta" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, string | number | null>>) {
  const keys = Object.keys(rows[0] ?? {});
  return [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
}

function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-[#111C3A]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Header({ snapshot, setEnvironment, exportJson }: { snapshot: SystemHealthSnapshotV2; setEnvironment: (env: HealthEnvironment) => void; exportJson: () => void }) {
  const state = derivePlatformState(snapshot);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-[#111C3A]">System Health</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Monitor platform services, investigate incidents and review operational impact across OmniPlatform.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`${BASE}/services`}><Layers3 className="size-4" />View Services</ButtonLink>
          <ButtonLink href={`${BASE}/incidents`}><ShieldAlert className="size-4" />View Incidents</ButtonLink>
          <div className="group relative">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><MoreHorizontal className="size-4" />More</button>
            <div className="invisible absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg group-hover:visible">
              <Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/services?health=degraded`}>Review Degraded Services</Link>
              <Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/incidents?state=active`}>View Active Incidents</Link>
              <Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/maintenance`}>View Maintenance</Link>
              <Link className="block rounded px-3 py-2 hover:bg-slate-50" href={`${BASE}/activity-monitoring`}>View Monitoring Coverage</Link>
              <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={exportJson}>Export Snapshot JSON</button>
            </div>
          </div>
        </div>
      </div>
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge className={state === "Partial Outage" ? healthTone.unavailable : state === "Degraded" ? healthTone.degraded : state === "Unknown" ? healthTone.unknown : healthTone.healthy}><HeartPulse className="mr-1 size-3" />{state}</Badge>
            <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Demo Monitoring Data</Badge>
            <Badge className="border-slate-200 bg-slate-50 text-slate-700">Production Telemetry Not Connected</Badge>
            <span className="text-xs text-slate-500">Last observation context: {formatDate(snapshot.generatedAt)} · {snapshot.timezone}</span>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Environment
            <select value={snapshot.environment} onChange={(event) => setEnvironment(event.target.value as HealthEnvironment)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </label>
        </div>
      </Card>
    </div>
  );
}

function Tabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="System Health sections" className="overflow-x-auto border-b border-slate-200">
      <ul className="flex min-w-max gap-0.5">
        {TABS.map((tab) => {
          const active = tab.href === BASE ? pathname === BASE : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={cn("relative inline-flex items-center px-3 py-2 text-[13px] font-medium", active ? "text-[#111C3A]" : "text-slate-500 hover:text-[#111C3A]")}>
                {tab.label}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-[#111C3A]" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Kpis({ snapshot }: { snapshot: SystemHealthSnapshotV2 }) {
  const kpis = summaryKpis(snapshot);
  const items = [
    ["Monitored Services", kpis.monitoredServices, "Registered in selected environment"],
    ["Healthy Services", kpis.healthy, "Fresh healthy observations"],
    ["Degraded Services", kpis.degraded, "Reduced capability"],
    ["Unavailable Services", kpis.unavailable, "Unavailable observed state"],
    ["Unknown Services", kpis.unknown, "No reliable current state"],
    ["Active Incidents", kpis.activeIncidents, "Not resolved"],
    ["Affected Companies", kpis.affectedCompanies || "Impact Unknown", "Distinct confirmed or potential IDs"],
    ["Stale Monitoring Sources", kpis.staleMonitors, "Stale or never reported"],
  ];
  return (
    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([title, value, hint]) => (
        <Card key={title} className="p-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-[#111C3A]">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </Card>
      ))}
    </div>
  );
}

function ServiceRow({ snapshot, service, onPreview }: { snapshot: SystemHealthSnapshotV2; service: ServiceRecord; onPreview: (service: ServiceRecord) => void }) {
  const observation = observationFor(snapshot, service.id);
  const health = serviceHealth(snapshot, service);
  const freshness = sourceFreshness(snapshot, observation);
  const incidents = incidentsForService(snapshot, service.id).filter((incident) => incident.state !== "resolved");
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2">
        <button type="button" onClick={() => onPreview(service)} className="text-left">
          <span className="block text-xs font-bold text-[#111C3A]">{service.name}</span>
          <span className="block text-[11px] text-slate-500">{service.category}</span>
        </button>
      </td>
      <td className="px-3 py-2"><Badge className={healthTone[health]}>{label(health)}</Badge></td>
      <td className="px-3 py-2"><Badge className={freshnessTone[freshness]}>{label(freshness)}</Badge></td>
      <td className="px-3 py-2 text-xs text-slate-600">{formatDate(observation?.observedAt ?? null)}</td>
      <td className="px-3 py-2 text-xs text-slate-600">{incidents.length}</td>
      <td className="px-3 py-2 text-xs text-slate-600">{service.capabilities.map((capability) => capability.label).join(", ")}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => onPreview(service)} className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-white" aria-label={`Preview ${service.name}`}><Eye className="size-3.5" /></button>
          <Link href={`${BASE}/services/${service.id}`} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white">Open</Link>
        </div>
      </td>
    </tr>
  );
}

function ServiceTable({ snapshot, services, onPreview }: { snapshot: SystemHealthSnapshotV2; services: ServiceRecord[]; onPreview: (service: ServiceRecord) => void }) {
  if (services.length === 0) return <Empty title="No Matching Search Results" body="Adjust search, health state or category filters." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Health</th><th className="px-3 py-2">Freshness</th><th className="px-3 py-2">Last Observed</th><th className="px-3 py-2">Incidents</th><th className="px-3 py-2">Capabilities</th><th className="px-3 py-2 text-right">Actions</th></tr>
        </thead>
        <tbody>{services.map((service) => <ServiceRow key={service.id} snapshot={snapshot} service={service} onPreview={onPreview} />)}</tbody>
      </table>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-[#111C3A]">{title}</p><p className="mt-1 text-xs text-slate-500">{body}</p></div>;
}

function Overview({ snapshot, openPreview }: { snapshot: SystemHealthSnapshotV2; openPreview: (service: ServiceRecord) => void }) {
  const active = activeIncidents(snapshot);
  const dependencies = snapshot.dependencies.filter((dependency) => dependency.observedHealth !== "healthy" || dependency.freshness !== "fresh");
  const services = sortServicesByAttention(snapshot).slice(0, 6);
  const impacts = snapshot.impacts.filter((impact) => impact.incidentId && active.some((incident) => incident.id === impact.incidentId));
  return (
    <div className="space-y-4">
      <Kpis snapshot={snapshot} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card><CardTitle title="Service Health Overview" subtitle="Registered services and their latest demo observations." action={<ButtonLink href={`${BASE}/services`}>View All</ButtonLink>} /><ServiceTable snapshot={snapshot} services={services} onPreview={openPreview} /></Card>
        <Card><CardTitle title="Active Incidents" subtitle="Managed incident records, separate from raw health state." action={<ButtonLink href={`${BASE}/incidents`}>View All</ButtonLink>} /><IncidentList snapshot={snapshot} incidents={active} compact /></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardTitle title="Operational Impact" subtitle="Confirmed, potential and unknown impact records." /><ImpactTable snapshot={snapshot} impacts={impacts.slice(0, 5)} /></Card>
        <Card><CardTitle title="Dependency Attention" subtitle="Dependencies with degraded, unknown or stale observations." /><DependencyList snapshot={snapshot} dependencies={dependencies.slice(0, 6)} /></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AvailabilityPanel snapshot={snapshot} />
        <Card><CardTitle title="Recent Health Events" subtitle="Health activity, incident updates and freshness changes." /><ActivityTable snapshot={snapshot} activity={snapshot.activity.slice(0, 6)} /></Card>
      </div>
      <MaintenancePage snapshot={snapshot} compact />
    </div>
  );
}

function IncidentList({ snapshot, incidents, compact = false }: { snapshot: SystemHealthSnapshotV2; incidents: IncidentRecord[]; compact?: boolean }) {
  if (!incidents.length) return <div className="p-4"><Empty title="No Active Incidents" body="Resolved records remain available in the incident directory." /></div>;
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-left", !compact && "min-w-[920px]")}>
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr><th className="px-3 py-2">Incident</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Primary Service</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2 text-right">Action</th></tr>
        </thead>
        <tbody>{incidents.map((incident) => {
          const service = snapshot.services.find((item) => item.id === incident.primaryServiceId);
          return (
            <tr key={incident.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2"><span className="block text-xs font-bold text-[#111C3A]">{incident.reference}</span><span className="block text-[11px] text-slate-500">{incident.title}</span></td>
              <td className="px-3 py-2"><Badge className={priorityTone[incident.priority]}>{label(incident.priority)}</Badge></td>
              <td className="px-3 py-2"><Badge className={stateTone[incident.state]}>{transitionLabel(incident.state)}</Badge></td>
              <td className="px-3 py-2 text-xs text-slate-600">{service?.name ?? "Unknown service"}</td>
              <td className="px-3 py-2 text-xs text-slate-600">{incident.ownerName ?? "Unassigned"}</td>
              <td className="px-3 py-2 text-right"><Link href={`${BASE}/incidents/${incident.id}`} className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white">Open</Link></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function DependencyList({ snapshot, dependencies }: { snapshot: SystemHealthSnapshotV2; dependencies: DependencyRecord[] }) {
  if (!dependencies.length) return <div className="p-4"><Empty title="No Dependencies Requiring Attention" body="Healthy dependencies remain visible in the dependency directory." /></div>;
  return (
    <div className="divide-y divide-slate-100">
      {dependencies.map((dependency) => {
        const services = snapshot.services.filter((service) => service.dependencyIds.includes(dependency.id));
        return (
          <Link key={dependency.id} href={`${BASE}/dependencies?dependency=${dependency.id}`} className="block px-4 py-3 hover:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-bold text-[#111C3A]">{dependency.name}</p><p className="text-[11px] text-slate-500">{dependency.type} · {services.length} dependent services</p></div>
              <div className="flex gap-1"><Badge className={healthTone[dependency.observedHealth]}>{label(dependency.observedHealth)}</Badge><Badge className={freshnessTone[dependency.freshness]}>{label(dependency.freshness)}</Badge></div>
            </div>
            <p className="mt-1 text-xs text-slate-600">{dependency.impactSummary}</p>
          </Link>
        );
      })}
    </div>
  );
}

function ImpactTable({ snapshot, impacts }: { snapshot: SystemHealthSnapshotV2; impacts: typeof snapshot.impacts }) {
  if (!impacts.length) return <div className="p-4"><Empty title="No Company Impact Records" body="No confirmed or potential impact is linked to the current filters." /></div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Evidence</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Incident</th></tr></thead>
        <tbody>{impacts.map((impact) => {
          const service = snapshot.services.find((item) => item.id === impact.serviceId);
          return <tr key={impact.id} className="border-b border-slate-100"><td className="px-3 py-2"><Badge className={impact.confidence === "confirmed" ? healthTone.degraded : impact.confidence === "potential" ? freshnessTone.stale : healthTone.unknown}>{label(impact.confidence)}</Badge><p className="mt-1 text-xs font-semibold text-[#111C3A]">{impact.area}</p></td><td className="px-3 py-2 text-xs text-slate-600">{impact.companyName ?? "Impact Unknown"}{impact.clientName ? ` · ${impact.clientName}` : ""}</td><td className="px-3 py-2 text-xs text-slate-600">{impact.evidence}</td><td className="px-3 py-2 text-xs text-slate-600">{service?.name ?? "Unknown"}</td><td className="px-3 py-2 text-xs text-slate-600">{impact.incidentId ?? "Not linked"}</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function AvailabilityPanel({ snapshot }: { snapshot: SystemHealthSnapshotV2 }) {
  const points = snapshot.availability.filter((point) => snapshot.services.some((service) => service.id === point.serviceId));
  const latest = points.slice(-8);
  return (
    <Card>
      <CardTitle title="Availability Trend" subtitle="Observed availability keeps unknown intervals separate from healthy time." action={<ButtonLink href={`${BASE}/impact-availability`}>Review</ButtonLink>} />
      <div className="p-4">
        <div className="flex h-32 items-end gap-1">
          {latest.map((point, index) => (
            <div key={`${point.serviceId}-${point.at}-${index}`} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-slate-200" style={{ height: `${point.unknownMinutes ? 22 : Math.max(18, point.observedAvailability ?? 8)}%` }}>
                <div className={cn("h-full rounded-t", point.unknownMinutes ? "bg-slate-400" : point.unavailableMinutes ? "bg-rose-400" : point.degradedMinutes ? "bg-amber-400" : "bg-emerald-500")} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-1 sm:grid-cols-4">
          <MiniMetric label="Observed Availability" value="Source-aware" />
          <MiniMetric label="Unknown Intervals" value={`${points.reduce((sum, point) => sum + point.unknownMinutes, 0)} min`} />
          <MiniMetric label="Degraded Periods" value={`${points.reduce((sum, point) => sum + point.degradedMinutes, 0)} min`} />
          <MiniMetric label="Unavailable Periods" value={`${points.reduce((sum, point) => sum + point.unavailableMinutes, 0)} min`} />
        </div>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">{label}</p><p className="text-xs font-bold text-[#111C3A]">{value}</p></div>;
}

function ActivityTable({ snapshot, activity }: { snapshot: SystemHealthSnapshotV2; activity: typeof snapshot.activity }) {
  if (!activity.length) return <div className="p-4"><Empty title="No Health Activity" body="No health events match the current view." /></div>;
  return <div className="divide-y divide-slate-100">{activity.map((item) => <div key={item.id} className="px-4 py-3"><p className="text-xs font-bold text-[#111C3A]">{item.type}</p><p className="text-xs text-slate-600">{item.summary}</p><p className="mt-1 text-[11px] text-slate-500">{formatDate(item.at)} · {item.source}</p></div>)}</div>;
}

function ServicePreview({ snapshot, service, onClose }: { snapshot: SystemHealthSnapshotV2; service: ServiceRecord | null; onClose: () => void }) {
  const observation = service ? observationFor(snapshot, service.id) : undefined;
  const health = service ? serviceHealth(snapshot, service) : "unknown";
  const freshness = sourceFreshness(snapshot, observation);
  return (
    <Drawer title={service?.name ?? "Service Preview"} open={Boolean(service)} onClose={onClose}>
      {service ? <div className="space-y-4">
        <div className="grid gap-1 sm:grid-cols-3">
          <MiniMetric label="Observed Health" value={label(health)} />
          <MiniMetric label="Freshness" value={label(freshness)} />
          <MiniMetric label="Operational Control" value={label(observation?.operationalControl ?? "unknown")} />
        </div>
        <div><p className="text-sm font-bold text-[#111C3A]">{service.description}</p><p className="mt-2 text-xs text-slate-600">{observation?.summary ?? "No current observation is available for this service."}</p></div>
        <Card className="p-3"><p className="text-xs font-bold text-[#111C3A]">Affected Capabilities</p><div className="mt-2 grid gap-2">{service.capabilities.map((capability) => <Link key={capability.id} href={capability.diagnosticHref} className="rounded-md border border-slate-200 p-2 text-xs hover:bg-slate-50">{capability.label}<span className="block text-[11px] text-slate-500">{capability.workflow}</span></Link>)}</div></Card>
        <div className="flex justify-end gap-2"><ButtonLink href={`${BASE}/services/${service.id}`}>Open Service</ButtonLink><ButtonLink href={`${BASE}/incidents?service=${service.id}`}>View Incidents</ButtonLink></div>
      </div> : null}
    </Drawer>
  );
}

function ServicesPage({ snapshot, openPreview }: { snapshot: SystemHealthSnapshotV2; openPreview: (service: ServiceRecord) => void }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState(searchParams.get("health") ?? "all");
  const [category, setCategory] = useState("all");
  const services = snapshot.services.filter((service) => {
    const current = serviceHealth(snapshot, service);
    return (health === "all" || current === health) && (category === "all" || service.category === category) && `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(query.toLowerCase());
  });
  const categories = Array.from(new Set(snapshot.services.map((service) => service.category)));
  return (
    <Card>
      <CardTitle title="Services Directory" subtitle="Service catalogue, capabilities, freshness and incident context." action={<button type="button" onClick={() => downloadFile("system-health-services.csv", toCsv(services.map((service) => ({ id: service.id, name: service.name, category: service.category, health: serviceHealth(snapshot, service), freshness: sourceFreshness(snapshot, observationFor(snapshot, service.id)) }))), "text/csv")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export CSV</button>} />
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        <label className="relative min-w-56 flex-1"><Search className="absolute left-2 top-2.5 size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-3 text-xs" placeholder="Search services" /></label>
        <select value={health} onChange={(event) => setHealth(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All health states</option><option value="healthy">Healthy</option><option value="degraded">Degraded</option><option value="unavailable">Unavailable</option><option value="unknown">Unknown</option></select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <ServiceTable snapshot={snapshot} services={services} onPreview={openPreview} />
    </Card>
  );
}

function ServiceDetailPage({ snapshot, serviceId }: { snapshot: SystemHealthSnapshotV2; serviceId: string }) {
  const service = snapshot.services.find((item) => item.id === serviceId);
  if (!service) return <NotFound title="Service Not Found" body="The service is not registered in the selected environment inventory." href={`${BASE}/services`} />;
  const observation = observationFor(snapshot, service.id);
  const dependencies = dependenciesForService(snapshot, service);
  const incidents = incidentsForService(snapshot, service.id);
  const impacts = snapshot.impacts.filter((impact) => impact.serviceId === service.id);
  return (
    <div className="space-y-4">
      <Link href={`${BASE}/services`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#111C3A]"><ArrowLeft className="size-4" />Back to Services</Link>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase text-slate-500">{service.category}</p><h2 className="text-xl font-bold text-[#111C3A]">{service.name}</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">{service.description}</p></div>
          <ButtonLink href={service.capabilities[0]?.diagnosticHref ?? BASE}><Activity className="size-4" />Open Diagnostic Module</ButtonLink>
        </div>
        <div className="mt-4 grid gap-1 sm:grid-cols-4">
          <MiniMetric label="Observed Health" value={label(serviceHealth(snapshot, service))} />
          <MiniMetric label="Monitoring Freshness" value={label(sourceFreshness(snapshot, observation))} />
          <MiniMetric label="Last Observed" value={formatDate(observation?.observedAt ?? null)} />
          <MiniMetric label="Operational Control" value={label(observation?.operationalControl ?? "unknown")} />
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardTitle title="Health & Metrics" subtitle={observation?.summary ?? "No observation available."} /><div className="p-4"><MiniMetric label={observation?.metricLabel ?? "Metric"} value={observation?.metricValue ?? "Unknown"} /></div></Card>
        <Card><CardTitle title="Service Dependencies" subtitle="Dependency health is shown without expanding it into confirmed company impact." /><DependencyList snapshot={snapshot} dependencies={dependencies} /></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardTitle title="Service Incidents" /><IncidentList snapshot={snapshot} incidents={incidents} /></Card>
        <Card><CardTitle title="Service Activity" /><ActivityTable snapshot={snapshot} activity={snapshot.activity.filter((item) => item.serviceId === service.id)} /></Card>
      </div>
      <Card><CardTitle title="Known Impact" /><ImpactTable snapshot={snapshot} impacts={impacts} /></Card>
    </div>
  );
}

function NotFound({ title, body, href }: { title: string; body: string; href: string }) {
  return <Card className="p-8 text-center"><AlertTriangle className="mx-auto size-8 text-amber-500" /><h2 className="mt-3 text-lg font-bold text-[#111C3A]">{title}</h2><p className="mt-1 text-sm text-slate-600">{body}</p><ButtonLink href={href} className="mt-4">Return</ButtonLink></Card>;
}

function DependenciesPage({ snapshot }: { snapshot: SystemHealthSnapshotV2 }) {
  const selectedId = useSearchParams().get("dependency") ?? snapshot.dependencies[0]?.id;
  const selected = snapshot.dependencies.find((dependency) => dependency.id === selectedId);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card><CardTitle title="Dependencies Directory" subtitle="Infrastructure and external dependencies with source-aware freshness." /><DependencyList snapshot={snapshot} dependencies={snapshot.dependencies} /></Card>
      <Card><CardTitle title="Dependency Detail" subtitle="Potential impact is not presented as confirmed without evidence." />{selected ? <div className="space-y-3 p-4"><div className="grid gap-1 sm:grid-cols-2"><MiniMetric label="Observed Health" value={label(selected.observedHealth)} /><MiniMetric label="Freshness" value={label(selected.freshness)} /></div><p className="text-sm font-bold text-[#111C3A]">{selected.name}</p><p className="text-xs text-slate-600">{selected.impactSummary}</p><div className="grid gap-2">{snapshot.services.filter((service) => service.dependencyIds.includes(selected.id)).map((service) => <Link key={service.id} href={`${BASE}/services/${service.id}`} className="rounded-md border border-slate-200 p-2 text-xs font-semibold hover:bg-slate-50">{service.name}<span className="block text-[11px] font-normal text-slate-500">{service.category}</span></Link>)}</div></div> : <Empty title="No Dependencies" body="No dependencies are registered." />}</Card>
    </div>
  );
}

function CreateIncidentModal({ snapshot, open, onClose, onCreate }: { snapshot: SystemHealthSnapshotV2; open: boolean; onClose: () => void; onCreate: (incident: IncidentRecord) => void }) {
  const owners = STAFF_MEMBERS.filter((staff) => staff.status === "active" && (staff.role === "super_admin" || staff.role === "technical_admin" || staff.role === "support"));
  const [title, setTitle] = useState("");
  const [serviceId, setServiceId] = useState(snapshot.services[0]?.id ?? "");
  const [priority, setPriority] = useState<IncidentPriority>("medium");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  function submit() {
    if (!title.trim() || !serviceId || !ownerId || !summary.trim()) {
      setError("Title, service, owner and summary are required.");
      return;
    }
    const owner = owners.find((item) => item.id === ownerId);
    onCreate(makeIncident({ title, primaryServiceId: serviceId, affectedServiceIds: [], priority, ownerId, ownerName: owner?.name ?? "Unassigned", summary }, Date.now() % 1000));
    setTitle(""); setSummary(""); setError(""); onClose();
  }
  return <Modal title="Create Demo Incident" open={open} onClose={onClose}><div className="space-y-3"><p className="text-xs text-slate-600">Creates a frontend demo incident record. It does not change service health or trigger production notifications.</p>{error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</div> : null}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Incident title" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Known symptoms and investigation context" className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><div className="grid gap-2 sm:grid-cols-3"><select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm">{snapshot.services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select><select value={priority} onChange={(event) => setPriority(event.target.value as IncidentPriority)} className="rounded-md border border-slate-200 px-2 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm">{owners.map((owner) => <option value={owner.id} key={owner.id}>{owner.name}</option>)}</select></div><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={submit} className="rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white">Create Incident</button></div></div></Modal>;
}

function IncidentsPage({ snapshot, incidents, setIncidents }: { snapshot: SystemHealthSnapshotV2; incidents: IncidentRecord[]; setIncidents: (incidents: IncidentRecord[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(useSearchParams().get("state") ?? "all");
  const visible = incidents.filter((incident) => filter === "all" || (filter === "active" ? incident.state !== "resolved" : incident.state === filter));
  return (
    <>
      <Card><CardTitle title="Incidents Directory" subtitle="Managed incident records and workflow state." action={<div className="flex gap-2"><button type="button" onClick={() => downloadFile("system-health-incidents.csv", toCsv(visible.map((incident) => ({ reference: incident.reference, title: incident.title, priority: incident.priority, state: incident.state, owner: incident.ownerName }))), "text/csv")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"><Download className="size-4" />Export</button><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white"><Plus className="size-4" />Create Incident</button></div>} /><div className="border-b border-slate-100 p-3"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All incidents</option><option value="active">Active incidents</option><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring_recovery">Monitoring Recovery</option><option value="resolved">Resolved</option></select></div><IncidentList snapshot={{ ...snapshot, incidents }} incidents={visible} /></Card>
      <CreateIncidentModal snapshot={snapshot} open={open} onClose={() => setOpen(false)} onCreate={(incident) => setIncidents([incident, ...incidents])} />
    </>
  );
}

function IncidentDetailPage({ snapshot, incidents, setIncidents, incidentId }: { snapshot: SystemHealthSnapshotV2; incidents: IncidentRecord[]; setIncidents: (incidents: IncidentRecord[]) => void; incidentId: string }) {
  const incident = incidents.find((item) => item.id === incidentId);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  if (!incident) return <NotFound title="Incident Not Found" body="The incident reference is not present in the shared demo state." href={`${BASE}/incidents`} />;
  const service = snapshot.services.find((item) => item.id === incident.primaryServiceId);
  const update = (next: IncidentRecord) => setIncidents(incidents.map((item) => item.id === incident.id ? next : item));
  function addNote() {
    if (!note.trim()) return;
    update({ ...incident, timeline: [{ id: `${incident.id}-${Date.now()}`, at: new Date().toISOString(), actor: incident.ownerName ?? "Super Admin", type: "update", note }, ...incident.timeline], currentFindings: note });
    setNote("");
  }
  function changeState(state: IncidentState) {
    update({ ...incident, state, resolvedAt: state === "resolved" ? new Date().toISOString() : incident.resolvedAt, recoveryEvidence: state === "resolved" ? resolution || "Resolved in frontend demo workflow after evidence review." : incident.recoveryEvidence, timeline: [{ id: `${incident.id}-${Date.now()}`, at: new Date().toISOString(), actor: incident.ownerName ?? "Super Admin", type: state === "resolved" ? "resolution" : "state_change", note: `State changed to ${transitionLabel(state)}. Service health was not automatically changed.` }, ...incident.timeline] });
  }
  return (
    <div className="space-y-4">
      <Link href={`${BASE}/incidents`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#111C3A]"><ArrowLeft className="size-4" />Back to Incidents</Link>
      <Card className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-500">{incident.reference}</p><h2 className="text-xl font-bold text-[#111C3A]">{incident.title}</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">{incident.summary}</p></div><div className="flex gap-1"><Badge className={priorityTone[incident.priority]}>{label(incident.priority)}</Badge><Badge className={stateTone[incident.state]}>{transitionLabel(incident.state)}</Badge></div></div><div className="mt-4 grid gap-1 sm:grid-cols-4"><MiniMetric label="Primary Service" value={service?.name ?? "Unknown"} /><MiniMetric label="Owner" value={incident.ownerName ?? "Unassigned"} /><MiniMetric label="Detected" value={formatDate(incident.detectedAt)} /><MiniMetric label="Resolved" value={formatDate(incident.resolvedAt)} /></div></Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card><CardTitle title="Incident Timeline" subtitle="Chronological updates recorded in frontend demo state." /><div className="space-y-2 p-4">{incident.timeline.map((entry) => <div key={entry.id} className="rounded-md border border-slate-200 p-3"><p className="text-xs font-bold text-[#111C3A]">{label(entry.type)} · {entry.actor}</p><p className="mt-1 text-xs text-slate-600">{entry.note}</p><p className="mt-1 text-[11px] text-slate-500">{formatDate(entry.at)}</p></div>)}</div></Card>
        <Card><CardTitle title="Incident Workflow" subtitle="Updates never imply infrastructure repair." /><div className="space-y-3 p-4"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add investigation update" className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><button type="button" onClick={addNote} className="w-full rounded-md bg-[#111C3A] px-3 py-2 text-xs font-semibold text-white">Add Incident Update</button><select value={incident.state} onChange={(event) => changeState(event.target.value as IncidentState)} className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring_recovery">Monitoring Recovery</option><option value="resolved">Resolved</option></select><textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Recovery evidence for resolution review" className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" /><p className="text-[11px] text-slate-500">Resolving this incident changes only the incident workflow. It does not mark any service healthy.</p></div></Card>
      </div>
      <Card><CardTitle title="Incident Impact" /><ImpactTable snapshot={snapshot} impacts={snapshot.impacts.filter((impact) => incident.impactIds.includes(impact.id))} /></Card>
    </div>
  );
}

function ImpactAvailabilityPage({ snapshot }: { snapshot: SystemHealthSnapshotV2 }) {
  const [serviceId, setServiceId] = useState("all");
  const points = snapshot.availability.filter((point) => serviceId === "all" || point.serviceId === serviceId);
  return (
    <div className="space-y-4">
      <Card><CardTitle title="Impact & Availability" subtitle="Availability reporting separates observed, degraded, unavailable and unknown intervals." action={<select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs"><option value="all">All services</option>{snapshot.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>} /><div className="p-4"><AvailabilityPanel snapshot={{ ...snapshot, availability: points }} /></div></Card>
      <Card><CardTitle title="Company Impact Table" /><ImpactTable snapshot={snapshot} impacts={snapshot.impacts} /></Card>
    </div>
  );
}

function MaintenancePage({ snapshot, compact = false }: { snapshot: SystemHealthSnapshotV2; compact?: boolean }) {
  return (
    <Card><CardTitle title={compact ? "Upcoming Maintenance" : "Maintenance"} subtitle="Maintenance visibility reads the Global Settings-owned schedule." action={!compact ? <ButtonLink href={`${ROUTES.superAdmin.settings}/maintenance`}><Wrench className="size-4" />Open Global Settings</ButtonLink> : <ButtonLink href={`${BASE}/maintenance`}>View</ButtonLink>} /><div className="divide-y divide-slate-100">{snapshot.maintenance.map((item) => <div key={item.id} className="px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{item.title}</p><Badge className={item.state === "in_progress" ? freshnessTone.stale : healthTone.unknown}>{label(item.state)}</Badge></div><p className="mt-1 text-xs text-slate-600">{item.scope}</p><p className="mt-1 text-[11px] text-slate-500">{formatDate(item.startsAt)} to {formatDate(item.endsAt)} · Source: Global Settings</p></div>)}</div></Card>
  );
}

function ActivityMonitoringPage({ snapshot }: { snapshot: SystemHealthSnapshotV2 }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card><CardTitle title="Health Activity" subtitle="Monitoring events stay in System Health activity, not high-impact audit history." /><ActivityTable snapshot={snapshot} activity={snapshot.activity} /></Card>
      <Card><CardTitle title="Monitoring Coverage" subtitle="Every source is clearly labelled as demo-backed until backend telemetry is connected." /><div className="divide-y divide-slate-100">{snapshot.sources.map((source) => <div key={source.id} className="px-4 py-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-[#111C3A]">{source.name}</p><Badge className={source.backendConnected ? healthTone.healthy : freshnessTone.stale}>{source.backendConnected ? "Backend Connected" : "Demo Only"}</Badge></div><p className="mt-1 text-xs text-slate-600">{label(source.kind)} · freshness threshold {source.freshnessThresholdMinutes} min</p></div>)}</div></Card>
    </div>
  );
}

export function SystemHealthOperationsCenter({ page, serviceId, incidentId }: { page?: "overview" | "services" | "service-detail" | "dependencies" | "incidents" | "incident-detail" | "impact" | "maintenance" | "activity"; serviceId?: string; incidentId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const initialEnv = (search.get("env") as HealthEnvironment | null) ?? "production";
  const [environment, setEnvironmentState] = useState<HealthEnvironment>(["development", "staging", "production"].includes(initialEnv) ? initialEnv : "production");
  const [preview, setPreview] = useState<ServiceRecord | null>(null);
  const snapshot = useMemo(() => buildSystemHealthSnapshot(environment), [environment]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>(snapshot.incidents);
  useEffect(() => setIncidents(buildSystemHealthSnapshot(environment).incidents), [environment]);
  const workingSnapshot = { ...snapshot, incidents };
  function setEnvironment(env: HealthEnvironment) {
    setEnvironmentState(env);
    const params = new URLSearchParams(search.toString());
    params.set("env", env);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  }
  function exportJson() {
    downloadFile(`system-health-${environment}.json`, JSON.stringify({ ...workingSnapshot, limitation: "Demo Monitoring Data - Production Telemetry Not Connected" }, null, 2), "application/json");
  }
  return (
    <div className="space-y-4">
      <Header snapshot={workingSnapshot} setEnvironment={setEnvironment} exportJson={exportJson} />
      <Tabs />
      {!SYSTEM_HEALTH_CAPABILITIES.canViewSystemHealth ? <NotFound title="Insufficient Capability" body="Your role cannot view System Health." href={ROUTES.superAdmin.dashboard} /> : null}
      {page === "services" ? <ServicesPage snapshot={workingSnapshot} openPreview={setPreview} /> : null}
      {page === "service-detail" && serviceId ? <ServiceDetailPage snapshot={workingSnapshot} serviceId={serviceId} /> : null}
      {page === "dependencies" ? <DependenciesPage snapshot={workingSnapshot} /> : null}
      {page === "incidents" ? <IncidentsPage snapshot={workingSnapshot} incidents={incidents} setIncidents={setIncidents} /> : null}
      {page === "incident-detail" && incidentId ? <IncidentDetailPage snapshot={workingSnapshot} incidents={incidents} setIncidents={setIncidents} incidentId={incidentId} /> : null}
      {page === "impact" ? <ImpactAvailabilityPage snapshot={workingSnapshot} /> : null}
      {page === "maintenance" ? <MaintenancePage snapshot={workingSnapshot} /> : null}
      {page === "activity" ? <ActivityMonitoringPage snapshot={workingSnapshot} /> : null}
      {!page || page === "overview" ? <Overview snapshot={workingSnapshot} openPreview={setPreview} /> : null}
      <ServicePreview snapshot={workingSnapshot} service={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
