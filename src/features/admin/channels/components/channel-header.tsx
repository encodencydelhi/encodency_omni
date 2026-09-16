"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";

export type ChannelType = "meta" | "linkedin" | "google" | "whatsapp" | "youtube" | "website";

interface ChannelConfig {
  id: ChannelType;
  name: string;
  href: string;
  badge: string;
  tagline: string;
  accountHandle: string;
  statusText: string;
  gradientBg: string;
  borderAccent: string;
  iconBg: string;
  brandColor: string;
  externalUrl?: string;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ElementType;
}

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  meta: {
    id: "meta",
    name: "Meta & Instagram",
    href: "/admin/meta",
    badge: "Meta Business Suite",
    tagline: "Manage your Facebook and Instagram presence, create content, run campaigns and track performance.",
    accountHandle: "Namo Gange Trust (@namogange.official)",
    statusText: "2 Accounts Connected",
    gradientBg: "bg-gradient-to-r from-[#FFF1F2]/80 via-[#EFF6FF]/60 to-white",
    borderAccent: "border-[#FBCFE8]/60",
    iconBg: "bg-gradient-to-tr from-[#E1306C] via-[#FD1D1D] to-[#405DE6]",
    brandColor: "#E1306C",
    externalUrl: "https://instagram.com",
    primaryActionLabel: "Create Post",
    primaryActionIcon: Plus,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    href: "/admin/linkedin",
    badge: "Official Company Page",
    tagline: "Manage LinkedIn Company Page, employee advocacy, newsletters, articles, and competitor benchmarks.",
    accountHandle: "Namo Gange Trust",
    statusText: "",
    gradientBg: "bg-gradient-to-r from-[#EFF6FF]/90 via-[#F5F3FF]/50 to-white",
    borderAccent: "border-transparent",
    iconBg: "bg-transparent",
    brandColor: "#0A66C2",
    externalUrl: "https://linkedin.com",
    primaryActionLabel: "Create Post",
    primaryActionIcon: Plus,
  },
  google: {
    id: "google",
    name: "Google Business",
    href: "/admin/google-business",
    badge: "Google Business Profile",
    tagline: "Manage locations, reviews, local SEO, search visibility, direction requests and customer interactions.",
    accountHandle: "Namo Gange Trust - New Delhi & 3 Locations",
    statusText: "Verified Listing • 4.8 ★ (248 Reviews)",
    gradientBg: "bg-gradient-to-r from-[#EFF6FF]/80 via-[#ECFDF5]/50 to-white",
    borderAccent: "border-[#BAE6FD]/60",
    iconBg: "bg-[#1A73E8]",
    brandColor: "#1A73E8",
    externalUrl: "https://business.google.com",
    primaryActionLabel: "Sync Locations",
    primaryActionIcon: RefreshCw,
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    href: "/admin/whatsapp",
    badge: "WhatsApp Business API",
    tagline: "Manage WhatsApp Business API, broadcast campaigns, interactive templates, automation and customer chats.",
    accountHandle: "Namo Gange Trust Helpline (+91 98110 XXXXX)",
    statusText: "Cloud API Active • 98.4% Delivery",
    gradientBg: "bg-gradient-to-r from-[#ECFDF5]/90 via-[#F0FDF4]/60 to-white",
    borderAccent: "border-[#A7F3D0]/60",
    iconBg: "bg-[#25D366]",
    brandColor: "#25D366",
    primaryActionLabel: "Send Broadcast",
    primaryActionIcon: Send,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    href: "/admin/youtube",
    badge: "YouTube Studio Partner",
    tagline: "Manage YouTube channel, publish videos & shorts, track audience retention, engagement, and subscriber growth.",
    accountHandle: "Namo Gange Trust Official (@NamoGange - 42.8K Subs)",
    statusText: "Channel Active • 142 Videos",
    gradientBg: "bg-gradient-to-r from-[#FEF2F2]/90 via-[#FFF7ED]/50 to-white",
    borderAccent: "border-[#FECACA]/60",
    iconBg: "bg-[#FF0000]",
    brandColor: "#FF0000",
    externalUrl: "https://youtube.com",
    primaryActionLabel: "Upload Video",
    primaryActionIcon: Plus,
  },
  website: {
    id: "website",
    name: "Website",
    href: "/admin/website",
    badge: "Web Analytics & SEO",
    tagline: "Manage website performance, traffic sources, landing pages, form conversions, bounce rate, and user behavior.",
    accountHandle: "namogangetrust.org (Production SSL)",
    statusText: "Tracking Active • 24.8K Monthly Visitors",
    gradientBg: "bg-gradient-to-r from-[#EFF6FF]/90 via-[#F5F3FF]/50 to-white",
    borderAccent: "border-[#C7D2FE]/60",
    iconBg: "bg-[#2563EB]",
    brandColor: "#2563EB",
    externalUrl: "https://namogangetrust.org",
    primaryActionLabel: "New Page",
    primaryActionIcon: Plus,
  },
};

interface ChannelHeaderProps {
  channel: ChannelType;
  customTitle?: string;
  customTagline?: string;
  customAccountHandle?: string;
  dateRangeText?: string;
  dateRangeSubtext?: string;
  onExport?: () => void;
  onSync?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  hidePrimaryAction?: boolean;
  extraActions?: React.ReactNode;
}

export function ChannelHeader({
  channel,
  customTitle,
  customTagline,
  customAccountHandle,
  dateRangeText = "Last 30 days",
  dateRangeSubtext = "Mar 15, 2025 – Apr 14, 2025",
  onExport,
  onSync,
  onPrimaryAction,
  primaryActionLabel,
  hidePrimaryAction = false,
  extraActions,
}: ChannelHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const config = CHANNEL_CONFIGS[channel];
  const effectivePrimaryLabel = primaryActionLabel !== undefined ? primaryActionLabel : config.primaryActionLabel;

  const handleSyncClick = () => {
    setIsSyncing(true);
    if (onSync) onSync();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const PrimaryIcon = config.primaryActionIcon || Plus;

  return (
    <header className="relative space-y-2.5">
      {/* 2-Row Clean Header */}
      <div className="relative py-3.5 space-y-3">
        {/* Row 1: Title, Account Handle, Status Badge & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Brand Logo Box */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className={cn(
                  "grid place-items-center shadow-xs rounded-sm",
                  channel === "linkedin" || channel === "whatsapp" || channel === "youtube" || channel === "website" ? "size-14 bg-transparent border-transparent shadow-none" : "size-10",
                  channel !== "linkedin" && channel !== "whatsapp" && channel !== "youtube" && channel !== "website" ? config.iconBg || "bg-[#2563EB]" : ""
                )}
              >
                {channel === "website" ? (
                  <img src="/website-logo.png" alt="Website Logo" className="size-16 object-contain drop-shadow-sm scale-[1.4]" />
                ) : channel === "linkedin" ? (
                  <img src="/linkedin-logo.png" alt="LinkedIn Logo" className="size-16 object-contain drop-shadow-sm scale-[1.4]" />
                ) : channel === "whatsapp" ? (
                  <img src="/whatsapp-logo.png" alt="WhatsApp Logo" className="size-16 object-contain drop-shadow-sm scale-[1.4]" />
                ) : channel === "youtube" ? (
                  <img src="/youtube-logo.png" alt="YouTube Logo" className="size-16 object-contain drop-shadow-sm scale-[1.4]" />
                ) : (
                  <ChannelLogo
                    channel={channel === "google" ? "Google Business" : "Meta"}
                    className="size-6 bg-transparent"
                  />
                )}
              </div>
              {/* Online indicator ping */}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-sm bg-[#10B981] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-sm border-2 border-white bg-[#10B981]" />
              </span>
            </div>

            {/* Text details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[20px] font-bold text-[#111B43] sm:text-[22px]">
                  {customTitle || config.name}
                </h1>
                <span className="text-[#DDE4ED] text-[20px] leading-none font-light">|</span>
                <span className="text-[14px] font-bold text-[#111B43]">{customAccountHandle || config.accountHandle}</span>
                {config.statusText && config.statusText.split("•")[0] && (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#047857] border border-emerald-200/60">
                    <span className="size-1.5 rounded-sm bg-[#10B981]" />
                    {config.statusText.split("•")[0]}
                  </span>
                )}
                {config.statusText && config.statusText.split("•")[1] && (
                  <span className="text-[12px] text-[#64748B] font-semibold">
                    • {config.statusText.split("•")[1]?.trim()}
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[12px] text-[#64748B] font-medium">
                {customTagline || config.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Actions Toolbar (Sync Live, Date Range, Export, Extra Actions, Primary Action) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            {(() => {
              const statusPills: Record<ChannelType, { label: string; text: string; bg: string; border: string; dot: string }> = {
                whatsapp: { label: "WABA Cloud API Connected", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200/70", dot: "bg-emerald-500" },
                website: { label: "Web Analytics & SSL Active", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200/70", dot: "bg-blue-500" },
                meta: { label: "Meta Graph API Connected", text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200/70", dot: "bg-pink-500" },
                linkedin: { label: "LinkedIn Company API Active", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200/70", dot: "bg-blue-600" },
                google: { label: "Google Business Profile Verified", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200/70", dot: "bg-blue-500" },
                youtube: { label: "YouTube Partner API Active", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200/70", dot: "bg-rose-500" },
              };
              const pill = statusPills[channel] || statusPills.website;
              return (
                <span className={cn("inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-bold border", pill.bg, pill.text, pill.border)}>
                  <span className={cn("size-2 rounded-sm animate-pulse", pill.dot)} /> {pill.label}
                </span>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Sync Action */}
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              title="Sync latest metrics"
              className={cn(
                "flex h-[36px] shrink-0 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-[11.5px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-98 cursor-pointer",
                isSyncing && "opacity-75 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("size-3.5", channel === "whatsapp" ? "text-emerald-600" : "text-blue-600", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Syncing..." : "Sync Live"}</span>
            </button>

            {/* Date Range Selector */}
            <div className="flex h-[36px] items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer">
              <CalendarDays className={cn("size-3.5 shrink-0", channel === "whatsapp" ? "text-emerald-600" : "text-blue-600")} />
              <div className="text-left text-xs leading-none">
                <span className="block font-bold text-slate-800">{dateRangeText}</span>
                <span className="block mt-0.5 text-[10px] text-slate-400 font-medium">{dateRangeSubtext}</span>
              </div>
              <ChevronDown className="size-3 text-slate-400" />
            </div>

            {/* Export Action */}
            <button
              onClick={onExport}
              className="flex h-[36px] items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-[11.5px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              <Download className="size-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {/* Channel-Specific Extra Actions */}
            {extraActions}

            {/* Primary Action Button */}
            {!hidePrimaryAction && effectivePrimaryLabel && (
              <button
                onClick={onPrimaryAction}
                className={cn(
                  "flex h-[36px] items-center gap-1.5 rounded-sm px-3.5 text-[11.5px] font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer",
                  channel === "whatsapp"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : channel === "website"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : channel === "meta"
                        ? "bg-pink-600 hover:bg-pink-700"
                        : channel === "linkedin"
                          ? "bg-[#0A66C2] hover:bg-[#084e96]"
                          : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                <PrimaryIcon className="size-3.5" />
                <span>{effectivePrimaryLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
