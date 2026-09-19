"use client";

import { useState, useMemo } from "react";
import { History, Search, Eye } from "lucide-react";
import { SettingsActivityItem, SettingsSectionId } from "../settings-data/types";
import { filterActivityLogs } from "../settings-data/selectors";
import { ActivityDetailDrawer } from "./activity-detail-drawer";

interface AuditActivitySectionProps {
  activities: SettingsActivityItem[];
}

export function AuditActivitySection({ activities }: AuditActivitySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<SettingsSectionId | "all">("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<SettingsActivityItem | null>(null);

  const filteredLogs = useMemo(() => {
    return filterActivityLogs(activities, {
      query: searchQuery,
      section: selectedSection,
      user: selectedUser,
    });
  }, [activities, searchQuery, selectedSection, selectedUser]);

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <History className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Settings Configuration Audit Trail</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Immutable record of administrative setting changes, policy modifications, and domain adjustments.
              </p>
            </div>
          </div>
          <span className="text-[9.5px] font-bold text-[#111C3A] bg-slate-100 px-2 py-0.5 rounded self-start sm:self-auto border border-[#CBD5E1]">
            {filteredLogs.length} audit entries
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-1.5 bg-[#F8FAFC] p-1.5 rounded-lg border border-[#CBD5E1]">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#111C3A]" />
            <input
              type="text"
              placeholder="Search action, user, or setting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-7 pr-2 rounded-md border border-[#CBD5E1] bg-white text-[11px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value as any)}
              className="h-7 px-2 rounded-md border border-[#CBD5E1] bg-white text-[10.5px] font-bold text-[#111C3A] focus:outline-none cursor-pointer"
            >
              <option value="all">All Sections</option>
              <option value="organization">Organization</option>
              <option value="workspace">Workspace</option>
              <option value="branding">Branding</option>
              <option value="notifications">Notifications</option>
              <option value="security">Security</option>
              <option value="preferences">Preferences</option>
              <option value="data-privacy">Data & Privacy</option>
              <option value="danger">Danger Zone</option>
            </select>

            {/* User Filter */}
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-7 px-2 rounded-md border border-[#CBD5E1] bg-white text-[10.5px] font-bold text-[#111C3A] focus:outline-none cursor-pointer"
            >
              <option value="all">All Administrators</option>
              <option value="Manish">Manish Sirohi (Owner)</option>
              <option value="Priya">Priya Sharma</option>
              <option value="Amit">Amit Singh</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#F8FAFC] text-[9px] font-bold uppercase text-[#111C3A] border-b border-[#CBD5E1]">
              <tr>
                <th className="py-2 px-2.5">Administrator</th>
                <th className="py-2 px-2.5">Action Description</th>
                <th className="py-2 px-2.5">Section</th>
                <th className="py-2 px-2.5 hidden sm:table-cell">Key Modified</th>
                <th className="py-2 px-2.5">Time</th>
                <th className="py-2 px-2.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#111C3A]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#111C3A] font-semibold text-[10.5px]">
                    No settings activity matches the applied filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-2.5 font-bold text-[#111C3A] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="size-5 rounded-full bg-slate-200 text-[#111C3A] font-bold text-[8.5px] flex items-center justify-center shrink-0">
                          {log.user.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[120px]">{log.user.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2.5">
                      <span className="font-semibold text-[#111C3A]">{log.action}</span>
                    </td>
                    <td className="py-2 px-2.5">
                      <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 text-[9px] font-bold text-[#111C3A] border border-[#CBD5E1]">
                        {log.section}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[9.5px] text-[#111C3A] font-medium hidden sm:table-cell truncate max-w-[140px]">
                      {log.settingName}
                    </td>
                    <td className="py-2 px-2.5 text-[#111C3A] font-medium whitespace-nowrap text-[10px]">{log.timestamp}</td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveItem(log)}
                        className="text-[#2563EB] hover:underline font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="size-3" /> View Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drawer */}
      <ActivityDetailDrawer activity={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
