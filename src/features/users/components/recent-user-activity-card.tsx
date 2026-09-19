import { ActivityIcon, ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { UserActivity } from "../data/types";

interface RecentUserActivityCardProps {
  activities: UserActivity[];
  onSelectEvent?: (event: UserActivity) => void;
  className?: string;
}

export function RecentUserActivityCard({
  activities,
  onSelectEvent,
  className,
}: RecentUserActivityCardProps) {
  const displayItems = activities.slice(0, 5);

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-4 text-blue-500 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Recent User Operations ({activities.length})
          </h3>
        </div>

        <Link
          href={ROUTES.superAdmin.userActivity}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>View All Activity</span>
          <ArrowRightIcon className="size-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {displayItems.length > 0 ? (
          displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectEvent?.(item)}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 rounded px-1.5 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 truncate">
                    {item.userName}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    {item.action}
                  </span>
                  <span className="text-xs rounded bg-slate-100 text-slate-600 px-1 py-0.2 truncate max-w-[130px]">
                    {item.companyName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {item.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(item.timestamp)}
                </span>
                <ChevronRightIcon className="size-3.5 text-slate-300" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 py-3 text-center italic">
            No recent activity recorded
          </div>
        )}
      </div>
    </div>
  );
}
