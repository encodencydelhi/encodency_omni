"use client";

import { ArrowRightIcon, LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { FieldChange } from "../data/types";

const KIND: Record<FieldChange["kind"], { label: string; tone: "info" | "success" | "danger" }> = {
  changed: { label: "Changed", tone: "info" },
  added: { label: "Added", tone: "success" },
  removed: { label: "Removed", tone: "danger" },
};

function Value({ text, redacted }: { text: string | null; redacted: boolean }) {
  if (redacted) return <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"><LockIcon className="size-3" aria-hidden />[REDACTED]</span>;
  if (text === null) return <span className="text-muted-foreground">Not Recorded</span>;
  return <span className="break-words text-foreground">{text}</span>;
}

function ListDetail({ change }: { change: FieldChange }) {
  if (!change.added && !change.removed) return null;
  return (
    <div className="mt-1 space-y-0.5 text-2xs">
      {change.added && change.added.length > 0 ? <p><span className="font-medium text-success">Added:</span> <span className="text-foreground">{change.added.join(", ")}</span></p> : null}
      {change.removed && change.removed.length > 0 ? <p><span className="font-medium text-danger">Removed:</span> <span className="text-foreground">{change.removed.join(", ")}</span></p> : null}
      {change.unchangedCount ? <p className="text-muted-foreground">{change.unchangedCount} unchanged</p> : null}
    </div>
  );
}

/**
 * Before and after, field by field, in words. Only fields that genuinely changed appear.
 * A field the audit record redacted stays redacted, and an event with no field-level
 * change says so instead of inventing values.
 */
export function AuditChangeDiff({ changes, className }: { changes: readonly FieldChange[]; className?: string }) {
  if (changes.length === 0) {
    return <p className={cn("rounded-sm border border-dashed border-border px-3 py-3 text-[0.8125rem] text-muted-foreground", className)}>No field-level changes were recorded for this event.</p>;
  }
  return (
    <div className={cn("overflow-hidden rounded-sm border border-border", className)}>
      <table className="w-full text-[0.8125rem]">
        <caption className="sr-only">Changed fields, previous value and new value</caption>
        <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Changed Field</th>
            <th className="px-3 py-1.5 font-medium">Previous Value</th>
            <th className="w-6" aria-hidden />
            <th className="px-3 py-1.5 font-medium">New Value</th>
            <th className="px-3 py-1.5 font-medium">Change Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {changes.map((change) => (
            <tr key={change.key} className="align-top">
              <td className="px-3 py-2 font-medium text-foreground">{change.label}</td>
              <td className="px-3 py-2"><Value text={change.before} redacted={change.redacted} /></td>
              <td className="pt-2.5 text-muted-foreground"><ArrowRightIcon className="size-3" aria-hidden /></td>
              <td className="px-3 py-2"><Value text={change.after} redacted={change.redacted} /><ListDetail change={change} /></td>
              <td className="px-3 py-2"><Badge tone={KIND[change.kind].tone}>{KIND[change.kind].label}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
