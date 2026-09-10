"use client";

import {
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  BarChart,
  Bar
} from "recharts";
import {
  ChevronDown,
  MousePointerClick,
  Eye,
  BarChart3,
  Percent,
  FileText,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { Box, SeoShell } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

// --- Mock Data ---

const topStats = [
  { label: "Organic Clicks", value: "12,482", trend: "↑ 28%", sub: "vs last 30 days", icon: MousePointerClick, color: "blue" },
  { label: "Impressions", value: "248,914", trend: "↑ 18%", sub: "vs last 30 days", icon: Eye, color: "purple" },
  { label: "Avg. Position", value: "14.6", trend: "↑ 3.2", sub: "(lower is better)", icon: BarChart3, color: "green" },
  { label: "CTR", value: "4.9%", trend: "↑ 0.8%", sub: "vs last 30 days", icon: Percent, color: "orange" },
  { label: "Indexed Pages", value: "124", trend: "↑ 6%", sub: "out of 128 submitted", icon: FileText, color: "blue" },
  { label: "Page Health", value: "92/100", trend: "↑ 4", sub: "Good", icon: HeartPulse, color: "green" },
];

const performanceData = [
  { d: "Mar 15", clicks: 12000, impressions: 20000, ctr: 3.5, pos: 18 },
  { d: "Mar 20", clicks: 15000, impressions: 22000, ctr: 4.0, pos: 17 },
  { d: "Mar 25", clicks: 18000, impressions: 25000, ctr: 4.2, pos: 16 },
  { d: "Mar 30", clicks: 22000, impressions: 30000, ctr: 4.5, pos: 15 },
  { d: "Apr 5", clicks: 25000, impressions: 32000, ctr: 4.8, pos: 14.5 },
  { d: "Apr 10", clicks: 28000, impressions: 35000, ctr: 5.0, pos: 14 },
  { d: "Apr 14", clicks: 31000, impressions: 48000, ctr: 5.2, pos: 13.5 },
];

const keywords = [
  { kw: "clean ganga", pos: 3, change: "↑ 12", vol: "4,400", up: true },
  { kw: "ganga river conservation", pos: 5, change: "↑ 8", vol: "2,900", up: true },
  { kw: "water pollution control", pos: 7, change: "↑ 6", vol: "1,600", up: true },
  { kw: "ngo in delhi", pos: 9, change: "↑ 5", vol: "1,300", up: true },
  { kw: "river cleaning initiative", pos: 11, change: "↑ 4", vol: "880", up: true },
];

const auditData = [
  { name: "Critical", value: 12, color: "#EF4444" },
  { name: "Warnings", value: 28, color: "#F59E0B" },
  { name: "Notices", value: 64, color: "#3B82F6" },
  { name: "Passed", value: 438, color: "#10B981" },
];

const backlinksData = [
  { d: "Mar 15", val: 800 },
  { d: "Mar 20", val: 950 },
  { d: "Mar 25", val: 1050 },
  { d: "Mar 30", val: 1100 },
  { d: "Apr 5", val: 1180 },
  { d: "Apr 14", val: 1248 },
];

const topPages = [
  { path: "/", clicks: "4,820", trend: "↑ 22%" },
  { path: "/about-us", clicks: "1,940", trend: "↑ 18%" },
  { path: "/our-work", clicks: "1,532", trend: "↑ 35%" },
  { path: "/blog/clean-ganga-initiative", clicks: "1,220", trend: "↑ 28%" },
  { path: "/contact", clicks: "980", trend: "↑ 12%" },
];

const recentIssues = [
  { issue: "Missing meta description", type: "On-Page", pages: 12, priority: "High" },
  { issue: "Images without alt text", type: "On-Page", pages: 28, priority: "High" },
  { issue: "Slow LCP (> 2.5s)", type: "Performance", pages: 8, priority: "Medium" },
  { issue: "Duplicate title tags", type: "On-Page", pages: 4, priority: "Medium" },
  { issue: "Broken internal links", type: "Technical", pages: 6, priority: "Low" },
];

const competitorData = [
  { name: "Organic Traffic", site: 150, c1: 120, c2: 80, c3: 40 },
  { name: "Keywords", site: 60, c1: 50, c2: 30, c3: 20 },
  { name: "Backlinks", site: 110, c1: 90, c2: 60, c3: 30 },
  { name: "Domain Authority", site: 80, c1: 75, c2: 65, c3: 50 },
];

const seoTasks = [
  { task: "Optimize meta titles for blog pages", priority: "High", due: "Apr 15" },
  { task: "Add alt text to new images", priority: "Medium", due: "Apr 16" },
  { task: "Fix broken internal links", priority: "High", due: "Apr 17" },
  { task: "Improve page speed (mobile)", priority: "Medium", due: "Apr 18" },
  { task: "Submit new sitemap to Google", priority: "Low", due: "Apr 20" },
];

// --- Components ---

export function SeoOverviewPage() {
  return (
    <SeoShell
      view="overview"
      title="SEO Overview"
      description="Track your website's search performance, fix issues and grow organic traffic."
    >
      {/* Row 1: Metrics */}
      <div className="grid grid-cols-6 gap-2">
        {topStats.map((stat, i) => {
          const c: Record<string, string> = {
            blue: "bg-[#EAF2FF] text-[#3186F3]",
            purple: "bg-[#F2EAFF] text-[#805AD5]",
            green: "bg-[#EAF5EF] text-[#25D366]",
            orange: "bg-[#FFF0DC] text-[#F28C28]",
          };
          return (
            <div key={i} className="flex min-h-[70px] items-center gap-3 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
              <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", c[stat.color])}><stat.icon className="size-[18px]" /></span>
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-bold text-[#52617D]">{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-[20px] font-bold tracking-[-0.02em] text-[#142044]">{stat.value}</b>
                  <span className={cn("text-[9px] font-bold whitespace-nowrap", stat.trend.includes("↑") || stat.trend.includes("9") ? "text-[#00A66A]" : "text-[#EA111B]")}>{stat.trend}</span>
                </div>
                <p className={cn("text-[8px]", i === 5 ? "text-[#10B981] font-semibold" : "text-[#71809D]")}>{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="grid h-[320px] grid-cols-[1.8fr_1fr_.7fr] gap-2">
        <Box title="Performance Trend" action={
          <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">Last 30 days <ChevronDown className="size-2.5" /></button>
        }>
          <div className="px-3 py-1 flex flex-col h-full">
            <div className="mb-2 flex gap-4 text-[9px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#3186F3] size-3 rounded-sm" /> Clicks</span>
              <span className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#8B5CF6] size-3 rounded-sm" /> Impressions</span>
              <span className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#F59E0B] size-3 rounded-sm" /> CTR</span>
              <span className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#10B981] size-3 rounded-sm" /> Avg. Position</span>
            </div>
            <div className="flex-1 min-h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3186F3" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Keyword Rankings" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 border-b border-[#DDE4ED] px-3 pt-1">
              {["Top Gaining", "Top Pages", "Top Losing"].map((tab, i) => (
                <button key={tab} className={cn("pb-1.5 text-[8.5px] font-bold", i === 0 ? "border-b-2 border-[#EB0711] text-[#172044]" : "text-[#71809D] hover:text-[#38444D]")}>{tab}</button>
              ))}
            </div>
            <div className="px-3 pt-1 flex-1 overflow-y-auto [scrollbar-width:thin]">
              <div className="grid grid-cols-[1.5fr_.5fr_.5fr_.6fr] py-1 text-[8px] font-bold text-[#71809D]">
                <span>Keyword</span>
                <span className="text-right">Position</span>
                <span className="text-right">Change</span>
                <span className="text-right">Search Vol.</span>
              </div>
              {keywords.map((kw, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_.5fr_.5fr_.6fr] border-t border-[#EDF1F5] py-2 text-[9px] font-semibold items-center">
                  <span className="text-[#172044] truncate">{kw.kw}</span>
                  <span className="text-right text-[#52617D]">{kw.pos}</span>
                  <span className="text-right text-[#10B981]">{kw.change}</span>
                  <span className="text-right text-[#52617D]">{kw.vol}</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="SEO Score">
          <div className="p-3 flex flex-col items-center h-full">
            <div className="relative size-[100px] shrink-0 mb-4">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="92, 100" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[22px] text-[#172044] font-bold leading-none">92</b>
                  <small className="text-[8px] text-[#71809D]">Excellent</small>
                </span>
              </div>
            </div>
            <div className="w-full space-y-1.5">
              {["Meta Tags", "Content Quality", "Technical SEO", "Mobile Usability", "Page Speed", "Structured Data", "Backlinks"].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-[8.5px] font-semibold text-[#52617D]">
                  <CheckCircle2 className="size-3 text-[#10B981]" /> {item}
                </div>
              ))}
            </div>
            <button className="mt-auto w-full rounded border border-[#DDE4ED] py-1 text-[9px] font-bold text-[#172044]">View Detailed Report →</button>
          </div>
        </Box>
      </div>

      {/* Row 3 */}
      <div className="grid h-[228px] grid-cols-[1.2fr_1fr_1.4fr_1fr] gap-2">
        <Box title="Site Audit Summary" action={<button className="flex h-6 items-center rounded border border-[#DDE4ED] px-2 text-[8.5px] font-bold text-[#172044]">View All Issues →</button>}>
          <div className="flex h-full items-center px-2">
            <div className="relative size-[110px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={auditData} dataKey="value" innerRadius={35} outerRadius={50} strokeWidth={0}>
                    {auditData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[18px] font-bold text-[#172044]">142</b>
                  <small className="text-[7.5px] leading-tight text-[#71809D]">Total Issues</small>
                </span>
              </div>
            </div>
            <div className="ml-4 flex-1 space-y-2">
              {auditData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[9.5px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                  <span className="text-[#172044] font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Page Speed Insights" action={
          <div className="flex rounded-md border border-[#DDE4ED] bg-[#F8FAFC] p-0.5 text-[8.5px]">
            <button className="rounded px-2 py-0.5 bg-white shadow-sm font-bold text-[#172044]">Desktop</button>
            <button className="rounded px-2 py-0.5 text-[#71809D] font-semibold">Mobile</button>
          </div>
        }>
          <div className="flex h-full flex-col">
          <div className="flex min-h-0 flex-1 items-center px-4">
            <div className="relative size-[90px] shrink-0">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeDasharray="78, 100" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[18px] font-bold text-[#172044]">78</b>
                  <small className="text-[8px] text-[#F59E0B] font-bold">Good</small>
                </span>
              </div>
            </div>
            <div className="ml-6 flex-1 space-y-3">
              <div className="flex justify-between items-center text-[10px]"><span className="text-[#71809D] font-semibold">LCP</span><span className="font-bold text-[#F59E0B]">2.1s</span></div>
              <div className="flex justify-between items-center text-[10px]"><span className="text-[#71809D] font-semibold">INP</span><span className="font-bold text-[#10B981]">120ms</span></div>
              <div className="flex justify-between items-center text-[10px]"><span className="text-[#71809D] font-semibold">CLS</span><span className="font-bold text-[#10B981]">0.05</span></div>
            </div>
          </div>
          <div className="shrink-0 px-4 pb-3"><button className="w-full rounded border border-[#DDE4ED] py-1 text-[9px] font-bold text-[#172044]">View Page Speed Report →</button></div>
          </div>
        </Box>

        <Box title="Backlinks Overview" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="p-3 flex flex-col h-full">
            <div className="flex justify-between mb-2">
              <div>
                <div className="text-[8.5px] text-[#71809D] font-semibold">Total Backlinks</div>
                <div className="text-[14px] font-bold text-[#172044]">1,248 <span className="text-[8px] text-[#10B981]">↑ 18%</span></div>
              </div>
              <div>
                <div className="text-[8.5px] text-[#71809D] font-semibold">Referring Domains</div>
                <div className="text-[14px] font-bold text-[#172044]">312 <span className="text-[8px] text-[#10B981]">↑ 12%</span></div>
              </div>
              <div>
                <div className="text-[8.5px] text-[#71809D] font-semibold">Domain Authority</div>
                <div className="text-[14px] font-bold text-[#172044]">36 <span className="text-[8px] text-[#10B981]">↑ 4</span></div>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={backlinksData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 7, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 7, fill: "#71809D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                  <Line type="monotone" dataKey="val" stroke="#3186F3" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Top Performing Pages" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-3 py-1 h-full">
            <div className="grid grid-cols-[1fr_.4fr_.4fr] py-1 text-[8.5px] font-bold text-[#71809D]">
              <span>Page</span>
              <span className="text-right">Clicks</span>
              <span></span>
            </div>
            {topPages.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_.4fr_.4fr] border-t border-[#EDF1F5] py-2 text-[9px] font-semibold items-center">
                <span className="text-[#172044] truncate pr-2">{p.path}</span>
                <span className="text-right text-[#52617D]">{p.clicks}</span>
                <span className="text-right text-[#10B981]">{p.trend}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 4 */}
      <div className="grid h-[266px] grid-cols-[1.5fr_1.5fr_1fr] gap-2">
        <Box title="Recent SEO Issues" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-3 py-1">
            <div className="grid grid-cols-[1.2fr_.6fr_.6fr_.4fr] py-1.5 text-[8.5px] font-bold text-[#71809D]">
              <span>Issue</span>
              <span>Type</span>
              <span className="text-right">Affected Pages</span>
              <span className="text-right">Priority</span>
            </div>
            {recentIssues.map((issue, i) => (
              <div key={i} className="grid grid-cols-[1.2fr_.6fr_.6fr_.4fr] border-t border-[#EDF1F5] py-2.5 text-[9px] font-semibold items-center">
                <span className="flex items-center gap-1.5 text-[#172044] truncate pr-2">
                  {issue.priority === 'High' ? <AlertTriangle className="size-3 text-[#EF4444] shrink-0" /> : <Info className="size-3 text-[#3B82F6] shrink-0" />}
                  {issue.issue}
                </span>
                <span className="text-[#71809D]">{issue.type}</span>
                <span className="text-right text-[#172044]">{issue.pages}</span>
                <span className="flex justify-end">
                  <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold",
                    issue.priority === "High" ? "bg-[#FFE4E6] text-[#E11D48]" :
                      issue.priority === "Medium" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#15803D]"
                  )}>{issue.priority}</span>
                </span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Competitor Comparison" action={
          <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#172044]">Organic Traffic <ChevronDown className="size-2.5" /></button>
        }>
          <div className="p-3 h-full flex flex-col">
            <div className="flex gap-4 text-[8.5px] font-semibold text-[#52617D] mb-4">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#3B82F6]" /> Your Site</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#A855F7]" /> Competitor 1</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#F59E0B]" /> Competitor 2</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#10B981]" /> Competitor 3</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={competitorData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <Bar dataKey="site" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={10} />
                  <Bar dataKey="c1" fill="#A855F7" radius={[2, 2, 0, 0]} barSize={10} />
                  <Bar dataKey="c2" fill="#F59E0B" radius={[2, 2, 0, 0]} barSize={10} />
                  <Bar dataKey="c3" fill="#10B981" radius={[2, 2, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="SEO Tasks" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-3 pt-2">
            {seoTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-3">
                <div className="size-3.5 rounded border border-[#cbd5e1] shrink-0" />
                <span className="text-[9px] font-semibold text-[#172044] flex-1 truncate">{t.task}</span>
                <span className={cn("px-1 py-0.5 rounded text-[7.5px] font-bold",
                  t.priority === "High" ? "bg-[#FFE4E6] text-[#E11D48]" :
                    t.priority === "Medium" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#15803D]"
                )}>{t.priority}</span>
                <span className="text-[8px] text-[#A0ABBA] w-8 text-right">{t.due}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </SeoShell>
  );
}
