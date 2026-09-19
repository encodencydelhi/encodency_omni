/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * API Monitoring Activity Feed
 */

"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  GlobeIcon,
  SettingsIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { LOG_SEVERITY_META } from "../data/config";
import type { ApiMonitoringActivity } from "../data/types";

interface ActivityFeedProps {
  activities: ApiMonitoringActivity[];
}

const ACTIVITY_ICONS: Record<string, typeof AlertTriangleIcon> = {
  endpoint_enabled: CheckCircle2Icon,
  endpoint_disabled: AlertTriangleIcon,
  rate_limit_changed: ShieldAlertIcon,
  error_spike_detected: AlertTriangleIcon,
  error_spike_resolved: CheckCircle2Icon,
  threshold_alert: ClockIcon,
  configuration_updated: SettingsIcon,
  provider_health_changed: GlobeIcon,
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <ClockIcon className="size-6 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-slate-50">
        {activities.map((act) => {
          const Icon = ACTIVITY_ICONS[act.type] ?? ClockIcon;
          const sevMeta = LOG_SEVERITY_META[act.severity];
          return (
            <div key={act.id} className="px-3 py-2 hover:bg-slate-50/40 transition-colors">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded",
                    sevMeta.tone === "danger" && "bg-red-50 text-red-600",
                    sevMeta.tone === "warning" && "bg-amber-50 text-amber-600",
                    sevMeta.tone === "info" && "bg-blue-50 text-blue-600",
                    sevMeta.tone === "neutral" && "bg-slate-100 text-slate-500"
                  )}
                >
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold">{act.actor}</span>
                    {" "}
                    {act.message}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span>{formatDateTime(act.timestamp)}</span>
                    <span>·</span>
                    <span className="capitalize">{act.provider}</span>
                    {act.endpoint && (
                      <>
                        <span>·</span>
                        <span>{act.endpoint}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
