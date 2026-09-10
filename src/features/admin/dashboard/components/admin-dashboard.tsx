"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, CalendarClock, CheckCircle2, ChevronDown, CircleDollarSign,
  Eye, FolderKanban, Gauge, Globe2, Megaphone, MousePointerClick, RefreshCcw,
  SearchCheck, Target, TrendingDown, TrendingUp, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import type { DashboardMetric } from "@/types/admin";
import { useAdminContext } from "../../shell/admin-context";
import { useAdminDashboard } from "../hooks/use-admin-dashboard";
import { ChannelLogo } from "../../shared/channel-logo";

const metricIcons = { Clients: FolderKanban, leads: UsersRound, campaigns: Megaphone, reach: Eye, visits: Globe2, seo: SearchCheck } as const;
const leadSources = [
  { name: "Website", value: 32, color: "#F20C20" }, { name: "Instagram", value: 24, color: "#F2709B" },
  { name: "Facebook", value: 18, color: "#3186F3" }, { name: "Google", value: 10, color: "#20A7B5" },
  { name: "LinkedIn", value: 8, color: "#805AD5" }, { name: "WhatsApp", value: 6, color: "#4FC061" },
  { name: "YouTube", value: 2, color: "#F0A000" },
];
const topCampaigns = [
  { name: "Clean Ganga Awareness", project: "Moksha Sewa", leads: 86, cpl: "₹120", trend: "18%" },
  { name: "Volunteer Drive", project: "Namo Gange Trust", leads: 62, cpl: "₹145", trend: "12%" },
  { name: "Ganga Tourism", project: "Ganga Explorer", leads: 48, cpl: "₹210", trend: "8%" },
  { name: "Donate for Change", project: "Namo Gange Foundation", leads: 36, cpl: "₹320", trend: "16%" },
];

function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-[#DDE4ED] bg-white shadow-[0_1px_3px_rgb(47_44_42/0.035)]", className)}><header className="flex h-9 items-center justify-between border-b border-[#E8EDF3] px-3"><h2 className="text-[11px] font-bold tracking-tight text-[#172044]">{title}</h2>{action}</header>{children}</section>;
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.key];
  return <div className="rounded-lg border border-[#DDE4ED] bg-white p-2.5 shadow-[0_1px_3px_rgb(47_44_42/0.035)] transition hover:-translate-y-px hover:shadow-md">
    <div className="flex items-start justify-between"><span className="grid size-7 place-items-center rounded-lg bg-[#F5F1EE] text-[#66737C]"><Icon className="size-3.5" /></span>{metric.change !== 0 && <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold", metric.change > 0 ? "bg-[#EAF4EE] text-[#347452]" : "bg-[#F9E9EA] text-[#B13B42]")}>{metric.change > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}{Math.abs(metric.change)}%</span>}</div>
    <p className="mt-1.5 text-[9px] font-medium text-[#71809D]">{metric.label}</p><p className="text-[19px] font-bold tracking-[-0.035em] text-[#172044]">{metric.formattedValue}</p><p className="mt-0.5 truncate text-[8px] text-[#8B97AD]">{metric.comparison}</p>
  </div>;
}

function DashboardLoading() {
  return <div className="space-y-4"><div className="flex justify-between"><div><Skeleton className="h-7 w-56" /><Skeleton className="mt-2 h-4 w-80" /></div><Skeleton className="h-9 w-32" /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div>;
}

export function AdminDashboard() {
  const { Clients, selectedProjectId } = useAdminContext();
  const dashboard = useAdminDashboard(selectedProjectId);
  const selectedProject = Clients.find((project) => project.id === selectedProjectId);
  if (dashboard.isLoading) return <DashboardLoading />;
  if (dashboard.isError || !dashboard.data) return <div className="grid min-h-[360px] place-items-center rounded-xl border border-[#E5E1DE] bg-white text-center"><div><AlertCircle className="mx-auto size-8 text-[#C9343B]" /><h1 className="mt-3 text-lg font-bold">Dashboard could not be loaded</h1><p className="mt-1 text-sm text-[#7C868D]">The mock service encountered an unexpected error.</p><Button className="mt-4 bg-[#C9343B] hover:bg-[#B82E35]" onClick={() => dashboard.refetch()}><RefreshCcw />Try again</Button></div></div>;
  const data = dashboard.data;
  return <div className="space-y-2">
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.035em] text-[#101A3D]">Good Morning, Manish <span className="text-[20px]" aria-hidden="true">👋</span></h1>
        <p className="mt-1 text-[10px] leading-4 text-[#637296]">Here&apos;s how your marketing is performing across {selectedProject ? selectedProject.name : "all Clients"}.</p>
      </div>
      <div className="flex items-center gap-5">
        <blockquote className="hidden border-r border-[#DDE4ED] pr-5 text-right text-[8.5px] leading-[12px] text-[#20315A] xl:block">“Consistent effort creates<br />extraordinary brands.”<footer className="mt-0.5 text-[7.5px] text-[#7B88A4]">— EnCodency</footer></blockquote>
        <button className="flex h-10 min-w-[210px] items-center gap-2.5 rounded-lg border border-[#D5DEEA] bg-white px-3 text-left shadow-sm hover:bg-[#FAFCFF]">
          <CalendarDays className="size-4 shrink-0 text-[#182A58]" />
          <span className="min-w-0 flex-1"><strong className="block text-[10px] leading-4 text-[#17254A]">Last 30 days</strong><small className="block whitespace-nowrap text-[7.5px] text-[#71809F]">Mar 15, 2025 – Apr 14, 2025</small></span>
          <ChevronDown className="size-3 shrink-0 text-[#213462]" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{data.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>

    <div className="grid gap-2 xl:grid-cols-[minmax(0,1.58fr)_minmax(310px,.72fr)]">
      <Section title="Marketing performance" action={<div className="flex items-center gap-3 text-[9px] font-medium text-[#7F888F]"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-[#C9343B]" />Leads</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-[#889CA8]" />Visits</span><button className="rounded-md border border-[#E4E0DD] px-2 py-1 text-[#5F6B74]">30 days</button></div>}>
        <div className="h-[220px] px-2 pb-2 pt-4 sm:px-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="adminLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9343B" stopOpacity={0.2} /><stop offset="1" stopColor="#C9343B" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#EEEAE7" strokeDasharray="3 3" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#939BA1", fontSize: 9 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#939BA1", fontSize: 9 }} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E1DE", fontSize: 10, boxShadow: "0 6px 20px rgb(30 42 50 / .08)" }} /><Area type="monotone" dataKey="leads" stroke="#C9343B" strokeWidth={2} fill="url(#adminLeads)" /><Area type="monotone" dataKey="visits" stroke="#889CA8" strokeWidth={1.5} fill="transparent" yAxisId={0} /></AreaChart></ResponsiveContainer></div>
      </Section>
      <Section title="Needs attention" action={<Link href="/admin/notifications" className="text-[10px] font-semibold text-[#C9343B] hover:underline">View all</Link>}>
        <div className="divide-y divide-[#F0EDEB]">{data.attention.map((item) => <div key={item.id} className="flex gap-2.5 px-4 py-3"><span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg", item.severity === "critical" ? "bg-[#FBEAEC] text-[#BC343C]" : item.severity === "warning" ? "bg-[#FBF2E3] text-[#9A691E]" : "bg-[#EAF1F5] text-[#47718D]")}><AlertCircle className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-[#38444D]">{item.title}</p><p className="mt-0.5 truncate text-[9px] text-[#8B949A]">{item.detail}</p></div><button className="shrink-0 self-center text-[9px] font-semibold text-[#B9323A] hover:underline">{item.actionLabel}</button></div>)}</div>
        <div className="border-t border-[#EEEAE7] bg-[#FBFAF8] px-4 py-2 text-[9px] text-[#7E888F]"><strong className="text-[#3E7558]">2 resolved</strong> in the last 7 days</div>
      </Section>
    </div>

    <Section title="Channel overview" action={<Link href="/admin/channels" className="flex items-center gap-1 text-[10px] font-semibold text-[#69747C] hover:text-[#C9343B]">Manage channels <ArrowRight className="size-3" /></Link>}>
      <div className="grid divide-y divide-[#E8EDF3] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">{data.channels.map((channel) => <div key={channel.id} className="flex items-center gap-2 px-3 py-2 sm:last:hidden xl:last:flex"><ChannelLogo channel={channel.name} className="size-7" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-[9px] font-semibold text-[#172044]">{channel.name}</p><i className={cn("size-1.5 shrink-0 rounded-full", channel.status === "healthy" ? "bg-[#4B8A68]" : channel.status === "attention" ? "bg-[#D09235]" : "bg-[#C9343B]")} /></div><div className="flex items-baseline gap-1"><strong className="text-[13px] text-[#172044]">{channel.metric}</strong><span className="text-[7px] text-[#8591A8]">{channel.metricLabel}</span></div></div><span className={cn("flex items-center text-[8px] font-semibold", channel.change >= 0 ? "text-[#3E7958]" : "text-[#B83C43]")}>{channel.change >= 0 ? <ArrowUpRight className="size-3" /> : <TrendingDown className="size-3" />}{Math.abs(channel.change)}%</span></div>)}</div>
    </Section>

    <div className="grid gap-2 xl:grid-cols-[.92fr_1.14fr_1fr]">
      <Section title="Leads by source" action={<Link href="/admin/analytics" className="text-[9px] font-semibold text-[#EB0711]">View all →</Link>}>
        <div className="flex min-h-[190px] items-center px-4"><div className="relative h-[138px] w-[138px] shrink-0"><ResponsiveContainer><PieChart><Pie data={leadSources} dataKey="value" innerRadius={41} outerRadius={64} strokeWidth={0}>{leadSources.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><span><strong className="block text-[18px] text-[#172044]">248</strong><small className="text-[8px] text-[#647394]">Total Leads</small></span></div></div><div className="ml-3 flex-1 space-y-1.5">{leadSources.map((source) => <div key={source.name} className="flex items-center gap-2 text-[8.5px]"><i className="size-2 rounded-sm" style={{ backgroundColor: source.color }} /><span className="flex-1 text-[#26365F]">{source.name}</span><strong className="text-[#172044]">{source.value}%</strong></div>)}</div></div>
      </Section>
      <Section title="Top performing campaigns" action={<Link href="/admin/campaigns" className="text-[9px] font-semibold text-[#EB0711]">View all →</Link>}>
        <div className="px-3 pb-2"><div className="grid grid-cols-[1fr_42px_55px_55px] px-2 py-1.5 text-[8px] text-[#71809F]"><span>Based on leads generated</span><span>Leads</span><span>CPL</span><span /></div>{topCampaigns.map((campaign, index) => <div key={campaign.name} className="grid grid-cols-[1fr_42px_55px_55px] items-center border-t border-[#EDF1F6] px-2 py-1.5 text-[8.5px]"><div className="flex min-w-0 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded bg-gradient-to-br from-[#8AB5D0] to-[#275C7D] text-[8px] text-white">{index + 1}</span><span className="min-w-0"><strong className="block truncate font-semibold text-[#172044]">{campaign.name}</strong><small className="block truncate text-[7.5px] text-[#72809D]">{campaign.project}</small></span></div><span>{campaign.leads}</span><span>{campaign.cpl}</span><span className="font-semibold text-[#00A66A]">↘ {campaign.trend}</span></div>)}</div>
      </Section>
      <Section title="Upcoming scheduled content" action={<Link href="/admin/calendar" className="text-[9px] font-semibold text-[#EB0711]">View all →</Link>}>
        <div className="divide-y divide-[#EDF1F6]">{data.scheduledContent.map((item, index) => <div key={item.id} className="flex items-center gap-2 px-3.5 py-2"><span className="grid h-8 w-10 shrink-0 place-items-center rounded bg-gradient-to-br from-[#84BDD1] to-[#286478] text-[8px] font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-semibold text-[#172044]">{item.title}</p><p className="text-[7.5px] text-[#71809F]">{item.channel}</p></div><span className="text-right text-[7.5px] leading-3 text-[#536585]">{item.scheduledFor}</span></div>)}</div>
      </Section>
    </div>

    <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[1.05fr_.95fr_.8fr]">
      <Section title="Recent leads" action={<Link href="/admin/crm/leads" className="text-[10px] font-semibold text-[#C9343B]">Open CRM</Link>}>
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-[#FBFAF8] text-[8px] uppercase tracking-wider text-[#969DA2]"><th className="px-4 py-2 font-semibold">Lead</th><th className="px-3 py-2 font-semibold">Source</th><th className="px-3 py-2 font-semibold">Stage</th><th className="px-4 py-2 text-right font-semibold">Received</th></tr></thead><tbody className="divide-y divide-[#F0EDEB]">{data.recentLeads.map((lead) => <tr key={lead.id} className="text-[10px] hover:bg-[#FCFBFA]"><td className="px-4 py-2.5"><p className="font-semibold text-[#38444D]">{lead.name}</p><p className="mt-0.5 text-[8.5px] text-[#939BA1]">{lead.campaign}</p></td><td className="px-3 py-2.5 text-[#68747C]">{lead.source}</td><td className="px-3 py-2.5"><span className="rounded-full bg-[#EEF2F3] px-2 py-1 text-[8px] font-semibold text-[#536772]">{lead.stage}</span></td><td className="px-4 py-2.5 text-right text-[9px] text-[#949CA1]">{lead.receivedAt}</td></tr>)}</tbody></table></div>
      </Section>
      <Section title="Upcoming content" action={<Link href="/admin/calendar" className="text-[10px] font-semibold text-[#69747C]">View calendar</Link>}>
        <div className="divide-y divide-[#F0EDEB]">{data.scheduledContent.map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F4F1EE] text-[#69757D]"><CalendarClock className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-[#3B4750]">{item.title}</p><p className="mt-0.5 text-[8.5px] text-[#91999F]">{item.channel} · {item.scheduledFor}</p></div><span className={cn("rounded-full px-2 py-1 text-[8px] font-semibold capitalize", item.status === "scheduled" ? "bg-[#EAF4EE] text-[#3C7657]" : "bg-[#F1EFEC] text-[#758087]")}>{item.status}</span></div>)}</div>
        <div className="border-t border-[#EEEAE7] p-2.5"><Button variant="outline" size="sm" className="h-7 w-full text-[9px]"><CalendarClock />Schedule content</Button></div>
      </Section>
      <Section title="Integration health" className="lg:col-span-2 xl:col-span-1" action={<Link href="/admin/integrations" className="text-[10px] font-semibold text-[#C9343B]">Manage</Link>}>
        <div className="p-4"><div className="flex items-center gap-4"><div className="relative grid size-[76px] place-items-center rounded-full" style={{ background: `conic-gradient(#4B8566 ${(data.integrationHealth.connected / data.integrationHealth.total) * 360}deg, #ECE9E6 0)` }}><div className="grid size-[60px] place-items-center rounded-full bg-white text-center"><span><strong className="block text-[18px] text-[#314049]">{data.integrationHealth.connected}/{data.integrationHealth.total}</strong><small className="text-[8px] text-[#8C959B]">connected</small></span></div></div><div className="flex-1 space-y-2"><div className="flex items-center justify-between text-[9px]"><span className="flex items-center gap-1.5 text-[#6C777F]"><CheckCircle2 className="size-3 text-[#4B8566]" />Synced</span><strong>{data.integrationHealth.synced}</strong></div><div className="flex items-center justify-between text-[9px]"><span className="flex items-center gap-1.5 text-[#6C777F]"><AlertCircle className="size-3 text-[#D09235]" />Needs action</span><strong>{data.integrationHealth.attention}</strong></div><div className="flex items-center justify-between text-[9px]"><span className="flex items-center gap-1.5 text-[#6C777F]"><RefreshCcw className="size-3 text-[#55768C]" />Last sync</span><strong>4m ago</strong></div></div></div><div className="mt-4 rounded-lg bg-[#F8F6F3] p-2.5 text-[9px] leading-relaxed text-[#68747C]"><strong className="text-[#3B4750]">LinkedIn connection expired.</strong> Reconnect to resume scheduled publishing.</div></div>
      </Section>
    </div>

    <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
      <Section title="Recent activity"><div className="grid divide-y divide-[#F0EDEB] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">{data.activity.map((item) => { const icons = { publish: MousePointerClick, lead: Target, seo: Gauge, campaign: CircleDollarSign }; const Icon = icons[item.kind]; return <div key={item.id} className="flex gap-2.5 px-4 py-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F4F1EE] text-[#69757D]"><Icon className="size-3.5" /></span><div className="min-w-0"><p className="truncate text-[9.5px] font-semibold text-[#3C4851]">{item.title}</p><p className="mt-0.5 truncate text-[8px] text-[#929A9F]">{item.meta} · {item.occurredAt}</p></div></div>; })}</div></Section>
      <div className="flex items-center justify-between gap-5 rounded-xl bg-[#2F414C] px-5 py-3 text-white lg:w-[300px]"><div><p className="text-[9px] font-semibold uppercase tracking-wider text-white/55">Marketing health</p><p className="mt-0.5 text-[18px] font-bold">Strong <span className="text-[#91C4A7]">82/100</span></p><p className="text-[8px] text-white/55">Up 5 points this month</p></div><div className="grid size-10 place-items-center rounded-xl bg-white/10"><BarChart3 className="size-5 text-[#F0B4B7]" /></div></div>
    </div>
  </div>;
}
