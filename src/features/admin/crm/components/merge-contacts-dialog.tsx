"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Contact } from "../types";

/** Combine two contacts: primary wins for scalar fields, lists are unioned. */
export function mergeContacts(primary: Contact, secondary: Contact): Contact {
  const uniq = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  const moreRecent = (a: string, b: string) => (a > b ? a : b);
  return {
    ...primary,
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    alternatePhone: primary.alternatePhone || secondary.alternatePhone,
    company: primary.company || secondary.company,
    role: primary.role || secondary.role,
    department: primary.department || secondary.department,
    website: primary.website || secondary.website,
    linkedIn: primary.linkedIn || secondary.linkedIn,
    location: primary.location || secondary.location,
    streetAddress: primary.streetAddress || secondary.streetAddress,
    city: primary.city || secondary.city,
    state: primary.state || secondary.state,
    zipCode: primary.zipCode || secondary.zipCode,
    country: primary.country || secondary.country,
    tags: uniq(primary.tags, secondary.tags),
    groups: uniq(primary.groups, secondary.groups),
    lastContacted: moreRecent(primary.lastContacted, secondary.lastContacted),
    nextFollowUp: primary.nextFollowUp || secondary.nextFollowUp,
    updatedAt: new Date().toISOString(),
  };
}

interface MergeContactsDialogProps {
  open: boolean;
  onClose: () => void;
  pair: [Contact, Contact] | null;
  onMerge: (merged: Contact, secondaryId: string) => void;
}

export function MergeContactsDialog({ open, onClose, pair, onMerge }: MergeContactsDialogProps) {
  const [primaryId, setPrimaryId] = useState("");

  useEffect(() => {
    if (open && pair) setPrimaryId(pair[0].id);
  }, [open, pair]);

  if (!open || !pair) return null;

  const primary = pair.find((c) => c.id === primaryId) ?? pair[0];
  const secondary = pair.find((c) => c.id !== primary.id)!;

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-xl sm:rounded-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold text-slate-800">Merge Contacts</DialogTitle>
          <DialogDescription>
            Choose the primary contact. Fields are merged — lists (tags, groups) are combined and the other contact is removed.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="gap-3 py-4">
          {pair.map((contact) => (
            <label
              key={contact.id}
              htmlFor={`merge-${contact.id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                contact.id === primaryId
                  ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <RadioGroupItem id={`merge-${contact.id}`} value={contact.id} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-blue-100 text-[12px] font-bold text-indigo-700 border border-indigo-100/50">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </span>
                  <p className="text-[13px] font-semibold text-slate-800 truncate">
                    {contact.firstName} {contact.lastName}
                  </p>
                  {contact.id === primaryId && (
                    <Badge tone="brand" className="shrink-0">Primary</Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-slate-500">
                  <span className="truncate">{contact.email || "—"}</span>
                  <span>{contact.phone || "—"}</span>
                  <span className="col-span-2 truncate">{contact.company || "—"}</span>
                </div>
                {contact.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contact.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                  </div>
                )}
              </div>
            </label>
          ))}
        </RadioGroup>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
          Merging keeps <span className="font-medium text-slate-700">“{primary.firstName} {primary.lastName}”</span> as
          the surviving record and deletes <span className="font-medium text-slate-700">“{secondary.firstName} {secondary.lastName}”</span>.
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button
            onClick={() => onMerge(mergeContacts(primary, secondary), secondary.id)}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Merge Contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
