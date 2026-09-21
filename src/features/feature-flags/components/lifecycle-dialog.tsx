"use client";

import { ArchiveIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { describeError, useFlag, useFlagCapabilities, useFlagMutations } from "../data/hooks";
import type { Environment } from "../data/types";

/**
 * Deprecates or archives a flag. Archiving is blocked while the flag is still rolled
 * out, required by another flag, or has open changes, and the blockers are listed
 * rather than hidden. It does not delete history or remove any code reference.
 */
export function LifecycleDialog({ flagKey, flagName, action, environment, onClose }: { flagKey: string; flagName: string; action: "deprecate" | "archive"; environment: Environment; onClose: () => void }) {
  const mutations = useFlagMutations();
  const capabilities = useFlagCapabilities();
  const detail = useFlag(flagKey, environment);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockers = action === "archive" ? (detail.data?.archiveBlockers ?? []) : [];
  const word = action === "archive" ? "Archive" : "Deprecate";

  const confirm = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await mutations.setLifecycle(flagKey, action, reason);
      toast.success(`${flagName} ${action === "archive" ? "Archived" : "Deprecated"}`, { description: action === "archive" ? "The flag is read-only now. History and configuration versions are kept." : "It can still run where it is enabled. Plan to retire it." });
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const guard = useUnsavedGuard({ dirty: reason.trim().length > 0 && !busy, onDiscard: onClose, label: "this reason" });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{word} {flagName}</DialogTitle>
            <DialogDescription>{action === "archive" ? "An archived flag is read-only and leaves the working list. Its history and configuration versions are kept, and no code is removed." : "A deprecated flag keeps working where it is enabled. It is marked for retirement and appears in cleanup."}</DialogDescription>
          </DialogHeader>
          {action === "archive" && detail.isLoading ? <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Checking what depends on this flag...</p> : null}
          {blockers.length > 0 ? (
            <AlertBanner tone="danger" title="Cannot Archive Yet">
              <ul className="list-disc pl-4">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
            </AlertBanner>
          ) : null}
          {!capabilities.canManageLifecycle ? <AlertBanner tone="warning" title="View Only">Changing a flag&rsquo;s lifecycle needs the flag-management and platform-write rights.</AlertBanner> : null}
          <div className="space-y-1">
            <Label htmlFor="lifecycle-reason" className="text-[0.8125rem]">Reason <span className="text-danger" aria-hidden>*</span></Label>
            <Textarea id="lifecycle-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this flag being retired?" />
          </div>
          {error ? <AlertBanner tone="danger" title={`${word} Failed`}>{error}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <Button variant={action === "archive" ? "destructive" : "default"} disabled={busy || !reason.trim() || blockers.length > 0 || detail.isLoading || !capabilities.canManageLifecycle} onClick={async () => { if (await confirm()) onClose(); }}>
              {busy ? <Loader2Icon className="animate-spin" /> : <ArchiveIcon />}
              {word} Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}
