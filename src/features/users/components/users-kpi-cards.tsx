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
      valueColor: "text-slate-900",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      activeRing: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30",
      accentBar: "bg-blue-500",
    },
    {
      id: "active",
      label: "ACTIVE USERS",
      value: kpis.activeUsers,
      sub: "In good standing",
      icon: CheckCircle2Icon,
      valueColor: "text-emerald-700",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      activeRing: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30",
      accentBar: "bg-emerald-500",
    },
    {
      id: "pending_invites",
      label: "PENDING INVITES",
      value: kpis.pendingInvites,
      sub: "Awaiting join",
      icon: MailIcon,
      valueColor: "text-sky-700",
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
      activeRing: "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/30",
      accentBar: "bg-sky-500",
    },
    {
      id: "suspended",
      label: "SUSPENDED",
      value: kpis.suspendedUsers,
      sub: "Platform hold",
      icon: BanIcon,
      valueColor: "text-rose-700",
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      activeRing: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30",
      accentBar: "bg-rose-500",
    },
    {
      id: "two_factor",
      label: "2FA ENABLED",
      value: `${kpis.twoFactorEnabled}/${kpis.twoFactorTotal}`,
      sub: `${Math.round((kpis.twoFactorEnabled / Math.max(1, kpis.twoFactorTotal)) * 100)}% coverage`,
      icon: ShieldCheckIcon,
      valueColor: "text-indigo-700",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      activeRing: "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30",
      accentBar: "bg-indigo-500",
    },
    {
      id: "inactive_30d",
      label: "INACTIVE 30D+",
      value: kpis.inactive30PlusDays,
      sub: "No recent login",
      icon: ClockIcon,
      valueColor: "text-amber-700",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      activeRing: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30",
      accentBar: "bg-amber-500",
    },
    {
      id: "multi_company",
      label: "MULTI-COMPANY",
      value: kpis.multiCompanyUsers,
      sub: ">1 membership",
      icon: LayersIcon,
      valueColor: "text-purple-700",
      iconBg: "bg-purple-50 text-purple-600 border-purple-100",
      activeRing: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/30",
      accentBar: "bg-purple-500",
    },
    {
      id: "needs_attention",
      label: "ATTENTION",
      value: kpis.needsAttentionCount,
      sub: "Action required",
      icon: AlertTriangleIcon,
      valueColor: kpis.needsAttentionCount > 0 ? "text-amber-700" : "text-slate-600",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      activeRing: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30",
      accentBar: "bg-amber-500",
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
              "group relative flex flex-col justify-between p-3 rounded-xl border bg-gradient-to-b from-white to-slate-50/60 text-left transition-all duration-200 cursor-pointer h-full min-h-[104px] min-w-0 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5",
              isSelected
                ? cn(c.activeRing, "shadow-sm -translate-y-0.5")
                : "border-slate-200/90",
            )}
          >
            {/* Top Accent line indicator when active */}
            {isSelected && (
              <span className={cn("absolute top-0 inset-x-3 h-0.5 rounded-full", c.accentBar)} />
            )}

            {/* Header: Label + Stylish Icon Container */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate pr-1">
                {c.label}
              </span>
              <div
                className={cn(
                  "size-6 rounded-md border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-2xs",
                  c.iconBg,
                )}
              >
                <c.icon className="size-3.5" />
              </div>
            </div>

            {/* Value */}
            <div className={cn("text-xl font-extrabold tracking-tight leading-tight my-0.5", c.valueColor)}>
              {c.value}
            </div>

            {/* Subtitle */}
            <div className="text-xs text-slate-500 truncate flex items-center gap-1 font-medium">
              <span className="size-1 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
              <span className="truncate">{c.sub}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
