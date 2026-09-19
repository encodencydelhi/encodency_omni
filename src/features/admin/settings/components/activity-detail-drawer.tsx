"use client";

import { X } from "lucide-react";
import { SettingsActivityItem } from "../settings-data/types";

interface ActivityDetailDrawerProps {
  activity: SettingsActivityItem | null;
  onClose: () => void;
}

export function ActivityDetailDrawer({ activity, onClose }: ActivityDetailDrawerProps) {
  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#CBD5E1] p-3 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Audit Record</span>
              <h3 className="text-[13px] font-bold text-[#111C3A]">{activity.action}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* User info */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-[11px]">
                {activity.user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#111C3A] truncate">{activity.user.name}</div>
                <div className="text-[9px] text-[#64748B] truncate">{activity.user.email}</div>
              </div>
              <span className="ml-auto text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                {activity.user.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60 text-[9.5px]">
              <div>
                <span className="text-[#94A3B8] block">Timestamp</span>
                <span className="font-semibold text-[#334155]">{activity.timestamp}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Origin IP</span>
                <span className="font-mono text-[#334155] truncate block">{activity.ipAddress}</span>
              </div>
            </div>
          </div>

          {/* Diff comparison */}
          <div className="space-y-1.5">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Configuration Diff ({activity.settingName})
            </div>

            <div className="space-y-1.5 text-[10.5px]">
              <div className="p-2 rounded-lg bg-red-50/60 border border-red-200">
                <span className="text-[9px] font-bold uppercase text-red-600 block mb-0.5">Previous Value</span>
                <code className="text-red-900 font-mono text-[10.5px] break-all">{activity.previousValue}</code>
              </div>

              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-[9px] font-bold uppercase text-emerald-600 block mb-0.5">New Value</span>
                <code className="text-emerald-900 font-mono text-[10.5px] break-all">{activity.newValue}</code>
              </div>
            </div>
          </div>

          {/* Section & Reason */}
          <div className="space-y-1.5 text-[10.5px]">
            <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Settings Domain</span>
              <span className="font-bold text-[#111C3A] capitalize">{activity.section}</span>
            </div>

            {activity.reason && (
              <div className="p-2 rounded-lg bg-slate-50 border border-[#E2E8F0] space-y-0.5">
                <span className="text-[9px] font-bold uppercase text-[#94A3B8]">Audit Justification</span>
                <p className="text-[10px] text-[#475569]">{activity.reason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-[#334155] rounded-md text-[11px] font-bold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
