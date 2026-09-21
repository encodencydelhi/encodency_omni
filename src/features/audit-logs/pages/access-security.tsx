"use client";

import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/features/companies/components/primitives";
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
import { AUDIT_MOCK_MODE, SECURITY_VIEWS, auditRoutes } from "../data/config";
import { useAuditCapabilities, useAuditWindow, useEvents, useSecurityCounts } from "../data/hooks";
import type { SecurityView } from "../data/types";

const VIEW_NOTE: Record<SecurityView, string> = {
  authentication: "A failed sign-in names the account that was attempted, separately from any authenticated actor. It is not evidence that the account's owner made the attempt.",
  user_access: "Company membership, roles and client access. Platform staff role changes are a separate view, and a pending request is never counted as an applied change.",
  staff: "Platform role assignment, operational company assignment and company membership are three different things and are recorded as different actions.",
  policies: "A requested policy change is not an effective policy. Requested, approved and applied are separate events, and only an applied event means the policy changed.",
};

/**
 * Filtered views of the one audit repository for authentication, user access, platform staff
 * and security policy. There is no second security-event dataset here.
 */
export function AccessSecurityPage() {
  const capabilities = useAuditCapabilities();
  const { window: dateWindow, range, from, to } = useAuditWindow();
  const requested = useSearchParams().get("view");
  const view = (SECURITY_VIEWS.find((item) => item.key === requested)?.key ?? "authentication") as SecurityView;
  const eventFilters = useEventFilters({ securityView: view });
  const events = useEvents(eventFilters.query);
  const counts = useSecurityCounts(dateWindow);
  const actions = useEventActions();
  const data = events.data;
  const meta = SECURITY_VIEWS.find((item) => item.key === view);
  const scope = { range: range === "30d" ? undefined : range, from: from || undefined, to: to || undefined };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Access & Security"
        description="Authentication, user access, platform staff and security-policy events, drawn from the same audit repository as Event Explorer."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Audit Data</DemoTag> : undefined}
      />

      <RangeControl />

      <nav aria-label="Security views" className="flex flex-wrap gap-1">
        {SECURITY_VIEWS.map((item) => (
          <Link key={item.key} href={auditRoutes.security(item.key, scope)} aria-current={item.key === view ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors", item.key === view ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
            {item.label}
            <span className="rounded-sm bg-muted px-1 text-2xs tabular text-muted-foreground">{counts.data ? counts.data[item.key] : "-"}</span>
          </Link>
        ))}
      </nav>
      <p className="text-2xs text-muted-foreground">{meta?.description}</p>

      <EventFilterBar filters={eventFilters} hide={["category", "quick", "sensitive", "stage"]} placeholder="Search event ID, actor, account, action or company..." />
      <AlertBanner tone="info">{VIEW_NOTE[view]}</AlertBanner>

      {events.error && !data ? (
        <AuditError subject="Security Events" error={events.error} onRetry={() => void events.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <Panel flush>
          <EventsTable
            rows={data.rows}
            variant={view === "authentication" ? "authentication" : "default"}
            canSeeEmail={capabilities.canViewActorEmail}
            caption={`${meta?.label ?? "Security"} events`}
            onOpen={(event) => eventFilters.set({ open: event.id })}
            menuFor={(event) => actions.menuFor(event, { onPreview: () => eventFilters.set({ open: event.id }), back: eventFilters.backString })}
            empty={<EmptyState icon={ShieldCheckIcon} title={eventFilters.activeCount > 0 ? "No Matching Events" : "No Events Recorded"} description={eventFilters.activeCount > 0 ? "No event in this view matches these filters and window." : `No ${meta?.label.toLowerCase()} events were recorded in the selected window.`} action={eventFilters.activeCount > 0 ? <Button variant="outline" onClick={eventFilters.clear}>Clear All Filters</Button> : undefined} />}
          />
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={eventFilters.setPage} />
        </Panel>
      )}

      <EventPreviewDrawer eventId={eventFilters.values.open || null} onClose={() => eventFilters.set({ open: null })} back={eventFilters.backString} />
      {actions.nodes}
    </div>
  );
}
