"use client";

import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton, StatGridSkeleton } from "@/features/companies/components/states";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { CasePriorityBadge, DemoTag, OutcomeBadge, PriorityBadge, StatusBadge } from "../components/badges";
import { AddEventsDialog, AddNoteDialog, ChangeOwnerDialog, CloseInvestigationDialog, EditRelevanceDialog } from "../components/investigation-actions";
import { AuditError } from "../components/states";
import { AUDIT_MOCK_MODE, INVESTIGATION_PRIORITY, INVESTIGATION_STATUS, auditRoutes } from "../data/config";
import { describeError, useAuditCapabilities, useAuditMutations, useInvestigation } from "../data/hooks";
import { NEXT_STATUSES } from "../data/investigation-policies";
import type { InvestigationPriority, InvestigationStatus } from "../data/types";
import { ago, plural, scopeText, utcFull, utcShort } from "../lib/format";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Linked Events" },
  { key: "timeline", label: "Investigation Timeline" },
  { key: "notes", label: "Internal Notes" },
  { key: "related", label: "Related Resources" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
type Dialog = null | { kind: "note"; correcting?: string } | { kind: "owner" } | { kind: "close" } | { kind: "events" } | { kind: "relevance"; eventId: string; initial: string } | { kind: "unlink"; eventId: string };

/**
 * One investigation. Everything here changes the case record only: linking, unlinking, noting,
 * reassigning and closing never modify an audit event, and the case never labels a person.
 */
export function InvestigationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const capabilities = useAuditCapabilities();
  const mutations = useAuditMutations();
  const query = useInvestigation(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const requested = params.get("tab");
  const tab: TabKey = TABS.find((item) => item.key === requested)?.key ?? "overview";
  const detail = query.data;

  if (query.error && !detail) return <AuditError subject="Investigation" error={query.error} onRetry={() => void query.refetch()} back={{ href: auditRoutes.investigations(), label: "Back to Investigations" }} />;
  if (!detail) return <div className="space-y-1"><StatGridSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" /><PanelSkeleton rows={6} /></div>;

  const { investigation: item, events, related } = detail;
  const closed = item.status === "closed";
  const manage = capabilities.canManageInvestigations;
  const close = () => setDialog(null);

  const attempt = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work();
      toast.success(success);
    } catch (failure) {
      toast.error("Not Changed", { description: describeError(failure).message });
    }
  };

  const menu: ActionMenuItem[] = [
    { id: "owner", label: "Change Owner", disabled: closed || !capabilities.canReassignInvestigations, onSelect: () => setDialog({ kind: "owner" }) },
    ...NEXT_STATUSES[item.status].filter((status) => status !== "closed").map((status): ActionMenuItem => ({ id: `status-${status}`, label: closed ? "Reopen Investigation" : `Set Status: ${INVESTIGATION_STATUS[status].label}`, disabled: !manage, onSelect: () => void attempt(() => mutations.changeStatus(item.id, status as InvestigationStatus), closed ? "Investigation Reopened" : `Status Set To ${INVESTIGATION_STATUS[status].label}`) })),
    ...(closed ? [] : (Object.keys(INVESTIGATION_PRIORITY) as InvestigationPriority[]).filter((priority) => priority !== item.priority).map((priority): ActionMenuItem => ({ id: `priority-${priority}`, label: `Set Priority: ${INVESTIGATION_PRIORITY[priority].label}`, disabled: !manage, separatorBefore: priority === (item.priority === "normal" ? "elevated" : "normal"), onSelect: () => void attempt(() => mutations.changePriority(item.id, priority), `Priority Set To ${INVESTIGATION_PRIORITY[priority].label}`) }))),
  ];

  return (
    <div className="space-y-3">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground"><Link href={auditRoutes.investigations()}><ArrowLeftIcon />Investigations</Link></Button>
        <PageHeader
          title={item.title}
          description={item.description || "No description was written for this investigation."}
          meta={
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground">{item.id}</span>
              <StatusBadge status={item.status} />
              <CasePriorityBadge priority={item.priority} />
              <span className="text-2xs text-muted-foreground">Owner {item.ownerName} - Created {utcShort(item.createdAt)} - Updated {ago(item.updatedAt)}</span>
              {AUDIT_MOCK_MODE ? <DemoTag>Demo Investigation</DemoTag> : null}
            </div>
          }
          actions={
            <>
              <Button variant="outline" size="sm" disabled={closed || !manage} onClick={() => setDialog({ kind: "events" })}><PlusIcon />Add Event</Button>
              <Button variant="outline" size="sm" disabled={closed || !manage} onClick={() => setDialog({ kind: "note" })}>Add Note</Button>
              {!closed ? <Button variant="outline" size="sm" disabled={!capabilities.canCloseInvestigations} onClick={() => setDialog({ kind: "close" })}>Close Investigation</Button> : null}
              <ActionMenu label="More Actions" items={menu} />
            </>
          }
        />
      </div>

      {closed && item.closure ? <AlertBanner tone="success" title="Investigation Closed">{item.closure.reason}. {item.closure.conclusion} Closed by {item.closure.closedBy}{item.closedAt ? `, ${utcShort(item.closedAt)}` : ""}. The linked audit events were not changed.</AlertBanner> : null}

      <nav aria-label="Investigation sections" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {TABS.map((entry) => (
            <li key={entry.key}>
              <Link href={`${auditRoutes.investigation(item.id)}${entry.key === "overview" ? "" : `?tab=${entry.key}`}`} aria-current={entry.key === tab ? "page" : undefined} className={cn("relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors", entry.key === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {entry.label}
                {entry.key === "events" ? <span className="ml-1.5 rounded-sm bg-muted px-1 text-2xs tabular text-muted-foreground">{item.links.length}</span> : null}
                {entry.key === tab ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <Panel title="Case Overview">
            <dl className="divide-y divide-border">
              <KeyValue label="Case ID"><span className="font-mono text-2xs">{item.id}</span></KeyValue>
              <KeyValue label="Scope">{scopeText(item.scope)}</KeyValue>
              <KeyValue label="Internal Owner">{item.ownerName}</KeyValue>
              <KeyValue label="Priority"><CasePriorityBadge priority={item.priority} /></KeyValue>
              <KeyValue label="Current Status"><StatusBadge status={item.status} /></KeyValue>
              <KeyValue label="Linked Events">{item.links.length}</KeyValue>
              <KeyValue label="Created By">{item.createdBy}</KeyValue>
              <KeyValue label="Created At">{utcFull(item.createdAt)}</KeyValue>
              <KeyValue label="Last Updated">{utcFull(item.updatedAt)}</KeyValue>
              <KeyValue label="Related Reference">{item.relatedReference ?? <span className="text-muted-foreground">None</span>}</KeyValue>
            </dl>
          </Panel>
          <Panel title="What This Case Is">
            <p className="text-[0.8125rem] text-muted-foreground">An investigation groups audit events for review. It is not a confirmed security incident, it makes no finding about anyone, and it is not a support ticket.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-2xs text-muted-foreground">
              <li>Linking an event adds a record to this case. The audit event is never edited.</li>
              <li>Owning a case does not grant access to company data.</li>
              <li>Notes are internal and append-only; a correction is a new note.</li>
              <li>No incident or ticket is linked, because no incident-management system is connected.</li>
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "events" ? (
        <Panel title="Linked Events" description="Events linked to this case, with why each one matters. Removing a link never deletes the event." flush action={!closed && manage ? <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "events" })}><PlusIcon />Add Audit Events</Button> : undefined}>
          <MiniTable
            caption="Linked audit events"
            rows={events}
            getKey={(row) => row.link.eventId}
            onRowClick={(row) => row.event && router.push(auditRoutes.event(row.link.eventId))}
            empty={<EmptyState icon={PlusIcon} size="sm" title="No Events Linked" description="Add audit events to start building the case." />}
            columns={[
              { id: "time", header: "Timestamp", cell: (row) => <span className="whitespace-nowrap text-2xs tabular">{row.event ? utcShort(row.event.occurredAt) : "-"}</span> },
              { id: "actor", header: "Actor", hideBelow: "md", cell: (row) => row.event?.actor.displayName ?? "-" },
              { id: "action", header: "Action", cell: (row) => (row.event ? <Link href={auditRoutes.event(row.link.eventId)} onClick={(click) => click.stopPropagation()} className="font-medium text-foreground hover:text-primary hover:underline">{row.event.actionLabel}</Link> : <span className="text-muted-foreground">Event Unavailable ({row.link.eventId})</span>) },
              { id: "target", header: "Target", hideBelow: "lg", cell: (row) => row.event?.target.displayName ?? "-" },
              { id: "outcome", header: "Outcome", cell: (row) => (row.event ? <OutcomeBadge outcome={row.event.outcome} /> : null) },
              { id: "priority", header: "Review Priority", hideBelow: "lg", cell: (row) => (row.event ? <PriorityBadge priority={row.event.priority} /> : null) },
              { id: "note", header: "Relevance Note", hideBelow: "md", cell: (row) => <span className="block max-w-56 truncate text-2xs text-muted-foreground" title={row.link.note}>{row.link.note || "None"}</span> },
              {
                id: "actions",
                header: <span className="sr-only">Actions</span>,
                align: "right",
                cell: (row) => (
                  <span onClick={(click) => click.stopPropagation()}>
                    <ActionMenu
                      label={`Actions for ${row.event?.actionLabel ?? row.link.eventId}`}
                      items={[
                        { id: "open", label: "Open Event", disabled: !row.event, onSelect: () => router.push(auditRoutes.event(row.link.eventId)) },
                        { id: "workflow", label: "View Workflow", disabled: !row.event?.correlationId, onSelect: () => router.push(`${auditRoutes.event(row.link.eventId)}#workflow`) },
                        { id: "relevance", label: "Edit Relevance Note", disabled: closed || !manage, onSelect: () => setDialog({ kind: "relevance", eventId: row.link.eventId, initial: row.link.note }) },
                        { id: "unlink", label: "Remove Event Link", variant: "destructive", disabled: closed || !manage, separatorBefore: true, onSelect: () => setDialog({ kind: "unlink", eventId: row.link.eventId }) },
                      ]}
                    />
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "timeline" ? (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <Panel title="Case Activity" description="What has been done to this case, newest first. Separate from the audit events themselves.">
            <ol className="space-y-2" aria-label="Case activity">
              {[...item.activity].reverse().map((entry) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] text-foreground">{entry.summary}</p>
                    <p className="text-2xs text-muted-foreground">{entry.actor} - {utcShort(entry.at)}{entry.context ? ` - ${entry.context}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Event Sequence" description="The linked audit events in the order they occurred.">
            {events.filter((row) => row.event).length === 0 ? (
              <p className="text-[0.8125rem] text-muted-foreground">No linked event to sequence.</p>
            ) : (
              <ol className="space-y-2" aria-label="Linked event sequence">
                {events.filter((row) => row.event).sort((a, b) => Date.parse(a.event?.occurredAt ?? "") - Date.parse(b.event?.occurredAt ?? "")).map((row) => (
                  <li key={row.link.eventId} className="flex gap-2">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-info/70" aria-hidden />
                    <div className="min-w-0">
                      <Link href={auditRoutes.event(row.link.eventId)} className="text-[0.8125rem] font-medium text-foreground hover:text-primary hover:underline">{row.event?.actionLabel}</Link>
                      <p className="text-2xs text-muted-foreground">{utcShort(row.event?.occurredAt ?? "")} - {row.event?.actor.displayName} - {row.event?.target.displayName}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "notes" ? (
        <Panel title="Internal Notes" description="Internal only. Never shown to Company Admin users. Notes are append-only: a correction is a new note." action={!closed && manage ? <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "note" })}>Add Note</Button> : undefined}>
          {item.notes.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {item.notes.map((note) => (
                <li key={note.id} className="rounded-sm border border-border p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground"><span className="font-medium text-foreground">{note.author}{note.type === "correction" ? " - Correction" : ""}</span><span>{utcShort(note.at)}</span></div>
                  <p className="mt-1 whitespace-pre-wrap text-[0.8125rem] text-foreground">{note.text}</p>
                  {note.correctsNoteId ? <p className="mt-1 text-2xs text-muted-foreground">Corrects an earlier note. The original is unchanged.</p> : null}
                  {!closed && manage && note.type === "note" ? <Button size="sm" variant="ghost" className="mt-1 -ml-2" onClick={() => setDialog({ kind: "note", correcting: note.id })}>Add Correction</Button> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "related" ? (
        <Panel title="Related Resources" description="Resources the linked events point at, where a live one exists.">
          {related.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No related resource is available for the linked events.</p>
          ) : (
            <ul className="divide-y divide-border">
              {related.map((ref) => (
                <li key={`${ref.type}:${ref.id}`} className="flex items-center gap-2 py-1.5 text-[0.8125rem]">
                  <span className="min-w-0 flex-1 truncate">{ref.href ? <Link href={ref.href} className="font-medium text-foreground hover:text-primary hover:underline">{ref.label}</Link> : ref.label}</span>
                  <span className="text-2xs capitalize text-muted-foreground">{ref.type.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {dialog?.kind === "note" ? <AddNoteDialog investigation={item} correcting={dialog.correcting ?? null} onClose={close} /> : null}
      {dialog?.kind === "owner" ? <ChangeOwnerDialog investigation={item} onClose={close} /> : null}
      {dialog?.kind === "close" ? <CloseInvestigationDialog investigation={item} onClose={close} /> : null}
      {dialog?.kind === "events" ? <AddEventsDialog investigation={item} onClose={close} /> : null}
      {dialog?.kind === "relevance" ? <EditRelevanceDialog investigation={item} eventId={dialog.eventId} initial={dialog.initial} onClose={close} /> : null}
      <ConfirmDialog
        open={dialog?.kind === "unlink"}
        onOpenChange={(open) => !open && close()}
        title="Remove Event Link?"
        description="Only the link to this investigation is removed. The audit event is not deleted or changed."
        confirmLabel="Remove Link"
        variant="destructive"
        onConfirm={() => { const target = dialog; close(); if (target?.kind === "unlink") void attempt(() => mutations.unlinkEvent(item.id, target.eventId), "Event Link Removed"); }}
      />
      <p className="text-2xs text-muted-foreground">{plural(item.links.length, "event")} linked - opened {ago(item.createdAt)}.</p>
    </div>
  );
}
