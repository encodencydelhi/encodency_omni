"use client";

import { useState } from "react";
import {
  Link2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

function Box({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs flex flex-col transition-all hover:shadow-md", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
        {action && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
  className?: string;
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap not-italic", styles[tone], className)}>
      {children}
    </span>
  );
}

export function SeoTab() {
  const [keywordFilter, setKeywordFilter] = useState("");

  const keywords = [
    { kw: "ganga cleanup initiative delhi", rank: 2, prev: 5, vol: "4.8K", difficulty: "Med", intent: "Informational" },
    { kw: "namo gange trust volunteer signup", rank: 1, prev: 1, vol: "2.4K", difficulty: "Low", intent: "Navigational" },
    { kw: "riverfront restoration rishikesh", rank: 3, prev: 7, vol: "3.1K", difficulty: "Med", intent: "Commercial" },
    { kw: "donate for clean ganga mission", rank: 4, prev: 6, vol: "8.2K", difficulty: "High", intent: "Transactional" },
    { kw: "ganga water pollution control ngo", rank: 5, prev: 8, vol: "1.9K", difficulty: "Med", intent: "Informational" },
    { kw: "haridwar riverfront awareness drive", rank: 2, prev: 3, vol: "1.2K", difficulty: "Low", intent: "Informational" },
  ];

  const backlinks = [
    { domain: "thehindu.com/environment", da: 89, links: 12, anchor: "Namo Gange Trust volunteer mobilization", status: "Active" },
    { domain: "ndtv.com/india-news", da: 91, links: 8, anchor: "Clean Ganga initiative report", status: "Active" },
    { domain: "downtoearth.org.in", da: 78, links: 16, anchor: "ecological restoration benchmarks", status: "Active" },
    { domain: "timesofindia.indiatimes.com", da: 94, links: 6, anchor: "Namo Gange Trust NGO", status: "Active" },
  ];

  const filteredKeywords = keywords.filter((k) =>
    k.kw.toLowerCase().includes(keywordFilter.toLowerCase())
  );

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* 4 SEO KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-sm border border-emerald-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Overall SEO Score</p>
          <b className="text-xl font-bold text-slate-900">88 / 100</b>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Top 5% NGO benchmark</p>
        </div>
        <div className="p-3 rounded-sm border border-blue-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Tracked Keywords</p>
          <b className="text-xl font-bold text-slate-900">482 Keywords</b>
          <p className="text-[10px] text-blue-600 font-bold mt-0.5">38 in Google Top 3</p>
        </div>
        <div className="p-3 rounded-sm border border-purple-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">High Authority Backlinks</p>
          <b className="text-xl font-bold text-slate-900">1,480 Links</b>
          <p className="text-[10px] text-purple-600 font-bold mt-0.5">142 referring domains</p>
        </div>
        <div className="p-3 rounded-sm border border-cyan-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Indexed URLs</p>
          <b className="text-xl font-bold text-slate-900">100% Crawled</b>
          <p className="text-[10px] text-cyan-700 font-bold mt-0.5">XML Sitemap healthy</p>
        </div>
      </div>

      {/* Keyword Rankings Table */}
      <Box
        title="Organic Search Keyword Rankings"
        action={
          <div className="flex items-center gap-2">
            <input
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="Search keywords..."
              className="h-7 w-44 rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              onClick={() => toast.success("Tracking new keyword")}
              className="flex h-7 items-center gap-1 rounded-sm bg-blue-600 hover:bg-blue-700 px-2.5 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              + Track Keyword
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
          <div className="grid min-w-[600px] grid-cols-[1.8fr_.6fr_.6fr_.8fr_.8fr_.8fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
            <span>Search Term</span>
            <span className="text-right">Current Rank</span>
            <span className="text-right">Change</span>
            <span className="text-right">Monthly Volume</span>
            <span>Difficulty</span>
            <span className="text-right">Search Intent</span>
          </div>

          {filteredKeywords.map((k, i) => {
            const diff = k.prev - k.rank;
            return (
              <div
                key={i}
                className="grid min-w-[600px] grid-cols-[1.8fr_.6fr_.6fr_.8fr_.8fr_.8fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap"
              >
                <span className="font-bold text-slate-900 truncate">{k.kw}</span>
                <span className="text-right font-bold text-blue-700">#{k.rank}</span>
                <span className={cn("text-right font-bold", diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-slate-400")}>
                  {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : "—"}
                </span>
                <span className="text-right font-mono font-semibold text-slate-800">{k.vol}</span>
                <span>
                  <Badge tone={k.difficulty === "Low" ? "success" : k.difficulty === "Med" ? "info" : "warning"} className="w-[52px] justify-center">
                    {k.difficulty}
                  </Badge>
                </span>
                <span className="text-right text-[11px] text-slate-500 font-medium">{k.intent}</span>
              </div>
            );
          })}
        </div>
      </Box>

      {/* Row 3: Backlinks & Technical SEO Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Backlinks */}
        <Box title="Top Referring Domains & Backlinks" className="lg:col-span-7">
          <div className="p-3 space-y-2 text-xs">
            {backlinks.map((b, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="size-3.5 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{b.domain}</span>
                    <Badge tone="info" className="shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[9.5px]">DA {b.da}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">&quot;{b.anchor}&quot;</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="font-bold text-slate-900 block">{b.links} links</span>
                  <span className="text-[10px] text-emerald-600 font-bold">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Box>

        {/* Technical SEO Audit */}
        <Box title="Technical Health & Action Items" className="lg:col-span-5">
          <div className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-sm border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="font-semibold text-emerald-950">XML Sitemap Validated</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700">/sitemap.xml</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-sm border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="font-semibold text-emerald-950">Schema JSON-LD Active</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700">NGO Schema</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-sm border border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                <span className="font-semibold text-amber-950">2 Images Missing Alt Tags</span>
              </div>
              <button
                onClick={() => toast.success("Auto-filled AI alt tags for 2 images!")}
                className="text-[10.5px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Auto-Fix
              </button>
            </div>

            <button
              onClick={() => toast.success("Running full technical crawl of namogangetrust.org...")}
              className="w-full h-8 rounded-sm bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer mt-1"
            >
              Run Full Site Audit Crawl
            </button>
          </div>
        </Box>
      </div>
    </div>
  );
}
