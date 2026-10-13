"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskPriority, TaskType } from "../types";

export interface TaskDialogValues {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  type: TaskType;
}

interface CrmTaskDialogProps {
  open: boolean;
  onClose: () => void;
  /** Who/what the task is linked to, e.g. "Rahul Mehta". */
  linkedTo: string;
  defaultTitle: string;
  isSaving?: boolean;
  onSubmit: (values: TaskDialogValues) => void | Promise<void>;
}

const TYPES: Array<{ value: TaskType; label: string }> = [
  { value: "follow_up", label: "Follow-up" }, { value: "call", label: "Call" }, { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" }, { value: "demo", label: "Demo" }, { value: "proposal", label: "Proposal" },
  { value: "other", label: "Other" },
];

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Mount with a changing `key` so each open starts from the defaults. */
export function CrmTaskDialog({ open, onClose, linkedTo, defaultTitle, isSaving = false, onSubmit }: CrmTaskDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(tomorrow);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskType>("follow_up");

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Create a task linked to {linkedTo}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" rows={3} className="resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-[12px] font-medium text-slate-600">Due date
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className="space-y-1 text-[12px] font-medium text-slate-600">Priority
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="block space-y-1 text-[12px] font-medium text-slate-600">Type
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!title.trim() || !dueDate || isSaving} onClick={() => void onSubmit({ title: title.trim(), description: description.trim(), dueDate, priority, type })}>
            {isSaving ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
