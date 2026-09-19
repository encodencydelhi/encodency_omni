"use client";

import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Protects unsaved work in users module drawers and dialogs.
 *
 * While `dirty`:
 *  - closing (Esc, overlay, Cancel, X) asks Stay / Discard / Save & leave,
 *  - the browser Back button asks the same question instead of silently
 *    discarding, and
 *  - closing the tab shows the browser's own prompt.
 */
export function useUnsavedGuard({
  dirty,
  onDiscard,
  onSave,
  label = "this form",
}: {
  dirty: boolean;
  onDiscard: () => void;
  onSave?: () => Promise<boolean>;
  label?: string;
}): { requestClose: () => void; guardDialog: ReactNode } {
  const [prompting, setPrompting] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) setPrompting(true);
    else onDiscard();
  }, [onDiscard]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    window.history.pushState({ unsavedGuard: true }, "");
    const onPopState = () => {
      if (!dirtyRef.current) return;
      window.history.pushState({ unsavedGuard: true }, "");
      setPrompting(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dirty]);

  const guardDialog = (
    <Dialog open={prompting} onOpenChange={(open) => !open && !saving && setPrompting(false)}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-amber-100 text-amber-600">
              <AlertTriangleIcon className="size-4" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>You have unsaved changes</DialogTitle>
              <DialogDescription>
                Changes to {label} have not been saved. Leaving now discards them.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPrompting(false)} disabled={saving}>
            Stay
          </Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={() => {
              setPrompting(false);
              onDiscard();
            }}
          >
            Discard
          </Button>
          {onSave ? (
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const saved = await onSave();
                setSaving(false);
                setPrompting(false);
                if (saved) onDiscard();
              }}
            >
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Save &amp; leave
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestClose, guardDialog };
}
