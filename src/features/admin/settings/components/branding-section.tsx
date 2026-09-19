"use client";

import { useRef, useState } from "react";
import {
  Palette,
  Upload,
  Trash2,
  Lock,
  Eye,
  FileText,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { BrandingSettings } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { cn } from "@/lib/utils/cn";

interface BrandingSectionProps {
  data: BrandingSettings;
  onChange: (partial: Partial<BrandingSettings>) => void;
}

type PreviewTab = "sidebar" | "report" | "email";

export function BrandingSection({ data, onChange }: BrandingSectionProps) {
  const { capabilities } = useSettingsCapability();
  const [activePreview, setActivePreview] = useState<PreviewTab>("sidebar");

  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const reportLogoRef = useRef<HTMLInputElement>(null);

  const handleAssetUpload = (key: keyof BrandingSettings, file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Asset size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ [key]: reader.result });
        toast.success(`Branding ${key} updated.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const PRESET_COLORS = ["#10B981", "#2563EB", "#7C3AED", "#EA580C", "#0891B2", "#E11D48", "#111C3A"];

  return (
    <div className="space-y-2">
      {/* SECTION 1: ASSETS & COLOR PALETTE */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <Palette className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Visual Brand Identity</h3>
              <p className="text-[10px] text-[#64748B]">
                Configure logos, colors, and typography displayed across reports, emails, and exports.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Main Logo */}
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5">
            <div className="text-[11px] font-bold text-[#111C3A]">Header / Sidebar Logo</div>
            <div className="h-14 rounded-md bg-white border border-[#CBD5E1] flex items-center justify-center overflow-hidden p-1.5">
              {data.logo ? (
                <img src={data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-400">No logo uploaded</span>
              )}
            </div>
            <p className="text-[9px] text-[#64748B]">SVG / PNG • Max 2MB</p>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAssetUpload("logo", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={!capabilities.canEditBranding}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded text-[10px] font-bold text-[#334155] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3 text-[#2563EB]" /> Upload
              </button>
              {data.logo && (
                <button
                  type="button"
                  onClick={() => onChange({ logo: "" })}
                  disabled={!capabilities.canEditBranding}
                  className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                  title="Remove logo"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5">
            <div className="text-[11px] font-bold text-[#111C3A]">Browser Favicon</div>
            <div className="h-14 rounded-md bg-white border border-[#CBD5E1] flex items-center justify-center overflow-hidden p-1.5">
              {data.favicon ? (
                <img src={data.favicon} alt="Favicon" className="size-7 rounded object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400">No favicon</span>
              )}
            </div>
            <p className="text-[9px] text-[#64748B]">Square 64×64px • ICO / PNG</p>
            <input
              ref={faviconRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAssetUpload("favicon", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => faviconRef.current?.click()}
                disabled={!capabilities.canEditBranding}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded text-[10px] font-bold text-[#334155] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3 text-[#2563EB]" /> Upload
              </button>
              {data.favicon && (
                <button
                  type="button"
                  onClick={() => onChange({ favicon: "" })}
                  disabled={!capabilities.canEditBranding}
                  className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                  title="Remove favicon"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Report / Email Header Logo */}
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5">
            <div className="text-[11px] font-bold text-[#111C3A]">PDF & Report Logo</div>
            <div className="h-14 rounded-md bg-white border border-[#CBD5E1] flex items-center justify-center overflow-hidden p-1.5">
              {data.reportLogo ? (
                <img src={data.reportLogo} alt="Report Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-400">Matches main logo</span>
              )}
            </div>
            <p className="text-[9px] text-[#64748B]">High-res horizontal • 300 DPI</p>
            <input
              ref={reportLogoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAssetUpload("reportLogo", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => reportLogoRef.current?.click()}
                disabled={!capabilities.canEditBranding}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded text-[10px] font-bold text-[#334155] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3 text-[#2563EB]" /> Upload
              </button>
              {data.reportLogo && (
                <button
                  type="button"
                  onClick={() => onChange({ reportLogo: "" })}
                  disabled={!capabilities.canEditBranding}
                  className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                  title="Remove"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Color Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="size-7 rounded border border-[#CBD5E1] p-0.5 cursor-pointer bg-white"
              />
              <input
                type="text"
                value={data.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="h-7 w-24 px-2 rounded-md border border-[#CBD5E1] bg-white text-[11px] font-mono text-[#111C3A] font-semibold uppercase"
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ primaryColor: c })}
                    className={cn(
                      "size-4 rounded-full border border-white shadow-2xs transition-transform hover:scale-110",
                      data.primaryColor === c && "ring-2 ring-blue-500 ring-offset-1"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <span className="text-[9px] text-[#94A3B8] mt-0.5 block">Applied to buttons, badges, and primary report highlights.</span>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
              Secondary Brand Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="size-7 rounded border border-[#CBD5E1] p-0.5 cursor-pointer bg-white"
              />
              <input
                type="text"
                value={data.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="h-7 w-24 px-2 rounded-md border border-[#CBD5E1] bg-white text-[11px] font-mono text-[#111C3A] font-semibold uppercase"
              />
            </div>
            <span className="text-[9px] text-[#94A3B8] mt-0.5 block">Used for table headers, dark cards, and chart baselines.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10.5px] font-bold text-[#334155] mb-1">
              Custom Footer / Copyright Notice
            </label>
            <input
              type="text"
              value={data.footerText}
              onChange={(e) => onChange({ footerText: e.target.value })}
              disabled={!capabilities.canEditBranding}
              placeholder="e.g. © 2026 Namo Gange Trust. All rights reserved."
              className="w-full h-8 px-2.5 rounded-md border border-[#CBD5E1] bg-white text-[11.5px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: LIVE BRANDING PREVIEW */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <Eye className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Live Branding Preview</h3>
              <p className="text-[10px] text-[#64748B]">Real-time preview of your brand elements applied to OmniPlatform outputs.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-md text-[10px]">
            <button
              type="button"
              onClick={() => setActivePreview("sidebar")}
              className={cn(
                "px-2 py-0.5 rounded font-semibold transition-all cursor-pointer",
                activePreview === "sidebar" ? "bg-white text-[#111C3A] shadow-2xs" : "text-[#64748B] hover:text-[#111C3A]"
              )}
            >
              Sidebar
            </button>
            <button
              type="button"
              onClick={() => setActivePreview("report")}
              className={cn(
                "px-2 py-0.5 rounded font-semibold transition-all cursor-pointer",
                activePreview === "report" ? "bg-white text-[#111C3A] shadow-2xs" : "text-[#64748B] hover:text-[#111C3A]"
              )}
            >
              Report PDF
            </button>
            <button
              type="button"
              onClick={() => setActivePreview("email")}
              className={cn(
                "px-2 py-0.5 rounded font-semibold transition-all cursor-pointer",
                activePreview === "email" ? "bg-white text-[#111C3A] shadow-2xs" : "text-[#64748B] hover:text-[#111C3A]"
              )}
            >
              Email Notification
            </button>
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="border border-[#CBD5E1] rounded-lg p-3 bg-slate-100/70">
          {activePreview === "sidebar" && (
            <div className="w-full max-w-[260px] mx-auto bg-[#0A0E1A] text-white rounded-lg p-2.5 space-y-2 shadow-md">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
                <div className="size-6 rounded-md bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                  {data.logo ? <img src={data.logo} alt="Logo" className="size-full object-contain" /> : <Sparkles className="size-3.5 text-emerald-500" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{data.brandName || "Namo Gange"}</div>
                  <div className="text-[8.5px] text-slate-400">OmniPlatform Workspace</div>
                </div>
              </div>
              <div className="space-y-1 text-[10px]">
                <div
                  className="px-2 py-1 rounded font-bold text-white flex items-center justify-between"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  <span>Dashboard Overview</span>
                  <Check className="size-3" />
                </div>
                <div className="px-2 py-1 text-slate-400 hover:text-white">Campaign Analytics</div>
                <div className="px-2 py-1 text-slate-400 hover:text-white">Automation Studio</div>
              </div>
            </div>
          )}

          {activePreview === "report" && (
            <div className="w-full max-w-sm mx-auto bg-white rounded-lg p-3 shadow-sm border border-slate-200 space-y-2 text-[10.5px]">
              <div className="flex items-start justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="size-7 rounded bg-slate-50 border p-0.5 flex items-center justify-center">
                    {data.reportLogo || data.logo ? (
                      <img src={data.reportLogo || data.logo} alt="Logo" className="size-full object-contain" />
                    ) : (
                      <FileText className="size-3.5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#111C3A]">{data.brandName || "Namo Gange"}</h4>
                    <p className="text-[8.5px] text-slate-500">Executive Performance Audit</p>
                  </div>
                </div>
                <span
                  className="px-1.5 py-0.2 rounded text-[8.5px] font-bold text-white"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  CONFIDENTIAL
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-slate-500">Audited Runs</div>
                  <div className="text-[12px] font-bold text-[#111C3A]">2,076</div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-slate-500">Success Rate</div>
                  <div className="text-[12px] font-bold" style={{ color: data.primaryColor }}>97.8%</div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-slate-500">Total Leads</div>
                  <div className="text-[12px] font-bold text-[#111C3A]">842</div>
                </div>
              </div>
              <div className="text-[8.5px] text-slate-400 pt-1 border-t text-center">{data.footerText}</div>
            </div>
          )}

          {activePreview === "email" && (
            <div className="w-full max-w-sm mx-auto bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-[10.5px]">
              <div className="p-2 text-white flex items-center justify-between" style={{ backgroundColor: data.secondaryColor }}>
                <span className="font-bold text-[11px]">{data.brandName} Notification</span>
                <span className="text-[9px] opacity-80">Security Notice</span>
              </div>
              <div className="p-3 space-y-1.5 text-[#334155]">
                <p className="text-[11px] font-medium">Hello Team Administrator,</p>
                <p className="text-[10px] text-[#64748B]">
                  A scheduled campaign report for Moksha Sewa has completed with 100% deliverability rate.
                </p>
                <button
                  type="button"
                  className="mt-1 px-2.5 py-1 rounded text-white text-[10px] font-bold shadow-2xs cursor-pointer"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  View Performance Metrics
                </button>
              </div>
              <div className="bg-slate-50 p-2 text-[8.5px] text-slate-400 text-center border-t">
                {data.footerText}
              </div>
            </div>
          )}
        </div>

        {/* Plan-Locked Feature */}
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-start gap-2">
          <div className="size-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="size-3" />
          </div>
          <div className="text-[10.5px] text-amber-900 min-w-0">
            <div className="font-bold flex items-center gap-1.5">
              Custom CNAME & White-Label Domain
              <span className="text-[8.5px] font-bold bg-amber-200/80 text-amber-800 px-1 py-0.2 rounded uppercase">
                Enterprise Add-on
              </span>
            </div>
            <p className="text-[9.5px] text-amber-800 mt-0.5 leading-snug">
              Hosting OmniPlatform at a dedicated subdomain like <code className="bg-amber-100 px-1 rounded font-mono">portal.namogange.org</code> with custom SSL certificate requires an Enterprise Organization Tier license. Contact your EnCodency account rep to activate.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
