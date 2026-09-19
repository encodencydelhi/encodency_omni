import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  LayersIcon,
  MailIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserKpis } from "../data/types";

interface UsersKpiCardsProps {
  kpis: UserKpis;
  activeFilter?: string;
  onSelectFilter?: (filterKey: string) => void;
  className?: string;
}

export function UsersKpiCards({
  kpis,
  activeFilter,
  onSelectFilter,
  className,
}: UsersKpiCardsProps) {
  const cards = [
    {
      id: "all",
      label: "TOTAL USERS",
      value: kpis.totalUsers,
      sub: "Unique identities",
      icon: UsersIcon,
      color: "text-slate-900",
      activeBg: "border-blue-500 bg-blue-50/40",
    },
    {
      id: "active",
      label: "ACTIVE USERS",
      value: kpis.activeUsers,
      sub: "In good standing",
      icon: CheckCircle2Icon,
      color: "text-emerald-600",
      activeBg: "border-emerald-500 bg-emerald-50/40",
    },
    {
      id: "pending_invites",
      label: "PENDING INVITES",
      value: kpis.pendingInvites,
      sub: "Awaiting acceptance",
      icon: MailIcon,
      color: "text-sky-600",
      activeBg: "border-sky-500 bg-sky-50/40",
    },
    {
      id: "suspended",
      label: "SUSPENDED",
      value: kpis.suspendedUsers,
      sub: "Platform hold",
      icon: BanIcon,
      color: "text-rose-600",
      activeBg: "border-rose-500 bg-rose-50/40",
    },
    {
      id: "two_factor",
      label: "2FA ENABLED",
      value: `${kpis.twoFactorEnabled} / ${kpis.twoFactorTotal}`,
      sub: `${Math.round((kpis.twoFactorEnabled / Math.max(1, kpis.twoFactorTotal)) * 100)}% compliance`,
      icon: ShieldCheckIcon,
      color: "text-indigo-600",
      activeBg: "border-indigo-500 bg-indigo-50/40",
    },
    {
      id: "inactive_30d",
      label: "INACTIVE 30+ DAYS",
      value: kpis.inactive30PlusDays,
      sub: "No recent activity",
      icon: ClockIcon,
      color: "text-amber-600",
      activeBg: "border-amber-500 bg-amber-50/40",
    },
    {
      id: "multi_company",
      label: "MULTI-COMPANY",
      value: kpis.multiCompanyUsers,
      sub: ">1 company access",
      icon: LayersIcon,
      color: "text-purple-600",
      activeBg: "border-purple-500 bg-purple-50/40",
    },
    {
      id: "needs_attention",
      label: "NEEDS ATTENTION",
      value: kpis.needsAttentionCount,
      sub: "Action required",
      icon: AlertTriangleIcon,
      color: kpis.needsAttentionCount > 0 ? "text-amber-600" : "text-slate-500",
      activeBg: "border-amber-500 bg-amber-50/40",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-1 items-stretch", className)}>
      {cards.map((c) => {
        const isSelected = activeFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter?.(c.id)}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-lg border border-slate-200 bg-white text-left transition-all hover:border-slate-300 hover:shadow-2xs cursor-pointer h-full min-h-[96px] min-w-0",
              isSelected && c.activeBg,
            )}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                {c.label}
              </span>
              <c.icon className={cn("size-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity", c.color)} />
            </div>

            <div className={cn("text-lg font-bold tracking-tight leading-none mb-1", c.color)}>
              {c.value}
            </div>

            <div className="text-xs text-slate-500 truncate">
              {c.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}
