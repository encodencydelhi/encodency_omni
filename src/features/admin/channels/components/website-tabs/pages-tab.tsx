"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Clock,
  Eye,
  SearchCheck,
  Plus,
  MoreHorizontal,
  Edit2,
  Copy,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WebsitePageItem } from "./types";

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
    <span className={cn("inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-[10px] font-bold shrink-0 not-italic", styles[tone], className)}>
      {children}
    </span>
  );
}

interface PagesTabProps {
  pages: WebsitePageItem[];
  onEditPage: (page: WebsitePageItem) => void;
  onPreviewPage: (page: WebsitePageItem) => void;
  onDuplicatePage: (page: WebsitePageItem) => void;
  onDeletePage: (page: WebsitePageItem) => void;
}

export function PagesTab({
  pages,
  onEditPage,
  onPreviewPage,
  onDuplicatePage,
  onDeletePage,
}: PagesTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const publishedCount = pages.filter((p) => p.status === "Published").length;
  const draftCount = pages.filter((p) => p.status === "Draft").length;
  const scheduledCount = pages.filter((p) => p.status === "Scheduled").length;
  const avgSeo = Math.round(pages.reduce((acc, p) => acc + p.seo, 0) / (pages.length || 1));

  const filtered = pages.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Published Pages", value: publishedCount.toString(), icon: CheckCircle2, bg: "bg-emerald-50/80 border-emerald-200/80", iconBg: "bg-emerald-600 text-white" },
          { label: "Drafts", value: draftCount.toString(), icon: FileText, bg: "bg-amber-50/80 border-amber-200/80", iconBg: "bg-amber-600 text-white" },
          { label: "Scheduled", value: scheduledCount.toString(), icon: Clock, bg: "bg-blue-50/80 border-blue-200/80", iconBg: "bg-blue-600 text-white" },
          { label: "Avg. Views", value: "2.8K", icon: Eye, bg: "bg-purple-50/80 border-purple-200/80", iconBg: "bg-purple-600 text-white" },
          { label: "Avg. SEO Score", value: `${avgSeo}/100`, icon: SearchCheck, bg: "bg-cyan-50/80 border-cyan-200/80", iconBg: "bg-cyan-600 text-white" },
        ].map((kpi, i) => (
          <div key={i} className={cn("flex items-center gap-2.5 rounded-sm border p-3 bg-white shadow-2xs", kpi.bg)}>
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm shadow-xs", kpi.iconBg)}>
              <kpi.icon className="size-4.5" />
            </span>
            <div>
              <p className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <b className="text-lg font-bold text-slate-900">{kpi.value}</b>
            </div>
          </div>
        ))}
      </div>

      <Box
        title="All Website Pages & Routing"
        action={
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-7 rounded-sm border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses ({pages.length})</option>
              <option value="published">Published ({publishedCount})</option>
              <option value="draft">Drafts ({draftCount})</option>
              <option value="scheduled">Scheduled ({scheduledCount})</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="h-7 w-40 sm:w-48 rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => router.push("/admin/website/new-page")}
              className="flex h-7 items-center gap-1 rounded-sm bg-blue-600 hover:bg-blue-700 px-2.5 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Plus className="size-3" /> New Page
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
          <div className="grid min-w-[700px] grid-cols-[1.6fr_1.3fr_.9fr_.9fr_.8fr_.8fr_.8fr_.8fr_.6fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
            <span>Page Title</span>
            <span>Slug</span>
            <span>Template</span>
            <span>Status</span>
            <span className="text-right">Views</span>
            <span className="text-right">Bounce</span>
            <span className="text-right">SEO</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>

          {filtered.map((p) => (
            <div
              key={p.id || p.slug}
              className="grid min-w-[700px] grid-cols-[1.6fr_1.3fr_.9fr_.9fr_.8fr_.8fr_.8fr_.8fr_.6fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap relative"
            >
              <span className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                <FileText className="size-3.5 text-slate-400 shrink-0" />
                {p.name}
              </span>
              <span
                onClick={() => onPreviewPage(p)}
                className="text-blue-600 font-mono text-[11px] hover:underline cursor-pointer truncate"
              >
                {p.slug}
              </span>
              <span className="text-[11px] text-slate-500 truncate">{p.template || "Standard Page"}</span>
              <span>
                <Badge
                  tone={p.status === "Published" ? "success" : p.status === "Scheduled" ? "info" : "warning"}
                  className="w-[74px] justify-center"
                >
                  {p.status}
                </Badge>
              </span>
              <span className="text-right font-bold text-slate-900">{p.views}</span>
              <span className="text-right text-slate-500 font-medium">{p.bounce}</span>
              <span className="text-right">
                <span
                  className={cn(
                    "font-bold text-xs",
                    p.seo >= 85 ? "text-emerald-700" : p.seo >= 75 ? "text-amber-700" : "text-rose-700"
                  )}
                >
                  {p.seo}/100
                </span>
              </span>
              <span className="text-slate-400 text-[11px]">{p.updated}</span>

              {/* Action buttons */}
              <div className="flex justify-end items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPreviewPage(p)}
                  className="p-1 rounded-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Live Preview"
                >
                  <Eye className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditPage(p)}
                  className="p-1 rounded-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Edit Page"
                >
                  <Edit2 className="size-3.5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                    className="p-1 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>

                  {activeMenuId === p.id && (
                    <div className="absolute right-0 top-6 z-20 w-36 rounded-sm border border-slate-200 bg-white shadow-lg py-1 text-xs animate-in fade-in duration-100">
                      <button
                        onClick={() => {
                          onDuplicatePage(p);
                          setActiveMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Copy className="size-3 text-slate-400" /> Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onDeletePage(p);
                          setActiveMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="size-3 text-rose-400" /> Delete Page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
