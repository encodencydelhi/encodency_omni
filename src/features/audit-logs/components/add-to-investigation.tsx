"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { cn } from "@/lib/utils/cn";
import { INVESTIGATION_STATUS } from "../data/config";
import { describeError, useAuditMutations, useInvestigations, useLinkCheck } from "../data/hooks";
import type { AuditEvent } from "../data/types";
import { scopeText, utcShort } from "../lib/format";
import { CreateInvestigationDrawer } from "./create-investigation";

/**
 * Adds one event to an existing investigation, or starts a new one with it. The link is a
 * separate record: the audit event itself is not modified. Duplicate links and events from
 * another company's scope are refused, and the reason is shown before anything is saved.
 */
export function AddToInvestigationDialog({ event, onClose, onDone }: { event: AuditEvent; onClose: () => void; onDone?: (investigationId: string) => void }) {
  const mutations = useAuditMutations();
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useInvestigations({ search: term || undefined, sort: "updated" });
  const check = useLinkCheck(selected || null, event.id);
  const open = (list.data?.rows ?? []).filter((row) => row.investigation.status !== "closed");
  const label = `${event.actionLabel} - ${event.target.displayName}`;

  const guard = useUnsavedGuard({ dirty: note.trim().length > 0 && !busy, onDiscard: onClose, label: "this note" });
  const link = async () => {
    setBusy(true);
    setError(null);
    try {
      await mutations.addEvents(selected, [event.id], note);
      toast.success("Event Linked", { description: `Added to ${selected}. The audit event itself was not changed.` });
      onDone?.(selected);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setBusy(false);
    }
  };

  if (creating) return <CreateInvestigationDrawer initialEventIds={[event.id]} labels={{ [event.id]: label }} defaultCompanyId={event.scope.companyId} onClose={() => { setCreating(false); onClose(); }} />;

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && !busy && guard.requestClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add To Investigation</DialogTitle>
            <DialogDescription>Link this event to a case for review. The event itself is not changed.</DialogDescription>
          </DialogHeader>
          <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem]">
            <p className="font-medium text-foreground">{event.actionLabel}</p>
            <p className="text-2xs text-muted-foreground">{event.actor.displayName} - {event.target.displayName} - {scopeText(event.scope)} - {utcShort(event.occurredAt)}</p>
          </div>
          <SearchInput value={term} onChange={setTerm} placeholder="Search case ID, title, company or owner..." aria-label="Search investigations" className="w-full" />
          <RadioGroup value={selected} onValueChange={setSelected} className="max-h-48 gap-1 overflow-y-auto scrollbar-thin" aria-label="Open investigations">
            {list.isLoading ? <p className="flex items-center gap-2 text-2xs text-muted-foreground" role="status"><Loader2Icon className="size-3 animate-spin" />Loading investigations...</p> : null}
            {!list.isLoading && open.length === 0 ? <p className="text-2xs text-muted-foreground">No open investigation matches. Create a new one instead.</p> : null}
            {open.map(({ investigation: item }) => (
              <label key={item.id} className={cn("flex cursor-pointer items-start gap-2 rounded-sm border p-2 hover:bg-accent/40", selected === item.id ? "border-primary/50 bg-primary-subtle/40" : "border-border")}>
                <RadioGroupItem value={item.id} className="mt-0.5" aria-label={`${item.id} ${item.title}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-foreground">{item.id} - {item.title}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground"><Badge tone={INVESTIGATION_STATUS[item.status].tone}>{INVESTIGATION_STATUS[item.status].label}</Badge>{scopeText(item.scope)} - {item.ownerName}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {selected ? (
            check.isLoading ? <p className="text-2xs text-muted-foreground" role="status">Checking scope and duplicates...</p>
            : check.data ? <AlertBanner tone={check.data.ok ? "success" : "warning"} title={check.data.ok ? "Can Be Linked" : check.data.duplicate ? "Already Linked" : "Cannot Be Linked"}>{check.data.message}</AlertBanner>
            : null
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="link-note" className="text-[0.8125rem]">Relevance Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="link-note" rows={2} maxLength={300} value={note} onChange={(changeEvent) => setNote(changeEvent.target.value)} placeholder="Why does this event matter to the case?" />
          </div>
          {error ? <AlertBanner tone="danger" title="Not Linked">{error}</AlertBanner> : null}
          <DialogFooter className="flex-wrap sm:justify-between">
            <Button variant="outline" onClick={() => setCreating(true)} disabled={busy}>Create New Investigation</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
              <Button onClick={() => void link()} disabled={busy || !selected || !check.data?.ok}>{busy ? <Loader2Icon className="animate-spin" /> : null}Add To Investigation</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}
