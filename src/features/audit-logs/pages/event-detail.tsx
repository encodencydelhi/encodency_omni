"use client";

import { ArrowLeftIcon, ChevronDownIcon, ClipboardCopyIcon, ExternalLinkIcon, WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton, StatGridSkeleton } from "@/features/companies/components/states";
import { cn } from "@/lib/utils/cn";
import { AddToInvestigationDialog } from "../components/add-to-investigation";
import { ActorIcon, DemoTag, IntegrityBadge, OutcomeBadge, PriorityBadge, SensitiveBadge, WorkflowBadge } from "../components/badges";
import { AuditChangeDiff } from "../components/change-diff";
import { ExportDialog } from "../components/export-dialog";
import { ALL_TIME } from "../components/event-picker";
import { AuditError } from "../components/states";
import { AuditWorkflowTimeline } from "../components/workflow-timeline";
import { ACTOR_TYPE, AUDIT_MOCK_MODE, CATEGORY, INVESTIGATION_STATUS, auditRoutes } from "../data/config";
import { useAuditCapabilities, useEvent } from "../data/hooks";
import { scopeText, utcFull } from "../lib/format";

const NOT_RECORDED = <span className="text-muted-foreground">Not Recorded</span>;

/**
 * One event in full. Actor, target and scope are separate panels because they are separate
 * facts. The change comparison is structured, secrets stay redacted, and there is no way to
 * edit or delete the event from here.
 */
export function EventDetailPage({ eventId }: { eventId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const capabilities = useAuditCapabilities();
  const query = useEvent(eventId);
  const [linking, setLinking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const back = params.get("back") ?? "";
  const backHref = auditRoutes.events(Object.fromEntries(new URLSearchParams(back)));
  const detail = query.data;

  if (query.error && !detail) {
    return <AuditError subject="Audit Event" error={query.error} onRetry={() => void query.refetch()} back={{ href: backHref, label: "Back to Event Explorer" }} />;
  }
  if (!detail) return <div className="space-y-1"><StatGridSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" /><PanelSkeleton rows={6} /></div>;

  const { event, workflow, linkedInvestigations, sameRequest } = detail;
  const related = event.target.href ?? event.related.find((ref) => ref.href)?.href ?? null;

  return (
    <div className="space-y-3">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground"><Link href={backHref}><ArrowLeftIcon />Event Explorer</Link></Button>
        <PageHeader
          title={event.actionLabel}
          description={event.summary}
          meta={
            <div className="flex flex-wrap items-center gap-1.5">
              <OutcomeBadge outcome={event.outcome} />
              <PriorityBadge priority={event.priority} />
              {event.sensitiveCategory ? <SensitiveBadge category={event.sensitiveCategory} /> : null}
              {event.workflowStage ? <WorkflowBadge stage={event.workflowStage} /> : null}
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground">{event.id}</span>
              <span className="text-2xs text-muted-foreground">{CATEGORY[event.category].label} - <span className="capitalize">{event.environment}</span></span>
              {AUDIT_MOCK_MODE ? <DemoTag>Demo</DemoTag> : null}
            </div>
          }
          actions={
            <>
              {related ? <Button asChild variant="outline" size="sm"><Link href={related}><ExternalLinkIcon />Open Related Resource</Link></Button> : null}
              <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(event.id).then(() => toast.success("Event ID Copied", { description: event.id })); }}><ClipboardCopyIcon />Copy Event ID</Button>
              {event.correlationId ? <Button asChild variant="outline" size="sm"><Link href="#workflow"><WorkflowIcon />View Correlated Events</Link></Button> : null}
              <ActionMenu
                label="More Actions"
                items={[
                  { id: "investigate", label: "Add To Investigation", disabled: !capabilities.canManageInvestigations, onSelect: () => setLinking(true) },
                  { id: "export", label: "Export Event", disabled: !capabilities.canExport, onSelect: () => setExporting(true) },
                  ...(event.scope.companyId ? [{ id: "activity", label: "Open Company Activity Reference", onSelect: () => router.push(auditRoutes.companyActivity(event.scope.companyId as string)) }] : []),
                ]}
              />
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Actor Information" description="Who or what performed or attempted the action, as recorded at the time.">
          <div className="mb-1 flex items-center gap-2"><ActorIcon type={event.actor.type} /><span className="text-[0.8125rem] font-medium text-foreground">{event.actor.displayName}</span></div>
          <dl className="divide-y divide-border">
            <KeyValue label="Actor Type">{ACTOR_TYPE[event.actor.type].label}</KeyValue>
            <KeyValue label="Recorded Actor ID">{event.actor.id ? <span className="font-mono text-2xs">{event.actor.id}</span> : NOT_RECORDED}</KeyValue>
            <KeyValue label="Email">{capabilities.canViewActorEmail ? (event.actor.email ?? NOT_RECORDED) : <span className="text-muted-foreground">Restricted</span>}</KeyValue>
            {event.actor.attemptedIdentifier ? <KeyValue label="Attempted Account">{capabilities.canViewActorEmail ? event.actor.attemptedIdentifier : <span className="text-muted-foreground">Restricted</span>}</KeyValue> : null}
            <KeyValue label="Role At Event Time">{event.actor.roleAtEvent ?? NOT_RECORDED}</KeyValue>
            <KeyValue label="Scope At Event Time">{event.actor.scopeAtEvent ?? NOT_RECORDED}</KeyValue>
            <KeyValue label="Authentication Context">{event.actor.authContext ?? NOT_RECORDED}</KeyValue>
          </dl>
          {event.actor.type === "anonymous" ? <p className="mt-2 text-2xs text-muted-foreground">An unauthenticated attempt names the account that was attempted. It is not evidence that the account&rsquo;s owner made the attempt.</p> : null}
          <p className="mt-1 text-2xs text-muted-foreground">Role and scope are what was recorded at the time. They are never replaced with the person&rsquo;s current role.</p>
        </Panel>

        <Panel title="Target Information" description="What the action was done to, and where it sits.">
          <dl className="divide-y divide-border">
            <KeyValue label="Target Type"><span className="capitalize">{event.target.type.replace(/_/g, " ")}</span></KeyValue>
            <KeyValue label="Target ID"><span className="font-mono text-2xs">{event.target.id}</span></KeyValue>
            <KeyValue label="Name At Event Time">{event.target.displayName}</KeyValue>
            <KeyValue label="Company Scope">{event.scope.companyName ?? "Platform-Wide"}</KeyValue>
            {event.scope.clientName ? <KeyValue label="Client Scope">{event.scope.clientName}</KeyValue> : null}
            <KeyValue label="Scope Level"><span className="capitalize">{event.scope.level}</span> - {scopeText(event.scope)}</KeyValue>
            <KeyValue label="Parent Resource">{event.target.parent ? `${event.target.parent.name} (${event.target.parent.type})` : "None"}</KeyValue>
            <KeyValue label="Current Resource">{event.target.href ? <Link href={event.target.href} className="text-primary hover:underline">Open Resource</Link> : <span className="text-muted-foreground">Current Resource Unavailable</span>}</KeyValue>
          </dl>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Change Summary" description="Only the fields that changed, in words. Secrets are never shown.">
          <AuditChangeDiff changes={event.changes} />
          {event.followUp ? <p className="mt-2 text-[0.8125rem] text-foreground"><span className="font-medium">Follow-up recorded:</span> <span className="text-muted-foreground">{event.followUp}</span></p> : null}
        </Panel>

        <Panel title="Event Context">
          <dl className="divide-y divide-border">
            <KeyValue label="Source Module">{event.sourceModule}</KeyValue>
            <KeyValue label="Event Producer"><span className="font-mono text-2xs">{event.producer}</span></KeyValue>
            <KeyValue label="Action Key"><span className="font-mono text-2xs">{event.actionKey}</span></KeyValue>
            <KeyValue label="Environment"><span className="capitalize">{event.environment}</span></KeyValue>
            <KeyValue label="Occurred At">{utcFull(event.occurredAt)}</KeyValue>
            <KeyValue label="Recorded At">{utcFull(event.recordedAt)}</KeyValue>
            <KeyValue label="Request ID">{event.requestId ? <span className="font-mono text-2xs">{event.requestId}</span> : NOT_RECORDED}</KeyValue>
            <KeyValue label="Correlation ID">{event.correlationId ? <span className="font-mono text-2xs">{event.correlationId}</span> : NOT_RECORDED}</KeyValue>
          </dl>
          <div className="mt-2"><p className="text-2xs font-medium text-foreground">Reason</p><p className="text-[0.8125rem] text-muted-foreground">{event.reason ?? "No reason was recorded."}</p></div>
          {event.related.length > 0 ? (
            <div className="mt-2"><p className="text-2xs font-medium text-foreground">Related Entities</p><ul className="mt-0.5 space-y-0.5">{event.related.map((ref) => <li key={`${ref.type}:${ref.id}`} className="text-[0.8125rem]">{ref.href ? <Link href={ref.href} className="text-primary hover:underline">{ref.label}</Link> : ref.label}</li>)}</ul></div>
          ) : null}
        </Panel>
      </div>

      <div id="workflow" className="grid scroll-mt-24 grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Correlated Events" description="Events that share this workflow's correlation ID.">
          <AuditWorkflowTimeline events={workflow} currentId={event.id} back={back || undefined} />
          {sameRequest.length > 0 ? <p className="mt-2 text-2xs text-muted-foreground">{sameRequest.length} other {sameRequest.length === 1 ? "event was" : "events were"} recorded on the same request.</p> : null}
        </Panel>

        <Panel title="Technical References" description="Infrastructure detail. Hidden until you open it.">
          <Collapsible open={technicalOpen} onOpenChange={setTechnicalOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" aria-expanded={technicalOpen}>{technicalOpen ? "Hide Technical Context" : "Show Technical Context"}<ChevronDownIcon className={cn("transition-transform", technicalOpen && "rotate-180")} /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {!capabilities.canViewTechnical ? (
                <p className="text-[0.8125rem] text-muted-foreground">Restricted. Technical context needs audit and platform read access.</p>
              ) : event.technical === null ? (
                <p className="text-[0.8125rem] text-muted-foreground">No technical context was recorded.</p>
              ) : (
                <dl className="divide-y divide-border">
                  <KeyValue label="Request ID">{event.requestId ?? NOT_RECORDED}</KeyValue>
                  <KeyValue label="Correlation ID">{event.correlationId ?? NOT_RECORDED}</KeyValue>
                  <KeyValue label="Session Reference">{event.technical.sessionRef ?? NOT_RECORDED}</KeyValue>
                  <KeyValue label="Producer Service">{event.technical.producerService}</KeyValue>
                  <KeyValue label="IP Address">{event.technical.ipAddress ?? <span className="text-muted-foreground">Not Collected</span>}</KeyValue>
                  <KeyValue label="User Agent">{event.technical.userAgent ?? <span className="text-muted-foreground">Not Collected</span>}</KeyValue>
                  <KeyValue label="Ingestion">{event.technical.ingestion}</KeyValue>
                </dl>
              )}
              <p className="mt-2 text-2xs text-muted-foreground">Authorization headers, tokens and raw provider payloads are never recorded.</p>
            </CollapsibleContent>
          </Collapsible>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Investigation Links" description="Cases this event is linked to. Linking never changes the event." action={capabilities.canManageInvestigations ? <Button size="sm" variant="outline" onClick={() => setLinking(true)}>Add To Investigation</Button> : undefined}>
          {linkedInvestigations.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">Not linked to any investigation.</p>
          ) : (
            <ul className="divide-y divide-border">
              {linkedInvestigations.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-1.5">
                  <Link href={auditRoutes.investigation(item.id)} className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground hover:text-primary hover:underline">{item.id} - {item.title}</Link>
                  <Badge tone={INVESTIGATION_STATUS[item.status].tone}>{INVESTIGATION_STATUS[item.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Audit Integrity Status" description="Whether this event's storage has been verified. Presence in the demo is not proof.">
          <div className="flex items-center gap-2"><IntegrityBadge status={event.integrity.status} /></div>
          <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{event.integrity.note}</p>
          <AlertBanner tone="info" className="mt-2">Verified is shown only when a real backend supplies verifiable evidence. No checksum is displayed because none was genuinely computed.</AlertBanner>
        </Panel>
      </div>

      {linking ? <AddToInvestigationDialog event={event} onClose={() => setLinking(false)} /> : null}
      {exporting ? <ExportDialog query={{ window: ALL_TIME, eventId: event.id }} subject={`Event ${event.id}`} onClose={() => setExporting(false)} /> : null}
    </div>
  );
}
