"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarClock,
  CircleAlert,
  FileText,
  Layers,
  Megaphone,
  Plug,
  Plus,
  RefreshCw,
  Send,
  UsersRound,
  Image as ImageIcon,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { ChannelLogo } from "../../shared/channel-logo";
import { COMPANY_RANGES, useCompanyOverview, type CompanyRange } from "../hooks/use-company-overview";
import { Box, Stat } from "./dashboard-parts";

const ALL_CLIENTS = "all";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const CHANNEL_NAME: Record<string, string> = {
  FACEBOOK_PAGE: "Facebook",
  INSTAGRAM_ACCOUNT: "Instagram",
  GOOGLE_BUSINESS_LOCATION: "Google Business",
  LINKEDIN_ORGANIZATION: "LinkedIn",
  YOUTUBE_CHANNEL: "YouTube",
};

const CAMPAIGN_STATUS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200/60",
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200/60",
};

const SEVERITY: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200/60",
  warning: "bg-amber-50 text-amber-700 border-amber-200/60",
  info: "bg-blue-50 text-blue-700 border-blue-200/60",
};

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-8 text-center text-xs font-medium text-slate-500">{children}</p>;
}

/** Company Admin dashboard on the real backend: only what the platform records is shown. */
export function LiveAdminDashboard() {
  const [range, setRange] = useState<CompanyRange>("30d");
  const [client, setClient] = useState<string>(ALL_CLIENTS);
  const { data, isLoading, isFetching, error, refetch } = useCompanyOverview(range, client === ALL_CLIENTS ? null : client);

  if (error && !data) {
    return (
      <div className="grid h-80 place-items-center text-center">
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-slate-800">The dashboard could not be loaded.</p>
          <p className="text-xs text-slate-500">{error instanceof Error ? error.message : "Something went wrong."}</p>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => void refetch()}>Try again</Button>
        </div>
      </div>
    );
  }
  if (isLoading || !data) {
    return <div className="grid h-80 place-items-center text-[12px] text-[#71809D]">Loading your dashboard...</div>;
  }

  const { stats } = data;
  const days = data.range.days;
  const newClientsTrend = stats.clients.previousNew > 0 ? Math.round(((stats.clients.newInRange - stats.clients.previousNew) / stats.clients.previousNew) * 100) : 0;
  const activity = data.publishingActivity.map((d) => ({ d: shortDay(d.date), Published: d.published, Scheduled: d.scheduled, Failed: d.failed }));

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            What is scheduled, published and needs your attention across {client === ALL_CLIENTS ? "your clients" : "this client"}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="h-9 w-48 text-xs" aria-label="Client">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
              {data.scope.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as CompanyRange)}>
            <SelectTrigger className="h-9 w-40 text-xs" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(COMPANY_RANGES) as CompanyRange[]).map((key) => (
                <SelectItem key={key} value={key}>{COMPANY_RANGES[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-9" onClick={() => void refetch()} disabled={isFetching} aria-label="Refresh dashboard">
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-1">
        <Stat label="Clients" value={String(stats.clients.total)} trend={newClientsTrend > 0 ? `${newClientsTrend}%` : ""} note={`${stats.clients.newInRange} added in this period`} icon={Layers} color="blue" />
        <Stat label="Active Campaigns" value={String(stats.activeCampaigns.count)} trend="" note={`${stats.activeCampaigns.endingSoon} ending within 7 days`} icon={Megaphone} color="red" />
        <Stat label="Scheduled Posts" value={String(stats.scheduledPosts.upcoming)} trend="" note={`${stats.scheduledPosts.nextSevenDays} in the next 7 days`} icon={CalendarClock} color="blue" />
        <Stat label="Published" value={String(stats.publishedInRange)} trend="" note={`In the last ${days} days`} icon={Send} color="green" />
        <Stat label="Failed Posts" value={String(stats.failedInRange)} trend="" note={`In the last ${days} days`} icon={CircleAlert} color={stats.failedInRange > 0 ? "red" : "green"} />
        <Stat label="Drafts" value={String(stats.drafts.total)} trend="" note={`${stats.drafts.pendingReview} waiting for review`} icon={FileText} color="purple" />
        <Stat label="Channels" value={String(stats.channels.connections)} trend="" note={stats.channels.needAttention > 0 ? `${stats.channels.needAttention} need attention` : "All connections healthy"} icon={Plug} color={stats.channels.needAttention > 0 ? "amber" : "green"} />
        <Stat label="Team Members" value={String(stats.members)} trend="" note={`${stats.pendingInvitations} invitations pending`} icon={UsersRound} color="amber" />
      </div>

      <div className="grid items-start gap-1 grid-cols-1 lg:grid-cols-3">
        <Box title="Publishing Activity" action="Open calendar" href="/admin/calendar">
          <div className="px-2.5 pb-2">
            <div className="flex flex-wrap items-center gap-3 py-1.5 text-[12px]">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#10A66E]" />Published</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#3186F3]" />Scheduled</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#F20C20]" />Failed</span>
            </div>
            <div className="h-[175px]">
              <ResponsiveContainer>
                <AreaChart data={activity} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#71809D" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12, fill: "#71809D" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area dataKey="Published" stroke="#10A66E" fill="#10A66E15" strokeWidth={1.5} />
                  <Area dataKey="Scheduled" stroke="#3186F3" fill="transparent" />
                  <Area dataKey="Failed" stroke="#F20C20" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Channel Overview" action="Manage" href="/admin/integrations">
          <div className="max-h-[235px] overflow-y-auto overflow-x-auto px-3 scrollbar-thin">
            {data.channels.length === 0 ? (
              <Empty>No channel is connected yet. Connect Meta, LinkedIn, Google Business or YouTube to start publishing.</Empty>
            ) : (
              <>
                <div className="sticky top-0 z-10 grid min-w-[420px] grid-cols-[130px_70px_70px_70px_1fr] gap-2 bg-white py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <span>Channel</span>
                  <span>Logins</span>
                  <span>Clients</span>
                  <span>Pages</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.channels.map((ch) => (
                    <div key={ch.provider} className="grid min-w-[420px] grid-cols-[130px_70px_70px_70px_1fr] items-center gap-2 py-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <ChannelLogo channel={ch.label} className="size-4 shrink-0" />
                        <b className="whitespace-nowrap font-semibold text-slate-900">{ch.label}</b>
                      </span>
                      <span className="text-slate-900 font-bold tabular-nums">{ch.connections}</span>
                      <span className="text-slate-600 font-medium tabular-nums">{ch.clientsUsing}</span>
                      <span className="text-slate-600 font-medium tabular-nums">{ch.resourcesMapped}</span>
                      <span className="text-right">
                        <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-bold border", ch.status === "Connected" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-rose-50 text-rose-700 border-rose-200/60")}>{ch.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Box>

        <Box title="Needs Attention" action="View all" href="/admin/notifications">
          <div className="max-h-[235px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {data.attention.length === 0 ? (
              <Empty>Nothing needs attention. Connections, publishing and billing look healthy.</Empty>
            ) : (
              data.attention.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-slate-50/80">
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-amber-50 text-amber-600 border border-amber-200/60">
                    <AlertTriangle className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-snug text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">{item.detail}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-sm px-2 py-0.5 text-[10.5px] font-bold border", SEVERITY[item.severity])}>{item.kind}</span>
                </Link>
              ))
            )}
          </div>
        </Box>
      </div>

      <div className="grid gap-1 grid-cols-1 lg:grid-cols-3">
        <Box title="Recent Activity">
          <div className="p-2.5 divide-y divide-slate-100 max-h-[235px] overflow-y-auto scrollbar-thin">
            {data.activity.length === 0 ? (
              <Empty>No activity recorded yet.</Empty>
            ) : (
              data.activity.map((act) => (
                <div key={act.id} className="flex items-center justify-between gap-2.5 py-2 text-xs px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 rounded-sm shrink-0", act.outcome === "FAILURE" ? "bg-rose-500" : "bg-emerald-500")} />
                    <p className="min-w-0 truncate font-semibold text-slate-800 text-[11.5px]">
                      {act.label}
                      <span className="font-medium text-slate-500"> · {act.actor}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">{formatRelativeTime(act.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </Box>

        <Box title="Campaigns" action="View all" href="/admin/campaigns">
          <div className="overflow-x-auto px-3 py-1 scrollbar-thin">
            {data.campaigns.length === 0 ? (
              <Empty>No campaigns yet. Plan your first campaign to see it here.</Empty>
            ) : (
              <>
                <div className="sticky top-0 z-10 grid min-w-[420px] grid-cols-[1.4fr_1fr_90px_80px] gap-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">
                  <span>Campaign</span>
                  <span>Client</span>
                  <span>Ends</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.campaigns.map((c) => (
                    <Link key={c.id} href="/admin/campaigns" className="grid min-w-[420px] grid-cols-[1.4fr_1fr_90px_80px] items-center gap-2 py-2 text-xs hover:bg-slate-50/80">
                      <b className="truncate font-semibold text-slate-900">{c.name}</b>
                      <span className="truncate text-slate-600 font-medium">{c.clientName ?? "—"}</span>
                      <span className="text-slate-600 tabular-nums">{c.endDate ? shortDay(c.endDate) : "No end date"}</span>
                      <span>
                        <i className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold not-italic border capitalize", CAMPAIGN_STATUS[c.status] ?? CAMPAIGN_STATUS.DRAFT)}>{c.status.toLowerCase()}</i>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </Box>

        <Box title="Upcoming Scheduled Content" action="View calendar" href="/admin/calendar">
          <div className="divide-y divide-slate-100 max-h-[235px] overflow-y-auto overflow-x-auto p-1 scrollbar-thin">
            {data.upcoming.length === 0 ? (
              <Empty>Nothing is scheduled. Create a post and schedule it from Content Studio.</Empty>
            ) : (
              data.upcoming.map((p) => (
                <Link key={p.id} href="/admin/calendar" className="grid min-w-[360px] grid-cols-[24px_1fr_110px] items-center gap-2 px-2 py-2 text-xs transition-colors hover:bg-slate-50/80">
                  <ChannelLogo channel={CHANNEL_NAME[p.channel] ?? p.channel} className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <b className="block truncate text-xs font-bold text-slate-900">{p.title}</b>
                    <span className="block truncate text-[11px] text-slate-500 font-medium">{p.clientName ?? ""}</span>
                  </span>
                  <span className="text-right text-[11px] leading-tight text-slate-600 font-medium whitespace-nowrap tabular-nums">{when(p.scheduledFor)}</span>
                </Link>
              ))
            )}
          </div>
        </Box>
      </div>

      <Box title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2">
          {(
            [
              [Plus, "Create Post", "/admin/content", "bg-blue-50 text-blue-600 border-blue-100"],
              [Megaphone, "Create Campaign", "/admin/campaigns", "bg-rose-50 text-rose-600 border-rose-100"],
              [CalendarDays, "Open Calendar", "/admin/calendar", "bg-emerald-50 text-emerald-600 border-emerald-100"],
              [ImageIcon, "Upload Media", "/admin/media", "bg-purple-50 text-purple-600 border-purple-100"],
              [Plug, "Connect Channel", "/admin/integrations", "bg-sky-50 text-sky-600 border-sky-100"],
              [UsersRound, "Invite User", "/admin/team", "bg-amber-50 text-amber-600 border-amber-100"],
            ] as const
          ).map(([Icon, label, href, colors]) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[44px] items-center gap-2.5 rounded-sm border border-slate-200/80 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-800 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/60"
            >
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm border transition-transform group-hover:scale-105", colors)}>
                <Icon className="size-3.5" />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </Box>
      <p className="px-1 pt-1 text-[11px] font-medium text-slate-400">
        Leads, website traffic, SEO scores and ad spend are not part of this dashboard yet. They appear here once those modules are connected.
      </p>
      <p className="sr-only">{plural(data.scope.clients.length, "client")} in scope</p>
    </div>
  );
}
