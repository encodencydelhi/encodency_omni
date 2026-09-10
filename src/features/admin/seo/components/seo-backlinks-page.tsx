"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ExternalLink,
  Globe,
  Link2,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Unlink,
} from "lucide-react";
import { Box, Filter, Meter, Pill, SeoShell, Stat, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Total Backlinks", value: "1,248", trend: "↑ 18%", sub: "+192 this month", icon: Link2, color: "blue" },
  { label: "Referring Domains", value: "312", trend: "↑ 12%", sub: "+34 this month", icon: Globe, color: "purple" },
  { label: "Domain Rating", value: "58", trend: "↑ 3", sub: "out of 100", icon: Star, color: "green" },
  { label: "Follow Links", value: "84%", trend: "↑ 2%", sub: "1,048 dofollow", icon: TrendingUp, color: "teal" },
  { label: "Lost Backlinks", value: "46", trend: "↓ 11", sub: "last 30 days", icon: Unlink, color: "orange" },
  { label: "Toxic Links", value: "14", trend: "↓ 6", sub: "1.1% of total", icon: ShieldAlert, color: "red" },
];

const growth = [
  { d: "Mar 15", total: 1056, gained: 42, lost: -12 },
  { d: "Mar 20", total: 1092, gained: 48, lost: -14 },
  { d: "Mar 25", total: 1134, gained: 54, lost: -11 },
  { d: "Mar 30", total: 1168, gained: 46, lost: -18 },
  { d: "Apr 5", total: 1196, gained: 38, lost: -9 },
  { d: "Apr 10", total: 1224, gained: 44, lost: -13 },
  { d: "Apr 14", total: 1248, gained: 36, lost: -10 },
];

const linkTypes = [
  { name: "Text", value: 72, color: "#3186F3" },
  { name: "Image", value: 16, color: "#8B5CF6" },
  { name: "Redirect", value: 8, color: "#F59E0B" },
  { name: "Form", value: 4, color: "#CBD5E1" },
];

const drBuckets = [
  { bucket: "DR 70+", count: 24, color: "#10B981" },
  { bucket: "DR 50-69", count: 68, color: "#3186F3" },
  { bucket: "DR 30-49", count: 124, color: "#8B5CF6" },
  { bucket: "DR 10-29", count: 78, color: "#F59E0B" },
  { bucket: "DR 0-9", count: 18, color: "#CBD5E1" },
];

const anchors = [
  { text: "namo gange trust", pct: 24 },
  { text: "clean ganga", pct: 18 },
  { text: "river conservation ngo", pct: 14 },
  { text: "read more", pct: 11 },
  { text: "namogangetrust.org", pct: 9 },
  { text: "donate now", pct: 7 },
  { text: "other anchors", pct: 17 },
];

const domains = [
  { domain: "timesofindia.com", dr: 91, links: 42, first: "Jan 12, 2025", type: "News", follow: true },
  { domain: "downtoearth.org.in", dr: 78, links: 28, first: "Feb 04, 2025", type: "Editorial", follow: true },
  { domain: "thehindu.com", dr: 89, links: 21, first: "Feb 18, 2025", type: "News", follow: true },
  { domain: "indiawaterportal.org", dr: 64, links: 36, first: "Nov 22, 2024", type: "Directory", follow: true },
  { domain: "csrjournal.in", dr: 52, links: 18, first: "Mar 02, 2025", type: "Editorial", follow: true },
  { domain: "ngodarpan.gov.in", dr: 71, links: 6, first: "Sep 08, 2024", type: "Government", follow: true },
  { domain: "medium.com", dr: 95, links: 14, first: "Mar 14, 2025", type: "Blog", follow: false },
  { domain: "greenindiablog.in", dr: 38, links: 24, first: "Dec 19, 2024", type: "Blog", follow: true },
  { domain: "eventbrite.com", dr: 92, links: 9, first: "Apr 02, 2025", type: "Listing", follow: false },
  { domain: "riverwatch.in", dr: 44, links: 16, first: "Jan 30, 2025", type: "Directory", follow: true },
];

const recent = [
  { domain: "thehindu.com", page: "/environment/ganga-cleanup-2025", dr: 89, status: "new" },
  { domain: "csrjournal.in", page: "/csr-partners-river-projects", dr: 52, status: "new" },
  { domain: "greenindiablog.in", page: "/top-ngos-water", dr: 38, status: "new" },
  { domain: "oldblog.example", page: "/archive/ngo-list", dr: 22, status: "lost" },
  { domain: "spamdirectory.xyz", page: "/links/2024", dr: 4, status: "toxic" },
  { domain: "linkfarm.top", page: "/partners", dr: 2, status: "toxic" },
];

const statusMeta: Record<string, { tone: string; label: string }> = {
  new: { tone: "good", label: "New" },
  lost: { tone: "medium", label: "Lost" },
  toxic: { tone: "critical", label: "Toxic" },
};

function statusOf(status: string) {
  return statusMeta[status] ?? { tone: "neutral", label: status };
}

function drColor(dr: number) {
  if (dr >= 70) return "#10B981";
  if (dr >= 50) return "#3186F3";
  if (dr >= 30) return "#F59E0B";
  return "#EF4444";
}

const cols = "grid-cols-[1.7fr_.66fr_.56fr_.8fr_.72fr_.6fr]";

export function SeoBacklinksPage() {
  return (
    <SeoShell
      view="backlinks"
      title="Backlinks"
      description="Who links to you, how authoritative they are and which links you just won or lost."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[252px] xl:grid-cols-[1.5fr_.85fr_.85fr]">
        <Box title="Backlink Growth" action={<Filter label="Last 30 days" />}>
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="flex gap-3 text-[8.5px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#3186F3]" /> Total backlinks
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#10B981]" /> Gained
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#EF4444]" /> Lost
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <AreaChart data={growth} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3186F3" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3186F3" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} formatter={(v) => Math.abs(Number(v))} />
                  <Area dataKey="total" name="Total" stroke="#3186F3" strokeWidth={1.7} fill="url(#blTotal)" dot={{ r: 1.8, strokeWidth: 0, fill: "#3186F3" }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[54px]">
              <ResponsiveContainer>
                <BarChart data={growth} margin={{ top: 2, right: 6, left: -18, bottom: 0 }} barGap={0}>
                  <XAxis dataKey="d" hide />
                  <YAxis tick={{ fontSize: 7, fill: "#9AA6BC" }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip {...chartTooltip} formatter={(v) => Math.abs(Number(v))} />
                  <ReferenceLine y={0} stroke="#D7DFEA" />
                  <Bar dataKey="gained" name="Gained" fill="#10B981" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="lost" name="Lost" fill="#EF4444" radius={[0, 0, 2, 2]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Domains by Authority">
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="h-[104px]">
              <ResponsiveContainer>
                <BarChart data={drBuckets} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 7, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {drBuckets.map((bucket) => (
                      <Cell key={bucket.bucket} fill={bucket.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 space-y-0.5">
              {drBuckets.map((bucket) => (
                <span key={bucket.bucket} className="flex items-center gap-1.5 text-[8.5px]">
                  <i className="size-1.5 rounded-full" style={{ background: bucket.color }} />
                  <span className="flex-1 text-[#52617D]">{bucket.bucket}</span>
                  <b className="text-[#172044]">{bucket.count}</b>
                </span>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Anchor Text Distribution" action={<ViewAll />}>
          <div className="space-y-[7px] px-3 py-2.5">
            {anchors.map((anchor) => (
              <div key={anchor.text}>
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="min-w-0 truncate text-[#52617D]">{anchor.text}</span>
                  <b className="ml-2 shrink-0 text-[#172044]">{anchor.pct}%</b>
                </div>
                <Meter value={anchor.pct} max={24} color="#8B5CF6" className="mt-0.5" />
              </div>
            ))}
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[2.1fr_1fr]">
        <Box
          title="Top Referring Domains"
          className="h-[426px]"
          action={
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-[140px] items-center gap-1.5 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5">
                <Search className="size-3 text-[#9AA6BC]" />
                <input
                  className="w-full bg-transparent text-[8.5px] outline-none placeholder:text-[#9AA6BC]"
                  placeholder="Search domains..."
                />
              </span>
              <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">
                <SlidersHorizontal className="size-2.5" />
                Filters
              </button>
            </div>
          }
        >
          <div className="px-3">
            <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", cols)}>
              <span>Referring Domain</span>
              <span>Domain Rating</span>
              <span className="text-right">Backlinks</span>
              <span>First Seen</span>
              <span>Type</span>
              <span>Link</span>
            </div>
            {domains.map((row) => (
              <div
                key={row.domain}
                className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", cols)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Globe className="size-3 shrink-0 text-[#9AA6BC]" />
                  <span className="truncate font-semibold text-[#2C6FD1]">{row.domain}</span>
                  <ExternalLink className="size-2.5 shrink-0 text-[#9AA6BC]" />
                </span>
                <span className="flex items-center gap-1.5">
                  <Meter value={row.dr} color={drColor(row.dr)} className="min-w-0 flex-1" />
                  <b className="w-4 shrink-0 text-right text-[8.5px] text-[#172044]">{row.dr}</b>
                </span>
                <b className="text-right text-[#172044]">{row.links}</b>
                <span>{row.first}</span>
                <span className="truncate">{row.type}</span>
                <Pill tone={row.follow ? "good" : "neutral"}>{row.follow ? "Follow" : "Nofollow"}</Pill>
              </div>
            ))}
          </div>
        </Box>

        <div className="space-y-2">
          <Box title="Link Types" className="h-[144px]">
            <div className="flex h-full items-center gap-2 px-3 pb-2">
              <div className="relative size-[92px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={linkTypes} dataKey="value" innerRadius={27} outerRadius={42} strokeWidth={0} isAnimationActive={false}>
                      {linkTypes.map((type) => (
                        <Cell key={type.name} fill={type.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <span>
                    <b className="block text-[13px] leading-4 text-[#172044]">1,248</b>
                    <small className="text-[7px] text-[#71809D]">Links</small>
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {linkTypes.map((type) => (
                  <span key={type.name} className="flex items-center gap-1.5 text-[8.5px]">
                    <i className="size-1.5 shrink-0 rounded-full" style={{ background: type.color }} />
                    <span className="min-w-0 flex-1 truncate text-[#52617D]">{type.name}</span>
                    <b className="text-[#172044]">{type.value}%</b>
                  </span>
                ))}
              </div>
            </div>
          </Box>

          <Box title="New, Lost & Toxic" className="h-[274px]" action={<ViewAll />}>
            {recent.map((row) => (
              <div
                key={row.page}
                className="flex items-center gap-2 border-b border-[#EDF1F5] px-3 py-[6px] last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#2C6FD1]">{row.domain}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{row.page}</small>
                </span>
                <span className="shrink-0 text-[8.5px] font-bold" style={{ color: drColor(row.dr) }}>
                  DR {row.dr}
                </span>
                <Pill tone={statusOf(row.status).tone}>{statusOf(row.status).label}</Pill>
              </div>
            ))}
          </Box>
        </div>
      </div>
    </SeoShell>
  );
}
