"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ExternalLink, Gauge, Globe2, Megaphone, Settings, Target, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { useProject } from "../hooks/use-projects";

const tabs = ["Overview", "Channels", "Content", "Campaigns", "Leads", "SEO", "Analytics", "Team", "Settings"] as const;

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const projectQuery = useProject(projectId);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  if (projectQuery.isLoading) return <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-12 rounded-xl" /><div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div></div>;
  const project = projectQuery.data;
  if (!project) return <div className="grid min-h-[420px] place-items-center rounded-xl border border-[#DDE4ED] bg-white text-center"><div><h1 className="text-lg font-bold text-[#172044]">Project not found</h1><Link href="/admin/projects" className="mt-3 inline-flex text-sm font-semibold text-[#EB0711]">Back to Clients</Link></div></div>;

  return <div className="space-y-4">
    <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#667695] hover:text-[#EB0711]"><ArrowLeft className="size-3.5" />Back to Clients</Link>
    <section className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-4"><span className="grid size-14 place-items-center rounded-xl text-base font-bold text-white shadow-sm" style={{ backgroundColor: project.color }}>{project.logoText}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="text-[22px] font-bold tracking-tight text-[#101A3D]">{project.name}</h1><span className="rounded-full bg-[#E6F7F0] px-2 py-1 text-[8px] font-semibold capitalize text-[#087A51]">{project.status}</span></div><a href={`https://${project.website}`} className="mt-1 flex items-center gap-1 text-[9px] text-[#647596]">{project.website}<ExternalLink className="size-2.5" /></a><p className="mt-1 max-w-2xl text-[10px] text-[#75829D]">{project.description}</p></div><div className="flex gap-2"><button className="flex h-9 items-center gap-2 rounded-lg border border-[#D7DFEA] px-3 text-[10px] font-semibold text-[#23345E]"><Settings className="size-3.5" />Project settings</button><button className="flex h-9 items-center gap-2 rounded-lg bg-[#EB0711] px-3 text-[10px] font-semibold text-white"><Megaphone className="size-3.5" />Create campaign</button></div></div></section>
    <div className="scrollbar-thin flex overflow-x-auto rounded-xl border border-[#DDE4ED] bg-white px-2 shadow-sm">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={cn("relative h-11 shrink-0 px-3 text-[10px] font-semibold", activeTab === tab ? "text-[#EB0711] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[#EB0711]" : "text-[#6A7895] hover:text-[#172044]")}>{tab}</button>)}</div>
    {activeTab === "Overview" ? <Overview project={project} /> : <section className="grid min-h-[360px] place-items-center rounded-xl border border-[#DDE4ED] bg-white text-center shadow-sm"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#FFE9EB] text-[#EB0711]"><Settings className="size-5" /></span><h2 className="mt-3 text-sm font-bold text-[#172044]">{activeTab}</h2><p className="mt-1 text-[10px] text-[#71809D]">This project module is ready for the next implementation step.</p></div></section>}
  </div>;
}

function Overview({ project }: { project: NonNullable<ReturnType<typeof useProject>["data"]> }) {
  const metrics = [
    { label: "Total Leads", value: project.leads.toLocaleString(), note: "+18% this month", icon: Target, color: "bg-[#E9F3FF] text-[#1672D8]" },
    { label: "Active Campaigns", value: String(project.campaigns), note: "2 performing well", icon: Megaphone, color: "bg-[#FFE9EB] text-[#E51A26]" },
    { label: "Website Visits", value: project.websiteVisits.toLocaleString(), note: "+12% this month", icon: Globe2, color: "bg-[#E5F8F0] text-[#0B9767]" },
    { label: "SEO Score", value: `${project.seoScore}/100`, note: "+6 points", icon: Gauge, color: "bg-[#F1EBFF] text-[#7A47D6]" },
  ];
  return <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><span className={cn("grid size-9 place-items-center rounded-xl", metric.color)}><Icon className="size-4" /></span><ArrowUpRight className="size-3.5 text-[#00A66A]" /></div><p className="mt-3 text-[9px] text-[#71809D]">{metric.label}</p><p className="mt-0.5 text-[22px] font-bold text-[#172044]">{metric.value}</p><p className="mt-1 text-[8.5px] font-medium text-[#00A66A]">{metric.note}</p></div>; })}</div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-xl border border-[#DDE4ED] bg-white shadow-sm"><header className="border-b border-[#E7ECF2] px-4 py-3"><h2 className="text-[11px] font-bold text-[#172044]">Connected channels</h2><p className="mt-0.5 text-[8.5px] text-[#71809D]">{project.connectedChannels.length} marketing channels are connected and syncing.</p></header><div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">{project.connectedChannels.map((channel: string) => <div key={channel} className="flex items-center gap-2 rounded-lg border border-[#E4E9F0] p-2.5"><span className="grid size-7 place-items-center rounded-lg bg-[#EEF4FC] text-[9px] font-bold text-[#2869B5]">{channel.slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-semibold text-[#172044]">{channel}</p><p className="text-[7.5px] text-[#00A66A]">Connected</p></div><CheckCircle2 className="size-3 text-[#00A66A]" /></div>)}</div></section><section className="rounded-xl border border-[#DDE4ED] bg-white shadow-sm"><header className="border-b border-[#E7ECF2] px-4 py-3"><h2 className="text-[11px] font-bold text-[#172044]">Project details</h2></header><dl className="space-y-3 p-4 text-[9px]"><Row label="Organization" value="Namo Gange Trust" /><Row label="Project owner" value={project.owner} /><Row label="Created" value={project.createdAt} /><Row label="Last activity" value={project.lastActivity} /><Row label="Team members" value="8 members" icon={<UsersRound className="size-3" />} /><Row label="Next review" value="15 Sep 2026" icon={<CalendarDays className="size-3" />} /></dl></section></div></>;
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-1.5 text-[#74819C]">{icon}{label}</dt><dd className="font-semibold text-[#25345B]">{value}</dd></div>; }
