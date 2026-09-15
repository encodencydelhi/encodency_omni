"use client";

import { useState } from "react";
import {
  Plus,
  Split,
  Copy,
  Check,
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
    <span className={cn("inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-[10px] font-bold shrink-0 not-italic", styles[tone], className)}>
      {children}
    </span>
  );
}

export function LandingPagesTab() {
  const [utmSource, setUtmSource] = useState("linkedin");
  const [utmCampaign, setUtmCampaign] = useState("clean_ganga_drive_2025");
  const [copied, setCopied] = useState(false);

  const landingPages = [
    {
      title: "Clean Ganga Donation Appeal 2025",
      url: "/campaigns/donate-clean-ganga",
      template: "Fundraising Hero",
      views: "14.2K",
      conversions: 842,
      rate: "5.9%",
      status: "Active",
      variant: "Variant A (Hero Video) vs B (Sticky Form)",
    },
    {
      title: "Volunteer Summit Delhi & Rishikesh",
      url: "/events/youth-leadership-summit-2025",
      template: "Event Registration",
      views: "8.6K",
      conversions: 520,
      rate: "6.0%",
      status: "Active",
      variant: "Single Variant",
    },
    {
      title: "Riverfront Cleanliness Drive Haridwar",
      url: "/campaigns/haridwar-cleanup",
      template: "Community Action",
      views: "4.8K",
      conversions: 218,
      rate: "4.5%",
      status: "Active",
      variant: "Single Variant",
    },
    {
      title: "Corporate CSR Environmental Partnerships",
      url: "/campaigns/csr-partnership",
      template: "B2B Lead Gen",
      views: "1.9K",
      conversions: 94,
      rate: "4.9%",
      status: "Paused",
      variant: "Variant A vs B (Tiered Tiers)",
    },
  ];

  const generatedUtm = `https://namogangetrust.org/campaigns/donate-clean-ganga?utm_source=${utmSource}&utm_medium=social&utm_campaign=${utmCampaign}`;

  const copyUtm = () => {
    navigator.clipboard.writeText(generatedUtm);
    setCopied(true);
    toast.success("Campaign UTM Link Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* Top 4 Landing Page KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-sm border border-blue-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Total Campaign Traffic</p>
          <b className="text-xl font-bold text-slate-900">29.5K</b>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">↑ 34% this month</p>
        </div>
        <div className="p-3 rounded-sm border border-emerald-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Avg. Conversion Rate</p>
          <b className="text-xl font-bold text-slate-900">5.6%</b>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">2.2x higher than site avg</p>
        </div>
        <div className="p-3 rounded-sm border border-purple-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Total Conversions</p>
          <b className="text-xl font-bold text-slate-900">1,674</b>
          <p className="text-[10px] text-purple-600 font-bold mt-0.5">Donations & Signups</p>
        </div>
        <div className="p-3 rounded-sm border border-amber-200/80 bg-white shadow-2xs">
          <p className="text-[10.5px] font-medium text-slate-500 uppercase">Active A/B Tests</p>
          <b className="text-xl font-bold text-slate-900">2 Running</b>
          <p className="text-[10px] text-amber-700 font-bold mt-0.5">Statistically significant</p>
        </div>
      </div>

      {/* Landing Pages Table */}
      <Box
        title="High-Converting Landing Pages"
        action={
          <button
            onClick={() => toast.success("Opening landing page template picker")}
            className="flex h-7 items-center gap-1 rounded-sm bg-blue-600 hover:bg-blue-700 px-2.5 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="size-3" /> New Landing Page
          </button>
        }
      >
        <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
          <div className="grid min-w-[650px] grid-cols-[1.6fr_1.3fr_1.2fr_.8fr_.8fr_.8fr_.8fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
            <span>Landing Page</span>
            <span>Path</span>
            <span>Layout Template</span>
            <span className="text-right">Visitors</span>
            <span className="text-right">Conversions</span>
            <span className="text-right">Conv. Rate</span>
            <span className="text-right">Status</span>
          </div>

          {landingPages.map((lp, idx) => (
            <div
              key={idx}
              className="grid min-w-[650px] grid-cols-[1.6fr_1.3fr_1.2fr_.8fr_.8fr_.8fr_.8fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{lp.title}</p>
                <span className="text-[10px] text-slate-400 font-medium">{lp.variant}</span>
              </div>
              <span className="text-blue-600 font-mono text-[11px] hover:underline cursor-pointer truncate">
                {lp.url}
              </span>
              <span className="text-slate-600 text-[11px]">{lp.template}</span>
              <span className="text-right font-bold text-slate-900">{lp.views}</span>
              <span className="text-right font-bold text-emerald-700">{lp.conversions}</span>
              <span className="text-right font-mono font-bold text-slate-900">{lp.rate}</span>
              <span className="flex justify-end">
                <Badge
                  tone={lp.status === "Active" ? "success" : "warning"}
                  className="w-[60px] justify-center"
                >
                  {lp.status}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </Box>

      {/* Row 3: A/B Split Test Analysis & UTM Campaign Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* A/B Test Results */}
        <Box title="Live A/B Experiment: Clean Ganga Donation Appeal" className="lg:col-span-6">
          <div className="p-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Split className="size-3.5 text-blue-600" /> 50/50 Traffic Split
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                Confidence: 98.4%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-sm border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Variant A (Control)</span>
                  <span className="text-[10px] text-slate-400">Hero Video</span>
                </div>
                <p className="text-lg font-bold text-slate-900">4.8% <span className="text-xs font-normal text-slate-500">conv.</span></p>
                <p className="text-[10.5px] text-slate-400">7,100 visitors • 341 conversions</p>
              </div>

              <div className="p-3 rounded-sm border border-emerald-300 bg-emerald-50/50 space-y-1 relative">
                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-xs">
                  Winner +24%
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-950">Variant B (Challenger)</span>
                </div>
                <p className="text-lg font-bold text-emerald-700">6.2% <span className="text-xs font-normal text-emerald-900">conv.</span></p>
                <p className="text-[10.5px] text-slate-500">7,100 visitors • 440 conversions</p>
              </div>
            </div>

            <button
              onClick={() => toast.success("Variant B promoted to 100% traffic!")}
              className="w-full h-8 rounded-sm bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Promote Variant B to 100% Traffic
            </button>
          </div>
        </Box>

        {/* UTM Campaign URL Builder */}
        <Box title="Campaign UTM Link Builder" className="lg:col-span-6">
          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">UTM Source</label>
                <select
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  className="h-8 w-full rounded-sm border border-slate-200 px-2 text-xs bg-white"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="meta">Facebook / Instagram</option>
                  <option value="google">Google Ads</option>
                  <option value="newsletter">Email Newsletter</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Campaign Tag</label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  className="h-8 w-full rounded-sm border border-slate-200 px-2 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="rounded-sm bg-slate-900 p-2.5 text-slate-200 font-mono text-[10.5px] break-all relative">
              {generatedUtm}
            </div>

            <button
              type="button"
              onClick={copyUtm}
              className="flex items-center justify-center gap-1.5 w-full h-8 rounded-sm bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied Link!" : "Copy Tracked Campaign Link"}</span>
            </button>
          </div>
        </Box>
      </div>
    </div>
  );
}
