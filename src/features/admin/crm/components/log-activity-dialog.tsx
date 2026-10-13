"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityType } from "../types";

export type LoggableActivity = Extract<ActivityType, "call_logged" | "email_sent" | "meeting_scheduled" | "note_added">;

const OPTIONS: Array<{ value: LoggableActivity; label: string; verb: string }> = [
  { value: "call_logged", label: "Call", verb: "Logged a call" },
  { value: "email_sent", label: "Email", verb: "Sent an email" },
  { value: "meeting_scheduled", label: "Meeting", verb: "Logged a meeting" },
  { value: "note_added", label: "Note", verb: "Added a note" },
];

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  isSaving?: boolean;
  onSubmit: (type: LoggableActivity, description: string) => void | Promise<void>;
}

/** Mount with a changing `key` so each open starts empty. */
export function LogActivityDialog({ open, onClose, subject, isSaving = false, onSubmit }: LogActivityDialogProps) {
  const [type, setType] = useState<LoggableActivity>("call_logged");
  const [note, setNote] = useState("");
  const option = OPTIONS.find((o) => o.value === type)!;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>Record an interaction with {subject}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={type} onValueChange={(v) => setType(v as LoggableActivity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="resize-none" placeholder="What happened? (required)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!note.trim() || isSaving} onClick={() => void onSubmit(type, `${option.verb}: ${note.trim()}`)}>
            {isSaving ? "Saving..." : "Log Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
