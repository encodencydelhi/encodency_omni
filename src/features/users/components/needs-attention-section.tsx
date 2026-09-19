import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { UserAttentionItem } from "../data/types";

interface NeedsAttentionSectionProps {
  items: UserAttentionItem[];
  onActionClick?: (item: UserAttentionItem) => void;
  className?: string;
}

export function NeedsAttentionSection({
  items,
  onActionClick,
  className,
}: NeedsAttentionSectionProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0) return null;

  const handleItemAction = (item: UserAttentionItem) => {
    if (onActionClick) {
      onActionClick(item);
      return;
    }

    if (item.actionType === "review_security") {
      router.push(ROUTES.superAdmin.userSecurity);
    } else if (item.actionType === "open_user") {
      router.push(ROUTES.superAdmin.user(item.userId));
    } else if (item.actionType === "review_access") {
      router.push(`${ROUTES.superAdmin.user(item.userId)}?tab=company-access`);
    } else if (item.actionType === "resend_invite") {
      router.push(ROUTES.superAdmin.userInvitations);
    } else if (item.actionType === "transfer_ownership") {
      router.push(`${ROUTES.superAdmin.user(item.userId)}?tab=company-access`);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-4 text-amber-600 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Needs Operational Attention ({items.length})
          </h3>
          <span className="text-xs text-amber-800/80 hidden sm:inline">
            Policy gaps, lockouts & orphaned ownership
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs font-medium text-amber-800 hover:text-amber-950 cursor-pointer"
        >
          {collapsed ? "Expand Items" : "Collapse"}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {items.map((item) => {
            const isCrit = item.severity === "critical";
            return (
              <div
                key={item.id}
                className={cn(
                  "p-2.5 rounded-md border bg-white flex flex-col justify-between shadow-2xs text-xs space-y-2 min-h-[120px]",
                  isCrit
                    ? "border-rose-200"
                    : "border-amber-200",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {item.userName}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  {item.companyName && (
                    <div className="text-xs font-medium text-slate-500 truncate">
                      {item.companyName}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
                    {item.issue}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
                      isCrit ? "text-rose-600" : "text-amber-600",
                    )}
                  >
                    {isCrit ? (
                      <AlertCircleIcon className="size-3" />
                    ) : (
                      <AlertTriangleIcon className="size-3" />
                    )}
                    {item.severity}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemAction(item)}
                    className="h-6.5 text-xs px-2 gap-2 border-slate-200"
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronRightIcon className="size-3 text-slate-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
