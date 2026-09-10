"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, BarChart3, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Filter, Link2, Megaphone, MoreVertical, Plus, Search, UsersRound, Globe } from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { useClients } from "../hooks/use-projects";
import { cn } from "@/lib/utils/cn";

type FilterValue = "all" | "active" | "paused" | "archived";

export function ClientsPage() {
  const { data = [] } = useClients();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => data.filter((p: any) => (filter === "all" || p.status === filter) && p.name.toLowerCase().includes(query.toLowerCase())), [data, filter, query]);

  return (
    <div className="space-y-2.5">
      {/* Header and Banner */}
      <div className="grid items-start gap-3 lg:grid-cols-[1fr_420px]">
        <div>
          {/* Breadcrumb */}
          <div className="text-[11px] text-muted-foreground flex items-center mb-1.5">
            <Link href="/admin" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="mx-0.5 h-3 w-3" />
            <strong className="text-foreground font-semibold">Clients</strong>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Clients</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Manage all your brands and marketing Clients in one place.</p>
        </div>

        <div className="relative hidden h-[76px] overflow-hidden rounded-xl border bg-gradient-to-r from-white via-red-50/30 to-blue-50/50 px-4 py-3 lg:block">
          <p className="text-[13px] font-bold text-foreground">Turn Ideas Into Impact</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Build. Publish. Engage. Grow.</p>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-end gap-1">
            <div className="flex items-end gap-0.5 mb-1.5">
              <span className="h-4 w-2 rounded-t-sm bg-red-200" />
              <span className="h-7 w-2 rounded-t-sm bg-red-400" />
              <span className="h-10 w-2 rounded-t-sm bg-primary" />
            </div>
            <div className="ml-3 flex h-10 w-[100px] items-center justify-center rounded-lg border bg-white shadow-sm p-1.5 gap-1.5">
              <span className="grid size-5 place-items-center rounded-full border border-red-200 text-primary bg-red-50 text-[10px]">
                ◎
              </span>
              <div className="flex gap-0.5">
                <div className="size-3 rounded-full bg-[#1877F2]" />
                <div className="size-3 rounded-full bg-[#E4405F]" />
                <div className="size-3 rounded-full bg-[#0A66C2]" />
                <div className="size-3 rounded-full bg-[#FF0000]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat icon={BarChart3} label="Total Clients" value="4" trend="↑ 33%" note="+1 new this month" color="red" />
        <Stat icon={CheckCircle2} label="Active Clients" value="3" trend="↑ 25%" note="75% of total" color="green" />
        <Stat icon={Clock3} label="Paused" value="1" trend="" note="25% of total" color="amber" />
        <Stat icon={Link2} label="Total Channels" value="18" trend="↑ 20%" note="Avg. 4.5 per project" color="purple" />
        <Stat icon={UsersRound} label="Project Team Members" value="12" trend="" note="Across all Clients" color="blue" />
      </div>

      {/* Table Section */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-2.5 pt-1">
          <div className="flex self-end">
            {(
              [
                ["all", "All Clients (4)"],
                ["active", "Active (3)"],
                ["paused", "Paused (1)"],
                ["archived", "Archived (0)"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "relative h-9 px-3 text-[11px] font-semibold transition-colors",
                  filter === key
                    ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-t-full after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 py-1.5">
            <label className="flex h-8 w-[200px] items-center gap-1.5 rounded-lg border bg-muted/30 px-2 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                placeholder="Search Clients..."
              />
            </label>
            <button className="flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold hover:bg-accent hover:text-accent-foreground">
              <Filter className="size-3.5" />
              Filter
            </button>
            <button className="flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold hover:bg-accent hover:text-accent-foreground">
              <ArrowDownUp className="size-3.5" />
              Sort
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            <button className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors">
              <Plus className="size-3.5" />
              Add Project
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-muted/50 text-[10px] text-muted-foreground">
              <tr>
                <th className="w-8 pl-3 py-2"><input type="checkbox" className="rounded border-gray-300 size-3" /></th>
                {["Project", "Website", "Status", "Connected Channels", "Leads (30d)", "Campaigns", "SEO Score", "Last Activity", "Actions"].map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((project: any, index: number) => (
                <tr key={project.id} className="text-[11px] hover:bg-accent/50 transition-colors">
                  <td className="pl-3 py-1.5"><input type="checkbox" className="rounded border-gray-300 size-3" /></td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold border border-emerald-100" style={{ color: project.color || '#078359' }}>
                        {project.logoText}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/projects/${project.id}`} className="font-bold text-foreground hover:underline truncate block text-[12px]">
                          {project.name}
                        </Link>
                        <p className="w-[140px] truncate text-[9.5px] text-muted-foreground mt-0.5" title={project.description}>
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px]">
                    <a href={`https://${project.website}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      https://{project.website}
                      <Globe className="size-2.5" />
                    </a>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      project.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                      <span className={cn("size-1 rounded-full", project.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex -space-x-1">
                      {project.connectedChannels.slice(0, 4).map((channel: string) => (
                        <ChannelLogo key={channel} channel={channel} className="size-5 rounded-full border-2 border-white bg-white shadow-sm" />
                      ))}
                      {project.connectedChannels.length > 4 && (
                        <span className="grid size-5 place-items-center rounded-full border-2 border-white bg-muted text-[8px] font-semibold text-muted-foreground shadow-sm relative z-10">
                          +{project.connectedChannels.length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-[12px]">{project.leads}</strong>
                      <p className={cn("text-[10px] font-semibold", index === 3 ? "text-red-600" : "text-emerald-600")}>
                        {index === 3 ? "↓ 8%" : "↑ " + [24, 18, 12][index] + "%"}
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col gap-0">
                      <strong className="text-[12px]">{project.campaigns}</strong>
                      <p className="w-fit rounded bg-emerald-50 px-1 py-[1px] text-[8.5px] font-medium text-emerald-700 flex items-center gap-0.5">
                        <span className="size-1 rounded-full bg-emerald-500" />
                        {index === 3 ? 0 : Math.max(2, project.campaigns - 3)} active
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <Score value={project.seoScore} />
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground">{project.lastActivity || (index === 0 ? "2 hours ago" : index === 1 ? "5 hours ago" : index === 2 ? "1 day ago" : "3 days ago")}</p>
                    <p className="text-[9px] truncate max-w-[130px]">
                      {["Post published on Instagram", "New lead from website form", "Campaign updated", "No recent activity"][index]}
                    </p>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/projects/${project.id}`} className="rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-accent hover:text-accent-foreground shadow-sm bg-white">
                        Open
                      </Link>
                      <button className="grid size-6 place-items-center rounded-md border transition-colors hover:bg-accent hover:text-accent-foreground shadow-sm bg-white">
                        <MoreVertical className="size-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>Showing 1 to {rows.length} of {rows.length} Clients</span>
          <div className="flex items-center gap-1">
            <button className="grid size-6 place-items-center rounded-md border transition-colors hover:bg-accent disabled:opacity-50" disabled>
              <ChevronLeft className="size-3" />
            </button>
            <button className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground font-semibold shadow-sm">
              1
            </button>
            <button className="grid size-6 place-items-center rounded-md border transition-colors hover:bg-accent disabled:opacity-50" disabled>
              <ChevronRight className="size-3" />
            </button>
            <div className="ml-1 h-6 flex items-center rounded-md border px-2 transition-colors hover:bg-accent cursor-pointer">
              10 per page
              <ChevronDown className="ml-1 size-2.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Quick icon={Plus} title="Create a New Project" text="Add a new brand or initiative to start managing your marketing." action="Add Project" color="red" />
        <Quick icon={Link2} title="Connect Channels" text="Connect your social media, website and other channels." action="Manage Integrations" color="blue" />
        <Quick icon={Megaphone} title="Plan a Campaign" text="Create and launch a campaign across multiple channels." action="Create Campaign" color="red" />
        <Quick icon={BarChart3} title="Track Performance" text="See how your Clients are performing with detailed analytics." action="View Analytics" color="green" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend, note, color }: { icon: any; label: string; value: string; trend: string; note: string; color: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-primary",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-500",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-xl border bg-card p-2.5 shadow-sm flex items-start gap-2">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", colors[color])}>
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground mb-0">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-[18px] font-bold text-foreground">{value}</p>
          {trend && <span className="text-[10px] font-bold text-emerald-600">{trend}</span>}
        </div>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function Score({ value }: { value: number }) {
  const color = value >= 75 ? "#08A875" : value >= 60 ? "#F0A000" : "#F04455";
  return (
    <span
      className="grid size-9 place-items-center rounded-full text-[12px] font-bold shadow-sm"
      style={{
        background: `radial-gradient(closest-side, white 76%, transparent 77% 99%), conic-gradient(${color} ${value}%, #E9EDF3 0)`,
        color: color
      }}
    >
      {value}
    </span>
  );
}

function Quick({ icon: Icon, title, text, action, color }: { icon: any; title: string; text: string; action: string; color: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-primary",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex gap-2 rounded-xl border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", colors[color])}>
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col">
        <p className="text-[11px] font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-[9.5px] text-muted-foreground flex-1 leading-relaxed">{text}</p>
        <button className="mt-2 w-fit rounded-md border px-2 py-1 text-[9.5px] font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground bg-white">
          {action}
        </button>
      </div>
    </div>
  );
}

