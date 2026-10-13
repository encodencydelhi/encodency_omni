import { formatRelativeTime } from "@/lib/utils/format";
import type { CrmActivity } from "../types";

/** Plain activity list. Descriptions are shown verbatim (the shared timeline rewrites punctuation). */
export function CrmTimeline({ entries, emptyLabel = "No activity yet." }: { entries: CrmActivity[]; emptyLabel?: string }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-[13px] text-slate-500">{emptyLabel}</p>;
  }
  return (
    <ol className="relative space-y-4 ps-5">
      <span className="absolute inset-y-1 left-[3px] w-px bg-border" aria-hidden />
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -start-5 size-[7px] rounded-sm border-2 border-card bg-border-strong" aria-hidden />
          <p className="text-[0.8125rem] leading-snug text-foreground">
            <span className="font-medium">{entry.actor}</span>{" "}
            <span className="text-muted-foreground">{entry.description}</span>
            {entry.oldValue && entry.newValue ? (
              <span className="text-muted-foreground"> ({entry.oldValue} → {entry.newValue})</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground">{formatRelativeTime(entry.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
