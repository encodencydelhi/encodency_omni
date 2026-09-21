"use client";

import { DownloadIcon, SearchXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/features/companies/components/primitives";
import { DemoTag } from "../components/badges";
import { EventFilterBar } from "../components/event-filter-bar";
import { EventPreviewDrawer } from "../components/event-preview-drawer";
import { EventsTable } from "../components/events-table";
import { ExportDialog } from "../components/export-dialog";
import { Pager } from "../components/pager";
import { RangeControl } from "../components/range-control";
import { AuditError, TableSkeleton } from "../components/states";
import { useEventActions } from "../components/use-event-actions";
import { useEventFilters } from "../components/use-event-filters";
import { AUDIT_MOCK_MODE, auditRoutes } from "../data/config";
import { useAuditCapabilities, useEvents } from "../data/hooks";

/** The main investigation workspace: search, filter, sort and open any recorded event. */
export function EventExplorerPage() {
  const router = useRouter();
  const capabilities = useAuditCapabilities();
  const filters = useEventFilters();
  const { query, values, activeCount, backString } = filters;
  const events = useEvents(query);
  const actions = useEventActions();
  const [exporting, setExporting] = useState(false);
  const data = events.data;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Event Explorer"
        description="Search and inspect recorded platform actions across companies, staff and system resources."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Audit Data</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canExport ? <Button variant="outline" size="sm" onClick={() => setExporting(true)} disabled={!data || data.total === 0}><DownloadIcon />Export Filtered Events</Button> : null}
            <ActionMenu
              label="More Actions"
              items={[
                { id: "clear", label: "Clear Filters", disabled: activeCount === 0, onSelect: filters.clear },
                { id: "coverage", label: "View Audit Coverage", onSelect: () => router.push(auditRoutes.settings({ section: "coverage" })) },
                { id: "investigations", label: "Open Investigations", onSelect: () => router.push(auditRoutes.investigations()) },
              ]}
            />
          </>
        }
      />

      <RangeControl />
      <EventFilterBar filters={filters} />

      {values.corr ? (
        <AlertBanner tone="info" title="Showing A Correlated Workflow" action={<Button size="sm" variant="outline" onClick={() => filters.setFilter({ corr: null })}>Show All Events</Button>}>
          Only events sharing the correlation ID <span className="font-mono">{values.corr}</span> are listed, oldest activity first when sorted that way.
        </AlertBanner>
      ) : null}

      {events.error && !data ? (
        <AuditError subject="Audit Events" error={events.error} onRetry={() => void events.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={10} columns={8} />
      ) : (
        <Panel flush>
          <EventsTable
            rows={data.rows}
            canSeeEmail={capabilities.canViewActorEmail}
            onOpen={(event) => filters.set({ open: event.id })}
            menuFor={(event) => actions.menuFor(event, { onPreview: () => filters.set({ open: event.id }), back: backString })}
            empty={
              <EmptyState
                icon={SearchXIcon}
                title={activeCount > 0 ? "No Matching Events" : "No Events In This Period"}
                description={activeCount > 0 ? "No recorded event matches these filters in the selected window. Widen the date range or clear a filter." : "Nothing was recorded in the selected window."}
                action={activeCount > 0 ? <Button variant="outline" onClick={filters.clear}>Clear All Filters</Button> : undefined}
              />
            }
          />
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={filters.setPage} />
        </Panel>
      )}

      <EventPreviewDrawer eventId={values.open || null} onClose={() => filters.set({ open: null })} back={backString.replace(/(^|&)open=[^&]*/, "").replace(/^&/, "")} />
      {actions.nodes}
      {exporting ? <ExportDialog query={query} subject={`${data?.total ?? 0} matching events`} onClose={() => setExporting(false)} /> : null}
    </div>
  );
}
