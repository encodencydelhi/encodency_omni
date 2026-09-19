"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowUpRight, Bell, CalendarClock, Database, Download, Gauge, RefreshCw, Search, ShieldAlert, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader, PageSection } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ROUTES } from "@/config/routes";
import { platformNow } from "@/features/companies/data/clock";
import { OVERRIDABLE_RESOURCES, RESOURCE_STATUS_META, USAGE_RESOURCE_BY_KEY, USAGE_RESOURCES, USAGE_THRESHOLDS } from "@/features/companies/data/config";
import type { CompanyUsageRecord, UsageResource } from "@/features/companies/data/types";
import { usageLimitsRepository, type OverrideDraft, type UsageCompanySnapshot } from "../data/repository";

type Tab = "overview" | "companies" | "resources" | "alerts" | "overrides" | "activity";
type Period = "7d" | "30d" | "90d" | "custom";

const TABS: Array<{ id: Tab; label: string; href: string }> = [
  { id: "overview", label: "Overview", href: ROUTES.superAdmin.usage },
  { id: "companies", label: "Company Usage", href: `${ROUTES.superAdmin.usage}?tab=companies` },
  { id: "resources", label: "Resources & Limits", href: `${ROUTES.superAdmin.usage}?tab=resources` },
  { id: "alerts", label: "Alerts & Overages", href: `${ROUTES.superAdmin.usage}?tab=alerts` },
  { id: "overrides", label: "Overrides", href: `${ROUTES.superAdmin.usage}?tab=overrides` },
  { id: "activity", label: "Metering & Activity", href: `${ROUTES.superAdmin.usage}?tab=activity` },
];

const DAY_MS = 86_400_000;

function formatDate(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)) : "Not set";
}

function formatNumber(value: number | null, unit = "") {
  if (value === null) return "Unlimited";
  return `${value.toLocaleString("en-IN")}${unit ? ` ${titleText(unit)}` : ""}`;
}

function titleText(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function tone(status: string): "success" | "warning" | "danger" | "info" | "neutral" | "brand" {
  if (status === "exceeded" || status === "critical" || status === "failed") return "danger";
  if (status === "near_limit" || status === "warning" || status === "expiring") return "warning";
  if (status === "high" || status === "info") return "info";
  if (status === "healthy" || status === "normal" || status === "active") return "success";
  return "neutral";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type UsageCompany = UsageCompanySnapshot;

interface UsageAlert {
  id: string;
  severity: "critical" | "warning";
  item: UsageCompany;
  record: CompanyUsageRecord;
  reason: string;
  detectedAt: string;
}

function useUsageData(version: number) {
  return useMemo<UsageCompany[]>(() => {
    return usageLimitsRepository.listCompanyUsage();
  }, [version]);
}

export function UsageLimitsWorkspace({ initialTab = "overview" }: { initialTab?: Tab }) {
  const [version, setVersion] = useState(0);
  const [activeTab] = useState<Tab>(initialTab);
  const [period, setPeriod] = useState<Period>("30d");
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set());
  const data = useUsageData(version);
  const [selectedCompany, setSelectedCompany] = useState<UsageCompany | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<UsageAlert | null>(null);
  const [selectedResource, setSelectedResource] = useState<UsageResource | null>(null);
  const [resource, setResource] = useState<UsageResource>("aiCredits");

  const writeOverride = (companyId: string, input: OverrideDraft) => {
    usageLimitsRepository.createOverride(companyId, input);
    setVersion((value) => value + 1);
  };

  const removeOverride = (companyId: string, overrideId: string) => {
    usageLimitsRepository.revokeOverride(companyId, overrideId);
    setVersion((value) => value + 1);
  };

  const exportUsage = () => {
    const rows = [["Company", "Resource", "Unit", "Current Usage", "Base Allowance", "Override", "Effective Allowance", "Utilization Status", "Data Freshness"]];
    for (const item of data) {
      for (const record of item.usage.records) {
        const def = USAGE_RESOURCE_BY_KEY[record.resource];
        rows.push([item.bundle.company.name, def.label, def.unit, String(record.used), String(record.includedLimit ?? "Unlimited"), String(record.activeOverride?.overrideLimit ?? ""), String(record.effectiveLimit ?? "Unlimited"), record.status, record.updatedAt]);
      }
    }
    downloadCsv("omni-usage-limits.csv", rows);
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setVersion((value) => value + 1);
      setRefreshing(false);
    }, 350);
  };

  const acknowledgeAlert = (id: string) => {
    setAcknowledged((current) => new Set([...current, id]));
    setSelectedAlert(null);
  };

  return (
    <PageSection className="space-y-3">
      <PageHeader
        title="Usage & Limits"
        description="Monitor Platform Usage, Quota Health, Over-Limit Risks, Metering Signals And Company-Specific Overrides."
        actions={
          <>
            <Button asChild size="sm" variant="outline"><Link href={`${ROUTES.superAdmin.usage}?tab=companies`}>View Company Usage</Link></Button>
            <Select value={resource} onValueChange={(value) => setResource(value as UsageResource)}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{USAGE_RESOURCES.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="7d">7D</SelectItem><SelectItem value="30d">30D</SelectItem><SelectItem value="90d">90D</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}><RefreshCw className={refreshing ? "animate-spin" : ""} />Refresh</Button>
            <Button size="sm" variant="outline" onClick={exportUsage}><Download />Export Usage</Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
        <span>Period: <b className="font-medium text-foreground">{period.toUpperCase()}</b></span>
        <span>Last Updated: <b className="font-medium text-foreground">{formatDate(new Date(platformNow()).toISOString())}</b></span>
        <span>Mock Mode: Deterministic Frontend Data Only.</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto rounded-sm border border-border bg-card p-1">
        {TABS.map((tab) => (
          <Button key={tab.id} asChild size="sm" variant={activeTab === tab.id ? "secondary" : "ghost"} className="shrink-0">
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </nav>
      {activeTab === "overview" ? <Overview data={data} resource={resource} period={period} onOpen={setSelectedCompany} onResource={setSelectedResource} /> : null}
      {activeTab === "companies" ? <CompanyUsage data={data} resource={resource} onResource={setResource} onOpen={setSelectedCompany} onOverride={writeOverride} /> : null}
      {activeTab === "resources" ? <ResourcesTab data={data} onResource={setSelectedResource} /> : null}
      {activeTab === "alerts" ? <AlertsTab data={data} acknowledged={acknowledged} onOpen={setSelectedCompany} onAlert={setSelectedAlert} /> : null}
      {activeTab === "overrides" ? <OverridesTab data={data} onRemove={removeOverride} onOpen={setSelectedCompany} /> : null}
      {activeTab === "activity" ? <ActivityTab data={data} /> : null}
      <CompanyUsageDialog item={selectedCompany} onClose={() => setSelectedCompany(null)} onOverride={writeOverride} onRemove={removeOverride} />
      <AlertDetailDialog alert={selectedAlert} acknowledged={selectedAlert ? acknowledged.has(selectedAlert.id) : false} onClose={() => setSelectedAlert(null)} onAcknowledge={acknowledgeAlert} onOpenCompany={setSelectedCompany} />
      <ResourceDetailDialog resource={selectedResource} data={data} onClose={() => setSelectedResource(null)} />
    </PageSection>
  );
}

function Overview({ data, resource, period, onOpen, onResource }: { data: UsageCompany[]; resource: UsageResource; period: Period; onOpen: (item: UsageCompany) => void; onResource: (resource: UsageResource) => void }) {
  const allRecords = data.flatMap((item) => item.usage.records.map((record) => ({ ...record, company: item })));
  const nearCompanies = new Set(allRecords.filter((record) => record.status === "near_limit").map((record) => record.company.bundle.company.id));
  const exceededCompanies = new Set(allRecords.filter((record) => record.status === "exceeded").map((record) => record.company.bundle.company.id));
  const overrides = data.flatMap((item) => item.usage.overrides);
  const periodFactor = period === "7d" ? 0.25 : period === "90d" ? 2.8 : 1;
  const aiCredits = Math.round(data.reduce((sum, item) => sum + (item.usage.records.find((entry) => entry.resource === "aiCredits")?.used ?? 0), 0) * periodFactor);
  const automationRuns = Math.round(data.reduce((sum, item) => sum + (item.usage.records.find((entry) => entry.resource === "automationRuns")?.used ?? 0), 0) * periodFactor);
  const apiRequests = Math.round(data.reduce((sum, item) => sum + (item.usage.records.find((entry) => entry.resource === "apiRequests")?.used ?? 0), 0) * periodFactor);
  const selectedRecords = data.map((item, index) => {
    const record = item.usage.records.find((entry) => entry.resource === resource);
    return { label: String(index + 1), value: Math.round((record?.used ?? 0) * (USAGE_RESOURCE_BY_KEY[resource].kind === "flow" ? periodFactor : 1)), company: item.bundle.company.name };
  });
  const topConsumers = data
    .map((item) => ({ item, record: item.usage.records.find((entry) => entry.resource === resource) }))
    .filter((entry): entry is { item: UsageCompany; record: CompanyUsageRecord } => Boolean(entry.record))
    .sort((a, b) => b.record.used - a.record.used)
    .slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Metered Companies" value={String(data.length)} icon={Gauge} hint="Companies With Valid Usage Snapshots" />
        <MetricCard label="Near-Limit Companies" value={String(nearCompanies.size)} icon={AlertTriangle} emphasis={nearCompanies.size ? "warning" : "default"} hint={`Deduped companies >= ${USAGE_THRESHOLDS.nearLimit}%`} />
        <MetricCard label="Limit-Exceeded Companies" value={String(exceededCompanies.size)} icon={ShieldAlert} emphasis={exceededCompanies.size ? "danger" : "default"} hint="Deduped Companies Over Limit" />
        <MetricCard label="AI Credits Used" value={formatNumber(aiCredits, "credits")} icon={Database} hint={`${period.toUpperCase()} Metered Usage`} />
        <MetricCard label="Automation Runs" value={formatNumber(automationRuns, "runs")} icon={Activity} hint={`${period.toUpperCase()} Metered Usage`} />
        <MetricCard label="API Requests" value={formatNumber(apiRequests, "requests")} icon={TrendingUp} hint={`${period.toUpperCase()} Metered Usage`} />
        <MetricCard label="Active Overrides" value={String(overrides.length)} icon={SlidersHorizontal} hint="Temporary Entitlement Exceptions" />
        <MetricCard label="Metering Issues" value="0" icon={Bell} hint="No Delayed Mock Meters" />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Resource Trends" description={`${USAGE_RESOURCE_BY_KEY[resource].label} Consumption Across Companies.`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedRecords}><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis hide /><Tooltip formatter={(value, _name, props) => [String(value), props.payload.company]} /><Area type="monotone" dataKey="value" stroke="#2563eb" fill="#dbeafe" /></AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Quota Health">
          <div className="grid gap-1 sm:grid-cols-2">
            {(["healthy", "high", "near_limit", "exceeded"] as const).map((status) => (
              <div key={status} className="rounded-sm border border-border p-3">
                <Badge tone={tone(status)}>{RESOURCE_STATUS_META[status].label}</Badge>
                <p className="mt-2 text-2xl font-semibold">{allRecords.filter((record) => record.status === status).length}</p>
                <p className="text-[12px] text-muted-foreground">Resource Rows</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <SectionCard title="Top Consumers">
          <div className="divide-y divide-border">
            {topConsumers.map(({ item, record }) => (
              <button key={item.bundle.company.id} className="grid w-full grid-cols-[1fr_auto] gap-2 py-2 text-left text-sm hover:bg-accent/30" onClick={() => onOpen(item)}>
                <span><span className="font-medium">{item.bundle.company.name}</span><br /><span className="text-muted-foreground">{formatNumber(record.used, USAGE_RESOURCE_BY_KEY[record.resource].unit)} Used</span></span>
                <Badge tone={tone(record.status)}>{record.utilization === null ? "Not metered" : `${Math.round(record.utilization)}%`}</Badge>
              </button>
            ))}
          </div>
        </SectionCard>
        <NeedsAttention data={data} onOpen={onOpen} />
      </div>
      <SectionCard title="Resource-Wise Quota Health" description="Counts Derive From Shared Company Usage And Effective Entitlement Records." flush>
        <div className="overflow-x-auto"><table className="min-w-[780px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Resource</th><th className="px-4 py-2 text-right">Within Limit</th><th className="px-4 py-2 text-right">Near Limit</th><th className="px-4 py-2 text-right">At Limit</th><th className="px-4 py-2 text-right">Exceeded</th><th className="px-4 py-2 text-right">Unknown</th></tr></thead><tbody className="divide-y divide-border">{USAGE_RESOURCES.map((def) => {
          const rows = data.map((item) => item.usage.records.find((record) => record.resource === def.key)).filter(Boolean) as CompanyUsageRecord[];
          return <tr key={def.key} className="hover:bg-accent/30"><td className="px-4 py-2"><button className="font-medium hover:underline" onClick={() => onResource(def.key)}>{def.label}</button><p className="text-2xs text-muted-foreground">{titleText(def.unit)}</p></td><td className="px-4 py-2 text-right">{rows.filter((row) => row.status === "healthy" || row.status === "high").length}</td><td className="px-4 py-2 text-right">{rows.filter((row) => row.status === "near_limit").length}</td><td className="px-4 py-2 text-right">{rows.filter((row) => row.utilization === 100).length}</td><td className="px-4 py-2 text-right">{rows.filter((row) => row.status === "exceeded").length}</td><td className="px-4 py-2 text-right">{rows.filter((row) => row.status === "not_metered").length}</td></tr>;
        })}</tbody></table></div>
      </SectionCard>
    </div>
  );
}

function CompanyUsage({ data, resource, onResource, onOpen, onOverride }: { data: UsageCompany[]; resource: UsageResource; onResource: (resource: UsageResource) => void; onOpen: (item: UsageCompany) => void; onOverride: (companyId: string, input: { resource: UsageResource; overrideLimit: number; days: number; reason: string }) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("utilization");
  const filtered = data.filter((item) => {
    const record = item.usage.records.find((entry) => entry.resource === resource);
    return (!search || item.bundle.company.name.toLowerCase().includes(search.toLowerCase())) && (status === "all" || record?.status === status);
  }).sort((a, b) => {
    const left = a.usage.records.find((entry) => entry.resource === resource);
    const right = b.usage.records.find((entry) => entry.resource === resource);
    if (sort === "company") return a.bundle.company.name.localeCompare(b.bundle.company.name);
    if (sort === "consumption") return (right?.used ?? 0) - (left?.used ?? 0);
    if (sort === "remaining") return ((left?.effectiveLimit ?? Number.POSITIVE_INFINITY) - (left?.used ?? 0)) - ((right?.effectiveLimit ?? Number.POSITIVE_INFINITY) - (right?.used ?? 0));
    return (right?.utilization ?? -1) - (left?.utilization ?? -1);
  });
  const companyStates = new Map(data.map((item) => [item.bundle.company.id, item.usage.records.some((record) => record.status === "exceeded") ? "exceeded" : item.usage.records.some((record) => record.status === "near_limit") ? "near" : item.usage.overrides.length ? "override" : "within"]));
  return (
    <div className="space-y-3">
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Total Companies" value={String(data.length)} />
        <MetricCard label="Within Limits" value={String([...companyStates.values()].filter((state) => state === "within").length)} />
        <MetricCard label="Near Limit" value={String([...companyStates.values()].filter((state) => state === "near").length)} emphasis="warning" />
        <MetricCard label="At Limit" value={String(data.filter((item) => item.usage.records.some((record) => record.utilization === 100)).length)} />
        <MetricCard label="Exceeded" value={String([...companyStates.values()].filter((state) => state === "exceeded").length)} emphasis="danger" />
        <MetricCard label="No Usage Data" value="0" />
        <MetricCard label="Overrides Active" value={String([...companyStates.values()].filter((state) => state === "override").length)} />
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={resource} onValueChange={(value) => onResource(value as UsageResource)}><SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger><SelectContent>{USAGE_RESOURCES.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(RESOURCE_STATUS_META).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}</SelectContent></Select>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="utilization">Highest Utilization</SelectItem><SelectItem value="consumption">Highest Consumption</SelectItem><SelectItem value="remaining">Lowest Remaining</SelectItem><SelectItem value="company">Company Name</SelectItem></SelectContent></Select>
      </div>
      <SectionCard title="Company Directory" description="Company-Level Usage Against Effective Limits." flush>
        {filtered.length ? <div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Company</th><th className="px-4 py-2 text-left">Resource</th><th className="px-4 py-2 text-right">Current Usage</th><th className="px-4 py-2 text-right">Base Allowance</th><th className="px-4 py-2 text-right">Override</th><th className="px-4 py-2 text-right">Effective Allowance</th><th className="px-4 py-2 text-left">Health</th><th className="px-4 py-2"></th></tr></thead><tbody className="divide-y divide-border">{filtered.map((item) => {
          const record = item.usage.records.find((entry) => entry.resource === resource)!;
          const def = USAGE_RESOURCE_BY_KEY[record.resource];
          return <tr key={item.bundle.company.id} className="hover:bg-accent/30"><td className="px-4 py-2 font-medium">{item.bundle.company.name}<p className="text-2xs font-normal text-muted-foreground">{item.summary.plan.name}</p></td><td className="px-4 py-2">{def.label}</td><td className="px-4 py-2 text-right tabular-nums">{formatNumber(record.used, def.unit)}</td><td className="px-4 py-2 text-right tabular-nums">{formatNumber(record.includedLimit, def.unit)}</td><td className="px-4 py-2 text-right tabular-nums">{record.activeOverride ? formatNumber(record.activeOverride.overrideLimit, def.unit) : "-"}</td><td className="px-4 py-2 text-right tabular-nums">{formatNumber(record.effectiveLimit, def.unit)}</td><td className="px-4 py-2"><Badge tone={tone(record.status)}>{RESOURCE_STATUS_META[record.status].label}</Badge></td><td className="px-4 py-2 text-right"><Button size="sm" variant="outline" onClick={() => onOpen(item)}>Inspect</Button></td></tr>;
        })}</tbody></table></div> : <EmptyState icon={Search} title="No Matching Usage Records" description="Adjust The Resource, Status Or Search Filter." />}
      </SectionCard>
      {filtered[0] ? <QuickOverride company={filtered[0]} resource={resource} onOverride={onOverride} /> : null}
    </div>
  );
}

function QuickOverride({ company, resource, onOverride }: { company: UsageCompany; resource: UsageResource; onOverride: (companyId: string, input: { resource: UsageResource; overrideLimit: number; days: number; reason: string }) => void }) {
  const record = company.usage.records.find((entry) => entry.resource === resource);
  const [limit, setLimit] = useState(record?.effectiveLimit ?? 10);
  return <SectionCard title="Shared Override Management" description={`Grant A Simulated Temporary Override For ${company.bundle.company.name}.`}><div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Field label="Override Limit"><Input type="number" min={1} value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></Field><Field label="Reason"><Input value="Temporary Campaign Exception" readOnly /></Field><div className="flex items-end"><Button size="sm" onClick={() => onOverride(company.bundle.company.id, { resource, overrideLimit: limit, days: 30, reason: "Temporary Campaign Exception" })}>Create Override</Button></div></div></SectionCard>;
}

function ResourcesTab({ data, onResource }: { data: UsageCompany[]; onResource: (resource: UsageResource) => void }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Resource Catalogue" description="Metered And Plan-Controlled Resources Used By Company Usage, Subscriptions And Limits." flush>
        <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Resource</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Plan Metric</th><th className="px-4 py-2 text-left">Policy</th><th className="px-4 py-2 text-right">Rows Exceeded</th></tr></thead><tbody className="divide-y divide-border">{USAGE_RESOURCES.map((resource) => {
          const rows = data.flatMap((item) => item.usage.records).filter((record) => record.resource === resource.key);
          return <tr key={resource.key} className="hover:bg-accent/30"><td className="px-4 py-2 font-medium"><button className="hover:underline" onClick={() => onResource(resource.key)}>{resource.label}</button><p className="text-2xs font-normal text-muted-foreground">{titleText(resource.unit)}</p></td><td className="px-4 py-2">{resource.kind === "flow" ? "Metered Per Period" : "Current Level"}</td><td className="px-4 py-2">{resource.metric ?? "Not Plan-Controlled"}</td><td className="px-4 py-2">{resource.capped ? "Hard Cap On Creation" : "Visible Quota / Review"}</td><td className="px-4 py-2 text-right">{rows.filter((record) => record.status === "exceeded").length}</td></tr>;
        })}</tbody></table></div>
      </SectionCard>
      <SectionCard title="Metering/Limit Policies">
        <div className="grid gap-1 md:grid-cols-3">
          <PolicyCard title="Hard-Capped Resources" text="Users, Clients And Connected Accounts Are Checked When New Resources Are Created." />
          <PolicyCard title="Metered Resources" text="AI Credits, Automation Runs, Reports And API Requests Accumulate Over The Billing Period." />
          <PolicyCard title="Overrides" text="Temporary Overrides Change The Effective Limit For One Company Without Changing The Global Plan." />
        </div>
      </SectionCard>
    </div>
  );
}

function PolicyCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-sm border border-border p-3"><p className="font-medium">{title}</p><p className="mt-1 text-[12px] text-muted-foreground">{text}</p></div>;
}

function buildAlerts(data: UsageCompany[]): UsageAlert[] {
  return data.flatMap((item) => item.usage.records.filter((record) => record.status === "near_limit" || record.status === "exceeded").map((record) => ({
    id: `${item.bundle.company.id}:${record.resource}:${record.status}`,
    severity: record.status === "exceeded" ? "critical" as const : "warning" as const,
    item,
    record,
    reason: record.status === "exceeded" ? "Current Usage Is Above The Effective Allowance." : "Current Usage Is Above The Configured Warning Threshold.",
    detectedAt: record.updatedAt,
  })));
}

function AlertsTab({ data, acknowledged, onOpen, onAlert }: { data: UsageCompany[]; acknowledged: Set<string>; onOpen: (item: UsageCompany) => void; onAlert: (alert: UsageAlert) => void }) {
  const alerts = buildAlerts(data).filter((alert) => !acknowledged.has(alert.id));
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SectionCard title="Threshold Alerts" description="Resources At Or Above Alert Thresholds.">
        <AlertList alerts={alerts.filter((alert) => alert.record.status === "near_limit")} onOpen={onOpen} onAlert={onAlert} empty="No Threshold Alerts" />
      </SectionCard>
      <SectionCard title="Exceeded Limits" description="Companies Above Effective Limits.">
        <AlertList alerts={alerts.filter((alert) => alert.record.status === "exceeded")} onOpen={onOpen} onAlert={onAlert} empty="No Exceeded Limits" />
      </SectionCard>
      <SectionCard className="xl:col-span-2" title="Overage Visibility" description="Demo Visibility Only; No Overage Billing Is Generated Here.">
        <div className="grid gap-1 md:grid-cols-3">
          <MetricCard label="Near Limit Rows" value={String(alerts.filter((alert) => alert.record.status === "near_limit").length)} icon={Bell} />
          <MetricCard label="Exceeded Rows" value={String(alerts.filter((alert) => alert.record.status === "exceeded").length)} icon={ShieldAlert} emphasis={alerts.some((a) => a.record.status === "exceeded") ? "danger" : "default"} />
          <MetricCard label="Overage Charges" value="0" icon={Gauge} hint="Billing module owns charges" />
        </div>
      </SectionCard>
    </div>
  );
}

function AlertList({ alerts, onOpen, onAlert, empty }: { alerts: UsageAlert[]; onOpen: (item: UsageCompany) => void; onAlert: (alert: UsageAlert) => void; empty: string }) {
  if (!alerts.length) return <EmptyState icon={ShieldAlert} title={empty} description="Usage Is Currently Within Configured Thresholds." size="sm" />;
  return <div className="divide-y divide-border">{alerts.map((alert) => <div key={alert.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-2 text-sm"><button className="text-left hover:underline" onClick={() => onOpen(alert.item)}><span className="font-medium">{alert.item.bundle.company.name}</span><br /><span className="text-muted-foreground">{USAGE_RESOURCE_BY_KEY[alert.record.resource].label}: {formatNumber(alert.record.used, USAGE_RESOURCE_BY_KEY[alert.record.resource].unit)} Used</span></button><Badge tone={tone(alert.record.status)}>{Math.round(alert.record.utilization ?? 0)}%</Badge><Button size="sm" variant="outline" onClick={() => onAlert(alert)}>Review</Button></div>)}</div>;
}

function OverridesTab({ data, onRemove, onOpen }: { data: UsageCompany[]; onRemove: (companyId: string, overrideId: string) => void; onOpen: (item: UsageCompany) => void }) {
  const now = platformNow();
  const overrides = data.flatMap((item) => item.usage.overrides.map((override) => ({ item, override })));
  const active = overrides.filter(({ override }) => Date.parse(override.startsAt) <= now && Date.parse(override.expiresAt) > now);
  const expiring = active.filter(({ override }) => Date.parse(override.expiresAt) - now <= 14 * DAY_MS);
  const scheduled = overrides.filter(({ override }) => Date.parse(override.startsAt) > now);
  return (
    <div className="space-y-3">
      <div className="grid gap-1 md:grid-cols-3">
        <MetricCard label="Active Overrides" value={String(active.length)} icon={SlidersHorizontal} />
        <MetricCard label="Scheduled Overrides" value={String(scheduled.length)} icon={CalendarClock} />
        <MetricCard label="Expiring Overrides" value={String(expiring.length)} icon={AlertTriangle} emphasis={expiring.length ? "warning" : "default"} />
      </div>
      <SectionCard title="Override Management" flush>
        {overrides.length ? <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Company</th><th className="px-4 py-2 text-left">Resource</th><th className="px-4 py-2 text-right">Limit</th><th className="px-4 py-2 text-left">Expires</th><th className="px-4 py-2 text-left">Reason</th><th className="px-4 py-2"></th></tr></thead><tbody className="divide-y divide-border">{overrides.map(({ item, override }) => <tr key={override.id}><td className="px-4 py-2 font-medium"><button className="hover:underline" onClick={() => onOpen(item)}>{item.bundle.company.name}</button></td><td className="px-4 py-2">{USAGE_RESOURCE_BY_KEY[override.resource].label}</td><td className="px-4 py-2 text-right">{override.overrideLimit.toLocaleString("en-IN")}</td><td className="px-4 py-2">{formatDate(override.expiresAt)}</td><td className="px-4 py-2 text-muted-foreground">{titleText(override.reason)}</td><td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => onRemove(item.bundle.company.id, override.id)}>Remove</Button></td></tr>)}</tbody></table></div> : <EmptyState icon={SlidersHorizontal} title="No Overrides" description="Temporary Limit Exceptions Will Appear Here." />}
      </SectionCard>
    </div>
  );
}

function ActivityTab({ data }: { data: UsageCompany[] }) {
  const events = data.flatMap((item) => item.bundle.activity.filter((entry) => entry.module === "usage").map((entry) => ({ item, entry }))).sort((a, b) => Date.parse(b.entry.at) - Date.parse(a.entry.at));
  const health = [
    { label: "Meter Collection", status: "healthy", detail: "Demo Metering Snapshots Are Available." },
    { label: "Quota Resolver", status: "healthy", detail: "Effective Limits Resolve From Plan Plus Overrides." },
    { label: "Overage Billing", status: "info", detail: "Not Connected; Billing & Payments Owns Charges." },
  ];
  return (
    <div className="grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
      <SectionCard title="Metering Health">
        <div className="space-y-1">{health.map((item) => <div key={item.label} className="rounded-sm border p-3"><Badge tone={tone(item.status)}>{item.status}</Badge><p className="mt-2 font-medium">{item.label}</p><p className="text-[12px] text-muted-foreground">{item.detail}</p></div>)}</div>
      </SectionCard>
      <SectionCard title="Usage Events" description="Usage and override activity from company records.">
        {events.length ? <div className="divide-y divide-border">{events.map(({ item, entry }) => <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm"><span><span className="font-medium">{item.bundle.company.name}</span><br /><span className="text-muted-foreground">{titleText(entry.summary)}</span></span><span className="text-right text-2xs text-muted-foreground">{formatDate(entry.at)}<br />{entry.actor.name}</span></div>)}</div> : <EmptyState icon={Activity} title="No Usage Activity" description="Override And Usage Events Will Appear Here." />}
      </SectionCard>
    </div>
  );
}

function NeedsAttention({ data, onOpen }: { data: UsageCompany[]; onOpen: (item: UsageCompany) => void }) {
  const issues = data.flatMap((item) => item.usage.records.filter((record) => record.status === "near_limit" || record.status === "exceeded").map((record) => ({ item, record }))).slice(0, 8);
  if (!issues.length) return <SectionCard title="Needs Attention"><EmptyState icon={ShieldAlert} title="No Attention Items" description="No Usage Records Are Near Or Above Limits." size="sm" /></SectionCard>;
  return <SectionCard title="Needs Attention">{issues.map(({ item, record }) => <button key={`${item.bundle.company.id}-${record.resource}`} onClick={() => onOpen(item)} className="grid w-full grid-cols-[auto_1fr_auto] gap-2 border-b py-2 text-left text-sm last:border-b-0 hover:bg-accent/30"><Badge tone={tone(record.status)}>{titleText(record.status)}</Badge><span><span className="font-medium">{item.bundle.company.name}</span><br /><span className="text-muted-foreground">{USAGE_RESOURCE_BY_KEY[record.resource].label}</span></span><span className="text-muted-foreground">{Math.round(record.utilization ?? 0)}%</span></button>)}</SectionCard>;
}

function CompanyUsageDialog({ item, onClose, onOverride, onRemove }: { item: UsageCompany | null; onClose: () => void; onOverride: (companyId: string, input: { resource: UsageResource; overrideLimit: number; days: number; reason: string }) => void; onRemove: (companyId: string, overrideId: string) => void }) {
  const [resource, setResource] = useState<UsageResource>("clients");
  const [limit, setLimit] = useState(10);
  if (!item) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{item.bundle.company.name}</DialogTitle><DialogDescription>Company Usage Detail, Effective Limits, Overrides And Deep Links.</DialogDescription></DialogHeader>
        <div className="grid gap-1 md:grid-cols-4">
          <MetricCard label="Highest Usage" value={item.usage.highest?.utilization ? `${Math.round(item.usage.highest.utilization)}%` : "n/a"} icon={TrendingUp} />
          <MetricCard label="Near Limit" value={String(item.usage.nearLimit.length)} icon={AlertTriangle} />
          <MetricCard label="Exceeded" value={String(item.usage.exceeded.length)} icon={ShieldAlert} emphasis={item.usage.exceeded.length ? "danger" : "default"} />
          <MetricCard label="Overrides" value={String(item.usage.overrides.length)} icon={SlidersHorizontal} />
        </div>
        <SectionCard title="Resource Details" flush>
          <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Resource</th><th className="px-4 py-2 text-right">Used</th><th className="px-4 py-2 text-right">Included</th><th className="px-4 py-2 text-right">Effective</th><th className="px-4 py-2 text-left">Status</th></tr></thead><tbody className="divide-y divide-border">{item.usage.records.map((record) => {
            const def = USAGE_RESOURCE_BY_KEY[record.resource];
            return <tr key={record.resource}><td className="px-4 py-2 font-medium">{def.label}</td><td className="px-4 py-2 text-right">{formatNumber(record.used, def.unit)}</td><td className="px-4 py-2 text-right">{formatNumber(record.includedLimit, def.unit)}</td><td className="px-4 py-2 text-right">{formatNumber(record.effectiveLimit, def.unit)}</td><td className="px-4 py-2"><Badge tone={tone(record.status)}>{RESOURCE_STATUS_META[record.status].label}</Badge></td></tr>;
          })}</tbody></table></div>
        </SectionCard>
        <SectionCard title="Override Actions">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]"><Field label="Resource"><Select value={resource} onValueChange={(value) => setResource(value as UsageResource)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OVERRIDABLE_RESOURCES.map((key) => <SelectItem key={key} value={key}>{USAGE_RESOURCE_BY_KEY[key].label}</SelectItem>)}</SelectContent></Select></Field><Field label="Override Limit"><Input type="number" min={1} value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></Field><Field label="Reason"><Textarea className="min-h-9" value="Approved Temporary Usage Exception" readOnly /></Field><div className="flex items-end"><Button size="sm" onClick={() => onOverride(item.bundle.company.id, { resource, overrideLimit: limit, days: 30, reason: "Approved Temporary Usage Exception" })}>Create</Button></div></div>
          {item.usage.overrides.length ? <div className="mt-3 divide-y border-t">{item.usage.overrides.map((override) => <div key={override.id} className="flex items-center justify-between py-2 text-sm"><span>{USAGE_RESOURCE_BY_KEY[override.resource].label}: {override.overrideLimit.toLocaleString("en-IN")} until {formatDate(override.expiresAt)}</span><Button size="sm" variant="ghost" onClick={() => onRemove(item.bundle.company.id, override.id)}>Remove</Button></div>)}</div> : null}
        </SectionCard>
        <DialogFooter><Button asChild variant="outline"><Link href={`${ROUTES.superAdmin.company(item.bundle.company.id)}/usage`}>Open Company Usage <ArrowUpRight /></Link></Button><Button onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertDetailDialog({
  alert,
  acknowledged,
  onClose,
  onAcknowledge,
  onOpenCompany,
}: {
  alert: UsageAlert | null;
  acknowledged: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onOpenCompany: (item: UsageCompany) => void;
}) {
  const [note, setNote] = useState("");
  if (!alert) return null;
  const def = USAGE_RESOURCE_BY_KEY[alert.record.resource];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{alert.severity === "critical" ? "Critical Usage Alert" : "Usage Threshold Alert"}</DialogTitle>
          <DialogDescription>{alert.item.bundle.company.name} · {def.label} · detected {formatDate(alert.detectedAt)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 sm:grid-cols-3">
          <MetricCard label="Current Usage" value={formatNumber(alert.record.used, def.unit)} />
          <MetricCard label="Effective Limit" value={formatNumber(alert.record.effectiveLimit, def.unit)} />
          <MetricCard label="Utilization" value={alert.record.utilization === null ? "n/a" : `${Math.round(alert.record.utilization)}%`} emphasis={alert.record.status === "exceeded" ? "danger" : "warning"} />
        </div>
        <div className="rounded-sm border border-border p-3 text-sm">
          <p className="font-medium">Reason</p>
          <p className="mt-1 text-muted-foreground">{alert.reason}</p>
          <p className="mt-2 text-2xs text-muted-foreground">Acknowledging This Alert Records Frontend Review State Only. It Does Not Change Usage, Limits, Billing, Or Enforcement.</p>
        </div>
        <Field label="Acknowledgement note">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add Review Context Before Acknowledging." />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenCompany(alert.item)}>Inspect Usage</Button>
          <Button asChild variant="outline"><Link href={`${ROUTES.superAdmin.company(alert.item.bundle.company.id)}/subscription`}>Open Subscription</Link></Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button disabled={acknowledged || note.trim().length < 3} onClick={() => onAcknowledge(alert.id)}>{acknowledged ? "Acknowledged" : "Acknowledge Alert"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceDetailDialog({ resource, data, onClose }: { resource: UsageResource | null; data: UsageCompany[]; onClose: () => void }) {
  if (!resource) return null;
  const def = USAGE_RESOURCE_BY_KEY[resource];
  const rows = data.map((item) => item.usage.records.find((record) => record.resource === resource)).filter(Boolean) as CompanyUsageRecord[];
  const exceeded = rows.filter((record) => record.status === "exceeded").length;
  const near = rows.filter((record) => record.status === "near_limit").length;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{def.label}</DialogTitle>
          <DialogDescription>Resource Definition, Quota Policy And Current Platform Health.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 sm:grid-cols-4">
          <MetricCard label="Measurement" value={def.kind === "flow" ? "Period flow" : "Snapshot"} />
          <MetricCard label="Unit" value={def.unit} />
          <MetricCard label="Near Limit" value={String(near)} emphasis={near ? "warning" : "default"} />
          <MetricCard label="Exceeded" value={String(exceeded)} emphasis={exceeded ? "danger" : "default"} />
        </div>
        <div className="grid gap-1 md:grid-cols-2">
          <PolicyCard title="Limit Policy" text={def.metric ? `${def.metric} from plan entitlement; overrides adjust one company only.` : "Not plan-controlled; monitored for operations."} />
          <PolicyCard title="Metering Source" text={def.kind === "flow" ? "Derived From Period Usage Aggregate In Mock Data." : "Derived From Current Company Records In Mock Data."} />
          <PolicyCard title="Client Attribution" text={def.key === "scheduledPosts" ? "Supported through client scheduled-post totals." : "Pending backend event attribution."} />
          <PolicyCard title="Over-Limit Policy" text={def.capped ? "Block new creation where enforced by the owning module." : "Surface alert and require operational review."} />
        </div>
        <DialogFooter>
          <Button asChild variant="outline"><Link href={`${ROUTES.superAdmin.usage}?tab=companies`}>View Company Usage</Link></Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
