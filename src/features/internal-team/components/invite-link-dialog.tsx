"use client";

import { CheckIcon, CopyIcon, MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { StaffInvitation } from "../data/types";

interface InviteLinkDialogProps {
  invitation: StaffInvitation | null;
  title?: string;
  onClose: () => void;
}

/** Shown right after an invitation is sent or renewed: the link is only known at that moment, so it can be copied here. */
export function InviteLinkDialog({ invitation, title = "Invitation sent", onClose }: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const link = invitation?.acceptLink ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Select it and copy manually.");
    }
  };

  return (
    <Dialog open={invitation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MailCheckIcon className="size-4 text-emerald-600" /> {title}</DialogTitle>
          <DialogDescription>
            {invitation ? `${invitation.email} was invited as ${invitation.role.replace(/_/g, " ")}. The email carries the same link; it works once and expires in 48 hours.` : ""}
          </DialogDescription>
        </DialogHeader>
        {link && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">Invitation link</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} aria-label="Invitation link" className="h-8 text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => void copy()}>
                {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">Share it directly if the email does not arrive. Anyone holding the link can create the account, so send it only to the invitee.</p>
          </div>
        )}
        <DialogFooter>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
