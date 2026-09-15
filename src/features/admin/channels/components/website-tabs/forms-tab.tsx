"use client";

import { useState } from "react";
import {
  Plus,
  Download,
  MoreHorizontal,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { WebsiteFormItem, WebsiteSubmissionItem } from "./types";

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

interface FormsTabProps {
  forms: WebsiteFormItem[];
  submissions: WebsiteSubmissionItem[];
  onOpenFormBuilder: () => void;
}

export function FormsTab({ forms, submissions, onOpenFormBuilder }: FormsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"forms" | "submissions">("forms");

  const exportSubmissions = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Name,Email,Form,Status,Time", ...submissions.map((s) => `${s.name},${s.email},${s.form},${s.status},${s.time}`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "website_form_submissions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Submissions CSV downloaded!");
  };

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* Sub tabs navigation */}
      <div className="flex gap-4 border-b border-slate-200 px-2 pb-1">
        {(["forms", "submissions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={cn(
              "pb-1.5 text-xs font-bold capitalize border-b-2 transition-all cursor-pointer",
              activeSubTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {tab === "forms" ? "All Web Forms" : "Inbound Submissions"}
          </button>
        ))}
      </div>

      {activeSubTab === "forms" ? (
        <Box
          title="Website Forms & Inbound Lead Capture"
          action={
            <button
              onClick={onOpenFormBuilder}
              className="flex h-7 items-center gap-1 rounded-sm bg-blue-600 hover:bg-blue-700 px-2.5 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Plus className="size-3" /> Create Form
            </button>
          }
        >
          <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
            <div className="grid min-w-[500px] grid-cols-[1.6fr_.9fr_1fr_.9fr_.9fr_.5fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
              <span>Form Name</span>
              <span>Status</span>
              <span>Fields Configured</span>
              <span className="text-right">Submissions</span>
              <span className="text-right">Conv. Rate</span>
              <span className="text-right">Actions</span>
            </div>

            {forms.map((f) => (
              <div
                key={f.id || f.name}
                className="grid min-w-[500px] grid-cols-[1.6fr_.9fr_1fr_.9fr_.9fr_.5fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{f.name}</p>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {f.id}</span>
                </div>
                <span>
                  <Badge
                    tone={f.status === "Active" ? "success" : "warning"}
                    className="w-[60px] justify-center"
                  >
                    {f.status}
                  </Badge>
                </span>
                <span className="text-slate-600 text-[11px]">
                  {f.fields ? `${f.fields.length} input fields` : "4 fields"}
                </span>
                <span className="text-right font-bold text-slate-900">{f.submissions}</span>
                <span className="text-right text-emerald-700 font-semibold">{f.conv}</span>
                <span className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://namogangetrust.org/forms/${f.id}" width="100%" height="450"></iframe>`);
                      toast.success(`Embed code for "${f.name}" copied to clipboard!`);
                    }}
                    className="p-1 rounded-sm text-slate-400 hover:text-blue-600 cursor-pointer"
                    title="Copy Embed Code"
                  >
                    <Code2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success(`Managing settings for ${f.name}`)}
                    className="p-1 rounded-sm text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Box>
      ) : (
        <Box
          title="Recent Form Inbound Submissions"
          action={
            <button
              onClick={exportSubmissions}
              className="flex h-7 items-center gap-1 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 px-2.5 text-[11px] font-bold text-slate-700 shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Download className="size-3" /> Export CSV
            </button>
          }
        >
          <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
            <div className="grid min-w-[550px] grid-cols-[1.4fr_1.6fr_1.4fr_.9fr_.8fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
              <span>Full Name</span>
              <span>Email Address</span>
              <span>Form Source</span>
              <span>Status</span>
              <span className="text-right">Timestamp</span>
            </div>

            {submissions.map((s, idx) => (
              <div
                key={idx}
                className="grid min-w-[550px] grid-cols-[1.4fr_1.6fr_1.4fr_.9fr_.8fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap"
              >
                <span className="font-bold text-slate-900 truncate">{s.name}</span>
                <span className="text-blue-600 font-medium truncate">{s.email}</span>
                <span className="text-slate-600 font-medium truncate">{s.form}</span>
                <span>
                  <Badge
                    tone={s.status === "Converted" ? "success" : s.status === "New" ? "info" : "warning"}
                    className="w-[74px] justify-center"
                  >
                    {s.status}
                  </Badge>
                </span>
                <span className="text-right text-slate-400 text-[11px]">{s.time}</span>
              </div>
            ))}
          </div>
        </Box>
      )}
    </div>
  );
}
