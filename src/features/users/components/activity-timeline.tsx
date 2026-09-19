import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { UserActivity } from "../data/types";

interface ActivityTimelineProps {
  activities: UserActivity[];
  className?: string;
}

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 italic">
        No activity recorded.
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {activities.map((act, idx) => (
        <div
          key={act.id}
          className="relative flex gap-3 py-2.5 text-xs"
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "size-2.5 rounded-full mt-1 shrink-0 ring-2 ring-white",
                act.result === "successful" ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            {idx < activities.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 mt-1" />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-800 truncate">{act.action}</span>
              <span className="text-[12px] text-slate-400 shrink-0">{formatRelativeTime(act.timestamp)}</span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{act.summary}</p>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-slate-400">
              <span className="rounded bg-slate-100 px-1.5 py-0.2">{act.companyName}</span>
              {act.clientName && (
                <>
                  <span>/</span>
                  <span>{act.clientName}</span>
                </>
              )}
              <span>·</span>
              <span className={cn(
                "flex items-center gap-0.5",
                act.result === "successful" ? "text-emerald-600" : "text-rose-600",
              )}>
                {act.result === "successful" ? (
                  <CheckCircle2Icon className="size-3" />
                ) : (
                  <XCircleIcon className="size-3" />
                )}
                {act.result}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
