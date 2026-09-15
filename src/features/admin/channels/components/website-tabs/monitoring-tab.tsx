"use client";

import { useState } from "react";
import {
  Mail,
  MessageSquare,
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

export function MonitoringTab() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/T00/B00/XXXXX");

  const endpoints = [
    { name: "Root Production Site", url: "https://namogangetrust.org/", status: "Operational", uptime: "100.0%", latency: "112ms" },
    { name: "Donation Payment Gateway", url: "https://namogangetrust.org/api/donate", status: "Operational", uptime: "99.99%", latency: "148ms" },
    { name: "Volunteer Form API", url: "https://namogangetrust.org/api/forms", status: "Operational", uptime: "99.98%", latency: "124ms" },
    { name: "Global CDN Edge (Cloudflare)", url: "https://namogangetrust.org/cdn-cgi/trace", status: "Operational", uptime: "100.0%", latency: "18ms" },
  ];

  const incidents = [
    {
      date: "Apr 14, 2025 • 03:15 AM",
      title: "Scheduled SSL Certificate Auto-Renewal",
      desc: "Zero-downtime certificate renewal executed via Cloudflare Edge TLS 1.3.",
      duration: "0 min downtime",
      severity: "Maintenance",
    },
    {
      date: "Apr 02, 2025 • 01:20 AM",
      title: "Database Indexing & Buffer Cache Optimization",
      desc: "Routine database index rebuild completed. Inbound forms queued gracefully during brief 1-minute window.",
      duration: "1 min duration",
      severity: "Resolved",
    },
    {
      date: "Mar 18, 2025 • 11:45 PM",
      title: "CDN Cache Invalidation & Re-warm",
      desc: "Purged static assets for spring release of Clean Ganga website.",
      duration: "0 min downtime",
      severity: "Maintenance",
    },
  ];

  const lighthouseScores = [
    { label: "Performance", score: 96, color: "text-emerald-600", stroke: "#10B981" },
    { label: "Accessibility", score: 94, color: "text-emerald-600", stroke: "#10B981" },
    { label: "Best Practices", score: 100, color: "text-emerald-600", stroke: "#10B981" },
    { label: "SEO Audit", score: 98, color: "text-emerald-600", stroke: "#10B981" },
  ];

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* 4 Endpoint Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {endpoints.map((ep, i) => (
          <div key={i} className="p-3 rounded-sm border border-emerald-200/80 bg-white shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate min-w-0">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{ep.name}</span>
              </span>
              <Badge tone="success" className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]">{ep.status}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">{ep.url}</p>
            <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-500 border-t border-slate-100 pt-1.5">
              <span>Uptime: <b className="text-slate-900">{ep.uptime}</b></span>
              <span>Latency: <b className="text-blue-600 font-mono">{ep.latency}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Lighthouse CI Performance & Alert Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Google Lighthouse Scores */}
        <Box title="Google Lighthouse Core Web Vitals Audit" className="lg:col-span-7">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {lighthouseScores.map((lh, idx) => (
                <div key={idx} className="p-2.5 rounded-sm border border-slate-100 bg-slate-50/60 space-y-1">
                  <div className="size-14 mx-auto rounded-full border-4 border-emerald-500 flex items-center justify-center bg-white shadow-xs">
                    <span className="text-base font-bold text-emerald-700">{lh.score}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{lh.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-500 text-center border-t border-slate-100 pt-2 font-medium">
              Passing all Core Web Vitals (LCP: 1.1s • FID: 12ms • CLS: 0.02). Optimized for Google PageSpeed indexing.
            </p>
          </div>
        </Box>

        {/* Alert Channel Configuration */}
        <Box title="Downtime & Security Alerts" className="lg:col-span-5">
          <div className="p-3.5 space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-sm border border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Email Alerts (admin@namogangetrust.org)</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded-xs text-blue-600"
              />
            </label>

            <div className="p-2 rounded-sm border border-slate-100 bg-slate-50/50 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-purple-600" />
                  <span className="font-semibold text-slate-800">Slack Channel Webhook</span>
                </div>
                <input
                  type="checkbox"
                  checked={slackAlerts}
                  onChange={(e) => setSlackAlerts(e.target.checked)}
                  className="rounded-xs text-blue-600"
                />
              </label>
              {slackAlerts && (
                <input
                  type="text"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className="h-7 w-full rounded-sm border border-slate-200 bg-white px-2 font-mono text-[10.5px] text-slate-600"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => toast.success("Test alert dispatched to Slack and Email!")}
              className="w-full h-7 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              Send Test Alert
            </button>
          </div>
        </Box>
      </div>

      {/* Row 3: Incident History & Maintenance Log */}
      <Box title="Incident History & Maintenance Log">
        <div className="p-3 space-y-2.5">
          {incidents.map((inc, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between p-2.5 rounded-sm border border-slate-100 bg-slate-50/50 text-xs gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium text-[10.5px]">{inc.date}</span>
                  <Badge tone={inc.severity === "Resolved" ? "success" : "info"} className="w-[84px] justify-center">
                    {inc.severity}
                  </Badge>
                </div>
                <h4 className="font-bold text-slate-900 mt-1">{inc.title}</h4>
                <p className="text-[11px] text-slate-600">{inc.desc}</p>
              </div>
              <span className="text-[10.5px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm shrink-0">
                {inc.duration}
              </span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
