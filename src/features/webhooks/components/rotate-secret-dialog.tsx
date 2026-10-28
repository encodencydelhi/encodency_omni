/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Rotating a signing secret ends the old one at once, so it asks first (with a reason). The new secret is then shown in this
 * dialog, not only copied to the clipboard, and stays until the person confirms they saved it: it cannot be shown again.
 */

"use client";

import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyOneTimeSecret } from "../data/copy-secret";
import { Notice } from "./kit";

export function RotateSecretDialog({
  open,
  onOpenChange,
  subject,
  rotate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being rotated, e.g. "endpoint signing". Used in the title. */
  subject: string;
  /** Rotates the secret and resolves with the new one (undefined when none comes back, as in the demo workspace). */
  rotate: (reason: string) => Promise<string | undefined>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonError = touched && reason.trim().length < 3 ? "Say why the secret is being rotated (at least 3 characters)." : null;
  const showing = secret !== null;

  function finish() {
    setReason("");
    setTouched(false);
    setPending(false);
    setSecret(null);
    setCopied(false);
    setError(null);
    onOpenChange(false);
  }

  async function submit() {
    setTouched(true);
    if (reason.trim().length < 3) return;
    setPending(true);
    setError(null);
    try {
      const next = await rotate(reason.trim());
      if (next) setSecret(next);
      else finish();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The secret could not be rotated.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await copyOneTimeSecret(secret ?? "");
      setCopied(true);
    } catch {
      toast.error("Copy failed. Select the secret in the box and copy it by hand.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) onOpenChange(true); else if (!showing && !pending) finish(); }}>
      <DialogContent
        className="max-w-lg"
        showClose={!showing}
        onInteractOutside={(event) => { if (showing || pending) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (showing || pending) event.preventDefault(); }}
      >
        {showing ? (
          <>
            <DialogHeader>
              <DialogTitle>New signing secret</DialogTitle>
              <DialogDescription>Copy it now. It is shown only once and cannot be recovered. If it is lost, rotate again.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <code className="block select-all break-all rounded-sm border border-border bg-surface-sunken px-3 py-2 font-mono text-[0.8125rem]" data-testid="new-secret">{secret}</code>
              <Button variant="outline" size="sm" onClick={() => void copy()}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy secret"}
              </Button>
              <Notice tone="warning" title="The old secret no longer works">
                Update the system that receives these webhooks now. Until it uses this secret, its signature checks will fail.
              </Notice>
            </div>
            <DialogFooter>
              <Button onClick={finish}>I have saved the secret</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rotate {subject} secret?</DialogTitle>
              <DialogDescription>The current secret stops working the moment you confirm. The new one is shown once, right after.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Notice tone="warning" title="Deliveries can fail until the receiver is updated">
                Whoever receives these webhooks must switch to the new secret straight away, or their signature checks will reject every delivery.
              </Notice>
              <div className="space-y-1.5">
                <Label htmlFor="rotate-reason">Reason *</Label>
                <Textarea id="rotate-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(reasonError)} placeholder="Why is the secret being rotated?" />
                {reasonError ? <p className="text-2xs text-danger">{reasonError}</p> : null}
                {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={finish} disabled={pending}>Cancel</Button>
              <Button onClick={() => void submit()} disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                Rotate secret
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
