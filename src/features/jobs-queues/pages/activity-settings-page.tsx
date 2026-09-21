"use client";

import { useState } from "react";
import { SettingsIcon, ActivityIcon, ShieldIcon, DatabaseIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { useJobsOverview } from "../data/hooks";
import { MOCK_ENVIRONMENT, MOCK_DATA_SOURCE } from "../data/config";

export function ActivitySettingsPage() {
  const { data: overview, isLoading } = useJobsOverview();

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Activity & Settings</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational activity log and global processing configuration.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2 mb-4">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Data Source:</span>
        <span>{MOCK_DATA_SOURCE}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <ActivityIcon className="size-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Operational Activity Log</h2>
            </div>
            
            {isLoading || !overview ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-slate-50 rounded-sm animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-0 max-h-[600px] overflow-y-auto">
                {overview.recentActivity.map((act) => (
                  <div key={act.id} className="flex flex-col py-3 px-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-sm transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{act.details}</span>
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wider",
                        act.result === "success" ? "bg-emerald-50 text-emerald-700" :
                        act.result === "failure" ? "bg-red-50 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      )}>{act.result}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        {act.jobId && <span className="font-mono">Job: {act.jobId}</span>}
                        {act.queue && <span>Queue: {act.queue}</span>}
                      </div>
                      <span title={formatDateTime(act.timestamp)}>{formatRelativeTime(act.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="size-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Global Queue Configuration</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Default Retention Policy", value: "7 days for completed, 30 days for failed" },
                { label: "Global Concurrency Limit", value: "1,000 concurrent jobs" },
                { label: "Stale Worker Timeout", value: "5 minutes without heartbeat" },
              ].map(setting => (
                <div key={setting.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-medium text-slate-600">{setting.label}</span>
                  <span className="text-xs font-bold text-slate-900">{setting.value}</span>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-slate-500 italic">Configuration is managed via infrastructure as code. Contact DevOps to request changes.</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <ShieldIcon className="size-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Processing Governance</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Data Residency Enforcement", value: "Active (Strict)", status: "success" },
                { label: "PII Scrubbing on Export", value: "Active", status: "success" },
                { label: "Dead-Letter Alerting", value: "Enabled (PagerDuty)", status: "info" },
              ].map(gov => (
                <div key={gov.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-medium text-slate-600">{gov.label}</span>
                  <span className={cn("px-2 py-0.5 rounded-sm text-xs font-bold", 
                    gov.status === "success" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50"
                  )}>{gov.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <DatabaseIcon className="size-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Data Store Metrics</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-slate-50 rounded-sm border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Redis Memory</p>
                  <p className="text-lg font-bold text-slate-900">1.2 GB <span className="text-xs font-normal text-slate-500">/ 4 GB</span></p>
                  <div className="w-full bg-slate-200 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[30%]" />
                  </div>
               </div>
               <div className="p-3 bg-slate-50 rounded-sm border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Postgres Archive</p>
                  <p className="text-lg font-bold text-slate-900">45 GB</p>
                  <p className="text-xs text-slate-500 mt-1">2.4M archived jobs</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
