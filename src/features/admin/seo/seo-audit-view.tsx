import { useState } from "react";
import {
  RefreshCw, Download, MoreVertical, Calendar,
  ArrowUp, ArrowDown, AlertCircle, AlertTriangle,
  Info, CheckCircle2, ChevronRight, Play, ArrowLeftRight,
  FileText, CalendarPlus, Lightbulb, FileSearch,
  Filter, Search, ExternalLink, Link as LinkIcon, Image as ImageIcon,
  ShieldCheck, Globe, Key, ChevronDown, X, Lock
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function SeoAuditView() {
  const [activeTab, setActiveTab] = useState("Overview");

  const tabs = ["Overview", "Issues (142)", "Crawl Explorer", "Page Analysis", "Technical SEO", "Core Web Vitals", "Structured Data", "Security", "Settings"];

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className="mx-auto max-w-[1500px] space-y-4 pb-10 text-[#172044]">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E3E9F1] bg-gradient-to-r from-white to-[#F7FAFE] p-4 shadow-sm xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-[#75829D] font-medium mb-1">
              <span>SEO</span>
              <ChevronRight className="size-3" />
              <span className="text-[#172044]">Site Audit</span>
            </div>
            <h1 className="text-[26px] font-bold tracking-[-.03em] text-[#101A3D]">Site Audit</h1>
            <p className="mt-1 text-[12px] text-[#687797]">Scan your website for SEO issues and get actionable recommendations to improve your search performance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#DDE4ED] bg-white text-[11px] font-semibold text-[#172044] shadow-sm hover:bg-gray-50 transition-colors">
              <RefreshCw className="size-3.5 text-[#3b82f6]" />
              Re-crawl
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#DDE4ED] bg-white text-[11px] font-semibold text-[#172044] shadow-sm hover:bg-gray-50 transition-colors">
              <Download className="size-3.5" />
              Download Report
              <ChevronDown className="size-3.5 ml-1" />
            </button>
            <button className="p-1.5 rounded border border-[#DDE4ED] bg-white shadow-sm hover:bg-gray-50 transition-colors">
              <MoreVertical className="size-3.5 text-[#75829D]" />
            </button>

            <div className="flex items-center gap-3 ml-2 p-1.5 rounded-lg bg-[#F8FAFD] border border-[#E8EDF3]">
              <div className="p-1.5 bg-white rounded-md shadow-sm border border-[#E8EDF3]">
                <Calendar className="size-4 text-[#3b82f6]" />
              </div>
              <div className="pr-2">
                <p className="text-[9px] font-bold text-[#172044] leading-tight">Last Crawl</p>
                <p className="text-[9px] text-[#75829D] leading-tight mb-0.5">Apr 14, 2025, 10:32 AM</p>
                <span className="inline-block px-1.5 py-[1px] rounded text-[7px] font-bold bg-[#E6F6ED] text-[#168762]">Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-[#E8EDF3] [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[11px] font-bold transition-colors",
                activeTab === tab ? "border-[#E30613] text-[#E30613]" : "border-transparent text-[#75829D] hover:text-[#172044]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Content */}
        <div className="mt-1">
          {activeTab === "Overview" && <OverviewTab />}
          {activeTab === "Issues (142)" && <IssuesTab />}
          {activeTab === "Crawl Explorer" && <CrawlExplorerTab />}
          {activeTab === "Page Analysis" && <PageAnalysisTab />}
          {activeTab === "Technical SEO" && <TechnicalSEOTab />}
          {activeTab === "Core Web Vitals" && <CoreWebVitalsTab />}
          {activeTab === "Structured Data" && <StructuredDataTab />}
          {activeTab === "Security" && <SecurityTab />}
          {activeTab === "Settings" && <SettingsTab />}
        </div>
      </div>
    </>
  );
}

function OverviewTab() {
  return (
      <div className="grid grid-cols-12 gap-3">
        {/* Row 1 */}
        {/* SEO Health Score */}
        <div className="col-span-12 flex h-[236px] flex-col overflow-hidden rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-[0_1px_4px_rgb(31_50_81/0.06)] lg:col-span-3">
          <div className="flex items-center justify-between"><div><h2 className="text-[13px] font-bold text-[#172044]">SEO Health Score</h2><p className="mt-0.5 text-[9px] text-[#75829D]">Overall website quality</p></div><span className="rounded-full bg-[#E6F6ED] px-2 py-1 text-[8px] font-bold text-[#078359]">GOOD</span></div>
          <div className="flex flex-1 items-center gap-4">
            <div className="relative size-[104px] shrink-0">
              <svg viewBox="0 0 100 100" className="rotate-[-90deg] drop-shadow-sm">
                <circle cx="50" cy="50" r="42" className="fill-transparent stroke-[#EDF2F7] stroke-[7]" />
                <circle cx="50" cy="50" r="42" className="fill-transparent stroke-[#10b981] stroke-[7]" strokeDasharray="263.89" strokeDashoffset={263.89 * (1 - 0.78)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <div className="flex items-baseline">
                  <span className="text-[30px] font-black text-[#172044] tracking-tight">78</span>
                  <span className="text-[10px] text-[#94a3b8] font-bold">/100</span>
                </div>
                <span className="mt-0.5 text-[8px] font-bold text-[#10b981]">SEO SCORE</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[#10b981] mb-0.5">
                <ArrowUp className="size-3.5 stroke-[3]" />
                <span className="text-[14px] font-bold">+12 points</span>
              </div>
              <p className="mb-2 text-[9px] font-medium text-[#94a3b8]">since last audit</p>
              <p className="text-[10px] font-medium leading-[15px] text-[#64748b]">
                Your website is in good shape, but there are still <span className="font-bold text-[#172044]">142 issues</span> to fix.
              </p>
            </div>
          </div>
        </div>

        {/* Issue Summary */}
        <div className="col-span-12 flex h-[236px] flex-col overflow-hidden rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-[0_1px_4px_rgb(31_50_81/0.06)] lg:col-span-6">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[13px] font-bold text-[#172044]">Issue Summary</h2><p className="mt-0.5 text-[9px] text-[#75829D]">Changes since the previous crawl</p></div><button className="text-[9px] font-bold text-[#2878E5]">View all →</button></div>
          <div className="grid flex-1 grid-cols-4 gap-2">
            {[
              { label: "Critical", count: "12", icon: AlertCircle, color: "text-[#E5484D]", bg: "bg-[#FFE7E8]", panel: "bg-[#FFF9F9]", border: "border-[#FFDADC]", accent: "bg-[#E5484D]", trendBg: "bg-[#FFE7E8]", trend: -8 },
              { label: "Warnings", count: "28", icon: AlertTriangle, color: "text-[#D98B00]", bg: "bg-[#FFF0C9]", panel: "bg-[#FFFCF5]", border: "border-[#FFE7B0]", accent: "bg-[#F2A20C]", trendBg: "bg-[#FFF0C9]", trend: -14 },
              { label: "Notices", count: "64", icon: Info, color: "text-[#2878E5]", bg: "bg-[#E1EEFF]", panel: "bg-[#F8FBFF]", border: "border-[#D7E7FC]", accent: "bg-[#4285F4]", trendBg: "bg-[#E1EEFF]", trend: -14 },
              { label: "Passed", count: "438", icon: CheckCircle2, color: "text-[#078359]", bg: "bg-[#DDF7EA]", panel: "bg-[#F7FCF9]", border: "border-[#D3F0E2]", accent: "bg-[#0AA673]", trendBg: "bg-[#DDF7EA]", trend: 26, isPositive: true },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative flex flex-col overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md", stat.panel, stat.border)}>
                <span className={cn("absolute inset-x-0 top-0 h-1", stat.accent)} />
                <div className="mt-1 flex items-center gap-2">
                  <div className={cn("grid size-8 place-items-center rounded-lg", stat.bg)}>
                    <stat.icon className={cn("size-4", stat.color)} />
                  </div>
                  <p className={cn("text-[10px] font-bold", stat.color)}>{stat.label}</p>
                </div>
                <p className="mt-3 text-[25px] font-bold leading-7 tracking-[-.03em] text-[#172044]">{stat.count}</p>
                <p className="mt-0.5 text-[8px] text-[#75829D]">Total checks</p>
                <div className={cn("mt-auto flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold", stat.trendBg, stat.isPositive ? "text-[#078359]" : stat.color)}> 
                  {stat.trend > 0 ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
                  {Math.abs(stat.trend)} vs last crawl
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crawl Information */}
        <div className="col-span-12 flex h-[236px] flex-col overflow-hidden rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-[0_1px_4px_rgb(31_50_81/0.06)] lg:col-span-3">
          <div>
            <div className="flex items-center justify-between"><div><h2 className="text-[13px] font-bold text-[#172044]">Crawl Information</h2><p className="mt-0.5 text-[9px] text-[#75829D]">Technical crawl details</p></div><FileSearch className="size-5 text-[#2878E5]" /></div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                { label: "Total Pages Crawled", value: "128" },
                { label: "Total Links Found", value: "1,842" },
                { label: "Crawl Duration", value: "13 mins" },
                { label: "Avg Response Time", value: "420 ms" },
                { label: "Crawl Status", value: <span className="flex items-center justify-end gap-1 text-[#10b981]"><CheckCircle2 className="size-3" /> Completed</span> },
                { label: "Sitemap URLs", value: "2" },
                { label: "Robots.txt", value: <span className="flex items-center justify-end gap-1 text-[#10b981]"><CheckCircle2 className="size-3" /> Found</span> },
              ].map((item, i) => (
                <div key={i} className="min-w-0">
                  <span className="block truncate text-[8px] font-medium text-[#75829D]">{item.label}</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-[#172044]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-2 w-full shrink-0 rounded-md border border-[#DDE4ED] bg-white py-1.5 text-[9px] font-bold text-[#172044] shadow-sm transition-colors hover:bg-gray-50">
            View Crawl Log →
          </button>
        </div>

        {/* Row 2 */}
        {/* Top Issues */}
        <div className="col-span-12 lg:col-span-6 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[13px] font-bold text-[#172044]">Top Issues</h2>
            <button className="text-[10px] font-semibold text-[#3b82f6] flex items-center gap-1 hover:underline">
              View All Issues <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8EDF3] text-[9px] text-[#94a3b8]">
                  <th className="pb-1.5 font-medium w-6">#</th>
                  <th className="pb-1.5 font-medium">Issue</th>
                  <th className="pb-1.5 font-medium">Type</th>
                  <th className="pb-1.5 font-medium">Affected Pages</th>
                  <th className="pb-1.5 font-medium">Severity</th>
                  <th className="pb-1.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {[
                  { id: 1, issue: "Missing meta description", type: "On-Page", pages: 12, severity: "Critical", color: "bg-[#ef4444]", badgeBg: "bg-[#fee2e2]", badgeText: "text-[#ef4444]", action: "Fix Issue" },
                  { id: 2, issue: "Images without alt text", type: "On-Page", pages: 28, severity: "Critical", color: "bg-[#ef4444]", badgeBg: "bg-[#fee2e2]", badgeText: "text-[#ef4444]", action: "Fix Issue" },
                  { id: 3, issue: "Slow LCP (> 2.5s)", type: "Performance", pages: 8, severity: "High", color: "bg-[#f59e0b]", badgeBg: "bg-[#fef3c7]", badgeText: "text-[#f59e0b]", action: "Improve" },
                  { id: 4, issue: "Duplicate title tags", type: "On-Page", pages: 4, severity: "High", color: "bg-[#f59e0b]", badgeBg: "bg-[#fef3c7]", badgeText: "text-[#f59e0b]", action: "Fix Issue" },
                  { id: 5, issue: "Broken internal links", type: "Technical", pages: 6, severity: "High", color: "bg-[#f59e0b]", badgeBg: "bg-[#fef3c7]", badgeText: "text-[#f59e0b]", action: "Fix Issue" },
                ].map((row) => (
                  <tr key={row.id} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="py-2 text-[#94a3b8]">{row.id}</td>
                    <td className="py-2 font-medium text-[#172044]">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 rounded-full shrink-0", row.color)}></span>
                        {row.issue}
                      </div>
                    </td>
                    <td className="py-2 text-[#94a3b8]">{row.type}</td>
                    <td className="py-2 text-[#172044]">{row.pages}</td>
                    <td className="py-2">
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold", row.badgeBg, row.badgeText)}>{row.severity}</span>
                    </td>
                    <td className="py-2">
                      <button className="text-[#3b82f6] font-semibold hover:underline bg-[#eff6ff] px-2 py-0.5 rounded text-[9px]">{row.action}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page Type Distribution */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm flex flex-col justify-center">
          <h2 className="text-[15px] font-bold text-[#172044] mb-4">Page Type Distribution</h2>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative size-[110px] shrink-0">
              <div className="absolute inset-0 rounded-full border-[6px] border-transparent" style={{ background: "conic-gradient(#10b981 0% 1%, #3b82f6 1% 15%, #8b5cf6 15% 48%, #94a3b8 48% 100%)", WebkitMask: "radial-gradient(transparent 65%, black 66%)", mask: "radial-gradient(transparent 65%, black 66%)" }}></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white m-[6px] rounded-full">
                <span className="text-2xl font-bold text-[#172044]">128</span>
                <span className="text-[10px] text-[#75829D]">Pages</span>
              </div>
            </div>
            <div className="space-y-2 text-[11px] w-full px-2">
              {[
                { label: "Homepage", count: "1", color: "bg-[#10b981]" },
                { label: "Service Pages", count: "18", color: "bg-[#3b82f6]" },
                { label: "Blog Posts", count: "42", color: "bg-[#8b5cf6]" },
                { label: "Other Pages", count: "67", color: "bg-[#94a3b8]" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full shrink-0", item.color)}></span>
                    <span className="text-[#172044] font-medium">{item.label}</span>
                  </div>
                  <span className="font-bold text-[#172044]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[15px] font-bold text-[#172044]">Core Web Vitals (Mobile)</h2>
            <button className="text-[11px] font-medium text-[#3b82f6] flex items-center gap-0.5 hover:underline">
              View Details <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="space-y-6">
            {[
              { metric: "LCP", value: "2.1s", status: "Needs Improvement", color: "bg-[#f59e0b]", valColor: "text-[#f59e0b]", progress: 75, badgeBg: "bg-[#fef3c7]" },
              { metric: "INP", value: "120ms", status: "Good", color: "bg-[#10b981]", valColor: "text-[#10b981]", progress: 40, badgeBg: "bg-[#d1fae5]" },
              { metric: "CLS", value: "0.05", status: "Good", color: "bg-[#10b981]", valColor: "text-[#10b981]", progress: 20, badgeBg: "bg-[#d1fae5]" },
            ].map((item) => (
              <div key={item.metric}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-[#172044]">{item.metric}</span>
                    <span className={cn("text-[13px] font-bold", item.valColor)}>{item.value}</span>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", item.badgeBg, item.valColor)}>{item.status}</span>
                </div>
                <div className="h-2.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3 */}
        {/* Indexability */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col">
          <h2 className="text-[13px] font-bold text-[#172044] mb-6">Indexability</h2>
          <div className="flex items-center justify-center gap-6 flex-1">
            <div className="relative size-[90px] shrink-0">
              <div className="absolute inset-0 rounded-full border-[12px] border-transparent" style={{ background: "conic-gradient(#10b981 0% 97%, #ef4444 97% 99%, #94a3b8 99% 100%)", WebkitMask: "radial-gradient(transparent 65%, black 66%)", mask: "radial-gradient(transparent 65%, black 66%)" }}></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white m-[12px] rounded-full">
                <span className="text-xl font-bold text-[#172044]">124</span>
                <span className="text-[9px] text-[#75829D]">Indexed</span>
              </div>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#10b981] shrink-0"></span>
                <span className="font-bold text-[#172044]">124</span>
                <span className="text-[#75829D]">Indexed (97%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#ef4444] shrink-0"></span>
                <span className="font-bold text-[#172044]">3</span>
                <span className="text-[#75829D]">Not Indexed (2%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#94a3b8] shrink-0"></span>
                <span className="font-bold text-[#172044]">1</span>
                <span className="text-[#75829D]">Blocked (1%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Usability */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col">
          <h2 className="text-[13px] font-bold text-[#172044] mb-6">Mobile Usability</h2>
          <div className="flex items-center justify-center gap-6 flex-1">
            <div className="relative size-[90px] shrink-0">
              <div className="absolute inset-0 rounded-full border-[8px] border-[#10b981]"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#172044]">96</span>
                <span className="text-[10px] text-[#10b981] font-semibold">Good</span>
              </div>
            </div>
            <div className="space-y-2 text-[10px] text-[#172044] font-medium">
              {[
                "Viewport configured",
                "Text readable",
                "Content fits screen",
                "Clickable elements",
                "No intrusive modals"
              ].map(text => (
                <div key={text} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#10b981]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Structured Data */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[13px] font-bold text-[#172044]">Structured Data</h2>
            <button className="text-[10px] font-semibold text-[#3b82f6] flex items-center gap-1 hover:underline">
              View Details <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 flex-1">
            <div className="relative size-[90px] shrink-0">
              <div className="absolute inset-0 rounded-full border-[12px] border-transparent" style={{ background: "conic-gradient(#10b981 0% 72%, #ef4444 72% 80%, #f59e0b 80% 100%)", WebkitMask: "radial-gradient(transparent 65%, black 66%)", mask: "radial-gradient(transparent 65%, black 66%)" }}></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white m-[12px] rounded-full">
                <span className="text-xl font-bold text-[#172044]">18</span>
                <span className="text-[9px] text-[#75829D]">Valid</span>
              </div>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#10b981] shrink-0"></span>
                <span className="font-bold text-[#172044]">18</span>
                <span className="text-[#75829D]">Valid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#ef4444] shrink-0"></span>
                <span className="font-bold text-[#172044]">2</span>
                <span className="text-[#75829D]">Errors</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#f59e0b] shrink-0"></span>
                <span className="font-bold text-[#172044]">5</span>
                <span className="text-[#75829D]">Warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#94a3b8] shrink-0"></span>
                <span className="text-[#75829D]">No Markup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-3 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col">
          <h2 className="text-[13px] font-bold text-[#172044] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <button className="flex items-center justify-center gap-1.5 rounded-lg bg-[#6366f1] text-white py-3 text-[11px] font-bold shadow-sm hover:bg-[#4f46e5]">
              <Play className="size-3.5 fill-current" /> Run New Audit
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E8EDF3] bg-white shadow-sm text-[#172044] py-3 text-[11px] font-bold hover:bg-[#f1f5f9]">
              <ArrowLeftRight className="size-3.5 text-[#6366f1]" /> Compare Audits
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E8EDF3] bg-white shadow-sm text-[#172044] py-3 text-[11px] font-bold hover:bg-[#f1f5f9]">
              <FileText className="size-3.5 text-[#6366f1]" /> Generate Report
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E8EDF3] bg-white shadow-sm text-[#172044] py-3 text-[11px] font-bold hover:bg-[#f1f5f9]">
              <CalendarPlus className="size-3.5 text-[#6366f1]" /> Schedule Audit
            </button>
          </div>
        </div>

        {/* Row 4 */}
        {/* Recent Audits */}
        <div className="col-span-12 lg:col-span-6 rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col justify-center">
          <h2 className="text-[13px] font-bold text-[#172044] mb-4">Recent Audits</h2>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8EDF3] text-[9px] text-[#75829D]">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Pages Crawled</th>
                  <th className="pb-2 font-medium">Issues Found</th>
                  <th className="pb-2 font-medium">SEO Score</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {[
                  { date: "Apr 14, 2025, 10:32 AM", pages: 128, issues: 142, issuesColor: "text-[#ef4444]", score: 78, scoreColor: "text-[#10b981] border-[#10b981]", status: "Completed", statusBg: "bg-[#d1fae5]", statusColor: "text-[#10b981]" },
                  { date: "Apr 07, 2025, 11:12 AM", pages: 121, issues: 178, issuesColor: "text-[#172044]", score: 66, scoreColor: "text-[#f59e0b] border-[#f59e0b]", status: "Completed", statusBg: "bg-[#d1fae5]", statusColor: "text-[#10b981]" },
                  { date: "Mar 28, 2025, 09:45 AM", pages: 119, issues: 201, issuesColor: "text-[#172044]", score: 61, scoreColor: "text-[#f59e0b] border-[#f59e0b]", status: "Completed", statusBg: "bg-[#d1fae5]", statusColor: "text-[#10b981]" },
                  { date: "Mar 15, 2025, 02:18 PM", pages: 112, issues: 238, issuesColor: "text-[#172044]", score: 54, scoreColor: "text-[#ef4444] border-[#ef4444]", status: "Completed", statusBg: "bg-[#d1fae5]", statusColor: "text-[#10b981]" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="py-3 font-medium text-[#172044]">{row.date}</td>
                    <td className="py-3 text-[#75829D]">{row.pages}</td>
                    <td className={cn("py-3 font-semibold", row.issuesColor)}>{row.issues}</td>
                    <td className="py-3">
                      <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold bg-white", row.scoreColor)}>{row.score}</span>
                    </td>
                    <td className="py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold", row.statusBg, row.statusColor)}>{row.status}</span>
                    </td>
                    <td className="py-3">
                      <button className="text-[#3b82f6] font-semibold hover:underline bg-[#eff6ff] px-2 py-0.5 rounded text-[9px]">View Report</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations & Help */}
        <div className="col-span-12 lg:col-span-6 flex gap-2">
          <div className="flex-[1.5] rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[13px] font-bold text-[#172044]">Recommendations</h2>
              <button className="text-[10px] font-semibold text-[#3b82f6] flex items-center gap-1 hover:underline">
                View All <ChevronRight className="size-3" />
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {[
                { title: "Add meta descriptions to 12 pages", desc: "Meta descriptions help improve click-through rates.", icon: AlertCircle, color: "text-[#ef4444]", bg: "bg-[#fee2e2]" },
                { title: "Optimize images with missing alt text", desc: "28 images are missing alt text. Add descriptive alt text.", icon: AlertTriangle, color: "text-[#ef4444]", bg: "bg-[#fee2e2]" },
                { title: "Improve page speed (LCP)", desc: "Your LCP is 2.1s. Aim for under 2.5s.", icon: Info, color: "text-[#f59e0b]", bg: "bg-[#fef3c7]" },
                { title: "Fix broken internal links", desc: "6 internal links are broken and should be updated.", icon: AlertCircle, color: "text-[#ef4444]", bg: "bg-[#fee2e2]" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5", item.bg)}>
                    <item.icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[11px] font-bold text-[#172044] mb-0.5">{item.title}</h3>
                    <p className="text-[10px] text-[#75829D]">{item.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-[#94a3b8] mt-1" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-[1] rounded-xl bg-gradient-to-br from-[#f8f5ff] to-[#f3ebff] p-5 flex flex-col items-center justify-center text-center relative overflow-hidden border border-[#eaddff]">
            <div className="absolute -bottom-10 -right-10 size-40 bg-[#d8b4fe] rounded-full blur-[50px] opacity-40"></div>
            <div className="absolute -top-10 -left-10 size-40 bg-[#c4b5fd] rounded-full blur-[50px] opacity-30"></div>

            <Lightbulb className="size-10 text-[#6366f1] mb-3 relative z-10" />
            <h2 className="text-[14px] font-bold text-[#1e1b4b] mb-2 relative z-10">Need help improving your SEO?</h2>
            <p className="text-[10px] text-[#4f46e5] mb-5 relative z-10 leading-relaxed font-medium">
              Get a detailed audit report with step-by-step recommendations from our experts.
            </p>
            <button className="w-full py-2.5 bg-white rounded-lg text-[#4f46e5] text-[11px] font-bold shadow-sm relative z-10 border border-[#eaddff] hover:bg-gray-50 transition-colors">
              Request SEO Consultation
            </button>
          </div>
        </div>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 2. Issues Tab (Clean Table)
      // -----------------------------------------------------------------------------
      function IssuesTab() {
  return (
      <div className="rounded-xl border border-[#E8EDF3] bg-white shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-4 border-b border-[#E8EDF3] flex justify-between items-center bg-white">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" placeholder="Search issues..." className="pl-9 pr-4 py-1.5 text-[12px] border border-[#E8EDF3] rounded-md focus:outline-none focus:border-[#3b82f6] w-64 shadow-sm" />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#E8EDF3] text-[12px] font-medium text-[#334155] hover:bg-gray-50 bg-white shadow-sm">
              <Filter className="size-3.5" /> Severity
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#E8EDF3] text-[12px] font-medium text-[#334155] hover:bg-gray-50 bg-white shadow-sm">
              <Filter className="size-3.5" /> Category
            </button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F8FAFD]">
            <tr className="border-b border-[#E8EDF3] text-[11px] text-[#64748b] font-medium">
              <th className="px-5 py-3">Issue Name</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">Affected Pages</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-[#334155]">
            {[
              { issue: "Missing meta description", cat: "On-Page", sev: "Critical", urls: 12, sevClass: "bg-[#fee2e2] text-[#ef4444]" },
              { issue: "Images without alt text", cat: "On-Page", sev: "Critical", urls: 28, sevClass: "bg-[#fee2e2] text-[#ef4444]" },
              { issue: "Duplicate title tags", cat: "On-Page", sev: "High", urls: 4, sevClass: "bg-[#fef3c7] text-[#f59e0b]" },
              { issue: "Broken internal links (404)", cat: "Technical", sev: "High", urls: 6, sevClass: "bg-[#fef3c7] text-[#f59e0b]" },
              { issue: "Slow LCP (> 2.5s)", cat: "Performance", sev: "High", urls: 8, sevClass: "bg-[#fef3c7] text-[#f59e0b]" },
              { issue: "URL too long", cat: "Structure", sev: "Warning", urls: 15, sevClass: "bg-[#fff7ed] text-[#ea580c]" },
              { issue: "Low word count (< 300)", cat: "Content", sev: "Notice", urls: 42, sevClass: "bg-[#dbeafe] text-[#3b82f6]" },
            ].map((row, i) => (
              <tr key={i} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                <td className="px-5 py-3.5 font-medium text-[#101A3D]">{row.issue}</td>
                <td className="px-5 py-3.5">{row.cat}</td>
                <td className="px-5 py-3.5">
                  <span className={cn("px-2 py-1 rounded text-[10px] font-bold", row.sevClass)}>{row.sev}</span>
                </td>
                <td className="px-5 py-3.5">{row.urls}</td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-[#3b82f6] font-medium hover:underline text-[12px]">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 3. Crawl Explorer Tab (Clean Table)
      // -----------------------------------------------------------------------------
      function CrawlExplorerTab() {
  return (
      <div className="rounded-xl border border-[#E8EDF3] bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-[#E8EDF3] flex justify-between items-center bg-white">
          <div className="relative w-[300px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" placeholder="Filter by URL path..." className="pl-9 pr-4 py-1.5 text-[12px] border border-[#E8EDF3] rounded-md focus:outline-none focus:border-[#3b82f6] w-full shadow-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFD] sticky top-0">
              <tr className="border-b border-[#E8EDF3] text-[11px] text-[#64748b] font-medium">
                <th className="px-5 py-3">URL Path</th>
                <th className="px-5 py-3">Status Code</th>
                <th className="px-5 py-3">Indexable</th>
                <th className="px-5 py-3">Inlinks</th>
                <th className="px-5 py-3">Outlinks</th>
              </tr>
            </thead>
            <tbody className="text-[12px] text-[#334155]">
              {[
                { url: "https://mokshasewa.org/", status: 200, indexable: true, in: 142, out: 24 },
                { url: "https://mokshasewa.org/about-us", status: 200, indexable: true, in: 88, out: 12 },
                { url: "https://mokshasewa.org/services", status: 200, indexable: true, in: 104, out: 18 },
                { url: "https://mokshasewa.org/old-services", status: 301, indexable: false, in: 14, out: 1 },
                { url: "https://mokshasewa.org/broken-link", status: 404, indexable: false, in: 6, out: 0 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#F1F5F9] hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#3b82f6] hover:underline cursor-pointer">{row.url}</span>
                      <ExternalLink className="size-3.5 text-[#cbd5e1]" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold",
                      row.status === 200 ? "bg-[#d1fae5] text-[#10b981]" :
                        row.status === 301 ? "bg-[#fef3c7] text-[#f59e0b]" :
                          "bg-[#fee2e2] text-[#ef4444]"
                    )}>{row.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.indexable ? <CheckCircle2 className="size-4 text-[#10b981]" /> : <X className="size-4 text-[#ef4444]" />}
                  </td>
                  <td className="px-5 py-3.5">{row.in}</td>
                  <td className="px-5 py-3.5">{row.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 4. Page Analysis Tab
      // -----------------------------------------------------------------------------
      function PageAnalysisTab() {
  return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E8EDF3] bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex-1 relative">
            <Globe className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" defaultValue="https://mokshasewa.org/services" className="pl-9 pr-3 py-1.5 w-full text-[13px] border border-[#E8EDF3] rounded-md focus:outline-none focus:border-[#3b82f6] shadow-sm" />
          </div>
          <button className="px-4 py-1.5 rounded-md bg-[#101A3D] text-white text-[12px] font-medium shadow-sm hover:bg-[#1e293b] flex items-center gap-2">
            Analyze Page
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm">
              <h3 className="text-[14px] font-bold text-[#172044] mb-4">Meta Tags</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[11px] text-[#64748b] font-semibold uppercase">Title Tag</p>
                    <span className="text-[#10b981] font-bold text-[10px] bg-[#d1fae5] px-2 py-0.5 rounded">54 chars (Good)</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFD] border border-[#E8EDF3] rounded-md text-[13px] text-[#101A3D] font-medium">
                    Our Services | Moksha Sewa - Dignified Final Rites
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[11px] text-[#64748b] font-semibold uppercase">Meta Description</p>
                    <span className="text-[#ef4444] font-bold text-[10px] bg-[#fee2e2] px-2 py-0.5 rounded">Missing</span>
                  </div>
                  <div className="p-3 bg-[#fff5f5] border border-[#fecaca] rounded-md text-[12px] text-[#ef4444]">
                    No meta description found. Add a compelling description to improve click-through rates.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm">
              <h3 className="text-[14px] font-bold text-[#172044] mb-4">Content Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#F8FAFD] rounded-lg border border-[#E8EDF3] text-center">
                  <p className="text-[11px] text-[#64748b] font-semibold uppercase mb-1">Word Count</p>
                  <p className="text-2xl font-bold text-[#172044]">842</p>
                </div>
                <div className="p-4 bg-[#F8FAFD] rounded-lg border border-[#E8EDF3] text-center">
                  <p className="text-[11px] text-[#64748b] font-semibold uppercase mb-1">Readability</p>
                  <p className="text-2xl font-bold text-[#172044]">A</p>
                </div>
                <div className="p-4 bg-[#fff5f5] rounded-lg border border-[#fecaca] text-center">
                  <p className="text-[11px] text-[#ef4444] font-semibold uppercase mb-1">Images w/o Alt</p>
                  <p className="text-2xl font-bold text-[#ef4444]">3</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm h-full">
              <h3 className="text-[14px] font-bold text-[#172044] mb-4">Heading Hierarchy</h3>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="bg-[#eff6ff] text-[#3b82f6] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">H1</span>
                  <span className="text-[#101A3D] font-medium text-[12px] pt-0.5">Our Complete Services</span>
                </div>
                <div className="flex gap-3 items-start pl-4">
                  <span className="bg-[#f1f5f9] text-[#64748b] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">H2</span>
                  <span className="text-[#334155] text-[12px] pt-0.5">Cremation Assistance</span>
                </div>
                <div className="flex gap-3 items-start pl-4">
                  <span className="bg-[#f1f5f9] text-[#64748b] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">H2</span>
                  <span className="text-[#334155] text-[12px] pt-0.5">Ambulance Services</span>
                </div>
                <div className="flex gap-3 items-start pl-8">
                  <span className="bg-[#f8fafc] text-[#94a3b8] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border border-[#e2e8f0]">H3</span>
                  <span className="text-[#64748b] text-[11px] pt-0.5">Booking an Ambulance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 5. Technical SEO Tab
      // -----------------------------------------------------------------------------
      function TechnicalSEOTab() {
  return (
      <div className="grid grid-cols-12 gap-4">
        {[
          { title: "Robots.txt", desc: "Valid and accessible", icon: FileText, ok: true },
          { title: "XML Sitemap", desc: "Submitted to Search Console", icon: FileSearch, ok: true },
          { title: "Canonical Tags", desc: "Found on 95% of pages", icon: LinkIcon, ok: true },
          { title: "Hreflang Tags", desc: "Not implemented", icon: Globe, neutral: true },
          { title: "404 Errors", desc: "12 broken internal links", icon: AlertCircle, ok: false },
          { title: "Redirect Chains", desc: "3 chains with >2 hops", icon: ArrowLeftRight, ok: false },
        ].map((item, i) => (
          <div key={i} className="col-span-12 md:col-span-4 rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className={cn("p-2.5 rounded-lg shrink-0", item.ok ? "bg-[#d1fae5] text-[#10b981]" : item.neutral ? "bg-[#f1f5f9] text-[#64748b]" : "bg-[#fee2e2] text-[#ef4444]")}>
              <item.icon className="size-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#172044] mb-1">{item.title}</h3>
              <p className="text-[11px] text-[#64748b]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 6. Core Web Vitals Tab
      // -----------------------------------------------------------------------------
      function CoreWebVitalsTab() {
  return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Largest Contentful Paint", short: "LCP", val: "2.1s", target: "< 2.5s", status: "Needs Work", color: "bg-[#f59e0b]", text: "text-[#f59e0b]", bg: "bg-[#fef3c7]", progress: "w-[75%]" },
            { label: "Interaction to Next Paint", short: "INP", val: "120ms", target: "< 200ms", status: "Good", color: "bg-[#10b981]", text: "text-[#10b981]", bg: "bg-[#d1fae5]", progress: "w-[40%]" },
            { label: "Cumulative Layout Shift", short: "CLS", val: "0.05", target: "< 0.1", status: "Good", color: "bg-[#10b981]", text: "text-[#10b981]", bg: "bg-[#d1fae5]", progress: "w-[20%]" },
          ].map((v) => (
            <div key={v.short} className="rounded-xl border border-[#E8EDF3] bg-white p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[13px] font-bold text-[#172044]">{v.short}</p>
                  <p className="text-[10px] text-[#64748b]">{v.label}</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase", v.bg, v.text)}>{v.status}</span>
              </div>

              <p className={cn("text-3xl font-bold mb-1", v.text)}>{v.val}</p>
              <p className="text-[11px] text-[#64748b] mb-4">Target: {v.target}</p>

              <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", v.color, v.progress)}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 7. Structured Data Tab
      // -----------------------------------------------------------------------------
      function StructuredDataTab() {
  return (
      <div className="rounded-xl border border-[#E8EDF3] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E8EDF3] bg-white flex justify-between items-center">
          <h2 className="text-[14px] font-bold text-[#101A3D]">Schema Validation</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F8FAFD]">
            <tr className="border-b border-[#E8EDF3] text-[11px] text-[#64748b] font-medium">
              <th className="px-5 py-3">Schema Type</th>
              <th className="px-5 py-3">Pages Detected</th>
              <th className="px-5 py-3">Validation Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-[#334155]">
            {[
              { type: "Organization", count: 1, status: "Valid", color: "text-[#10b981]", bg: "bg-[#d1fae5]", icon: CheckCircle2 },
              { type: "BreadcrumbList", count: 128, status: "Valid", color: "text-[#10b981]", bg: "bg-[#d1fae5]", icon: CheckCircle2 },
              { type: "Article", count: 42, status: "2 Errors", color: "text-[#ef4444]", bg: "bg-[#fee2e2]", icon: AlertCircle },
              { type: "FAQPage", count: 5, status: "1 Warning", color: "text-[#f59e0b]", bg: "bg-[#fef3c7]", icon: AlertTriangle },
            ].map((row, i) => (
              <tr key={i} className="border-b border-[#F1F5F9]">
                <td className="px-5 py-3.5 font-mono text-[11px] text-[#172044]">{row.type}</td>
                <td className="px-5 py-3.5">{row.count}</td>
                <td className="px-5 py-3.5">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold", row.bg, row.color)}>
                    <row.icon className="size-3" /> {row.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-[#3b82f6] font-medium text-[11px] hover:underline">View Code</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 8. Security Tab
      // -----------------------------------------------------------------------------
      function SecurityTab() {
  return (
      <div className="rounded-xl border border-[#E8EDF3] bg-white p-6 shadow-sm max-w-2xl mx-auto mt-4">
        <div className="text-center mb-8">
          <div className="size-12 bg-[#d1fae5] text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#a7f3d0]">
            <ShieldCheck className="size-6" />
          </div>
          <h2 className="text-[16px] font-bold text-[#101A3D]">Website is Secure</h2>
          <p className="text-[12px] text-[#64748b] mt-1">No major security issues detected.</p>
        </div>

        <div className="space-y-3">
          {[
            { label: "Valid SSL Certificate", desc: "Certificate expires in 245 days.", icon: Lock, ok: true },
            { label: "HTTPS Redirects", desc: "All HTTP traffic is redirected.", icon: ArrowLeftRight, ok: true },
            { label: "Mixed Content", desc: "No unsecure resources found.", icon: ImageIcon, ok: true },
            { label: "HSTS Header", desc: "Strict-Transport-Security is active.", icon: Key, ok: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-[#E8EDF3] rounded-lg bg-white">
              <div className="p-2 bg-[#F8FAFD] rounded-md border border-[#E8EDF3]">
                <item.icon className="size-4 text-[#64748b]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[#172044] mb-0.5">{item.label}</p>
                <p className="text-[11px] text-[#64748b]">{item.desc}</p>
              </div>
              <CheckCircle2 className="size-5 text-[#10b981]" />
            </div>
          ))}
        </div>
      </div>
      );
}

      // -----------------------------------------------------------------------------
      // 9. Settings Tab
      // -----------------------------------------------------------------------------
      function SettingsTab() {
  return (
      <div className="rounded-xl border border-[#E8EDF3] bg-white shadow-sm max-w-2xl mx-auto mt-4">
        <div className="p-5 border-b border-[#E8EDF3]">
          <h2 className="text-[15px] font-bold text-[#101A3D]">Crawler Configuration</h2>
          <p className="text-[12px] text-[#64748b] mt-0.5">Manage how the SEO spider interacts with your website.</p>
        </div>

        <form className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[12px] font-semibold text-[#172044] mb-1.5">Crawl Schedule</label>
              <select className="w-full border border-[#DDE4ED] rounded-md px-3 py-2 text-[12px] text-[#172044] focus:outline-none focus:border-[#3b82f6] shadow-sm bg-white">
                <option>Weekly (Every Monday)</option>
                <option>Daily</option>
                <option>Monthly</option>
                <option>Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#172044] mb-1.5">Max Pages to Crawl</label>
              <input type="number" defaultValue={1000} className="w-full border border-[#DDE4ED] rounded-md px-3 py-2 text-[12px] text-[#172044] focus:outline-none focus:border-[#3b82f6] shadow-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#172044] mb-1.5">Excluded URL Patterns</label>
            <textarea rows={3} defaultValue="/api/*&#10;/admin/*" className="w-full border border-[#DDE4ED] rounded-md px-3 py-2 text-[12px] text-[#334155] font-mono focus:outline-none focus:border-[#3b82f6] shadow-sm resize-none"></textarea>
            <p className="text-[10px] text-[#64748b] mt-1.5">Paths to ignore during the crawl (One per line).</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 rounded-md border border-[#DDE4ED] bg-white text-[#475569] text-[12px] font-semibold hover:bg-gray-50 transition-colors shadow-sm">
              Cancel
            </button>
            <button type="button" className="px-4 py-2 rounded-md bg-[#101A3D] text-white text-[12px] font-semibold hover:bg-[#1e293b] transition-colors shadow-sm">
              Save Settings
            </button>
          </div>
        </form>
      </div>
      );
}
