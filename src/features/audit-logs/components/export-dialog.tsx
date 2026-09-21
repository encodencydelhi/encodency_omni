"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { MAX_EXPORT_RANGE_DAYS } from "../data/config";
import { describeError, useAuditCapabilities, useAuditMutations } from "../data/hooks";
import type { EventQuery, ExportFormat } from "../data/types";
import { utcShort } from "../lib/format";

/**
 * Export governance in one place. An export needs a reason, covers at most one bounded date
 * window, leaves out sensitive fields unless the exporter may include them, and is itself
 * recorded as an audit event. The file is built in the browser from the events matching the
 * filters; nothing is uploaded.
 */
export function ExportDialog({ query, subject, onClose }: { query: EventQuery; subject: string; onClose: () => void }) {
  const capabilities = useAuditCapabilities();
  const mutations = useAuditMutations();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [reason, setReason] = useState("");
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  const span = (Date.parse(query.window.to) - Date.parse(query.window.from)) / 86_400_000;
  const tooWide = span > MAX_EXPORT_RANGE_DAYS;
  const guard = useUnsavedGuard({ dirty: reason.trim().length > 0 && !busy, onDiscard: onClose, label: "this export reason" });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await mutations.exportEvents({ query: { ...query, page: 1, pageSize: 100000 }, format, reason, includeSensitive });
      toast.success(`${result.count} ${result.count === 1 ? "Event" : "Events"} Exported`, { description: `${result.filename} was built in your browser. The export was recorded as an audit event.` });
      onClose();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Authorized Events</DialogTitle>
            <DialogDescription>{subject} in the window {utcShort(query.window.from)} to {utcShort(query.window.to)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-[0.8125rem]">Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="flex gap-3">
              {(["csv", "json"] as const).map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 text-[0.8125rem]"><RadioGroupItem value={item} aria-label={item.toUpperCase()} />{item.toUpperCase()}</label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1">
            <Label htmlFor="export-reason" className="text-[0.8125rem]">Reason <span className="text-danger" aria-hidden>*</span></Label>
            <Textarea id="export-reason" rows={3} maxLength={300} value={reason} aria-invalid={Boolean(error?.fieldErrors.reason)} onChange={(event) => setReason(event.target.value)} placeholder="Why are these events being exported?" />
            {error?.fieldErrors.reason ? <p role="alert" className="text-2xs text-danger">{error.fieldErrors.reason}</p> : <p className="text-2xs text-muted-foreground">Recorded with the export.</p>}
          </div>
          {capabilities.canExportSensitive ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-border p-2.5 text-[0.8125rem]">
              <Checkbox className="mt-0.5" checked={includeSensitive} onCheckedChange={(value) => setIncludeSensitive(value === true)} aria-label="Include sensitive fields" />
              <span><span className="block font-medium text-foreground">Include Sensitive Fields</span><span className="block text-2xs text-muted-foreground">Actor emails, attempted identifiers, IP addresses and the values of sensitive changes. Secrets are never included.</span></span>
            </label>
          ) : null}
          <AlertBanner tone="info" title="What This Export Contains">{includeSensitive ? "Sensitive fields are included. Secrets and credentials are still never present." : "Actor emails, attempted identifiers, IP addresses and the values of sensitive changes are left out, matching what your role can see on screen."} Exports are limited to {MAX_EXPORT_RANGE_DAYS} days and are recorded as audit events. No approval service is connected in this phase.</AlertBanner>
          {tooWide ? <AlertBanner tone="warning" title="Date Range Too Wide">This window covers {Math.round(span)} days. Narrow it to {MAX_EXPORT_RANGE_DAYS} days or fewer to export.</AlertBanner> : null}
          {error && !error.fieldErrors.reason ? <AlertBanner tone="danger" title="Export Failed">{error.message}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy || tooWide || reason.trim().length < 10}>{busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}Export {format.toUpperCase()}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}
