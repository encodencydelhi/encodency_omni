"use client";

import type React from "react";
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
    <aside className="w-full md:w-[215px] lg:w-[225px] shrink-0 space-y-2">
      {/* Navigation Card */}
      <nav className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-1.5 space-y-0.5 hover:border-[#CBD5E1] transition-all">
        <div className="px-2.5 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-[#101A3D] flex items-center justify-between border-b border-[#F1F5F9] mb-1">
          <span>Workspace Settings</span>
          <span className="size-1.5 rounded-full bg-blue-600"></span>
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
                "group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer select-none",
                isActive
                  ? item.isDanger
                    ? "bg-red-50 text-red-600 font-bold border border-red-200 shadow-2xs"
                    : "bg-gradient-to-r from-blue-50/90 to-indigo-50/40 text-[#2563EB] font-bold border border-blue-200/90 shadow-2xs relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#2563EB] before:rounded-r"
                  : item.isDanger
                  ? "text-[#101A3D] font-semibold hover:text-red-600 hover:bg-red-50/50"
                  : "text-[#101A3D] font-semibold hover:text-[#2563EB] hover:bg-[#F8FAFD]"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "size-5 rounded-md flex items-center justify-center transition-colors shrink-0",
                    isActive
                      ? item.isDanger
                        ? "bg-white text-red-600 shadow-2xs"
                        : "bg-white text-[#2563EB] shadow-2xs"
                      : "text-[#101A3D] group-hover:text-[#2563EB]"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
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

      {/* Role / Capability Switcher Box */}
      <div className="bg-gradient-to-br from-[#F8FAFD] to-[#F1F5F9] border border-[#DDE4ED] rounded-xl p-2.5 text-[11px] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-[#101A3D]">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <Shield className="size-3 text-blue-600" /> Active Role
          </span>
          <span className="text-[9.5px] font-bold text-[#059669] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
            Verified
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => switchRole("Organization Owner")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-[10px] transition-all cursor-pointer border text-center font-bold",
              currentRole === "Organization Owner"
                ? "bg-white text-[#101A3D] border-[#CBD5E1] shadow-xs"
                : "bg-transparent text-[#101A3D] border-transparent hover:bg-slate-200/70"
            )}
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => switchRole("Organization Admin")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-[10px] transition-all cursor-pointer border text-center font-bold",
              currentRole === "Organization Admin"
                ? "bg-white text-[#101A3D] border-[#CBD5E1] shadow-xs"
                : "bg-transparent text-[#101A3D] border-transparent hover:bg-slate-200/70"
            )}
          >
            Admin
          </button>
        </div>
        <p className="text-[9px] text-[#101A3D] font-semibold leading-tight pt-0.5">
          {currentRole === "Organization Owner"
            ? "Full access including Transfer, Deactivation & Deletion."
            : "Admin access. High-risk danger actions are restricted to Owner."}
        </p>
      </div>
    </aside>
  );
}
