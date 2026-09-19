"use client";

import React from "react";
import {
  Building2,
  Layers,
  Palette,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  Database,
  History,
  AlertTriangle,
  ChevronRight,
  Shield,
} from "lucide-react";
import { SettingsSectionId } from "../settings-data/types";
import { cn } from "@/lib/utils/cn";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface SettingsNavProps {
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  isSectionDirty: (section: SettingsSectionId) => boolean;
}

interface NavItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isDanger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "workspace", label: "Clients & Workspace", icon: Layers },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "data-privacy", label: "Data & Privacy", icon: Database },
  { id: "audit", label: "Audit & Activity", icon: History },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, isDanger: true },
];

export function SettingsNav({ activeSection, onSelectSection, isSectionDirty }: SettingsNavProps) {
  const { currentRole, switchRole } = useSettingsCapability();

  return (
    <aside className="w-full md:w-[210px] lg:w-[220px] shrink-0 space-y-2">
      {/* Navigation Card */}
      <nav className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-1.5 space-y-0.5">
        <div className="px-2.5 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Workspace Settings
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const isDirty = isSectionDirty(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                "group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer select-none",
                isActive
                  ? item.isDanger
                    ? "bg-red-50 text-red-600 font-semibold border border-red-100"
                    : "bg-blue-50/70 text-[#2563EB] font-semibold border border-blue-100"
                  : item.isDanger
                  ? "text-[#64748B] hover:text-red-600 hover:bg-red-50/50"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? item.isDanger
                        ? "text-red-600"
                        : "text-[#2563EB]"
                      : item.isDanger
                      ? "text-slate-400 group-hover:text-red-500"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {isDirty && (
                  <span
                    title="Unsaved changes in this section"
                    className="size-1.5 rounded-full bg-amber-500 animate-pulse"
                  />
                )}
                {isActive && (
                  <ChevronRight
                    className={cn("size-3.5", item.isDanger ? "text-red-500" : "text-blue-500")}
                  />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Role / Capability Switcher Box (Dev & QA Friendly) */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Shield className="size-3 text-blue-500" /> Active Role
          </span>
          <span className="text-[9.5px] font-semibold text-[#10B981] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            Verified
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => switchRole("Organization Owner")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded text-[10px] font-semibold transition-all cursor-pointer border text-center",
              currentRole === "Organization Owner"
                ? "bg-white text-[#111C3A] border-[#CBD5E1] shadow-2xs font-bold"
                : "bg-transparent text-[#64748B] border-transparent hover:bg-slate-200/60"
            )}
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => switchRole("Organization Admin")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded text-[10px] font-semibold transition-all cursor-pointer border text-center",
              currentRole === "Organization Admin"
                ? "bg-white text-[#111C3A] border-[#CBD5E1] shadow-2xs font-bold"
                : "bg-transparent text-[#64748B] border-transparent hover:bg-slate-200/60"
            )}
          >
            Admin
          </button>
        </div>
        <p className="text-[9px] text-[#94A3B8] leading-tight pt-0.5">
          {currentRole === "Organization Owner"
            ? "Full access including Transfer, Deactivation & Deletion."
            : "Admin access. High-risk danger actions are restricted to Owner."}
        </p>
      </div>
    </aside>
  );
}
