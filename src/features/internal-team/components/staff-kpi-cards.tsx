"use client";

import {
  AlertTriangleIcon, Building2Icon, CheckCircle2Icon, MailIcon, ShieldAlertIcon, ShieldCheckIcon, UserCheckIcon, UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TEAM_MOCK_MODE } from "../data/config";
import type { StaffKpis } from "../data/types";

interface StaffKpiCardsProps {
  kpis: StaffKpis;
  activeFilter?: string;
  onSelectFilter?: (id: string) => void;
  className?: string;
}

export function StaffKpiCards({ kpis, activeFilter, onSelectFilter, className }: StaffKpiCardsProps) {
  const cards = [
    { id: "all", label: "TOTAL STAFF", value: kpis.totalStaff, sub: "Platform team members", icon: UsersIcon, color: "text-blue-700", iconBg: "bg-blue-50 text-blue-600 border-blue-100", activeRing: "border-blue-500 ring-2 ring-blue-500/20", tint: "border-blue-200 bg-blue-50", bar: "bg-blue-500" },
    { id: "active", label: "ACTIVE", value: kpis.activeStaff, sub: "In good standing", icon: CheckCircle2Icon, color: "text-emerald-700", iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100", activeRing: "border-emerald-500 ring-2 ring-emerald-500/20", tint: "border-emerald-200 bg-emerald-50", bar: "bg-emerald-500" },
    { id: "invited", label: "PENDING", value: kpis.pendingInvitations, sub: "Awaiting acceptance", icon: MailIcon, color: "text-sky-700", iconBg: "bg-sky-50 text-sky-600 border-sky-100", activeRing: "border-sky-500 ring-2 ring-sky-500/20", tint: "border-sky-200 bg-sky-50", bar: "bg-sky-500" },
    { id: "suspended", label: TEAM_MOCK_MODE ? "SUSPENDED" : "DEACTIVATED", value: kpis.suspendedStaff, sub: "Access revoked", icon: ShieldAlertIcon, color: "text-rose-700", iconBg: "bg-rose-50 text-rose-600 border-rose-100", activeRing: "border-rose-500 ring-2 ring-rose-500/20", tint: "border-rose-200 bg-rose-50", bar: "bg-rose-500" },
    { id: "mfa", label: "MFA ACTION", value: kpis.mfaActionRequired, sub: "Setup required", icon: ShieldCheckIcon, color: "text-amber-700", iconBg: "bg-amber-50 text-amber-600 border-amber-100", activeRing: "border-amber-500 ring-2 ring-amber-500/20", tint: "border-amber-200 bg-amber-50", bar: "bg-amber-500" },
    { id: "reviews", label: "REVIEWS DUE", value: kpis.accessReviewsDue, sub: "Access review needed", icon: AlertTriangleIcon, color: kpis.accessReviewsDue > 0 ? "text-orange-700" : "text-slate-600", iconBg: "bg-orange-50 text-orange-600 border-orange-100", activeRing: "border-orange-500 ring-2 ring-orange-500/20", tint: "border-orange-200 bg-orange-50", bar: "bg-orange-500" },
    { id: "assigned", label: "ASSIGNED", value: kpis.assignedCompanies, sub: "Companies covered", icon: Building2Icon, color: "text-violet-700", iconBg: "bg-violet-50 text-violet-600 border-violet-100", activeRing: "border-violet-500 ring-2 ring-violet-500/20", tint: "border-violet-200 bg-violet-50", bar: "bg-violet-500" },
    { id: "unassigned", label: "UNASSIGNED", value: kpis.unassignedCompanies, sub: "Need coverage", icon: UserCheckIcon, color: kpis.unassignedCompanies > 0 ? "text-rose-700" : "text-slate-600", iconBg: "bg-rose-50 text-rose-600 border-rose-100", activeRing: "border-rose-500 ring-2 ring-rose-500/20", tint: "border-rose-200 bg-rose-50", bar: "bg-rose-500" },
  ];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 items-stretch", className)}>
      {cards.map((c) => {
        const isActive = activeFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter?.(c.id)}
            className={cn(
              "group relative flex flex-col justify-between px-3 py-2 rounded-sm border text-left transition-all duration-200 cursor-pointer h-full min-h-[80px] min-w-0 shadow-2xs hover:shadow-md hover:-translate-y-0.5",
              c.tint,
              isActive && cn(c.activeRing, "shadow-sm -translate-y-0.5"),
            )}
          >
            {isActive && <span className={cn("absolute top-0 inset-x-3 h-0.5 rounded-full", c.bar)} />}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 truncate pr-1">{c.label}</span>
              <div className={cn("size-6 rounded-sm border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-2xs", c.iconBg)}>
                <c.icon className="size-3.5" />
              </div>
            </div>
            <div className={cn("text-xl font-extrabold tracking-tight leading-tight", c.color)}>{c.value}</div>
            <div className="text-xs text-slate-600 truncate flex items-center gap-1 font-medium">
              <span className="size-1 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
              <span className="truncate">{c.sub}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
