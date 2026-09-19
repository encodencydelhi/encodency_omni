"use client";

import { EyeIcon, PencilIcon, RocketIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { relativeTime } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { DemoTag, PlanStatusBadge, VersionStatusBadge } from "../components/badges";
import { MiniTable } from "../components/mini-table";
import { AvailabilitySection } from "../components/plan-config";
import { ComparisonTable, type ComparisonColumn } from "../components/plan-comparison-table";
import { PlansError } from "../components/states";
import { usePlanActions } from "../components/use-plan-actions";
import { ENTITLEMENT_CATEGORIES, FEATURES, RESOURCES, featuresIn, formatRule, resourcesIn, rulesEqual } from "../data/catalogue";
import { PLAN_SECTIONS, PLANS_MOCK_MODE, ROLLOUT_POLICY, routes, type PlanSection } from "../data/config";
import { describeError, usePlan, usePlanMutations } from "../data/hooks";
import { draftInputOf } from "../data/selectors";
import type { PlanAvailability, PlanSummary, PlanVersion } from "../data/types";
import { annualSavings, money, moneyTotals } from "../lib/money";

function sectionOf(value: string | null): PlanSection {
  return PLAN_SECTIONS.find((item) => item.key === value)?.key ?? "overview";
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function OverviewSection({ summary, activity }: { summary: PlanSummary; activity: { id: string; at: string; actor: string; summary: string }[] }) {
  const { plan, current, subscribers } = summary;
  const enabled = current ? FEATURES.filter((feature) => current.features[feature.key]) : [];
  const keyLimits = current ? RESOURCES.filter((def) => ["Clients", "users", "channels", "aiCredits", "automationRuns"].includes(def.key)) : [];

  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
      <Panel title="Plan identity">
        <dl className="divide-y divide-border">
          <KeyValue label="Name">{plan.name}</KeyValue>
          <KeyValue label="Internal code"><span className="font-mono text-2xs">{plan.internalCode}</span></KeyValue>
          <KeyValue label="Status"><PlanStatusBadge status={plan.status} /></KeyValue>
          <KeyValue label="Segment">{plan.targetSegment}</KeyValue>
          <KeyValue label="Visibility">{plan.availability.visibility === "public" ? "Public" : "Invite only"}</KeyValue>
          <KeyValue label="Created">{formatDate(plan.createdAt)}</KeyValue>
        </dl>
        {plan.description ? <p className="mt-2 text-2xs text-muted-foreground">{plan.description}</p> : null}
        {plan.internalNotes ? <p className="mt-2 rounded-sm bg-surface-sunken px-2 py-1.5 text-2xs text-muted-foreground"><span className="font-medium">Internal note: </span>{plan.internalNotes}</p> : null}
      </Panel>

      <Panel title="Current version">
        {current ? (
          <dl className="divide-y divide-border">
            <KeyValue label="Version">v{current.version} <VersionStatusBadge status="published" /></KeyValue>
            <KeyValue label="Published">{current.publishedAt ? formatDate(current.publishedAt) : "-"} by {current.publishedBy ?? "-"}</KeyValue>
            <KeyValue label="Monthly">{money(current.price.monthlyMinor, current.price.currency)}</KeyValue>
            <KeyValue label="Annual">{money(current.price.annualMinor, current.price.currency)}</KeyValue>
            <KeyValue label="Trial">{current.price.trialDays > 0 ? `${current.price.trialDays} days` : "None"}</KeyValue>
            <KeyValue label="Setup fee">{current.price.setupFeeMinor > 0 ? money(current.price.setupFeeMinor, current.price.currency) : "None"}</KeyValue>
          </dl>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">Not published yet. This plan is a draft and no company can subscribe to it.</p>
        )}
        {summary.draft ? <p className="mt-2 text-2xs text-warning">Draft version {summary.draft.version} has unpublished changes.</p> : null}
      </Panel>

      <Panel title="Subscribers" action={<Button asChild variant="ghost" size="sm"><Link href={routes.subscriptionsFor({ plan: plan.key })}>View Subscriptions on This Plan</Link></Button>}>
        <dl className="divide-y divide-border">
          <KeyValue label="Active paid">{formatNumber(subscribers.paid)}</KeyValue>
          <KeyValue label="On trial">{formatNumber(subscribers.trial)}</KeyValue>
          <KeyValue label="MRR">{moneyTotals(subscribers.mrrByCurrency)}</KeyValue>
          <KeyValue label="On an older version">{formatNumber(subscribers.onOlderVersion)}</KeyValue>
        </dl>
        {plan.status === "retired" && subscribers.total > 0 ? <p className="mt-2 text-2xs text-muted-foreground">Retired, but these subscriptions keep referencing it unchanged.</p> : null}
      </Panel>

      <Panel title="Entitlement summary" description={`${enabled.length} of ${FEATURES.length} features enabled`} className="lg:col-span-2">
        {current ? (
          <div className="space-y-2">
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {keyLimits.map((def) => (
                <KeyValue key={def.key} label={def.name}>{formatRule(current.limits[def.key], def.unit)}</KeyValue>
              ))}
            </dl>
            <Link href={routes.plan(plan.id, "features")} className="text-2xs font-medium text-primary hover:underline">See every feature and limit</Link>
          </div>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">Nothing published yet.</p>
        )}
      </Panel>

      <Panel title="Recent plan activity" action={<Button asChild variant="ghost" size="sm"><Link href={routes.plan(plan.id, "versions")}>All activity</Link></Button>}>
        {activity.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.slice(0, 4).map((entry) => (
              <li key={entry.id} className="py-1.5">
                <p className="text-[0.8125rem] text-foreground">{entry.summary}</p>
                <p className="text-2xs text-muted-foreground">{entry.actor} · {relativeTime(entry.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function PricingSection({ summary, subscribersOnPlan }: { summary: PlanSummary; subscribersOnPlan: number }) {
  const { current, draft } = summary;
  const savings = current ? annualSavings(current.price.monthlyMinor, current.price.annualMinor) : null;
  const diffs = current && draft ? [
    ["Monthly price", money(current.price.monthlyMinor, current.price.currency), money(draft.price.monthlyMinor, draft.price.currency), current.price.monthlyMinor !== draft.price.monthlyMinor],
    ["Annual price", money(current.price.annualMinor, current.price.currency), money(draft.price.annualMinor, draft.price.currency), current.price.annualMinor !== draft.price.annualMinor],
    ["Trial", `${current.price.trialDays} days`, `${draft.price.trialDays} days`, current.price.trialDays !== draft.price.trialDays],
  ] as Array<[string, string, string, boolean]> : [];

  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
      <Panel title="Published pricing" description={current ? `Version ${current.version}` : undefined}>
        {current ? (
          <dl className="divide-y divide-border">
            <KeyValue label="Currency">{current.price.currency}</KeyValue>
            <KeyValue label="Monthly price">{money(current.price.monthlyMinor, current.price.currency)}</KeyValue>
            <KeyValue label="Annual price">{money(current.price.annualMinor, current.price.currency)}</KeyValue>
            <KeyValue label="Annual monthly equivalent">{money(Math.round(current.price.annualMinor / 12), current.price.currency)}</KeyValue>
            <KeyValue label="Annual savings">{savings && savings.amountMinor >= 0 ? `${savings.percent}%` : "-"}</KeyValue>
            <KeyValue label="Trial policy">{current.price.trialDays > 0 ? `${current.price.trialDays} days, not counted as paid` : "No trial"}</KeyValue>
            <KeyValue label="Price version">v{current.version}</KeyValue>
            <KeyValue label="Effective">{current.publishedAt ? formatDate(current.publishedAt) : "-"}</KeyValue>
            <KeyValue label="Subscribers priced here">{formatNumber(subscribersOnPlan)}</KeyValue>
          </dl>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">Nothing is published, so no price is in force.</p>
        )}
        {current?.price.notes ? <p className="mt-2 text-2xs text-muted-foreground">{current.price.notes}</p> : null}
      </Panel>
      <Panel title="Changing this price" description="Published pricing is never edited in place">
        <p className="text-[0.8125rem] text-foreground">A published version is an immutable snapshot. To change the price, create a new draft version, review the impact, then publish it with a rollout policy.</p>
        <p className="mt-2 text-2xs text-muted-foreground">Existing subscriptions keep the price of the version they are on until you migrate them or they move at renewal. Nobody&apos;s price changes silently.</p>
        {draft && diffs.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1 text-[0.8125rem] font-medium text-foreground">Draft version {draft.version} versus current</p>
            <MiniTable caption="Pricing differences" rows={diffs} getKey={(row) => row[0]} columns={[
              { id: "field", header: "Field", cell: (row) => row[0] },
              { id: "current", header: "Current", cell: (row) => row[1] },
              { id: "draft", header: "Draft", cell: (row) => <span className={cn(row[3] && "font-medium text-primary")}>{row[2]}</span> },
            ]} />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function FeaturesSection({ summary }: { summary: PlanSummary }) {
  const { current, draft } = summary;
  const base = current ?? draft;
  if (!base) return <p className="text-[0.8125rem] text-muted-foreground">Nothing configured yet.</p>;
  const compare = current && draft ? draft : null;

  return (
    <div className="space-y-1">
      {compare ? <AlertBanner tone="info" title={`Comparing with draft version ${compare.version}`}>Changed values are marked. The published version is not modified.</AlertBanner> : null}
      {ENTITLEMENT_CATEGORIES.map((category) => {
        const resources = resourcesIn(category);
        const features = featuresIn(category);
        return (
          <Panel key={category} title={category} flush>
            <MiniTable
              caption={`${category} entitlements`}
              rows={[...resources.map((def) => ({ kind: "resource" as const, key: def.key, name: def.name, def })), ...features.map((feature) => ({ kind: "feature" as const, key: feature.key, name: feature.name, def: feature }))]}
              getKey={(row) => `${row.kind}-${row.key}`}
              columns={[
                { id: "name", header: "Feature / resource", cell: (row) => <span><span className="block font-medium text-foreground">{row.name}</span><span className="block font-mono text-[10px] text-muted-foreground">{row.key}</span></span> },
                {
                  id: "value",
                  header: `Version ${base.version}`,
                  cell: (row) => (row.kind === "resource" ? formatRule(base.limits[row.def.key as keyof typeof base.limits], row.def.unit) : base.features[row.key] ? "Included" : "Not included"),
                },
                ...(compare
                  ? [{
                      id: "draft",
                      header: `Draft v${compare.version}`,
                      cell: (row: { kind: "resource" | "feature"; key: string; def: (typeof resources)[number] | (typeof features)[number] }) => {
                        if (row.kind === "resource") {
                          const key = row.def.key as keyof typeof base.limits;
                          const changed = !rulesEqual(base.limits[key], compare.limits[key]);
                          return <span className={cn(changed && "font-medium text-primary")}>{formatRule(compare.limits[key], (row.def as (typeof resources)[number]).unit)}{changed ? " • changed" : ""}</span>;
                        }
                        const changed = Boolean(base.features[row.key]) !== Boolean(compare.features[row.key]);
                        return <span className={cn(changed && "font-medium text-primary")}>{compare.features[row.key] ? "Included" : "Not included"}{changed ? " • changed" : ""}</span>;
                      },
                    }]
                  : []),
                { id: "unit", header: "Unit / reset", hideBelow: "md", cell: (row) => (row.kind === "resource" ? `${(row.def as (typeof resources)[number]).unit} · ${(row.def as (typeof resources)[number]).resetPeriod === "none" ? "capacity" : (row.def as (typeof resources)[number]).resetPeriod === "billing_cycle" ? "per billing period" : "per month"}` : "-") },
                { id: "dep", header: "Dependency", hideBelow: "lg", cell: (row) => (row.kind === "feature" && (row.def as (typeof features)[number]).dependencies.length > 0 ? (row.def as (typeof features)[number]).dependencies.join(", ") : "-") },
              ]}
            />
          </Panel>
        );
      })}
    </div>
  );
}

function AvailabilitySectionView({ summary }: { summary: PlanSummary }) {
  const mutations = usePlanMutations();
  const actions = usePlanActions();
  const { plan, current, draft } = summary;
  const base = current ?? draft;
  const [editing, setEditing] = useState<PlanAvailability | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = actions.capabilities.canEditDraftPlan && plan.status !== "retired";
  const a = plan.availability;

  const save = async () => {
    if (!editing) return;
    setPending(true);
    setError(null);
    try {
      await mutations.setAvailability(plan.id, editing);
      toast.success("Availability updated. Plan selectors now reflect it.");
      setEditing(null);
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  const yesNo = (value: boolean) => (value ? <span className="text-success">Available</span> : <span className="text-muted-foreground">Not available</span>);
  const editorValue = base && editing ? { ...draftInputOf(plan, base), availability: editing } : null;

  return (
    <Panel
      title="Availability"
      description="Who can be moved onto this plan. Availability is separate from the plan's lifecycle status."
      action={editable && !editing ? <Button variant="outline" size="sm" onClick={() => setEditing(structuredClone(a))}><PencilIcon />Edit availability</Button> : undefined}
    >
      {editing && editorValue ? (
        <div className="space-y-3">
          {error ? <AlertBanner tone="danger" title="Nothing was changed">{error}</AlertBanner> : null}
          <AvailabilitySection value={editorValue} onChange={(patch) => patch.availability && setEditing(patch.availability)} errors={editing.currencies.length === 0 ? { currencies: "Choose at least one currency." } : {}} idPrefix="detail" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditing(null); setError(null); }} disabled={pending}>Cancel</Button>
            <Button onClick={() => void save()} disabled={pending}>Save availability</Button>
          </div>
        </div>
      ) : (
        <dl className="divide-y divide-border">
          <KeyValue label="Lifecycle status"><PlanStatusBadge status={plan.status} /></KeyValue>
          <KeyValue label="New purchase">{yesNo(a.newPurchase && plan.status === "published")}</KeyValue>
          <KeyValue label="Upgrade">{yesNo(a.upgrade && plan.status === "published")}</KeyValue>
          <KeyValue label="Downgrade">{yesNo(a.downgrade && plan.status === "published")}</KeyValue>
          <KeyValue label="Visibility">{a.visibility === "public" ? "Public" : "Invite only"}</KeyValue>
          <KeyValue label="Currencies">{a.currencies.join(", ")}</KeyValue>
        </dl>
      )}
      {plan.status !== "published" && !editing ? <p className="mt-2 text-2xs text-muted-foreground">The plan is {plan.status === "hidden" ? "hidden from new purchase" : plan.status === "retired" ? "retired" : "a draft"}, so it is not offered in any direction whatever the switches say.</p> : null}
    </Panel>
  );
}

function VersionSheet({ plan, version, onClose }: { plan: PlanSummary["plan"]; version: PlanVersion | null; onClose: () => void }) {
  const columns: ComparisonColumn[] = version ? [{ id: version.id, title: `Version ${version.version}`, subtitle: version.status === "draft" ? "Draft" : version.publishedAt ? `Published ${formatDate(version.publishedAt)}` : "", version }] : [];
  return (
    <Sheet open={version !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{plan.name} version {version?.version}</SheetTitle>
          <SheetDescription>{version?.changeSummary.join("; ") || "No summary"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-0">{version ? <ComparisonTable columns={columns} /> : null}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function VersionsSection({ summary, subscribersByVersion, activity }: { summary: PlanSummary; subscribersByVersion: Record<number, number>; activity: { id: string; at: string; actor: string; summary: string; result: string }[] }) {
  const { plan } = summary;
  const router = useRouter();
  const versions = [...plan.versions].sort((a, b) => b.version - a.version);
  const [viewing, setViewing] = useState<PlanVersion | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const pair = left !== null && right !== null ? [versions.find((v) => v.version === left), versions.find((v) => v.version === right)] : null;

  return (
    <div className="space-y-1">
      <Panel title="Versions" description="Each published version is an immutable snapshot of price, features and limits" flush>
        <MiniTable
          caption="Plan versions"
          rows={versions}
          getKey={(version) => version.id}
          columns={[
            { id: "version", header: "Version", cell: (version) => <span className="font-medium text-foreground">v{version.version}</span> },
            { id: "status", header: "Status", cell: (version) => <VersionStatusBadge status={version.status} /> },
            { id: "published", header: "Published", hideBelow: "sm", cell: (version) => (version.publishedAt ? <span className="text-2xs">{formatDate(version.publishedAt)}<span className="block text-muted-foreground">{version.publishedBy}</span></span> : <span className="text-muted-foreground">Not published</span>) },
            { id: "changes", header: "Changes", hideBelow: "md", className: "min-w-56", cell: (version) => <span className="line-clamp-2 text-2xs text-muted-foreground">{version.changeSummary.length ? version.changeSummary.join("; ") : "No changes recorded yet"}{version.rollout ? ` · ${ROLLOUT_POLICY[version.rollout].label}` : ""}</span> },
            { id: "subs", header: "Subscribers", align: "right", cell: (version) => <span className="tabular">{subscribersByVersion[version.version] ?? 0}</span> },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (version) => (
                <ActionMenu
                  label={`Actions for version ${version.version}`}
                  items={[
                    { id: "view", label: "View Version", icon: EyeIcon, onSelect: () => setViewing(version) },
                    { id: "compare", label: version.version === versions[0]?.version ? "Compare with previous" : `Compare with v${versions[0]?.version}`, onSelect: () => { setLeft(version.version); setRight(version.version === versions[0]?.version ? (versions[1]?.version ?? null) : (versions[0]?.version ?? null)); }, disabled: versions.length < 2 },
                    { id: "subs", label: "View Subscribers", icon: UsersIcon, onSelect: () => router.push(routes.subscriptionsFor({ plan: plan.key })) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Panel>

      {pair && pair[0] && pair[1] ? (
        <Panel title="Compare Versions" action={<Button variant="ghost" size="sm" onClick={() => { setLeft(null); setRight(null); }}>Close</Button>} flush>
          <ComparisonTable
            columns={[pair[1], pair[0]].map((version) => ({ id: version.id, title: `Version ${version.version}`, subtitle: version.status === "draft" ? "Draft" : version.publishedAt ? formatDate(version.publishedAt) : "", version }))}
          />
        </Panel>
      ) : null}

      <Panel title="Plan activity">
        {activity.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-1.5">
                <div className="min-w-0"><p className="text-[0.8125rem] text-foreground">{entry.summary}</p><p className="text-2xs text-muted-foreground">{entry.actor}</p></div>
                <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground" title={formatDateTime(entry.at)}>{relativeTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <VersionSheet plan={plan} version={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PlanDetailPage() {
  const params = useParams<{ planId: string }>();
  const planId = decodeURIComponent(params.planId ?? "");
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const section = sectionOf(search.get("section"));
  const query = usePlan(planId);
  const actions = usePlanActions();
  const data = query.data;
  const menu = useMemo(() => (data ? actions.menu(data.summary) : []), [actions, data]);

  if (query.error && !data) return <PlansError subject="Plan" error={query.error} onRetry={() => void query.refetch()} back={{ href: routes.plans, label: "Back to Plans" }} />;
  if (!data) {
    return (
      <div className="space-y-2">
        <div className="rounded-sm border border-border bg-card p-4"><Skeleton className="h-5 w-56" /><Skeleton className="mt-3 h-3.5 w-80 max-w-full" /></div>
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <PanelSkeleton key={index} rows={5} />)}</div>
      </div>
    );
  }

  const { summary } = data;
  const { plan, current, draft, subscribers } = summary;
  const edit = actions.editAction(summary);
  const price = (current ?? draft)?.price;
  const setSection = (key: PlanSection) => router.replace(key === "overview" ? pathname : `${pathname}?section=${key}`, { scroll: false });

  return (
    <div className="space-y-2">
      <header className="space-y-1">
        <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3.5 shadow-xs sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{plan.name}</h1>
              <PlanStatusBadge status={plan.status} />
              {PLANS_MOCK_MODE ? <DemoTag>Demo configuration</DemoTag> : null}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
              <span className="font-mono">{plan.internalCode}</span>
              <span>{current ? `Current v${current.version}` : "Not published"}</span>
              {draft ? <span className="text-warning">Draft v{draft.version} in progress</span> : null}
              <span>Updated {relativeTime(plan.updatedAt)} by {plan.updatedBy}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {edit ? <Button variant="outline" size="sm" onClick={edit.run}><PencilIcon />{edit.label}</Button> : null}
            {draft && actions.capabilities.canPublishPlan && plan.status !== "retired" ? (
              <Button size="sm" onClick={() => actions.openFlow({ kind: "publish", summary })}><RocketIcon />Publish</Button>
            ) : null}
            <ActionMenu items={menu} label={`More actions for ${plan.name}`} />
          </div>
        </div>
        {plan.status === "retired" ? <AlertBanner tone="info" title="This plan is retired">It is closed to new business. {subscribers.total} existing {subscribers.total === 1 ? "subscription keeps" : "subscriptions keep"} referencing it unchanged.</AlertBanner> : null}
        {plan.status === "hidden" ? <AlertBanner tone="warning" title="Hidden from new purchase">Existing subscribers keep this plan; nobody new can choose it.</AlertBanner> : null}
        {plan.status === "draft" ? <AlertBanner tone="info" title="Draft plan">No company can subscribe until it is published.</AlertBanner> : null}
      </header>

      <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-6">
        <StatCard compact label="Current version" value={current ? `v${current.version}` : "Draft"} hint={current?.publishedAt ? formatDate(current.publishedAt) : "Not published"} />
        <StatCard compact label="Monthly price" value={<span className="text-base">{price ? money(price.monthlyMinor, price.currency) : "-"}</span>} />
        <StatCard compact label="Annual price" value={<span className="text-base">{price ? money(price.annualMinor, price.currency) : "-"}</span>} />
        <StatCard compact label="Active subscribers" value={formatNumber(subscribers.total)} hint={`${subscribers.paid} paid · ${subscribers.trial} trial`} href={routes.subscriptionsFor({ plan: plan.key })} />
        <StatCard compact label="MRR" value={<span className="text-base">{moneyTotals(subscribers.mrrByCurrency, true)}</span>} />
        <StatCard compact label="Last updated" value={<span className="text-[0.8125rem]">{relativeTime(plan.updatedAt)}</span>} />
      </StatGrid>

      <nav aria-label="Plan sections" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {PLAN_SECTIONS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setSection(item.key)}
                aria-current={item.key === section ? "page" : undefined}
                className={cn("relative px-3 py-2 text-[0.8125rem] font-medium transition-colors", item.key === section ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {item.label}
                {item.key === section ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-1">
        {section === "overview" ? <OverviewSection summary={summary} activity={data.activity} /> : null}
        {section === "pricing" ? <PricingSection summary={summary} subscribersOnPlan={subscribers.total} /> : null}
        {section === "features" ? <FeaturesSection summary={summary} /> : null}
        {section === "availability" ? <AvailabilitySectionView summary={summary} /> : null}
        {section === "versions" ? <VersionsSection summary={summary} subscribersByVersion={data.subscribersByVersion} activity={data.activity} /> : null}
      </div>
      {actions.dialogs}
    </div>
  );
}
