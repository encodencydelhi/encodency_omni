"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ContactGroup } from "../types";

/* ------------------------------------------------------------------ */
/* Manage groups: create / delete                                       */
/* ------------------------------------------------------------------ */

interface ManageGroupsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: ContactGroup[];
  /** Live member counts keyed by group name. */
  counts: Record<string, number>;
  isSaving?: boolean;
  onCreate: (name: string, description: string) => void | Promise<void>;
  onDelete: (group: ContactGroup) => void | Promise<void>;
}

export function ManageGroupsDialog({ open, onClose, groups, counts, isSaving = false, onCreate, onDelete }: ManageGroupsDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const duplicate = groups.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const submit = async () => {
    if (!name.trim() || duplicate) return;
    await onCreate(name.trim(), description.trim());
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setConfirmId(null); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
          <DialogDescription>Groups segment your contacts. Deleting a group removes it from every contact.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name *" maxLength={60} />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" maxLength={120} />
          </div>
          {duplicate ? <p className="text-[12px] text-red-600">A group with this name already exists.</p> : null}
          <div className="flex justify-end">
            <Button size="sm" disabled={!name.trim() || duplicate || isSaving} onClick={() => void submit()}>Add Group</Button>
          </div>
        </div>

        <ul className="max-h-64 space-y-1.5 overflow-y-auto scrollbar-thin">
          {groups.length === 0 ? <li className="py-6 text-center text-[13px] text-slate-500">No groups yet.</li> : null}
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">{group.name}</p>
                <p className="truncate text-[12px] text-slate-500">{group.description || "No description"} · {counts[group.name] ?? 0} contact{(counts[group.name] ?? 0) === 1 ? "" : "s"}</p>
              </div>
              {confirmId === group.id ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Keep</Button>
                  <Button size="sm" variant="destructive" disabled={isSaving} onClick={() => { void onDelete(group); setConfirmId(null); }}>Delete</Button>
                </div>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label={`Delete ${group.name}`} onClick={() => setConfirmId(group.id)}><Trash2 className="size-4" /></Button>
              )}
            </li>
          ))}
        </ul>

        <DialogFooter><Button variant="outline" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Add selected contacts to groups                                      */
/* ------------------------------------------------------------------ */

interface AssignGroupsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: ContactGroup[];
  /** Short description of who is being added, e.g. "3 contacts". */
  subject: string;
  isSaving?: boolean;
  onApply: (groupNames: string[]) => void | Promise<void>;
}

/** Mount with a changing `key` so the selection resets per open. */
export function AssignGroupsDialog({ open, onClose, groups, subject, isSaving = false, onApply }: AssignGroupsDialogProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (name: string) => setPicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Group</DialogTitle>
          <DialogDescription>Add {subject} to one or more groups.</DialogDescription>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-slate-500">No groups yet. Create one from “Manage Groups”.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
            {groups.map((group) => (
              <li key={group.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <Checkbox checked={picked.includes(group.name)} onCheckedChange={() => toggle(group.name)} />
                  <span className="text-[13px] font-medium text-slate-800">{group.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={picked.length === 0 || isSaving} onClick={() => void onApply(picked)}>{isSaving ? "Adding..." : "Add to Group"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
