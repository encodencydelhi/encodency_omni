"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Code,
  FileCode,
  Gauge,
  Globe,
  Info,
  Map,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  XCircle,
  Zap,
} from "lucide-react";
import { Box, Filter, Meter, Pill, SeoShell, Stat, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Site Health", value: "92/100", trend: "↑ 4", sub: "Good", icon: Gauge, color: "green", subTone: "text-[#10B981] font-semibold" },
  { label: "Critical Issues", value: "12", trend: "↓ 5", sub: "Fix these first", icon: ShieldAlert, color: "red" },
  { label: "Warnings", value: "28", trend: "↓ 9", sub: "Should be reviewed", icon: AlertTriangle, color: "orange" },
  { label: "Notices", value: "64", trend: "↑ 3", sub: "Low priority", icon: Info, color: "blue" },
  { label: "Passed Checks", value: "438", trend: "↑ 22", sub: "of 542 total", icon: CheckCircle2, color: "teal" },
  { label: "Crawled Pages", value: "142", trend: "↑ 8", sub: "Last crawl 6h ago", icon: Bot, color: "purple" },
];

const healthDonut = [
  { name: "Score", value: 92, color: "#10B981" },
  { name: "Remaining", value: 8, color: "#E8EDF3" },
];

const issueMix = [
  { name: "Critical", value: 12, color: "#EF4444" },
  { name: "Warnings", value: 28, color: "#F59E0B" },
  { name: "Notices", value: 64, color: "#3186F3" },
  { name: "Passed", value: 438, color: "#10B981" },
];

const crawlHistory = [
  { d: "Feb 14", issues: 92, health: 74 },
  { d: "Feb 28", issues: 84, health: 78 },
  { d: "Mar 14", issues: 71, health: 82 },
  { d: "Mar 21", issues: 62, health: 85 },
  { d: "Mar 28", issues: 54, health: 88 },
  { d: "Apr 7", issues: 46, health: 90 },
  { d: "Apr 14", issues: 40, health: 92 },
];

const vitals = [
  { name: "LCP", label: "Largest Contentful Paint", value: "2.1s", target: "< 2.5s", pct: 78, status: "Good" },
  { name: "INP", label: "Interaction to Next Paint", value: "148ms", target: "< 200ms", pct: 84, status: "Good" },
  { name: "CLS", label: "Cumulative Layout Shift", value: "0.14", target: "< 0.1", pct: 48, status: "Needs work" },
  { name: "TTFB", label: "Time to First Byte", value: "0.6s", target: "< 0.8s", pct: 88, status: "Good" },
];

const crawlChecks = [
  { label: "robots.txt", detail: "Found and valid", ok: true, icon: Bot },
  { label: "XML sitemap", detail: "128 URLs submitted", ok: true, icon: Map },
  { label: "Canonical tags", detail: "3 pages missing canonical", ok: false, icon: Code },
  { label: "Structured data", detail: "Organization + Article valid", ok: true, icon: FileCode },
  { label: "hreflang", detail: "Not configured (single locale)", ok: true, icon: Globe },
  { label: "HTTPS / SSL", detail: "Valid until Dec 2025", ok: true, icon: ShieldAlert },
  { label: "Mobile friendly", detail: "All pages pass", ok: true, icon: Smartphone },
  { label: "Core Web Vitals", detail: "CLS above threshold", ok: false, icon: Zap },
];

const issues = [
  { issue: "Pages missing meta description", category: "On-Page", severity: "critical", pages: 12, trend: -3 },
  { issue: "Images without alt attribute", category: "Accessibility", severity: "critical", pages: 28, trend: -6 },
  { issue: "Slow LCP (> 2.5s)", category: "Performance", severity: "high", pages: 8, trend: -2 },
  { issue: "Duplicate title tags", category: "On-Page", severity: "high", pages: 4, trend: 0 },
  { issue: "Cumulative Layout Shift above 0.1", category: "Performance", severity: "high", pages: 6, trend: 1 },
  { issue: "Broken internal links (404)", category: "Technical", severity: "medium", pages: 6, trend: -4 },
  { issue: "Missing canonical tag", category: "Technical", severity: "medium", pages: 3, trend: 0 },
  { issue: "Redirect chains longer than 2 hops", category: "Technical", severity: "medium", pages: 5, trend: -1 },
  { issue: "Thin content (< 300 words)", category: "Content", severity: "low", pages: 4, trend: 2 },
  { issue: "H1 missing or duplicated", category: "On-Page", severity: "low", pages: 7, trend: -2 },
  { issue: "Images larger than 200KB", category: "Performance", severity: "low", pages: 22, trend: -8 },
];

const statusCodes = [
  { code: "200 OK", count: 124, tone: "#10B981" },
  { code: "301 Moved", count: 12, tone: "#3186F3" },
  { code: "302 Found", count: 3, tone: "#8B5CF6" },
  { code: "404 Not Found", count: 6, tone: "#EF4444" },
  { code: "5xx Server Error", count: 1, tone: "#B91C1C" },
];

const severityLabel: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const cols = "grid-cols-[2.2fr_.8fr_.6fr_.5fr_.5fr_.6fr]";

export function SeoTechnicalPage() {
  return (
    <SeoShell
      view="technical"
      title="Technical SEO"
      description="Crawl health, Core Web Vitals and every issue standing between you and better rankings."
      action={
        <button className="flex h-8 items-center gap-1.5 rounded bg-[#EB0711] px-3 text-[9.5px] font-semibold text-white shadow-sm hover:bg-[#C90610]">
          <RefreshCw className="size-3.5" />
          Run Site Audit
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            {...stat}
            down={stat.label === "Notices"}
          />
        ))}
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[344px] xl:grid-cols-[.72fr_1.3fr_1fr]">
        <Box title="Site Health Score">
          <div className="flex h-full flex-col items-center justify-center px-3 pb-2">
            <div className="relative size-[128px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={healthDonut}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {healthDonut.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[26px] leading-7 text-[#142044]">
                    92<small className="text-[12px] font-semibold text-[#8A97AF]">/100</small>
                  </b>
                  <small className="text-[9px] text-[#71809D]">Site Health</small>
                </span>
              </div>
            </div>
            <p className="mt-1 text-[9px] font-semibold text-[#10B981]">
              ↑ 4 points <span className="font-normal text-[#8A97AF]">from last crawl</span>
            </p>
          </div>
        </Box>

        <Box title="Core Web Vitals" action={<Filter label="Mobile" />}>
          <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
            {vitals.map((vital) => (
              <div key={vital.name} className="rounded-lg border border-[#E4EAF2] bg-[#FBFCFE] px-2.5 py-2">
                <div className="flex items-center justify-between">
                  <b className="text-[9.5px] font-bold text-[#172044]">{vital.name}</b>
                  <Pill tone={vital.status === "Good" ? "good" : "medium"}>{vital.status}</Pill>
                </div>
                <p className="truncate text-[8px] text-[#8A97AF]">{vital.label}</p>
                <p className="mt-1 flex items-baseline gap-1.5">
                  <b className="text-[17px] leading-5 text-[#142044]">{vital.value}</b>
                  <span className="text-[8px] text-[#71809D]">{vital.target}</span>
                </p>
                <Meter
                  value={vital.pct}
                  color={vital.status === "Good" ? "#10B981" : "#F59E0B"}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </Box>

        <Box title="Crawlability Checks" action={<span className="text-[#10B981]">6 / 8 pass</span>}>
          <div className="px-3 py-1">
            {crawlChecks.map(({ label, detail, ok, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 border-b border-[#EDF1F5] py-[5px] last:border-b-0">
                <Icon className="size-3 shrink-0 text-[#9AA6BC]" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#172044]">{label}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{detail}</small>
                </span>
                {ok ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-[#10B981]" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-[#EF4444]" />
                )}
              </div>
            ))}
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2">
        <Box
          title="All Detected Issues"
          className="h-[452px]"
          action={
            <div className="flex items-center gap-1.5">
              <Filter label="All severities" />
              <Filter label="All categories" />
              <ViewAll label="Export" />
            </div>
          }
        >
          <div className="px-3">
            <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", cols)}>
              <span>Issue</span>
              <span>Category</span>
              <span>Severity</span>
              <span className="text-right">Pages</span>
              <span className="text-right">Trend</span>
              <span className="text-right">Action</span>
            </div>
            {issues.map((row) => (
              <div
                key={row.issue}
                className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", cols)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <AlertTriangle
                    className={cn(
                      "size-3 shrink-0",
                      row.severity === "critical"
                        ? "text-[#EF4444]"
                        : row.severity === "high"
                          ? "text-[#F97316]"
                          : row.severity === "medium"
                            ? "text-[#F59E0B]"
                            : "text-[#3186F3]",
                    )}
                  />
                  <span className="truncate font-semibold text-[#172044]">{row.issue}</span>
                </span>
                <span className="truncate">{row.category}</span>
                <Pill tone={row.severity}>{severityLabel[row.severity]}</Pill>
                <b className="text-right text-[#172044]">{row.pages}</b>
                <span className="text-right">
                  {row.trend === 0 ? (
                    <span className="text-[8.5px] text-[#8A97AF]">—</span>
                  ) : (
                    <span
                      className={cn(
                        "text-[9px] font-bold",
                        row.trend < 0 ? "text-[#10B981]" : "text-[#EF4444]",
                      )}
                    >
                      {row.trend < 0 ? "↓" : "↑"} {Math.abs(row.trend)}
                    </span>
                  )}
                </span>
                <button className="justify-self-end rounded border border-[#DDE4ED] px-1.5 py-0.5 text-[8px] font-semibold text-[#425273] hover:bg-[#F8FAFD]">
                  Fix
                </button>
              </div>
            ))}
          </div>
        </Box>

      </div>

      <div className="grid items-start gap-2 [&>section]:h-[200px] xl:grid-cols-[.9fr_.9fr_1.6fr]">
        <Box title="Issue Breakdown">
            <div className="flex h-full items-center gap-2 px-3 pb-2">
              <div className="relative size-[96px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={issueMix} dataKey="value" innerRadius={28} outerRadius={44} strokeWidth={0} isAnimationActive={false}>
                      {issueMix.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <span>
                    <b className="block text-[14px] leading-4 text-[#172044]">542</b>
                    <small className="text-[7px] text-[#71809D]">Checks</small>
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {issueMix.map((slice) => (
                  <span key={slice.name} className="flex items-center gap-1.5 text-[8.5px]">
                    <i className="size-1.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                    <span className="min-w-0 flex-1 truncate text-[#52617D]">{slice.name}</span>
                    <b className="text-[#172044]">{slice.value}</b>
                  </span>
                ))}
              </div>
            </div>
          </Box>

          <Box title="HTTP Status Codes">
            <div className="space-y-1.5 px-3 py-2">
              {statusCodes.map((row) => (
                <div key={row.code}>
                  <div className="flex items-center justify-between text-[8.5px]">
                    <span className="text-[#52617D]">{row.code}</span>
                    <b className="text-[#172044]">{row.count}</b>
                  </div>
                  <Meter value={row.count} max={124} color={row.tone} className="mt-0.5" />
                </div>
              ))}
            </div>
      </Box>

        <Box title="Audit History" action={<Filter label="Last 60 days" />}>
        <div className="flex h-full flex-col px-3 pb-2 pt-1">
          <div className="flex gap-3 text-[8.5px] font-semibold text-[#52617D]">
            <span className="flex items-center gap-1.5">
              <i className="size-1.5 rounded-full bg-[#10B981]" /> Site health score
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-1.5 rounded-full bg-[#EF4444]" /> Open issues
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer>
              <AreaChart data={crawlHistory} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="techHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EDF1F7" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip {...chartTooltip} />
                <Area dataKey="health" name="Health score" stroke="#10B981" strokeWidth={1.7} fill="url(#techHealth)" dot={{ r: 1.8, strokeWidth: 0, fill: "#10B981" }} isAnimationActive={false} />
                <Area dataKey="issues" name="Open issues" stroke="#EF4444" strokeWidth={1.6} fill="transparent" dot={{ r: 1.8, strokeWidth: 0, fill: "#EF4444" }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        </Box>
      </div>
    </SeoShell>
  );
}
