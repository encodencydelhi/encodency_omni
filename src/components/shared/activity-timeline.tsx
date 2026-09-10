import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

interface ActivityTimelineProps {
  entries: ActivityEntry[];
  className?: string;
}

function humaniseAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ActivityTimeline({ entries, className }: ActivityTimelineProps) {
  return (
    <ol className={cn("relative space-y-4 ps-5", className)}>
      <span className="absolute inset-y-1 left-[3px] w-px bg-border" aria-hidden />
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -start-5 size-[7px] rounded-full border-2 border-card bg-border-strong" aria-hidden />
          <p className="text-[0.8125rem] leading-snug text-foreground">
            <span className="font-medium">{entry.actor}</span>{" "}
            <span className="text-muted-foreground">{humaniseAction(entry.action).toLowerCase()}</span>{" "}
            <span className="font-medium">{entry.target}</span>
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground">{formatRelativeTime(entry.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
