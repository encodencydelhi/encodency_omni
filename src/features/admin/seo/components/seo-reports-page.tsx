"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BarChart3,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  Mail,
  Plus,
  Search,
  Send,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Box, Filter, Pill, SeoShell, Stat, Toggle, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Scheduled Reports", value: "6", trend: "↑ 2", sub: "4 active, 2 paused", icon: CalendarClock, color: "blue" },
  { label: "Sent This Month", value: "24", trend: "↑ 8", sub: "100% delivered", icon: Send, color: "green" },
  { label: "Recipients", value: "18", trend: "↑ 3", sub: "across 5 teams", icon: Users, color: "purple" },
  { label: "Templates", value: "9", trend: "↑ 1", sub: "3 custom built", icon: FileText, color: "orange" },
  { label: "Avg. Open Rate", value: "78%", trend: "↑ 6%", sub: "last 90 days", icon: Mail, color: "teal" },
];

const sendVolume = [
  { m: "Nov", sent: 12 },
  { m: "Dec", sent: 14 },
  { m: "Jan", sent: 16 },
  { m: "Feb", sent: 18 },
  { m: "Mar", sent: 21 },
  { m: "Apr", sent: 24 },
];

const templates = [
  { name: "Monthly SEO Summary", detail: "Traffic, rankings, issues and wins in one page.", icon: BarChart3, color: "blue", sections: 8 },
  { name: "Keyword Ranking Report", detail: "Position changes across all tracked keywords.", icon: Target, color: "purple", sections: 5 },
  { name: "Technical Audit Report", detail: "Crawl issues grouped by severity with fixes.", icon: FileText, color: "red", sections: 7 },
  { name: "Backlink Profile Report", detail: "New, lost and toxic links plus authority mix.", icon: Link2, color: "teal", sections: 6 },
  { name: "Competitor Benchmark", detail: "Share of voice and keyword gaps versus rivals.", icon: Users, color: "orange", sections: 6 },
  { name: "Executive One-Pager", detail: "Headline metrics for leadership and trustees.", icon: FileSpreadsheet, color: "green", sections: 4 },
];

const scheduled = [
  { name: "Monthly SEO Summary", type: "Summary", frequency: "Monthly · 1st, 9:00 AM", recipients: 8, next: "May 1, 2025", format: "PDF", active: true },
  { name: "Weekly Ranking Digest", type: "Keywords", frequency: "Weekly · Mon, 8:00 AM", recipients: 5, next: "Apr 21, 2025", format: "PDF", active: true },
  { name: "Technical Audit Alert", type: "Technical", frequency: "Weekly · Fri, 6:00 PM", recipients: 3, next: "Apr 18, 2025", format: "PDF", active: true },
  { name: "Backlink Movement", type: "Backlinks", frequency: "Bi-weekly · Wed", recipients: 4, next: "Apr 23, 2025", format: "CSV", active: true },
  { name: "Competitor Benchmark", type: "Competitors", frequency: "Monthly · 15th", recipients: 6, next: "May 15, 2025", format: "PDF", active: false },
  { name: "Trustee One-Pager", type: "Executive", frequency: "Quarterly", recipients: 12, next: "Jun 30, 2025", format: "PDF", active: false },
];

const history = [
  { name: "Monthly SEO Summary", period: "Mar 2025", generated: "Apr 1, 2025 · 9:02 AM", size: "1.8 MB", format: "PDF", status: "sent" },
  { name: "Weekly Ranking Digest", period: "Apr 7 – Apr 13", generated: "Apr 14, 2025 · 8:01 AM", size: "412 KB", format: "PDF", status: "sent" },
  { name: "Technical Audit Alert", period: "Apr 11", generated: "Apr 11, 2025 · 6:00 PM", size: "684 KB", format: "PDF", status: "sent" },
  { name: "Backlink Movement", period: "Mar 26 – Apr 9", generated: "Apr 9, 2025 · 10:14 AM", size: "96 KB", format: "CSV", status: "sent" },
  { name: "Weekly Ranking Digest", period: "Mar 31 – Apr 6", generated: "Apr 7, 2025 · 8:01 AM", size: "408 KB", format: "PDF", status: "sent" },
  { name: "Competitor Benchmark", period: "Mar 2025", generated: "Mar 15, 2025 · 9:00 AM", size: "2.1 MB", format: "PDF", status: "failed" },
  { name: "Monthly SEO Summary", period: "Feb 2025", generated: "Mar 1, 2025 · 9:03 AM", size: "1.7 MB", format: "PDF", status: "sent" },
];

const recipients = [
  { name: "Ankit Verma", email: "ankit@namogangetrust.org", role: "Company Admin", reports: 6 },
  { name: "Priya Sharma", email: "priya@namogangetrust.org", role: "Marketing Lead", reports: 5 },
  { name: "Rahul Mehta", email: "rahul@encodency.com", role: "SEO Analyst", reports: 6 },
  { name: "Neha Gupta", email: "neha@namogangetrust.org", role: "Content Manager", reports: 3 },
  { name: "Trustee Board", email: "board@namogangetrust.org", role: "Distribution list", reports: 2 },
];

const quickExports = [
  { label: "Keyword rankings", format: "CSV" },
  { label: "Page performance", format: "CSV" },
  { label: "Technical issues", format: "XLSX" },
  { label: "Backlink profile", format: "CSV" },
  { label: "Full SEO snapshot", format: "PDF" },
];

const tint: Record<string, string> = {
  blue: "bg-[#EAF2FF] text-[#3186F3]",
  purple: "bg-[#F2EAFF] text-[#805AD5]",
  green: "bg-[#EAF5EF] text-[#0FA968]",
  orange: "bg-[#FFF0DC] text-[#F28C28]",
  red: "bg-[#FFEAEC] text-[#EA111B]",
  teal: "bg-[#E2F6F5] text-[#0E9C92]",
};

const scheduleCols = "grid-cols-[1.5fr_.7fr_1.3fr_.66fr_.8fr_.5fr_.7fr]";
const historyCols = "grid-cols-[1.5fr_.9fr_1.2fr_.56fr_.5fr_.6fr_.4fr]";

export function SeoReportsPage() {
  return (
    <SeoShell
      view="reports"
      title="Reports"
      description="Build, schedule and deliver SEO reporting to the people who need it."
      action={
        <button className="flex h-8 items-center gap-1.5 rounded bg-[#EB0711] px-3 text-[9.5px] font-semibold text-white shadow-sm hover:bg-[#C90610]">
          <Plus className="size-3.5" />
          Create Report
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[2.2fr_1fr]">
        <Box title="Report Templates" className="h-[336px]" action={<ViewAll label="Browse all" />}>
          <div className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-3">
            {templates.map(({ name, detail, icon: Icon, color, sections }) => (
              <article
                key={name}
                className="group rounded-lg border border-[#E4EAF2] bg-[#FBFCFE] p-2.5 transition-colors hover:border-[#C9D6E8] hover:bg-white"
              >
                <span className={cn("grid size-7 place-items-center rounded-lg", tint[color])}>
                  <Icon className="size-3.5" />
                </span>
                <b className="mt-1.5 block truncate text-[9.5px] font-bold text-[#172044]">{name}</b>
                <p className="mt-0.5 line-clamp-2 text-[8px] leading-3 text-[#8A97AF]">{detail}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[8px] text-[#9AA6BC]">{sections} sections</span>
                  <button className="rounded border border-[#DDE4ED] bg-white px-1.5 py-0.5 text-[8px] font-bold text-[#EB0711]">
                    Use
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Box>

        <div className="space-y-2">
          <Box title="Send Volume" className="h-[124px]" action={<Filter label="6 months" />}>
            <div className="h-full px-3 pb-2 pt-1">
              <ResponsiveContainer>
                <BarChart data={sendVolume} margin={{ top: 6, right: 4, left: -26, bottom: 0 }}>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="sent" name="Reports sent" fill="#3186F3" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Box>

          <Box title="Quick Export" className="h-[204px]">
            <div className="grid grid-cols-1 gap-1 p-2">
              {quickExports.map((row) => (
                <button
                  key={row.label}
                  className="flex items-center gap-2 rounded border border-[#E4EAF2] px-2 py-1 text-left text-[8.5px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]"
                >
                  <Download className="size-3 shrink-0 text-[#9AA6BC]" />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  <Pill tone="neutral">{row.format}</Pill>
                </button>
              ))}
            </div>
          </Box>
        </div>
      </div>

      <Box
        title="Scheduled Reports"
        className="h-[264px]"
        action={
          <div className="flex items-center gap-1.5">
            <Filter label="All types" />
            <Filter label="All statuses" />
          </div>
        }
      >
        <div className="px-3">
          <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", scheduleCols)}>
            <span>Report</span>
            <span>Type</span>
            <span>Frequency</span>
            <span className="text-right">Recipients</span>
            <span>Next Run</span>
            <span>Format</span>
            <span className="text-right">Status</span>
          </div>
          {scheduled.map((row) => (
            <div
              key={row.name}
              className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", scheduleCols)}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <FileText className="size-3 shrink-0 text-[#9AA6BC]" />
                <b className="truncate text-[9px] text-[#172044]">{row.name}</b>
              </span>
              <span className="truncate">{row.type}</span>
              <span className="truncate">{row.frequency}</span>
              <span className="text-right">
                <b className="text-[#172044]">{row.recipients}</b>
              </span>
              <span className="whitespace-nowrap">{row.next}</span>
              <Pill tone="neutral">{row.format}</Pill>
              <span className="flex items-center justify-end gap-2">
                <Pill tone={row.active ? "good" : "neutral"}>{row.active ? "Active" : "Paused"}</Pill>
                <Toggle on={row.active} />
              </span>
            </div>
          ))}
        </div>
      </Box>

      <div className="grid items-start gap-2 xl:grid-cols-[2fr_1fr]">
        <Box
          title="Report History"
          className="h-[318px]"
          action={
            <span className="flex h-6 w-[140px] items-center gap-1.5 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5">
              <Search className="size-3 text-[#9AA6BC]" />
              <input
                className="w-full bg-transparent text-[8.5px] outline-none placeholder:text-[#9AA6BC]"
                placeholder="Search history..."
              />
            </span>
          }
        >
          <div className="px-3">
            <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", historyCols)}>
              <span>Report</span>
              <span>Period</span>
              <span>Generated</span>
              <span className="text-right">Size</span>
              <span>Format</span>
              <span>Status</span>
              <span className="text-right">Get</span>
            </div>
            {history.map((row, index) => (
              <div
                key={`${row.name}-${index}`}
                className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", historyCols)}
              >
                <b className="truncate text-[9px] text-[#172044]">{row.name}</b>
                <span className="truncate">{row.period}</span>
                <span className="truncate">{row.generated}</span>
                <span className="text-right">{row.size}</span>
                <Pill tone="neutral">{row.format}</Pill>
                <Pill tone={row.status === "sent" ? "good" : "critical"}>
                  {row.status === "sent" ? "Sent" : "Failed"}
                </Pill>
                <span className="flex items-center justify-end gap-1">
                  <button className="rounded p-0.5 text-[#3186F3] hover:bg-[#EAF2FF]">
                    <Download className="size-3" />
                  </button>
                  <button className="rounded p-0.5 text-[#EF4444] hover:bg-[#FFEAEC]">
                    <Trash2 className="size-3" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Box>

        <Box
          title="Recipients"
          className="h-[318px]"
          action={
            <button className="flex items-center gap-1 text-[9px] font-semibold text-[#EB0711]">
              <Plus className="size-3" />
              Add
            </button>
          }
        >
          <div className="px-3">
            {recipients.map((row) => (
              <div
                key={row.email}
                className="flex items-center gap-2 border-b border-[#EDF1F5] py-2 last:border-b-0"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[9px] font-bold text-[#1A6BC4]">
                  {row.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#172044]">{row.name}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{row.email}</small>
                </span>
                <span className="shrink-0 text-right">
                  <Pill tone="low">{row.role}</Pill>
                  <small className="mt-0.5 block text-[8px] text-[#9AA6BC]">{row.reports} reports</small>
                </span>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </SeoShell>
  );
}
