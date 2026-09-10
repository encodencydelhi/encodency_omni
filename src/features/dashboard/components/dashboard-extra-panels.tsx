"use client";

import {
  ActivityIcon,
  ArrowRightIcon,
  ClipboardListIcon,
  SettingsIcon,
  Building2Icon,
} from "lucide-react";
import Link from "next/link";
import { CardSkeleton } from "@/components/shared/loading-state";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-[#3b82f6]",
  growth: "bg-[#10b981]",
  agency: "bg-[#f59e0b]",
  enterprise: "bg-[#8b5cf6]",
};

const TIER_BADGE: Record<string, string> = {
  trial: "bg-[#dcfce7] text-[#166534]",
  starter: "bg-[#dbeafe] text-[#1e40af]",
  growth: "bg-[#dcfce7] text-[#166534]",
  agency: "bg-[#ffedd5] text-[#9a3412]",
  enterprise: "bg-[#f3e8ff] text-[#6b21a8]",
};

const AVATAR_COLORS = [
  "bg-[#0f766e]", // teal
  "bg-[#9a3412]", // brown
  "bg-[#0369a1]", // dark blue
  "bg-[#0f172a]", // black
  "bg-[#6d28d9]", // purple
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const IntegrationLogos: Record<string, React.ReactNode> = {
  "Google Workspace": (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
  Slack: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" />
      <path fill="#E01E5A" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" />
      <path fill="#36C5F0" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
      <path fill="#2EB67D" d="M18.956 8.835a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.835a2.528 2.528 0 0 1-2.522 2.52h-2.522v-2.52z" />
      <path fill="#2EB67D" d="M17.688 8.835a2.528 2.528 0 0 1-2.523 2.52 2.528 2.528 0 0 1-2.52-2.52V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.313z" />
      <path fill="#ECB22E" d="M15.165 18.958a2.528 2.528 0 0 1 2.523 2.52 2.528 2.528 0 0 1-2.523 2.522 2.528 2.528 0 0 1-2.52-2.522v-2.52h2.52z" />
      <path fill="#ECB22E" d="M15.165 17.687a2.528 2.528 0 0 1-2.523-2.521 2.528 2.528 0 0 1 2.523-2.52h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.313z" />
    </svg>
  ),
  Microsoft: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#f35325" d="M1 1h10.5v10.5H1z" />
      <path fill="#81bc06" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#05a6f0" d="M1 12.5h10.5V23H1z" />
      <path fill="#ffba08" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  ),
  HubSpot: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#FF7A59" d="M13.626 7.643L20.211 4.54l1.326 1.706-5.836 4.316a5.795 5.795 0 1 1-10.499 1.488L2 10.638V8.401l3.05 1.258A5.794 5.794 0 0 1 13.626 7.643M6.924 14.16a2.898 2.898 0 1 0 0-5.797 2.898 2.898 0 0 0 0 5.797m11.838 2.454l1.248-1.571-3.644-2.887a5.786 5.786 0 0 1-4.805 3.328l.21 4.516H9.553l-.227-4.871A5.792 5.792 0 0 1 7.228 14.61l3.076-2.158A2.897 2.897 0 0 0 15.82 11.23l2.942 5.384" />
    </svg>
  ),
  Zoom: (
    <div className="w-5 h-5 bg-[#2D8CFF] rounded-full flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-3 h-3 text-white">
        <path fill="currentColor" d="M17 7h-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-1h2l4 3V4l-4 3z" />
      </svg>
    </div>
  ),
};

export function PlanDistributionPanel({
  distribution,
  isLoading,
}: {
  distribution: DashboardSnapshot["subscriptionDistribution"];
  isLoading: boolean;
}) {
  return (
    <Card className="flex flex-col h-[280px] rounded-2xl shadow-sm border-slate-200">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-full bg-red-100 text-red-500 shrink-0">
            <ClipboardListIcon className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight truncate">Plan Distribution</h3>
            <p className="text-[12px] text-slate-500 font-medium truncate">Total active subscriptions: {distribution.activeTotal}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {isLoading ? (
          <CardSkeleton lines={4} />
        ) : (
          <div className="flex flex-col gap-4">
            {distribution.segments.map((segment) => {
              const percent = distribution.activeTotal > 0 ? Math.round((segment.companies / distribution.activeTotal) * 100) : 0;
              return (
                <div key={segment.tier} className="flex items-center text-[13px]">
                  <div className="flex w-[80px] items-center gap-2 shrink-0">
                    <div className={cn("size-2.5 rounded-full shrink-0", PLAN_COLORS[segment.tier])} />
                    <span className="text-slate-600 capitalize truncate">{segment.label}</span>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 mx-2">
                    <div className={cn("h-full rounded-full", PLAN_COLORS[segment.tier])} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex w-[52px] shrink-0 items-center justify-end gap-2 font-semibold text-slate-800">
                    <span>{segment.companies}</span>
                    <span className="text-slate-500 font-medium w-7 text-right">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LatestSignupsPanel({
  signups,
  isLoading,
}: {
  signups: DashboardSnapshot["latestSignups"];
  isLoading: boolean;
}) {
  return (
    <Card className="flex flex-col h-[280px] rounded-2xl shadow-sm border-slate-200">
      <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-500 shrink-0">
            <Building2Icon className="size-4" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-800 tracking-tight truncate">Latest Signups</h3>
        </div>
        <Link href={ROUTES.superAdmin.companies} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-red-500 hover:text-red-600">
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {isLoading ? (
          <CardSkeleton lines={5} />
        ) : (
          <ul className="flex flex-col gap-3 mt-1">
            {signups.map((signup) => (
              <li key={signup.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", getAvatarColor(signup.name))}>
                    {signup.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-[13px] font-semibold text-slate-800">{signup.name}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{signup.timeAgo}</span>
                  </div>
                </div>
                <span className={cn("shrink-0 inline-flex h-[24px] px-2.5 items-center justify-center rounded-full text-[10px] font-bold capitalize tracking-wide", TIER_BADGE[signup.tier])}>
                  {signup.tier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ApiUsagePanel({
  usage,
  isLoading,
}: {
  usage: DashboardSnapshot["apiUsage"];
  isLoading: boolean;
}) {
  return (
    <Card className="flex flex-col h-[280px] rounded-2xl shadow-sm border-slate-200">
      <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-purple-100 text-purple-500 shrink-0">
            <ActivityIcon className="size-4" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-800 tracking-tight truncate">API Usage Snapshot</h3>
        </div>
        <select className="text-[11px] border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-500 font-medium outline-none shrink-0 cursor-pointer">
          <option>Last 30 days</option>
        </select>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {isLoading ? (
          <CardSkeleton lines={4} />
        ) : (
          <>
            <div className="flex flex-col mt-2 gap-4">
              <div className="flex flex-col">
                <div className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight mb-1.5">
                  {usage.totalRequests.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">API requests</span>
                  <span className="text-[11px] font-bold text-[#10b981] flex items-center">
                    ↑ {usage.requestDelta.changePercent}%
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-[2px] h-12 w-full shrink-0">
                {usage.series.map((val, i) => (
                  <div key={i} className="flex-1 bg-[#bfdbfe] rounded-[1px]" style={{ height: `${Math.max((val / Math.max(...usage.series)) * 100, 15)}%` }} />
                ))}
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-3 gap-1">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 font-medium mb-0.5 whitespace-nowrap">Success Rate</span>
                <span className="text-base font-extrabold text-[#10b981]">{usage.successRate}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 font-medium mb-0.5 whitespace-nowrap">Failed Req</span>
                <span className="text-base font-extrabold text-red-500">{usage.failedRequests}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 font-medium mb-0.5 whitespace-nowrap">Avg Resp</span>
                <span className="text-base font-extrabold text-slate-800">{usage.avgResponseMs} ms</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function IntegrationStatusPanel({
  integrations,
  isLoading,
}: {
  integrations: DashboardSnapshot["integrationStatus"];
  isLoading: boolean;
}) {
  return (
    <Card className="flex flex-col h-[280px] rounded-2xl shadow-sm border-slate-200">
      <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 shrink-0">
            <SettingsIcon className="size-4" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-800 tracking-tight truncate">Integration Status</h3>
        </div>
        <Link href={ROUTES.superAdmin.integrations} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-red-500 hover:text-red-600">
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {isLoading ? (
          <CardSkeleton lines={5} />
        ) : (
          <ul className="flex flex-col mt-1">
            {integrations.map((integration, index) => (
              <li key={integration.id} className={cn("flex items-center justify-between text-[13px] py-2.5", index !== 0 && "border-t border-slate-100")}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-6 shrink-0 flex items-center justify-center">
                    {IntegrationLogos[integration.name] ? (
                      IntegrationLogos[integration.name]
                    ) : (
                      <div className="size-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {integration.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-slate-700 truncate">{integration.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={cn("size-1.5 rounded-full", integration.status === "Connected" ? "bg-[#10b981]" : "bg-red-500")} />
                  <span className={cn("text-[12px] font-semibold", integration.status === "Connected" ? "text-[#10b981]" : "text-red-500")}>
                    {integration.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
