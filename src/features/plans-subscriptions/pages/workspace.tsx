"use client";

import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, CalendarClock, Check, ChevronRight, Download, Eye, GitCompare, History, Plus, Receipt, Search, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageSection } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/config/routes";
import { QUOTA_METRICS, type PlanTier } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import type { UsageResource } from "@/features/companies/data/types";
import { ENTITLEMENT_CATALOGUE } from "../data/catalogue";
import { PlansSubscriptionsProvider, resolveEffectiveEntitlements, usePlansSubscriptions } from "../data/store";
import type { PlatformPlan, SubscriptionPolicy, SubscriptionRow } from "../data/types";

type Tab = "overview" | "plans" | "subscriptions" | "changes" | "settings";
const TABS: Array<{ id: Tab; label: string; href: string }> = [
  { id: "overview", label: "Overview", href: ROUTES.superAdmin.plans },
  { id: "plans", label: "Plans", href: `${ROUTES.superAdmin.plans}?tab=plans` },
  { id: "subscriptions", label: "Subscriptions", href: ROUTES.superAdmin.subscriptions },
  { id: "changes", label: "Trials & Changes", href: `${ROUTES.superAdmin.plans}?tab=changes` },
  { id: "settings", label: "Settings", href: `${ROUTES.superAdmin.plans}?tab=settings` },
];

function money(minor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

function date(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)) : "Not set";
}

function download(filename: string, text: string, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" | "brand" {
  if (["active", "published", "success"].includes(status)) return "success";
  if (["trialing", "draft", "scheduled_cancellation", "hidden"].includes(status)) return "warning";
  if (["past_due", "cancelled", "expired", "retired", "failed"].includes(status)) return "danger";
  if (["scheduled", "ready"].includes(status)) return "info";
  return "neutral";
}

export function PlansSubscriptionsWorkspace({ initialTab = "overview" }: { initialTab?: Tab }) {
  return (
    <PlansSubscriptionsProvider>
      <WorkspaceInner initialTab={initialTab} />
    </PlansSubscriptionsProvider>
  );
}

function WorkspaceInner({ initialTab }: { initialTab: Tab }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { subscriptionRows, capabilities } = usePlansSubscriptions();
  const active = initialTab;

  const exportSubscriptions = () => {
    const header = ["Company", "Plan", "Cycle", "Status", "Recurring Amount", "MRR", "Renewal/Trial End"];
    const lines = subscriptionRows.map((row) => [row.companyName, row.planName, row.billingCycle, row.status, row.recurringMinor / 100, row.mrrMinor / 100, row.trialEndsAt ?? row.renewsAt].join(","));
    download("omni-subscriptions.csv", [header.join(","), ...lines].join("\n"));
  };

  return (
    <PageSection className="space-y-3">
      <PageHeader
        title="Plans & Subscriptions"
        description="Manage platform plans, feature entitlements, company subscriptions and subscription lifecycle."
        actions={
          <>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!capabilities.canCreatePlan}><Plus />Create Plan</Button>
            <Button asChild size="sm" variant="outline"><Link href={ROUTES.superAdmin.subscriptions}>View Subscriptions</Link></Button>
            <Button size="icon-sm" variant="ghost" onClick={exportSubscriptions} title="Export subscriptions"><Download /></Button>
          </>
        }
      />
      <nav className="flex gap-1 overflow-x-auto rounded-sm border border-border bg-card p-1">
        {TABS.map((tab) => (
          <Button key={tab.id} asChild size="sm" variant={active === tab.id ? "secondary" : "ghost"} className="shrink-0">
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </nav>
      {active === "overview" ? <Overview /> : null}
      {active === "plans" ? <PlansTab onCreate={() => setCreateOpen(true)} /> : null}
      {active === "subscriptions" ? <SubscriptionsTab /> : null}
      {active === "changes" ? <ChangesTab /> : null}
      {active === "settings" ? <SettingsTab /> : null}
      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <div className="rounded-sm border border-info/20 bg-info-subtle/50 px-3 py-2 text-[12px] text-muted-foreground">
        Frontend demo mode: actions update shared mock subscription records and policy state only. No charges, refunds, invoices, notifications or backend jobs are executed.
      </div>
    </PageSection>
  );
}

function Overview() {
  const { subscriptionRows, attention, plans } = usePlansSubscriptions();
  const [metric, setMetric] = useState("active");
  const [period, setPeriod] = useState("3M");
  const paid = subscriptionRows.filter((row) => ["active", "past_due", "scheduled_cancellation"].includes(row.status));
  const trials = subscriptionRows.filter((row) => row.status === "trialing");
  const pastDue = subscriptionRows.filter((row) => row.status === "past_due");
  const scheduledCancel = subscriptionRows.filter((row) => row.scheduledCancellationAt);
  const mrr = paid.reduce((sum, row) => row.currency === "INR" ? sum + row.mrrMinor : sum, 0);
  const trend = Array.from({ length: period === "30D" ? 12 : period === "1Y" ? 12 : 8 }, (_, index) => {
    const base = metric === "active" ? paid.length : metric === "trials" ? trials.length : metric === "new" ? 2 : scheduledCancel.length;
    return { label: `${index + 1}`, value: Math.max(0, base + Math.round(Math.sin(index / 1.7) * 2) + index % 3) };
  });
  return (
    <div className="space-y-3">
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Current Subscriptions" value={String(subscriptionRows.length)} icon={Receipt} hint={`${paid.length} paid, ${trials.length} trials`} />
        <MetricCard label="Active Paid" value={String(paid.length)} icon={Check} hint="Trials excluded from paid totals" />
        <MetricCard label="Active Trials" value={String(trials.length)} icon={Sparkles} hint={`${trials.filter((row) => row.trialEndsAt && Date.parse(row.trialEndsAt) - Date.now() < 7 * 86400000).length} ending soon`} />
        <MetricCard label="Past Due" value={String(pastDue.length)} icon={TriangleAlert} emphasis={pastDue.length ? "danger" : "default"} hint="Requires billing review" />
        <MetricCard label="Scheduled Cancellation" value={String(scheduledCancel.length)} icon={CalendarClock} hint="Can overlap active subscriptions" />
        <MetricCard label="MRR" value={money(mrr)} icon={Receipt} hint="Annual plans normalized monthly" />
        <MetricCard label="Trials Ending Soon" value={String(attention.filter((item) => item.issue.includes("Trial")).length)} icon={History} emphasis="warning" />
        <MetricCard label="Needs Attention" value={String(attention.length)} icon={ShieldCheck} emphasis={attention.length ? "warning" : "default"} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Subscription Trends" action={<Controls metric={metric} setMetric={setMetric} period={period} setPeriod={setPeriod} />}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="value" stroke="#2563eb" fill="#dbeafe" /></AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Plan Adoption" description="Active paid companies and trial companies by plan.">
          <div className="divide-y divide-border">
            {plans.map((plan) => {
              const planRows = subscriptionRows.filter((row) => row.planTier === plan.tier);
              const planPaid = planRows.filter((row) => ["active", "past_due", "scheduled_cancellation"].includes(row.status));
              const planTrials = planRows.filter((row) => row.status === "trialing");
              const contribution = planPaid.reduce((sum, row) => sum + row.mrrMinor, 0);
              return <Link key={plan.id} href={`${ROUTES.superAdmin.plans}?tab=plans&plan=${plan.id}`} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm hover:bg-accent/40"><span className="font-medium">{plan.name}</span><span className="text-muted-foreground">{planPaid.length} paid | {planTrials.length} trial | {money(contribution)}</span></Link>;
            })}
          </div>
        </SectionCard>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <AttentionPanel className="xl:col-span-1" />
        <ScheduledPanel />
        <ActivityPanel />
      </div>
    </div>
  );
}

function Controls({ metric, setMetric, period, setPeriod }: { metric: string; setMetric: (v: string) => void; period: string; setPeriod: (v: string) => void }) {
  return <div className="flex gap-1"><Select value={metric} onValueChange={setMetric}><SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active Paid</SelectItem><SelectItem value="trials">Active Trials</SelectItem><SelectItem value="new">New Subscriptions</SelectItem><SelectItem value="cancel">Cancellations</SelectItem></SelectContent></Select><Select value={period} onValueChange={setPeriod}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent>{["30D","3M","6M","1Y"].map((p)=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>;
}

function PlansTab({ onCreate }: { onCreate: () => void }) {
  const { plans, subscriptionRows, publishPlan, retirePlan, createVersion } = usePlansSubscriptions();
  const [compare, setCompare] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const visible = plans.filter((plan) => showRetired || plan.publicationStatus !== "retired");
  return (
    <div className="space-y-3">
      <PageHeader title="Platform Plans" description="Define pricing, features, usage allowances and availability for company subscriptions." actions={<><Button size="sm" onClick={onCreate}><Plus />Create Plan</Button><Button size="sm" variant="outline" onClick={() => setCompare((v) => !v)}><GitCompare />Compare Plans</Button><Button size="sm" variant="ghost" onClick={() => setShowRetired((v) => !v)}>{showRetired ? "Hide Retired" : "Show Retired Plans"}</Button></>} />
      <div className="grid gap-1 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Published Plans" value={String(plans.filter((p) => p.publicationStatus === "published").length)} />
        <MetricCard label="Draft Plans" value={String(plans.filter((p) => p.publicationStatus === "draft").length)} />
        <MetricCard label="Hidden Plans" value={String(plans.filter((p) => p.publicationStatus === "hidden").length)} />
        <MetricCard label="Retired Plans" value={String(plans.filter((p) => p.publicationStatus === "retired").length)} />
        <MetricCard label="Active Subscribers" value={String(subscriptionRows.filter((row) => row.status === "active").length)} />
        <MetricCard label="Plans Requiring Review" value={String(plans.filter((p) => p.publicationStatus !== "published").length)} />
      </div>
      <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((plan) => <PlanCard key={plan.id} plan={plan} subscribers={subscriptionRows.filter((row) => row.planTier === plan.tier).length} onPublish={() => publishPlan(plan.id)} onRetire={() => retirePlan(plan.id)} onVersion={() => createVersion(plan.id, Math.max(1, (plan.limits.Clients ?? 30) - 2))} />)}
      </div>
      {compare ? <PlanComparison plans={plans} /> : null}
    </div>
  );
}

function PlanCard({ plan, subscribers, onPublish, onRetire, onVersion }: { plan: PlatformPlan; subscribers: number; onPublish: () => void; onRetire: () => void; onVersion: () => void }) {
  return (
    <div className="flex min-h-72 flex-col rounded-sm border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2"><div><p className="text-2xs font-semibold uppercase text-muted-foreground">{plan.internalCode}</p><h3 className="font-semibold">{plan.name}</h3></div><Badge tone={statusTone(plan.publicationStatus)}>{plan.publicationStatus}</Badge></div>
      <p className="mt-2 line-clamp-2 text-[12.5px] text-muted-foreground">{plan.description}</p>
      <div className="mt-4 space-y-1 text-sm"><p className="font-semibold">{money(plan.monthlyPriceMinor, plan.currency)}<span className="text-xs font-normal text-muted-foreground"> / month</span></p><p className="text-muted-foreground">{money(plan.annualPriceMinor, plan.currency)} / year</p></div>
      <div className="mt-3 text-[12px] text-muted-foreground">{subscribers} active companies | v{plan.versions[0]?.version ?? 1} | Updated {date(plan.updatedAt)}</div>
      <div className="mt-auto flex flex-wrap gap-1 pt-4"><Button asChild size="sm" variant="outline"><Link href={`${ROUTES.superAdmin.plans}?tab=plans&plan=${plan.id}`}>View Plan</Link></Button><Button size="sm" variant="secondary" onClick={onVersion}>New Version</Button>{plan.publicationStatus === "draft" ? <Button size="sm" onClick={onPublish}>Publish</Button> : <Button size="sm" variant="ghost" onClick={onRetire}>Retire</Button>}</div>
    </div>
  );
}

function PlanComparison({ plans }: { plans: PlatformPlan[] }) {
  const rows = ["Clients", "users", "channels", "aiCredits", "automationRuns", "seoPages", "apiCalls", "reports"] as const;
  return <SectionCard title="Plan Comparison" description="Published plan-version values used by selectors and subscription workflows." flush><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="sticky top-0 bg-card"><tr><th className="px-4 py-2 text-left">Feature / Resource</th>{plans.map((plan)=><th key={plan.id} className="px-4 py-2 text-left">{plan.name}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((key)=><tr key={key} className="hover:bg-accent/30"><td className="px-4 py-2 font-medium">{QUOTA_METRICS[key].label}</td>{plans.map((plan)=><td key={plan.id} className="px-4 py-2">{plan.limits[key] === null ? "Unlimited" : `${plan.limits[key]?.toLocaleString()} ${QUOTA_METRICS[key].unit}`}</td>)}</tr>)}</tbody></table></div></SectionCard>;
}

function SubscriptionsTab() {
  const { subscriptionRows, plans, bundles, changePlan, extendTrial, scheduleCancellation, undoCancellation, createOverride, removeOverride } = usePlansSubscriptions();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [selected, setSelected] = useState<SubscriptionRow | null>(null);
  const filtered = subscriptionRows.filter((row) => (!search || row.companyName.toLowerCase().includes(search.toLowerCase())) && (plan === "all" || row.planTier === plan));
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search company" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={plan} onValueChange={setPlan}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All plans</SelectItem>{plans.map((item)=><SelectItem key={item.id} value={item.tier}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <SectionCard title="Subscriptions Directory" description="Cross-company subscription records, lifecycle state and recurring value." flush>
      {filtered.length ? <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead><tr className="border-b"><th className="px-4 py-2 text-left">Company</th><th className="px-4 py-2 text-left">Plan</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">MRR</th><th className="px-4 py-2 text-left">Renewal / Trial</th><th className="px-4 py-2"></th></tr></thead><tbody className="divide-y divide-border">{filtered.map((row)=><tr key={row.id} className="hover:bg-accent/30"><td className="px-4 py-2 font-medium">{row.companyName}</td><td className="px-4 py-2">{row.planName} <span className="text-muted-foreground">({row.billingCycle})</span></td><td className="px-4 py-2"><Badge tone={statusTone(row.status)}>{row.status.replace(/_/g," ")}</Badge></td><td className="px-4 py-2 text-right tabular-nums">{money(row.mrrMinor, row.currency)}</td><td className="px-4 py-2">{date(row.trialEndsAt ?? row.renewsAt)}</td><td className="px-4 py-2 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(row)}><Eye />Preview</Button></td></tr>)}</tbody></table></div> : <EmptyState icon={Search} title="No Matching Search Results" description="Adjust the search or plan filter." />}
      </SectionCard>
      <SubscriptionDialog row={selected} onClose={() => setSelected(null)} plans={plans} bundle={bundles.find((b)=>b.company.id===selected?.companyId) ?? null} changePlan={changePlan} extendTrial={extendTrial} scheduleCancellation={scheduleCancellation} undoCancellation={undoCancellation} createOverride={createOverride} removeOverride={removeOverride} />
    </div>
  );
}

function SubscriptionDialog({ row, onClose, plans, bundle, changePlan, extendTrial, scheduleCancellation, undoCancellation, createOverride, removeOverride }: { row: SubscriptionRow | null; onClose: () => void; plans: PlatformPlan[]; bundle: any; changePlan: (id:string,p:PlanTier,c:BillingCycle,e:"immediately"|"next_renewal")=>void; extendTrial:(id:string,d:number)=>void; scheduleCancellation:(id:string)=>void; undoCancellation:(id:string)=>void; createOverride:(id:string,r:UsageResource,v:number,d:number)=>void; removeOverride:(id:string,o:string)=>void }) {
  const [target, setTarget] = useState<PlanTier>("growth");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  if (!row) return null;
  const currentPlan = plans.find((plan) => plan.tier === row.planTier) ?? plans[0]!;
  const effective = bundle ? resolveEffectiveEntitlements(currentPlan, bundle.overrides.map((o: any) => ({ ...o, rule: "absolute", value: o.overrideLimit })), row.status, new Date().toISOString()) : [];
  return <Dialog open onOpenChange={(open)=>!open && onClose()}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>{row.companyName}</DialogTitle><DialogDescription>Subscription detail, entitlements, changes and simulated lifecycle controls.</DialogDescription></DialogHeader><div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]"><div className="space-y-3"><div className="grid gap-1 sm:grid-cols-3"><MetricCard label="Plan" value={row.planName} /><MetricCard label="MRR" value={money(row.mrrMinor,row.currency)} /><MetricCard label="Status" value={row.status.replace(/_/g," ")} /></div><SectionCard title="Effective Entitlements" flush><table className="w-full text-sm"><tbody className="divide-y">{effective.map((item)=><tr key={item.resource}><td className="py-2 pr-2 font-medium">{item.resource}</td><td className="py-2">{item.effectiveLimit === null ? "Unlimited" : item.effectiveLimit.toLocaleString()}</td><td className="py-2 text-muted-foreground">{item.ruleApplied}</td></tr>)}</tbody></table></SectionCard><SectionCard title="Company-Specific Overrides">{bundle?.overrides.length ? <div className="space-y-1">{bundle.overrides.map((o:any)=><div key={o.id} className="flex items-center justify-between rounded-sm border p-2 text-sm"><span>{o.resource}: {o.overrideLimit.toLocaleString()} until {date(o.expiresAt)}</span><Button size="sm" variant="ghost" onClick={()=>removeOverride(row.companyId,o.id)}>Remove</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No active overrides.</p>}<Button className="mt-2" size="sm" variant="outline" onClick={()=>createOverride(row.companyId,"clients",10,30)}>Create Client Limit Override</Button></SectionCard></div><div className="space-y-3"><SectionCard title="Change Plan"><div className="space-y-3"><Select value={target} onValueChange={(v)=>setTarget(v as PlanTier)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{plans.filter(p=>p.publicationStatus==="published").map(p=><SelectItem key={p.id} value={p.tier}>{p.name}</SelectItem>)}</SelectContent></Select><Select value={cycle} onValueChange={(v)=>setCycle(v as BillingCycle)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select><div className="grid grid-cols-2 gap-1"><Button size="sm" onClick={()=>changePlan(row.companyId,target,cycle,"immediately")}>Apply Now</Button><Button size="sm" variant="outline" onClick={()=>changePlan(row.companyId,target,cycle,"next_renewal")}>Schedule</Button></div></div></SectionCard><SectionCard title="Trial & Cancellation"><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" disabled={row.status!=="trialing"} onClick={()=>extendTrial(row.companyId,7)}>Extend Trial 7d</Button>{row.scheduledCancellationAt ? <Button size="sm" onClick={()=>undoCancellation(row.companyId)}>Undo Cancellation</Button> : <Button size="sm" variant="destructive" onClick={()=>scheduleCancellation(row.companyId)}>Schedule Cancellation</Button>}</div></SectionCard><Button asChild variant="outline"><Link href={ROUTES.superAdmin.company(row.companyId)}>Open Company <ArrowUpRight /></Link></Button></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter></DialogContent></Dialog>;
}

function ChangesTab() {
  return <div className="grid gap-3 xl:grid-cols-2"><SectionCard title="Trial Management"><TrialsTable /></SectionCard><ScheduledPanel /><AttentionPanel className="xl:col-span-2" /></div>;
}

function TrialsTable() {
  const { subscriptionRows } = usePlansSubscriptions();
  const trials = subscriptionRows.filter((row) => row.status === "trialing");
  if (!trials.length) return <EmptyState icon={Sparkles} title="No Active Trials" description="New trial subscriptions will appear here." />;
  return <div className="divide-y divide-border">{trials.map((row)=><div key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm"><div><p className="font-medium">{row.companyName}</p><p className="text-muted-foreground">Ends {date(row.trialEndsAt)}</p></div><Badge tone="warning">{row.planName}</Badge></div>)}</div>;
}

function ScheduledPanel() {
  const { scheduledChanges } = usePlansSubscriptions();
  return <SectionCard title="Upcoming Subscription Changes" action={<Button asChild size="sm" variant="ghost"><Link href={`${ROUTES.superAdmin.plans}?tab=changes`}>View All <ChevronRight /></Link></Button>}>{scheduledChanges.length ? <div className="divide-y divide-border">{scheduledChanges.slice(0,6).map((item)=><div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm"><div><p className="font-medium">{item.companyName}</p><p className="text-muted-foreground">{item.label}</p></div><div className="text-right"><Badge tone={statusTone(item.status)}>{item.status}</Badge><p className="mt-1 text-2xs text-muted-foreground">{date(item.effectiveAt)}</p></div></div>)}</div> : <EmptyState icon={CalendarClock} title="No Scheduled Changes" description="Scheduled upgrades, downgrades and cancellations will appear here." />}</SectionCard>;
}

function AttentionPanel({ className }: { className?: string }) {
  const { attention } = usePlansSubscriptions();
  return <SectionCard className={className} title="Needs Attention">{attention.length ? <div className="divide-y divide-border">{attention.slice(0,8).map((item)=><Link key={item.id} href={item.action === "open_company" ? ROUTES.superAdmin.company(item.companyId) : ROUTES.superAdmin.subscriptions} className="grid grid-cols-[auto_1fr_auto] gap-2 py-2 text-sm hover:bg-accent/30"><Badge tone={statusTone(item.severity)}>{item.severity}</Badge><span><span className="font-medium">{item.companyName}</span><br/><span className="text-muted-foreground">{item.issue}</span></span><span className="text-muted-foreground">{date(item.dueAt)}</span></Link>)}</div> : <EmptyState icon={ShieldCheck} title="No Attention Items" description="No subscription issues need review." />}</SectionCard>;
}

function ActivityPanel() {
  const { activity } = usePlansSubscriptions();
  return <SectionCard title="Recent Subscription Activity">{activity.length ? <div className="divide-y divide-border">{activity.slice(0,6).map((item)=><div key={item.id} className="py-2 text-sm"><p className="font-medium">{item.companyName}</p><p className="text-muted-foreground">{item.action} by {item.actor} | {date(item.at)}</p></div>)}</div> : <EmptyState icon={History} title="No Activity" description="Subscription lifecycle events will appear here." />}</SectionCard>;
}

function SettingsTab() {
  const { policy, savePolicy } = usePlansSubscriptions();
  const [draft, setDraft] = useState<SubscriptionPolicy>(policy);
  const dirty = JSON.stringify(policy) !== JSON.stringify(draft);
  return <div className="space-y-3"><SectionCard title="Subscription Policies and Settings" description="Frontend policy state for trials, renewals, cancellations and over-limit handling."><div className="grid gap-3 md:grid-cols-2"><Field label="Default Trial Duration"><Input type="number" value={draft.defaultTrialDays} onChange={(e)=>setDraft({...draft,defaultTrialDays:Number(e.target.value)})} /></Field><Field label="Trial Extension Limit"><Input type="number" value={draft.trialExtensionLimitDays} onChange={(e)=>setDraft({...draft,trialExtensionLimitDays:Number(e.target.value)})} /></Field><Field label="Grace Period"><Input type="number" value={draft.gracePeriodDays} onChange={(e)=>setDraft({...draft,gracePeriodDays:Number(e.target.value)})} /></Field><Field label="Reactivation Window"><Input type="number" value={draft.reactivationWindowDays} onChange={(e)=>setDraft({...draft,reactivationWindowDays:Number(e.target.value)})} /></Field></div></SectionCard><SectionCard title="Entitlement Catalogue"><div className="grid gap-1 md:grid-cols-2">{ENTITLEMENT_CATALOGUE.map((item)=><div key={item.key} className="rounded-sm border p-3"><p className="font-medium">{item.displayName}</p><p className="text-[12px] text-muted-foreground">{item.description}</p></div>)}</div></SectionCard>{dirty ? <div className="sticky bottom-3 flex items-center justify-between rounded-sm border border-warning/30 bg-card p-3 shadow-md"><span className="text-sm font-medium">Unsaved subscription policy changes</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>setDraft(policy)}>Discard</Button><Button size="sm" onClick={()=>savePolicy(draft)}>Save Changes</Button></div></div> : null}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function CreatePlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { createPlan, plans } = usePlansSubscriptions();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", code: "", description: "", monthly: 0, annual: 0, trialDays: 14 });
  const codeTaken = plans.some((plan) => plan.internalCode === form.code.toUpperCase());
  const detailsValid = Boolean(form.name.trim()) && /^[A-Z0-9_]{3,16}$/.test(form.code.toUpperCase()) && !codeTaken;
  const pricingValid = form.monthly >= 0 && form.annual >= 0 && form.trialDays >= 0;
  const valid = detailsValid && pricingValid;
  const canContinue = step === 0 ? detailsValid : step === 1 ? pricingValid : true;
  const save = (publish: boolean) => { if (!valid) return; createPlan({ ...form, code: form.code.toUpperCase(), publish }); onOpenChange(false); setStep(0); setForm({ name: "", code: "", description: "", monthly: 0, annual: 0, trialDays: 14 }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Create Plan</DialogTitle><DialogDescription>Configure a draft or published platform plan. This is a frontend-only demo workspace.</DialogDescription></DialogHeader><div className="flex gap-1 overflow-x-auto">{["Basic Details","Pricing","Features","Limits","Availability","Review"].map((label,index)=><Button key={label} size="sm" variant={step===index?"secondary":"ghost"} disabled={index > 1 && !valid} onClick={()=>setStep(index)}>{index+1}. {label}</Button>)}</div><div className="min-h-72 rounded-sm border p-4">{step===0 ? <div className="grid gap-3"><Field label="Plan Name*"><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field><Field label="Internal Code*"><Input value={form.code} onChange={(e)=>setForm({...form,code:e.target.value.toUpperCase()})} aria-invalid={codeTaken} /></Field>{codeTaken ? <p className="text-sm text-danger">Internal code must be unique.</p> : null}<Field label="Description"><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field><Field label="Target Segment"><Input placeholder="Growing teams, agencies, enterprise..." /></Field></div> : null}{step===1 ? <div className="grid gap-3 md:grid-cols-2"><Field label="Currency"><Input value="INR" disabled /></Field><Field label="Trial Duration"><Input type="number" min={0} value={form.trialDays} onChange={(e)=>setForm({...form,trialDays:Number(e.target.value)})} /></Field><Field label="Monthly Recurring Price"><Input type="number" min={0} value={form.monthly} onChange={(e)=>setForm({...form,monthly:Number(e.target.value)})} /></Field><Field label="Annual Recurring Price"><Input type="number" min={0} value={form.annual} onChange={(e)=>setForm({...form,annual:Number(e.target.value)})} /></Field><p className="text-sm text-muted-foreground md:col-span-2">Monthly equivalent: {money((form.annual * 100) / 12)}. Annual savings appears once both prices are valid.</p></div> : null}{step>1 ? <div className="space-y-2 text-sm">{ENTITLEMENT_CATALOGUE.slice(0, step === 2 ? 6 : 10).map((item)=><div key={item.key} className="flex items-center justify-between rounded-sm border p-2"><span>{item.displayName}</span><Badge>{item.category}</Badge></div>)}</div> : null}</div><DialogFooter><Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button><Button variant="outline" disabled={step===0} onClick={()=>setStep(step-1)}>Back</Button><Button variant="outline" disabled={!valid} onClick={()=>save(false)}>Save as Draft</Button>{step<5 ? <Button disabled={!canContinue} onClick={()=>setStep(step+1)}>Continue</Button> : <Button disabled={!valid} onClick={()=>save(true)}>Publish Plan</Button>}</DialogFooter></DialogContent></Dialog>;
}
