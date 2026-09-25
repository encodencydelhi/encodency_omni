"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";
import { useEvents } from "../data/hooks";
import { ALL_TIME } from "../data/filters";
import type { AuditEvent, DateWindow } from "../data/types";
import { utcShort } from "../lib/format";

export { ALL_TIME };

/**
 * Chooses audit events to link to an investigation. Linking is a separate record: choosing an
 * event here never changes the event. `labels` lets the caller show names for events chosen
 * elsewhere (an event opened from its detail page, say).
 */
export function EventPicker({ selected, onChange, labels = {}, companyId, disabledIds = [], className }: { selected: readonly string[]; onChange: (ids: string[]) => void; labels?: Record<string, string>; companyId?: string | null; disabledIds?: readonly string[]; className?: string }) {
  const [term, setTerm] = useState("");
  const query = useEvents({ window: ALL_TIME, search: term || undefined, companyId: companyId || undefined, pageSize: 8, sort: "newest", searchEmail: false });
  const [names, setNames] = useState<Record<string, string>>({});
  const set = new Set(selected);
  const label = (id: string) => labels[id] ?? names[id] ?? id;
  const toggle = (event: AuditEvent) => {
    setNames((current) => ({ ...current, [event.id]: `${event.actionLabel} - ${event.target.displayName}` }));
    onChange(set.has(event.id) ? selected.filter((id) => id !== event.id) : [...selected, event.id]);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1" aria-label="Chosen events">
        {selected.length === 0 ? <p className="text-2xs text-muted-foreground">No event chosen yet.</p> : null}
        {selected.map((id) => (
          <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-sm border border-border-strong bg-primary-subtle px-1.5 py-0.5 text-2xs font-medium text-primary">
            <span className="truncate">{label(id)}</span>
            <button type="button" onClick={() => onChange(selected.filter((item) => item !== id))} aria-label={`Remove ${label(id)}`} className="rounded-sm hover:bg-primary/10"><XIcon className="size-3" aria-hidden /></button>
          </span>
        ))}
      </div>
      <SearchInput value={term} onChange={setTerm} placeholder="Search event ID, actor, action, company or resource..." aria-label="Search audit events to link" className="w-full" />
      <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin" aria-label="Audit events">
        {query.isLoading ? <li className="flex items-center gap-2 px-3 py-2 text-2xs text-muted-foreground" role="status"><Loader2Icon className="size-3 animate-spin" />Loading events...</li> : null}
        {query.data?.rows.length === 0 ? <li className="px-3 py-2 text-2xs text-muted-foreground">No event matches this search.</li> : null}
        {query.data?.rows.map((event) => {
          const blocked = disabledIds.includes(event.id);
          return (
            <li key={event.id}>
              <label className={cn("flex items-start gap-2 px-3 py-1.5 text-[0.8125rem]", blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/50")}>
                <Checkbox className="mt-0.5" checked={set.has(event.id) || blocked} disabled={blocked} onCheckedChange={() => toggle(event)} aria-label={`${event.actionLabel}, ${event.target.displayName}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{event.actionLabel}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{event.actor.displayName} - {event.target.displayName} - {utcShort(event.occurredAt)}{blocked ? " - Already linked" : ""}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
