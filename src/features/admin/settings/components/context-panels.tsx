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
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md bg-emerald-50 text-[#10B981] flex items-center justify-center border border-emerald-200/60 shrink-0">
            <Sparkles className="size-3" />
          </div>
          <h4 className="text-[11.5px] font-bold text-[#111C3A]">Profile Completeness</h4>
        </div>
        <span className="text-[10px] font-bold text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
          {score}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#10B981] h-full rounded-full transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="space-y-1 text-[10px]">
        <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Verified Items</div>
        {completedItems.slice(0, 4).map((item) => (
          <div key={item} className="flex items-center gap-1 text-[#334155]">
            <CheckCircle2 className="size-3 text-[#10B981] shrink-0" />
            <span className="truncate">{item}</span>
          </div>
        ))}

        {pendingItems.length > 0 && (
          <>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] pt-0.5">Recommended</div>
            {pendingItems.map((item) => (
              <div key={item} className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="size-3 text-amber-500 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10px]">
        <span className="text-[#64748B]">Entity status</span>
        <span className="font-semibold text-emerald-600 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500"></span> KYC Verified
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
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200/60 shrink-0">
            <ShieldCheck className="size-3" />
          </div>
          <h4 className="text-[11.5px] font-bold text-[#111C3A]">Security Health</h4>
        </div>
        <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200">
          Grade {health.grade} ({health.score}/100)
        </span>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-1.5">
          <div className="text-[8.5px] text-[#64748B] font-medium">2FA Adoption</div>
          <div className="text-[12px] font-bold text-[#111C3A]">{summary.twoFactorAdoptionRate}%</div>
          <div className="text-[8px] text-[#10B981]">11 of 12 members</div>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-1.5">
          <div className="text-[8.5px] text-[#64748B] font-medium">Admins w/o 2FA</div>
          <div className="text-[12px] font-bold text-amber-600">{summary.adminsWithout2FA}</div>
          <div className="text-[8px] text-[#64748B]">Neha Verma (SEO)</div>
        </div>
      </div>

      {/* Policy checklist */}
      <div className="space-y-1 text-[10px]">
        <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Audit Rules</div>
        {health.checks.slice(0, 3).map((c) => (
          <div key={c.title} className="flex items-start gap-1 text-[#334155]">
            {c.status === "passed" ? (
              <CheckCircle2 className="size-3 text-[#10B981] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-3 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate">{c.title}</div>
              <div className="text-[9px] text-[#64748B] leading-tight">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10.5px]">
        <Link
          href="/admin/team"
          className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
        >
          <Users className="size-3" /> View Team Roster →
        </Link>
        <Link
          href="/admin/roles"
          className="text-[#64748B] hover:text-[#111C3A] font-medium text-[9.5px]"
        >
          Roles
        </Link>
      </div>
    </div>
  );
}

export function BrandingGuidelinesPanel() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2 text-[10.5px]">
      <div className="flex items-center gap-1.5">
        <div className="size-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
          <Info className="size-3" />
        </div>
        <h4 className="text-[11.5px] font-bold text-[#111C3A]">Asset Guidelines</h4>
      </div>

      <div className="space-y-1.5 text-[#475569]">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-1.5 space-y-0.5">
          <div className="font-semibold text-[#111C3A]">Logo Dimensions</div>
          <p className="text-[9.5px] text-[#64748B] leading-normal">
            SVG or transparent PNG recommended. 400×400px square or 1200×300px horizontal. Max 2MB.
          </p>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-1.5 space-y-0.5">
          <div className="font-semibold text-[#111C3A]">Color Contrast</div>
          <p className="text-[9.5px] text-[#64748B] leading-normal">
            Ensure primary color maintains 4.5:1 contrast against white for WCAG AA readability.
          </p>
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#F1F5F9] text-[9.5px] text-[#64748B]">
        Updates sync instantly across PDF reports, portals, and notifications.
      </div>
    </div>
  );
}

export function QuickActivityPanel({ activities }: { activities: SettingsActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
            <Clock className="size-3" />
          </div>
          <h4 className="text-[11.5px] font-bold text-[#111C3A]">Recent Updates</h4>
        </div>
        <span className="text-[9.5px] text-[#64748B]">Settings only</span>
      </div>

      <div className="space-y-1.5">
        {activities.slice(0, 3).map((act) => (
          <div key={act.id} className="text-[10.5px] pb-1.5 border-b border-[#F1F5F9] last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-semibold text-[#111C3A] truncate">{act.user.name}</span>
              <span className="text-[9px] text-[#94A3B8] shrink-0">{act.timestamp}</span>
            </div>
            <p className="text-[9.5px] text-[#64748B] leading-snug">{act.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
