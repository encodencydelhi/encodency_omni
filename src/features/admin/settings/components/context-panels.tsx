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
import { OrganizationProfile, SecuritySummary, SettingsActivityItem } from "../settings-data/types";
import { calculateOrganizationCompleteness } from "../settings-data/selectors";

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
            <h4 className="text-[12px] font-bold text-[#0F172A] leading-tight">Profile Completeness</h4>
          </div>
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap shrink-0 shadow-2xs">
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
        <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">Verified Items</div>
        {completedItems.slice(0, 4).map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[#334155] font-normal">
            <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0" />
            <span className="truncate">{item}</span>
          </div>
        ))}

        {pendingItems.length > 0 && (
          <>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-amber-800 pt-0.5">Recommended</div>
            {pendingItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-amber-900 font-normal">
                <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </>
        )}
      </div>

    </div>
  );
}

/** Checks computed from the Company's real members (never from sample numbers or device-only toggles). */
function securityChecks(summary: SecuritySummary): { title: string; status: "passed" | "warning" | "failed"; detail: string }[] {
  const withoutTwoFactor = Math.max(0, summary.members - summary.twoFactorEnabled);
  return [
    {
      title: "Everyone Uses 2FA",
      status: summary.members > 0 && withoutTwoFactor === 0 ? "passed" : "warning",
      detail: withoutTwoFactor === 0 ? "Every active member signs in with two-factor." : `${withoutTwoFactor} active ${withoutTwoFactor === 1 ? "member has" : "members have"} not set up 2FA.`,
    },
    {
      title: "Owners & Admins Protected",
      status: summary.privilegedWithoutTwoFactor === 0 ? "passed" : "failed",
      detail: summary.privilegedWithoutTwoFactor === 0 ? "All Owners and Admins use 2FA." : `${summary.privilegedWithoutTwoFactor} of ${summary.privilegedMembers} Owners and Admins have no 2FA.`,
    },
    {
      title: "No Suspended Access",
      status: summary.suspended === 0 ? "passed" : "warning",
      detail: summary.suspended === 0 ? "Nobody is suspended." : `${summary.suspended} ${summary.suspended === 1 ? "member is" : "members are"} suspended and cannot sign in.`,
    },
  ];
}

export function SecurityHealthPanel({ summary }: { summary: SecuritySummary }) {
  const checks = summary.available ? securityChecks(summary) : [];
  const passed = checks.filter((check) => check.status === "passed").length;

  return (
    <div className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="size-3" />
          </div>
          <h4 className="text-[12px] font-bold text-[#0F172A] leading-tight">Security Health</h4>
        </div>
        <span className="text-[10px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0 shadow-2xs">
          {summary.available ? `${passed} Of ${checks.length} Checks Passed` : "Owners & Admins Only"}
        </span>
      </div>

      {!summary.available ? (
        <p className="text-[10.5px] text-[#64748B] font-normal leading-snug">
          Only Owners and Admins can see how well the team is protected. Ask one of them, or open Team to see who has access.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 shadow-2xs">
              <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">2FA Adoption</div>
              <div className="text-[14px] font-bold text-[#0F172A] mt-0.5">{summary.twoFactorRate}%</div>
              <div className="text-[9px] text-[#10B981] font-semibold">
                {summary.twoFactorEnabled} of {summary.members} members
              </div>
            </div>
            <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 shadow-2xs">
              <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Admins W/O 2FA</div>
              <div className={`text-[14px] font-bold mt-0.5 ${summary.privilegedWithoutTwoFactor > 0 ? "text-amber-700" : "text-[#0F172A]"}`}>{summary.privilegedWithoutTwoFactor}</div>
              <div className="text-[9px] text-[#64748B] font-normal truncate">of {summary.privilegedMembers} Owners &amp; Admins</div>
            </div>
          </div>

          <div className="space-y-1 text-[10.5px]">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B]">Checks</div>
            {checks.map((check) => (
              <div key={check.title} className="flex items-start gap-1.5 text-[#334155]">
                {check.status === "passed" ? <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" /> : <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <div className="font-semibold text-[#0F172A] truncate text-[10.5px]">{check.title}</div>
                  <div className="text-[9.5px] text-[#64748B] leading-tight font-normal">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10.5px]">
        <Link href="/admin/team" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1">
          <Users className="size-3" /> View Team Roster →
        </Link>
        <Link href="/admin/roles" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-[#2563EB] font-medium text-[10px]">
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
        <h4 className="text-[12px] font-bold text-[#0F172A]">Asset Guidelines</h4>
      </div>

      <div className="space-y-1.5">
        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 space-y-0.5 shadow-2xs">
          <div className="font-semibold text-[#1E293B] text-[11px]">Logo Dimensions</div>
          <p className="text-[9.5px] text-[#64748B] leading-normal font-normal">
            SVG or transparent PNG recommended. 400×400px square or 1200×300px horizontal. Max 2MB.
          </p>
        </div>

        <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2 space-y-0.5 shadow-2xs">
          <div className="font-semibold text-[#1E293B] text-[11px]">Color Contrast</div>
          <p className="text-[9.5px] text-[#64748B] leading-normal font-normal">
            Ensure primary color maintains 4.5:1 contrast against white for WCAG AA readability.
          </p>
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] text-[9.5px] text-[#64748B] font-normal">
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
          <h4 className="text-[12px] font-bold text-[#0F172A]">Recent Updates</h4>
        </div>
        <span className="text-[9.5px] text-[#64748B] font-medium bg-slate-100 px-1.5 py-0.5 rounded">From Audit Log</span>
      </div>

      <div className="space-y-1.5">
        {activities.slice(0, 3).map((act) => (
          <div key={act.id} className="text-[10.5px] pb-1.5 border-b border-[#F1F5F9] last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-semibold text-[#0F172A] truncate">{act.user.name}</span>
              <span className="text-[9px] text-[#64748B] font-normal shrink-0">{act.timestamp}</span>
            </div>
            <p className="text-[9.5px] text-[#64748B] leading-snug font-normal">{act.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
