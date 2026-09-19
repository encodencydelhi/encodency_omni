"use client";

import { CalendarClockIcon, EyeIcon, HistoryIcon, TimerIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { TableSkeleton } from "@/features/companies/components/states";
import { relativeTime } from "@/features/companies/data/clock";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { DemoTag, ScheduledKindBadge, ScheduledStatusBadge, UsageRiskBadge } from "../components/badges";
import { MiniTable } from "../components/mini-table";
import { PlansError } from "../components/states";
import { useSubscriptionActions } from "../components/use-subscription-actions";
import { PLANS_MOCK_MODE, SCHEDULED_KIND, routes } from "../data/config";
import { useRecentChanges, useScheduledChanges, useTrials } from "../data/hooks";
import type { ScheduledChangeKind, SubscriptionEvent, TrialRow } from "../data/types";

type View = "trials" | "scheduled" | "recent";
const VIEWS: Array<{ key: View; label: string }> = [
  { key: "trials", label: "Trials" },
  { key: "scheduled", label: "Scheduled Changes" },
  { key: "recent", label: "Recent Changes" },
];

const TRIAL_STATES = [
  { value: "ending_soon", label: "Ending soon" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
];

const TRIAL_STATE_LABEL: Record<TrialRow["state"], { label: string; className: string }> = {
  active: { label: "Active", className: "text-success" },
  ending_soon: { label: "Ending soon", className: "text-warning" },
  expired: { label: "Expired", className: "text-danger" },
  converted: { label: "Converted", className: "text-info" },
};

/* ------------------------------------------------------------------ */
/* Trials                                                              */
/* ------------------------------------------------------------------ */

function TrialsView() {
  const router = useRouter();
  const actions = useSubscriptionActions();
  const url = useUrlParams(["tq", "tstate"] as const);
  const [search, setSearch] = useDebouncedText(url.values.tq, (value) => url.set({ tq: value }));
  const query = useTrials({ search: url.values.tq || undefined, state: url.values.tstate || undefined });
  const filtered = url.activeCount > 0;

  const menu = (trial: TrialRow): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [{ id: "open", label: "Open Subscription", icon: EyeIcon, onSelect: () => router.push(routes.subscription(trial.subscriptionId)) }];
    if (trial.state === "active" || trial.state === "ending_soon") {
      if (actions.can(trial.row).trial) {
        items.push({ id: "extend", label: "Extend Trial", icon: TimerIcon, onSelect: () => actions.openFlow({ kind: "extend", row: trial.row }) });
        items.push({ id: "convert", label: "Convert to Paid", onSelect: () => actions.openFlow({ kind: "convert", row: trial.row }) });
      }
    }
    items.push({ id: "company", label: "Open Company", onSelect: () => router.push(ROUTES.superAdmin.company(trial.company.id)) });
    return items;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company or plan..." aria-label="Search trials" className="w-full sm:w-72" />
        <FilterSelect label="Trial" value={url.values.tstate || undefined} options={TRIAL_STATES} onChange={(value) => url.set({ tstate: value })} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => { url.clear(); setSearch(""); }}>Clear Filters</Button> : null}
      </div>
      {query.error && !query.data ? (
        <PlansError subject="Trials" error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Trials"
            rows={query.data}
            getKey={(trial) => trial.subscriptionId}
            empty={
              <EmptyState icon={TimerIcon} title={filtered ? "No trials match these filters" : "No active trials"} description={filtered ? "Try a different state or search." : "Trials appear here when a company starts one."} action={filtered ? <Button variant="outline" onClick={() => { url.clear(); setSearch(""); }}>Clear Filters</Button> : undefined} />
            }
            columns={[
              { id: "company", header: "Company", cell: (trial) => <Link href={routes.subscription(trial.subscriptionId)} className="font-medium text-foreground hover:text-primary hover:underline">{trial.company.name}</Link> },
              { id: "plan", header: "Plan", cell: (trial) => trial.planName },
              { id: "start", header: "Trial Start", hideBelow: "md", cell: (trial) => <span className="whitespace-nowrap text-2xs tabular">{formatDate(trial.startedAt)}</span> },
              { id: "end", header: "Trial End", cell: (trial) => <span className="whitespace-nowrap text-2xs tabular">{formatDate(trial.endsAt)}</span> },
              {
                id: "days",
                header: "Days Remaining",
                align: "right",
                cell: (trial) => (trial.state === "converted" ? <span className="text-muted-foreground">-</span> : <span className={cn("tabular font-medium", trial.daysRemaining <= 2 ? "text-danger" : trial.daysRemaining <= 7 ? "text-warning" : "text-foreground")}>{trial.daysRemaining < 0 ? `${-trial.daysRemaining} ago` : trial.daysRemaining}</span>),
              },
              { id: "usage", header: "Current Usage", hideBelow: "lg", cell: (trial) => <UsageRiskBadge risk={trial.usageRisk} /> },
              { id: "onboarding", header: "Onboarding", hideBelow: "lg", cell: (trial) => <span className="text-2xs capitalize text-muted-foreground">{trial.onboarding.replace(/_/g, " ")}</span> },
              { id: "state", header: "Status", cell: (trial) => <span className={cn("text-2xs font-medium", TRIAL_STATE_LABEL[trial.state].className)}>{TRIAL_STATE_LABEL[trial.state].label}{trial.extendedDays > 0 ? ` (+${trial.extendedDays}d)` : ""}</span> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (trial) => <ActionMenu items={menu(trial)} label={`Actions for ${trial.company.name}`} /> },
            ]}
          />
        </Panel>
      )}
      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scheduled                                                           */
/* ------------------------------------------------------------------ */

function ScheduledView() {
  const actions = useSubscriptionActions();
  const query = useScheduledChanges();
  const url = useUrlParams(["skind"] as const);
  const rows = (query.data ?? []).filter((item) => !url.values.skind || item.kind === url.values.skind);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterSelect label="Type" value={url.values.skind || undefined} options={(Object.keys(SCHEDULED_KIND) as ScheduledChangeKind[]).map((kind) => ({ value: kind, label: SCHEDULED_KIND[kind].label }))} onChange={(value) => url.set({ skind: value })} />
        {url.activeCount > 0 ? <Button variant="ghost" size="sm" onClick={url.clear}>Clear Filters</Button> : null}
        <p className="ml-auto text-2xs text-muted-foreground">Scheduled means not yet applied. This demo applies nothing on a schedule.</p>
      </div>
      {query.error && !query.data ? (
        <PlansError subject="Scheduled changes" error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Scheduled subscription changes"
            rows={rows}
            getKey={(item) => item.id}
            empty={<EmptyState icon={CalendarClockIcon} title="No scheduled changes" description={url.activeCount > 0 ? "None of this type is scheduled." : "Future-dated plan changes, cancellations and override expiries appear here."} action={url.activeCount > 0 ? <Button variant="outline" onClick={url.clear}>Clear Filters</Button> : undefined} />}
            columns={[
              { id: "company", header: "Company", cell: (item) => <Link href={routes.subscription(item.subscriptionId)} className="font-medium text-foreground hover:text-primary hover:underline">{item.company.name}</Link> },
              { id: "type", header: "Change Type", cell: (item) => <span><ScheduledKindBadge kind={item.kind} /><span className="mt-0.5 block text-2xs text-muted-foreground">{item.label}</span></span> },
              { id: "current", header: "Current Value", hideBelow: "sm", cell: (item) => item.current },
              { id: "scheduled", header: "Scheduled Value", cell: (item) => <span className="font-medium text-foreground">{item.scheduled}</span> },
              { id: "date", header: "Effective Date", cell: (item) => <span className="whitespace-nowrap text-2xs tabular">{formatDate(item.effectiveAt)}</span> },
              { id: "status", header: "Status", cell: (item) => <ScheduledStatusBadge status={item.status} /> },
              { id: "by", header: "Created By", hideBelow: "lg", cell: (item) => <span className="text-2xs text-muted-foreground">{item.createdBy}</span> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (item) => <ActionMenu items={actions.changeMenu(item)} label={`Actions for ${item.company.name}`} /> },
            ]}
          />
        </Panel>
      )}
      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent                                                              */
/* ------------------------------------------------------------------ */

function RecentView() {
  const router = useRouter();
  const query = useRecentChanges();
  const [viewing, setViewing] = useState<SubscriptionEvent | null>(null);

  return (
    <div className="space-y-2">
      {query.error && !query.data ? (
        <PlansError subject="Recent changes" error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Recent subscription changes"
            rows={query.data.slice(0, 50)}
            getKey={(event) => event.id}
            empty={<EmptyState icon={HistoryIcon} title="No changes yet" description="Plan, subscription, trial and override changes are recorded here." />}
            columns={[
              { id: "time", header: "Time", cell: (event) => <span className="whitespace-nowrap text-2xs text-muted-foreground" title={formatDateTime(event.at)}>{relativeTime(event.at)}</span> },
              { id: "company", header: "Company", cell: (event) => (event.company ? <span className="font-medium text-foreground">{event.company.name}</span> : <span className="text-muted-foreground">Platform plan</span>) },
              { id: "action", header: "Action", className: "min-w-56", cell: (event) => <span className="line-clamp-2">{event.summary}</span> },
              { id: "prev", header: "Previous", hideBelow: "lg", cell: (event) => <span className="text-2xs text-muted-foreground">{event.previousValue ?? "-"}</span> },
              { id: "next", header: "New", hideBelow: "lg", cell: (event) => <span className="text-2xs">{event.newValue ?? "-"}</span> },
              { id: "actor", header: "Actor", hideBelow: "md", cell: (event) => event.actor },
              { id: "result", header: "Result", cell: (event) => <span className={cn("text-2xs font-medium", event.result === "success" ? "text-success" : "text-danger")}>{event.result === "success" ? "Success" : event.result === "failure" ? "Failed" : "Denied"}</span> },
              {
                id: "actions",
                header: <span className="sr-only">Actions</span>,
                align: "right",
                cell: (event) => (
                  <ActionMenu
                    label="Event actions"
                    items={[
                      { id: "view", label: "View Event", icon: EyeIcon, onSelect: () => setViewing(event) },
                      ...(event.subscriptionId ? [{ id: "open", label: "Open Subscription", onSelect: () => router.push(routes.subscription(event.subscriptionId ?? "")) }] : []),
                      ...(event.planId ? [{ id: "plan", label: "Open Plan", onSelect: () => router.push(routes.plan(event.planId ?? "")) }] : []),
                    ]}
                  />
                ),
              },
            ]}
          />
        </Panel>
      )}
      <Sheet open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent className="sm:max-w-md">
          {viewing ? (
            <>
              <SheetHeader><SheetTitle>{viewing.action}</SheetTitle><SheetDescription>{formatDateTime(viewing.at)}</SheetDescription></SheetHeader>
              <SheetBody className="space-y-3">
                <p className="text-[0.8125rem] text-foreground">{viewing.summary}</p>
                <Panel title="Details">
                  <dl className="divide-y divide-border">
                    <KeyValue label="Company">{viewing.company?.name ?? "Platform plan"}</KeyValue>
                    <KeyValue label="Actor">{viewing.actor}</KeyValue>
                    <KeyValue label="Result">{viewing.result}</KeyValue>
                    <KeyValue label="Previous">{viewing.previousValue ?? "-"}</KeyValue>
                    <KeyValue label="New">{viewing.newValue ?? "-"}</KeyValue>
                    {viewing.reason ? <KeyValue label="Reason">{viewing.reason}</KeyValue> : null}
                  </dl>
                </Panel>
              </SheetBody>
              <SheetFooter>
                {viewing.subscriptionId ? <Button asChild variant="outline"><Link href={routes.subscription(viewing.subscriptionId)}>Open Subscription</Link></Button> : null}
                <Button onClick={() => setViewing(null)}>Close</Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Trials, future-dated changes and what just happened - three views, not one giant table. */
export function ChangesPage() {
  const view = useSearchParams().get("view");
  const current: View = VIEWS.find((item) => item.key === view)?.key ?? "trials";

  return (
    <div className="space-y-3">
      <PageHeader
        title="Trials & Changes"
        description="Manage running trials, review scheduled subscription changes and see recent commercial activity."
        meta={PLANS_MOCK_MODE ? <DemoTag>Demo data</DemoTag> : undefined}
      />
      <div role="tablist" aria-label="Trials and changes views" className="inline-flex rounded-sm border border-border-strong bg-card p-0.5">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            role="tab"
            aria-selected={current === item.key}
            href={routes.changes(item.key)}
            replace
            scroll={false}
            className={cn("rounded-[3px] px-3 py-1 text-[0.8125rem] font-medium transition-colors", current === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {current === "trials" ? <TrialsView /> : null}
      {current === "scheduled" ? <ScheduledView /> : null}
      {current === "recent" ? <RecentView /> : null}
    </div>
  );
}
