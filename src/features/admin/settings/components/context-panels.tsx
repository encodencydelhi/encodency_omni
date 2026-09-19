"use client";

import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Users,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";
import { OrganizationProfile, SecurityPolicy, SecuritySummary, SettingsActivityItem } from "../settings-data/types";
import { calculateOrganizationCompleteness, calculateSecurityHealth } from "../settings-data/selectors";

export function OrganizationCompletenessPanel({ profile }: { profile: OrganizationProfile }) {
  const { score, completedItems, pendingItems } = calculateOrganizationCompleteness(profile);

  return (
    <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
      {/* Header with Title and Single-line Complete Badge */}
      <div className="flex flex-col gap-1.5 pb-1 border-b border-[#F1F5F9]">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="size-3" />
            </div>
            <h4 className="text-[12px] font-bold text-[#111C3A] leading-tight">Profile Completeness</h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap shrink-0 shadow-2xs">
            {score}% Complete
          </span>
        </div>

        {/* Dynamic Gradient Progress Bar */}
        <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5 text-[10.5px]">
        <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A]">Verified Items</div>
        {completedItems.slice(0, 4).map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[#111C3A] font-semibold">
            <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0" />
            <span className="truncate">{item}</span>
          </div>
        ))}

        {pendingItems.length > 0 && (
          <>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A] pt-0.5">Recommended</div>
            {pendingItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-amber-900 font-semibold">
                <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10.5px]">
        <span className="text-[#111C3A] font-bold">Entity status</span>
        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5 text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse"></span> KYC Verified
        </span>
      </div>
    </div>
  );
}

export function SecurityHealthPanel({
  policy,
  summary,
}: {
  policy: SecurityPolicy;
  summary: SecuritySummary;
}) {
  const health = calculateSecurityHealth(policy);

  return (
    <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="size-3" />
          </div>
          <h4 className="text-[12px] font-bold text-[#111C3A] leading-tight">Security Health</h4>
        </div>
        <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0 shadow-2xs">
          Grade {health.grade} ({health.score}/100)
        </span>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 shadow-2xs">
          <div className="text-[9px] text-[#111C3A] font-bold uppercase tracking-wider">2FA Adoption</div>
          <div className="text-[14px] font-bold text-[#111C3A] mt-0.5">{summary.twoFactorAdoptionRate}%</div>
          <div className="text-[9px] text-[#10B981] font-bold">11 of 12 members</div>
        </div>
        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 shadow-2xs">
          <div className="text-[9px] text-[#111C3A] font-bold uppercase tracking-wider">Admins w/o 2FA</div>
          <div className="text-[14px] font-bold text-amber-700 mt-0.5">{summary.adminsWithout2FA}</div>
          <div className="text-[9px] text-[#111C3A] font-bold truncate">Neha Verma (SEO)</div>
        </div>
      </div>

      {/* Policy checklist */}
      <div className="space-y-1 text-[10.5px]">
        <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A]">Audit Rules</div>
        {health.checks.slice(0, 3).map((c) => (
          <div key={c.title} className="flex items-start gap-1.5 text-[#111C3A]">
            {c.status === "passed" ? (
              <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-bold truncate text-[10.5px]">{c.title}</div>
              <div className="text-[9.5px] text-[#111C3A] leading-tight font-medium">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10.5px]">
        <Link
          href="/admin/team"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2563EB] hover:underline font-bold flex items-center gap-1"
        >
          <Users className="size-3" /> View Team Roster →
        </Link>
        <Link
          href="/admin/roles"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#111C3A] hover:text-[#2563EB] font-bold text-[10px]"
        >
          Roles
        </Link>
      </div>
    </div>
  );
}

export function BrandingGuidelinesPanel() {
  return (
    <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 text-[10.5px] hover:border-[#CBD5E1] transition-all">
      <div className="flex items-center gap-2 pb-1 border-b border-[#F1F5F9]">
        <div className="size-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
          <Info className="size-3" />
        </div>
        <h4 className="text-[12px] font-bold text-[#111C3A]">Asset Guidelines</h4>
      </div>

      <div className="space-y-1.5 text-[#111C3A]">
        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 space-y-0.5 shadow-2xs">
          <div className="font-bold text-[#111C3A] text-[11px]">Logo Dimensions</div>
          <p className="text-[9.5px] text-[#111C3A] leading-normal font-medium">
            SVG or transparent PNG recommended. 400×400px square or 1200×300px horizontal. Max 2MB.
          </p>
        </div>

        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 space-y-0.5 shadow-2xs">
          <div className="font-bold text-[#111C3A] text-[11px]">Color Contrast</div>
          <p className="text-[9.5px] text-[#111C3A] leading-normal font-medium">
            Ensure primary color maintains 4.5:1 contrast against white for WCAG AA readability.
          </p>
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] text-[9.5px] text-[#111C3A] font-bold">
        Updates sync instantly across PDF reports, portals, and notifications.
      </div>
    </div>
  );
}

export function QuickActivityPanel({ activities }: { activities: SettingsActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
      <div className="flex items-center justify-between pb-1 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="size-3" />
          </div>
          <h4 className="text-[12px] font-bold text-[#111C3A]">Recent Updates</h4>
        </div>
        <span className="text-[9.5px] text-[#111C3A] font-bold bg-slate-100 px-1.5 py-0.5 rounded">Settings only</span>
      </div>

      <div className="space-y-1.5">
        {activities.slice(0, 3).map((act) => (
          <div key={act.id} className="text-[10.5px] pb-1.5 border-b border-[#F1F5F9] last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-[#111C3A] truncate">{act.user.name}</span>
              <span className="text-[9px] text-[#111C3A] font-bold shrink-0">{act.timestamp}</span>
            </div>
            <p className="text-[9.5px] text-[#111C3A] leading-snug font-medium">{act.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
