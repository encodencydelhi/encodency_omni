"use client";

import { ChevronDownIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton } from "@/features/companies/components/states";
import { cn } from "@/lib/utils/cn";
import { DemoTag } from "../components/badges";
import { EventFilterBar } from "../components/event-filter-bar";
import { EventPreviewDrawer } from "../components/event-preview-drawer";
import { EventsTable } from "../components/events-table";
import { Pager } from "../components/pager";
import { RangeControl } from "../components/range-control";
import { AuditError, TableSkeleton } from "../components/states";
import { useEventActions } from "../components/use-event-actions";
import { useEventFilters } from "../components/use-event-filters";
import { SENSITIVE_CLASSIFICATION } from "../data/action-catalogue";
import { AUDIT_MOCK_MODE, SENSITIVE } from "../data/config";
import { useAuditCapabilities, useAuditWindow, useEvents, useSensitiveCounts } from "../data/hooks";
import type { SensitiveCategory } from "../data/types";

/**
 * High-impact administrative events, by an explicit and documented classification. Being on this
 * list means a change deserves a look; it never means anyone did something wrong. A request is
 * separate from its approval, and both are separate from the change actually being applied.
 */
export function SensitiveChangesPage() {
  const capabilities = useAuditCapabilities();
  const { window: dateWindow } = useAuditWindow();
  const filters = useEventFilters({ sensitiveOnly: true });
  const { query, values } = filters;
  const events = useEvents(query);
  const counts = useSensitiveCounts(dateWindow);
  const actions = useEventActions();
  const [open, setOpen] = useState(false);
  const data = events.data;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Sensitive Changes"
        description="Review high-impact administrative events: privileged access, money, entitlements, integrations, feature rollouts, platform security, privacy and availability."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Audit Data</DemoTag> : undefined}
      />

      <RangeControl />

      {counts.data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8">
          {SENSITIVE_CLASSIFICATION.map((item) => (
            <button key={item.category} type="button" onClick={() => filters.setFilter({ sens: values.sens === item.category ? null : item.category })} aria-pressed={values.sens === item.category} className={cn("block min-w-0 rounded-sm border bg-card px-3 py-2.5 text-left shadow-xs transition-colors hover:bg-accent/40", values.sens === item.category ? "border-primary/50 bg-primary-subtle/40" : "border-border")}>
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{SENSITIVE[item.category as SensitiveCategory].label}</p>
              <p className="mt-1.5 text-lg font-semibold leading-none tabular text-foreground">{counts.data[item.category]}</p>
              <p className="mt-1 truncate text-2xs text-muted-foreground">In the selected period</p>
            </button>
          ))}
        </StatGrid>
      ) : (
        <StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8" />
      )}

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" aria-expanded={open}>How Events Are Classified<ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} /></Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Panel>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
              {SENSITIVE_CLASSIFICATION.map((item) => <div key={item.category}><dt className="text-[0.8125rem] font-medium text-foreground">{item.label}</dt><dd className="text-2xs text-muted-foreground">{item.description}</dd></div>)}
            </dl>
            <p className="mt-2 text-2xs text-muted-foreground">Classification follows the action, not the person or the outcome. A change outside production is routine and is not classed as sensitive.</p>
          </Panel>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-1.5">
        <EventFilterBar filters={filters} hide={["category", "quick", "sensitive", "actorType"]} placeholder="Search actor, action, target or company..." />
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterSelect label="Sensitive Category" value={values.sens || undefined} options={SENSITIVE_CLASSIFICATION.map((item) => ({ value: item.category, label: item.label }))} onChange={(value) => filters.setFilter({ sens: value })} />
        </div>
      </div>
      <AlertBanner tone="info">A request that was recorded successfully does not mean the proposed change was applied. Look at the workflow state: only a Change Applied event means the change took effect.</AlertBanner>

      {events.error && !data ? (
        <AuditError subject="Sensitive Events" error={events.error} onRetry={() => void events.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <Panel flush>
          <EventsTable
            rows={data.rows}
            variant="sensitive"
            canSeeEmail={capabilities.canViewActorEmail}
            caption="Sensitive changes"
            onOpen={(event) => filters.set({ open: event.id })}
            menuFor={(event) => actions.menuFor(event, { onPreview: () => filters.set({ open: event.id }), back: filters.backString })}
            empty={<EmptyState icon={ShieldCheckIcon} title={filters.activeCount > 0 ? "No Matching Sensitive Events" : "No Sensitive Events"} description={filters.activeCount > 0 ? "No high-impact event matches these filters in this window." : "No high-impact action was recorded in the selected window."} action={filters.activeCount > 0 ? <Button variant="outline" onClick={filters.clear}>Clear All Filters</Button> : undefined} />}
          />
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={filters.setPage} />
        </Panel>
      )}

      <EventPreviewDrawer eventId={values.open || null} onClose={() => filters.set({ open: null })} back={filters.backString} />
      {actions.nodes}
    </div>
  );
}
