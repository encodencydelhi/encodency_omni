"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, History, Search, Eye } from "lucide-react";
import type { SettingsActivityItem, SettingsSectionId } from "../settings-data/types";
import { filterActivityLogs } from "../settings-data/selectors";
import { ActivityDetailDrawer } from "./activity-detail-drawer";

const PAGE_SIZE = 15;

/** Page numbers to show: first, last, and two either side of the current page, with gaps as null. */
function pageList(current: number, total: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let p = 1; p <= total; p += 1) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

interface AuditActivitySectionProps {
  activities: SettingsActivityItem[];
}

export function AuditActivitySection({ activities }: AuditActivitySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<SettingsSectionId | "all">("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<SettingsActivityItem | null>(null);
  const [page, setPage] = useState(1);

  const people = useMemo(() => Array.from(new Set(activities.map((item) => item.user.name))).sort((a, b) => a.localeCompare(b)), [activities]);

  const filteredLogs = useMemo(() => {
    return filterActivityLogs(activities, {
      query: searchQuery,
      section: selectedSection,
      user: selectedUser,
    });
  }, [activities, searchQuery, selectedSection, selectedUser]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filteredLogs.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <History className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Organization Activity</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
                What your team did in this Company, read from the audit log (visible to Owners and Admins). Newest first.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-[#0F172A] bg-[#F1F5F9] px-3.5 py-1 rounded-lg self-start sm:self-auto border border-[#CBD5E1] whitespace-nowrap min-w-[115px] text-center shadow-2xs">
            {filteredLogs.length} audit entries
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-1.5 bg-[#F8FAFD] p-1.5 rounded-xl border border-[#DDE4ED] shadow-2xs">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search action, user, or setting..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] shadow-2xs placeholder:text-[#94A3B8] transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value as SettingsSectionId | "all");
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[11.5px] font-normal text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer shadow-2xs"
            >
              <option value="all">All Activity</option>
              <option value="organization">Organization</option>
              <option value="audit">Everything Else</option>
            </select>

            {/* User Filter */}
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[11.5px] font-normal text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer shadow-2xs"
            >
              <option value="all">Everyone</option>
              {people.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Log Table with Horizontal Scroll */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-[11px] min-w-[760px]">
            <thead className="bg-[#F8FAFD] text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#CBD5E1]">
              <tr>
                <th className="py-2.5 px-3 w-[160px] min-w-[150px] whitespace-nowrap">Administrator</th>
                <th className="py-2.5 px-3 min-w-[210px]">Action Description</th>
                <th className="py-2.5 px-3 w-[115px] whitespace-nowrap">Section</th>
                <th className="py-2.5 px-3 w-[170px] min-w-[160px] whitespace-nowrap">Key Modified</th>
                <th className="py-2.5 px-3 w-[145px] min-w-[140px] whitespace-nowrap">Time</th>
                <th className="py-2.5 px-3 w-[100px] text-right whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#64748B] font-normal text-[11px]">
                    No settings activity matches the applied filter criteria.
                  </td>
                </tr>
              ) : (
                pageRows.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] whitespace-nowrap w-[160px] min-w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <div className="size-5 rounded-full bg-slate-200 text-[#0F172A] font-semibold text-[8.5px] flex items-center justify-center shrink-0">
                          {log.user.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[125px]">{log.user.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 min-w-[210px]">
                      <span className="font-normal text-[#334155]">{log.action}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap w-[115px]">
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-medium text-[#334155] border border-[#CBD5E1]">
                        {log.section}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#64748B] font-normal whitespace-nowrap w-[170px] min-w-[160px]">
                      {log.settingName}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B] font-normal whitespace-nowrap text-[10px] w-[145px] min-w-[140px]">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap w-[100px]">
                      <button
                        type="button"
                        onClick={() => setActiveItem(log)}
                        className="text-[#2563EB] hover:underline font-semibold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
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

        {filteredLogs.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[10.5px] text-[#64748B]">
              Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </p>
            <nav className="flex items-center gap-1" aria-label="Activity pages">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 1}
                className="inline-flex h-7 items-center gap-0.5 rounded-md border border-[#CBD5E1] bg-white px-2 text-[11px] font-medium text-[#334155] disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </button>
              {pageList(current, totalPages).map((p, i) =>
                p === null ? (
                  <span key={`gap-${i}`} className="px-1 text-[11px] text-[#94A3B8]">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === current ? "page" : undefined}
                    className={`h-7 min-w-7 rounded-md border px-2 text-[11px] font-semibold ${p === current ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFD]"}`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current === totalPages}
                className="inline-flex h-7 items-center gap-0.5 rounded-md border border-[#CBD5E1] bg-white px-2 text-[11px] font-medium text-[#334155] disabled:opacity-40"
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            </nav>
          </div>
        ) : null}
        <p className="px-1 text-[10px] text-[#94A3B8]">The latest 200 entries are shown here; the full history stays in the audit log.</p>
      </section>

      {/* Drawer */}
      <ActivityDetailDrawer activity={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
