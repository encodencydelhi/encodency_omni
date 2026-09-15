"use client";

import { useState } from "react";
import {
  RefreshCw,
  Trash2,
  Lock,
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

export function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<
    "general" | "domain" | "ssl" | "tracking" | "redirects"
  >("general");

  // General state
  const [siteName, setSiteName] = useState("Namo Gange Trust Official Portal");
  const [siteUrl, setSiteUrl] = useState("https://namogangetrust.org");
  const [siteDesc, setSiteDesc] = useState(
    "Dedicated NGO initiative for sustainable riverfront cleaning, afforestation, and ecological preservation across North India."
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Tracking IDs
  const [ga4Id, setGa4Id] = useState("G-984X72YQ12");
  const [gtmId, setGtmId] = useState("GTM-NMG8241");
  const [metaPixelId, setMetaPixelId] = useState("782194109823412");
  const [clarityId, setClarityId] = useState("h82kx091a");

  // Redirects
  const [redirects, setRedirects] = useState([
    { from: "/volunteer", to: "/events/youth-leadership-summit-2025", type: "301 (Permanent)" },
    { from: "/donate-now", to: "/campaigns/donate-clean-ganga", type: "301 (Permanent)" },
    { from: "/cleanup-drive-old", to: "/campaigns/haridwar-cleanup", type: "302 (Temporary)" },
  ]);

  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");

  const handleAddRedirect = () => {
    if (!newFrom.trim() || !newTo.trim()) {
      toast.error("Please enter both source and destination URLs");
      return;
    }
    setRedirects([...redirects, { from: newFrom.trim(), to: newTo.trim(), type: "301 (Permanent)" }]);
    setNewFrom("");
    setNewTo("");
    toast.success("Redirect rule added successfully!");
  };

  const handleRemoveRedirect = (idx: number) => {
    setRedirects(redirects.filter((_, i) => i !== idx));
    toast.success("Redirect rule removed");
  };

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* 5 Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200 px-2 pb-1">
        {[
          { key: "general", label: "General Settings" },
          { key: "domain", label: "Domain & DNS" },
          { key: "ssl", label: "SSL & Security" },
          { key: "tracking", label: "Tracking & Analytics" },
          { key: "redirects", label: "Redirects & Scripts" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            className={cn(
              "pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2",
              activeSubTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: GENERAL */}
      {activeSubTab === "general" && (
        <Box title="Website General Profile">
          <div className="p-4 space-y-3.5 max-w-xl text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Website Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Production URL</label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
              <textarea
                value={siteDesc}
                onChange={(e) => setSiteDesc(e.target.value)}
                className="w-full min-h-[70px] rounded-sm border border-slate-200 p-2 text-xs bg-white resize-none"
              />
            </div>

            <div className="p-3 rounded-sm border border-slate-200 bg-slate-50">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Maintenance Mode</span>
                  <span className="text-[10.5px] text-slate-500">Temporarily show maintenance page to regular visitors</span>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded-xs text-blue-600"
                />
              </label>
            </div>

            <button
              onClick={() => toast.success("General settings saved successfully!")}
              className="h-8 px-4 rounded-sm bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              Save General Settings
            </button>
          </div>
        </Box>
      )}

      {/* SUB-TAB 2: DOMAIN & DNS */}
      {activeSubTab === "domain" && (
        <Box title="Domain & DNS Configuration">
          <div className="p-4 space-y-4 text-xs">
            <div className="flex flex-wrap justify-between items-center p-3 rounded-sm border border-emerald-200 bg-emerald-50/50 gap-2">
              <div>
                <span className="font-bold text-emerald-950 block text-xs">namogangetrust.org (Primary Domain)</span>
                <span className="text-[10.5px] text-emerald-700 font-medium">Points to AWS CloudFront & Cloudflare Enterprise DNS</span>
              </div>
              <Badge tone="success" className="w-[84px] justify-center">DNS Verified</Badge>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-2">Active DNS Records</h4>
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <div className="grid min-w-[550px] grid-cols-[1fr_2fr_2fr_1fr] gap-2 py-1.5 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <span>Type</span><span>Host / Name</span><span>Value / Target</span><span>TTL</span>
                </div>
                {[
                  { type: "A Record", host: "@", value: "104.21.48.192 (Cloudflare Proxy)", ttl: "Auto" },
                  { type: "CNAME", host: "www", value: "namogangetrust.org", ttl: "Auto" },
                  { type: "TXT", host: "@", value: "v=spf1 include:_spf.google.com ~all", ttl: "3600" },
                  { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject; rua=mailto:dmarc@namogangetrust.org", ttl: "3600" },
                ].map((dns, idx) => (
                  <div key={idx} className="grid min-w-[550px] grid-cols-[1fr_2fr_2fr_1fr] gap-2 items-center py-2 border-b border-slate-50 font-mono text-[11px]">
                    <span className="font-bold text-slate-800 font-sans">{dns.type}</span>
                    <span className="text-blue-600">{dns.host}</span>
                    <span className="text-slate-700 truncate">{dns.value}</span>
                    <span className="text-slate-400 font-sans text-xs">{dns.ttl}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => toast.success("DNS resolution confirmed across global nameservers!")}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3.5 text-blue-600" /> Check DNS Propagation
            </button>
          </div>
        </Box>
      )}

      {/* SUB-TAB 3: SSL & SECURITY */}
      {activeSubTab === "ssl" && (
        <Box title="SSL Certificate & Cryptographic Security">
          <div className="p-4 space-y-3.5 text-xs max-w-xl">
            <div className="p-3 rounded-sm border border-emerald-200 bg-emerald-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-emerald-600" /> TLS 1.3 Active
                </span>
                <Badge tone="success" className="w-[60px] justify-center">Valid</Badge>
              </div>
              <p className="text-[11px] text-emerald-800 font-mono">Issuer: Cloudflare Inc ECC CA-3 • Auto-renews May 2026</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-sm border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Enforce HTTPS (Always Use SSL)</span>
                  <span className="text-[10px] text-slate-500">Automatically redirect all HTTP requests to HTTPS</span>
                </div>
                <input type="checkbox" defaultChecked className="rounded-xs text-blue-600" />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-sm border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">HTTP Strict Transport Security (HSTS)</span>
                  <span className="text-[10px] text-slate-500">Instruct browsers to strictly enforce secure connection</span>
                </div>
                <input type="checkbox" defaultChecked className="rounded-xs text-blue-600" />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-sm border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Bot Fight Mode</span>
                  <span className="text-[10px] text-slate-500">Block scraping bots from crawling donation and form APIs</span>
                </div>
                <input type="checkbox" defaultChecked className="rounded-xs text-blue-600" />
              </label>
            </div>
          </div>
        </Box>
      )}

      {/* SUB-TAB 4: TRACKING & INTEGRATIONS */}
      {activeSubTab === "tracking" && (
        <Box title="Analytics & Marketing Integrations">
          <div className="p-4 space-y-3.5 text-xs max-w-xl">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Analytics 4 (GA4 Measurement ID)
              </label>
              <input
                type="text"
                value={ga4Id}
                onChange={(e) => setGa4Id(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-mono text-blue-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Tag Manager (GTM Container ID)
              </label>
              <input
                type="text"
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-mono text-purple-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Meta Pixel ID (Facebook / Instagram Ads)
              </label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-mono text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Microsoft Clarity (Session Recording & Heatmaps)
              </label>
              <input
                type="text"
                value={clarityId}
                onChange={(e) => setClarityId(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-mono text-slate-800 bg-white"
              />
            </div>

            <button
              onClick={() => toast.success("Tracking pixels and analytics tags saved and active!")}
              className="h-8 px-4 rounded-sm bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              Save Tracking IDs
            </button>
          </div>
        </Box>
      )}

      {/* SUB-TAB 5: REDIRECTS & SCRIPTS */}
      {activeSubTab === "redirects" && (
        <Box title="URL Redirects (301/302) & Header Scripts">
          <div className="p-4 space-y-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800">Add New URL Redirect</h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  placeholder="/old-page"
                  className="sm:col-span-2 h-8 rounded-sm border border-slate-200 px-2.5 text-xs font-mono bg-white"
                />
                <input
                  type="text"
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  placeholder="/new-page"
                  className="sm:col-span-2 h-8 rounded-sm border border-slate-200 px-2.5 text-xs font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddRedirect}
                  className="h-8 rounded-sm bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  Add Redirect
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-800 mb-2">Active Redirect Rules ({redirects.length})</h4>
              <div className="space-y-1.5">
                {redirects.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-sm border border-slate-100 bg-slate-50/70 font-mono text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-800 font-semibold">{r.from}</span>
                      <span className="text-slate-400 font-sans">→</span>
                      <span className="text-blue-600 font-semibold">{r.to}</span>
                      <Badge tone="info" className="w-[94px] justify-center text-[9px] font-sans">{r.type}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRedirect(i)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Box>
      )}
    </div>
  );
}
