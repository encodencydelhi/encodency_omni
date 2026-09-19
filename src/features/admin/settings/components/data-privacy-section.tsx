"use client";

import React, { useState } from "react";
import { Download, ShieldCheck, Clock, FileArchive, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DataPrivacySettings, DataExportRequest } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { ExportDataModal } from "./export-data-modal";

interface DataPrivacySectionProps {
  data: DataPrivacySettings;
  onChange: (partial: Partial<DataPrivacySettings>) => void;
  onRequestExport: (categories: string[]) => Promise<DataExportRequest>;
}

export function DataPrivacySection({ data, onChange, onRequestExport }: DataPrivacySectionProps) {
  const { capabilities } = useSettingsCapability();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      {/* SECTION 1: DATA RETENTION POLICIES */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
            <Clock className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Data Lifecycle & Retention Policies</h3>
            <p className="text-[10px] text-[#64748B]">
              Define automated pruning schedules for logs, historical analytics, and generated exports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Activity & Audit History
            </label>
            <select
              value={data.retention.activityHistoryRetentionDays}
              onChange={(e) =>
                onChange({
                  retention: {
                    ...data.retention,
                    activityHistoryRetentionDays: Number(e.target.value),
                  },
                })
              }
              disabled={!capabilities.canManagePrivacy}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year (Recommended)</option>
              <option value={1095}>3 years</option>
              <option value={0}>Unlimited / Indefinite</option>
            </select>
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Audit trails older than this are archived to cold storage.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Raw Analytics Timeseries
            </label>
            <select
              value={data.retention.analyticsRetentionYears}
              onChange={(e) =>
                onChange({
                  retention: {
                    ...data.retention,
                    analyticsRetentionYears: Number(e.target.value),
                  },
                })
              }
              disabled={!capabilities.canManagePrivacy}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value={1}>1 year</option>
              <option value={2}>2 years (Default)</option>
              <option value={5}>5 years</option>
              <option value={0}>Indefinite</option>
            </select>
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Cross-channel reach and follower historical data points.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Export File Auto-Purge
            </label>
            <select
              value={data.retention.exportRetentionDays}
              onChange={(e) =>
                onChange({
                  retention: {
                    ...data.retention,
                    exportRetentionDays: Number(e.target.value),
                  },
                })
              }
              disabled={!capabilities.canManagePrivacy}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days (Recommended)</option>
              <option value={30}>30 days</option>
            </select>
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Generated CSV/PDF exports expire after this window.</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-[10.5px] text-[#64748B]">
          <span className="font-bold text-[#334155]">Policy Enforcement: </span>
          Retention pruning runs daily at 02:00 AM UTC. Complies with GDPR Right-to-be-Forgotten & ISO 27001 data lifecycles.
        </div>
      </section>

      {/* SECTION 2: ORGANIZATION DATA EXPORT */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <FileArchive className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Full Archive Export</h3>
              <p className="text-[10px] text-[#64748B]">Download complete portability archives of content, CRM records, and configurations.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            disabled={!capabilities.canManagePrivacy}
            className="px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Download className="size-3" /> Request Organization Export
          </button>
        </div>

        {/* Recent Exports Table */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Recent Export Packages</div>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] text-[9.5px] font-bold uppercase text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2 px-3">Export ID</th>
                  <th className="py-2 px-3">Date Requested</th>
                  <th className="py-2 px-3">Categories</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
                {data.recentExports.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[10.5px] font-semibold text-[#111C3A]">
                      {exp.id}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{exp.requestedAt}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {exp.categories.map((c) => (
                          <span key={c} className="px-1.5 py-0.2 rounded bg-slate-100 text-[9.5px] font-medium text-[#475569]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Ready
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(
                            JSON.stringify({
                              organization: "Namo Gange Trust",
                              exportId: exp.id,
                              requestedAt: exp.requestedAt,
                              categories: exp.categories,
                            })
                          );
                          const link = document.createElement("a");
                          link.href = jsonContent;
                          link.download = `${exp.id}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-[#2563EB] hover:underline font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="size-3" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 3: PRIVACY & TELEMETRY */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center border border-emerald-200 shrink-0">
            <ShieldCheck className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Privacy, Cookies & Telemetry</h3>
            <p className="text-[10px] text-[#64748B]">Client privacy defaults, telemetry preferences, and tracking transparency.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-semibold text-[#111C3A]">Anonymize Client IP Addresses in Analytics</div>
              <p className="text-[10px] text-[#64748B]">
                Masks the last octet of visitor IP addresses before logging click tracking or form attribution.
              </p>
            </div>
            <Switch
              checked={data.privacy.anonymizeClientIpAddresses}
              onCheckedChange={(val) =>
                onChange({
                  privacy: { ...data.privacy, anonymizeClientIpAddresses: val },
                })
              }
              disabled={!capabilities.canManagePrivacy}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-semibold text-[#111C3A]">Explicit Consent Cookie Banner Default</div>
              <p className="text-[10px] text-[#64748B]">
                Enforces opt-in consent prompts on connected landing pages and website forms.
              </p>
            </div>
            <Switch
              checked={data.privacy.consentCookieBannerEnabled}
              onCheckedChange={(val) =>
                onChange({
                  privacy: { ...data.privacy, consentCookieBannerEnabled: val },
                })
              }
              disabled={!capabilities.canManagePrivacy}
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-semibold text-[#111C3A]">Share Anonymized Diagnostic Crash Reports</div>
              <p className="text-[10px] text-[#64748B]">
                Help EnCodency improve platform reliability by automatically transmitting non-identifiable client logs.
              </p>
            </div>
            <Switch
              checked={data.privacy.shareCrashReports}
              onCheckedChange={(val) =>
                onChange({
                  privacy: { ...data.privacy, shareCrashReports: val },
                })
              }
              disabled={!capabilities.canManagePrivacy}
            />
          </div>
        </div>
      </section>

      {/* Export Modal */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onRequestExport={onRequestExport}
      />
    </div>
  );
}
