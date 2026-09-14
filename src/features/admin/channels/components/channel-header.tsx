"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Globe2,
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
    borderAccent: "border-[#BFDBFE]/60",
    iconBg: "bg-[#0A66C2]",
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
    primaryActionLabel: "New Page / CTA",
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
  extraActions,
}: ChannelHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const config = CHANNEL_CONFIGS[channel];

  const handleSyncClick = () => {
    setIsSyncing(true);
    if (onSync) onSync();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const PrimaryIcon = config.primaryActionIcon || Plus;

  return (
    <header className="relative space-y-2.5">
      {/* Top row removed as per request */}

      {/* Clean Header */}
      <div className="relative py-4">

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Column: Icon + Title + Account details + Status */}
          <div className="flex items-start gap-3.5">
            {/* Brand Logo Box */}
            <div className="relative shrink-0 mt-1">
              <div className="grid size-10 place-items-center rounded bg-[#0A66C2] shadow-sm">
                {channel === "website" ? (
                  <Globe2 className="size-5 text-[#2563EB]" />
                ) : (
                  <ChannelLogo
                    channel={
                      channel === "linkedin"
                        ? "LinkedIn"
                        : channel === "google"
                          ? "Google Business"
                          : channel === "whatsapp"
                            ? "WhatsApp"
                            : channel === "youtube"
                              ? "YouTube"
                              : "Meta"
                    }
                    className="size-6 bg-transparent"
                  />
                )}
              </div>
              {/* Online indicator ping */}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full border-2 border-white bg-[#10B981]" />
              </span>
            </div>

            {/* Text details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[20px] font-semibold text-[#111B43] sm:text-[22px]">
                  {customTitle || config.name}
                </h1>
                <span className="text-[#DDE4ED] text-[20px] leading-none mb-1 font-light">|</span>
                <span className="text-[14px] font-semibold text-[#111B43]">{customAccountHandle || config.accountHandle}</span>
                {config.statusText && config.statusText.split("•")[0] && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10.5px] font-semibold text-[#047857]">
                    <span className="size-1.5 rounded-full bg-[#10B981]" />
                    {config.statusText.split("•")[0]}
                  </span>
                )}
                {config.statusText && config.statusText.split("•")[1] && (
                  <span className="text-[12px] text-[#64748B]">
                    • {config.statusText.split("•")[1]?.trim()}
                  </span>
                )}
              </div>

              <p className="mt-1 line-clamp-1 text-[12px] text-[#64748B]">
                {customTagline || config.tagline}
              </p>
            </div>
          </div>

          {/* Right Column: Actions & Controls */}
          <div className="flex flex-nowrap shrink-0 items-center gap-2 self-start lg:self-center">
            {/* Live Sync Action */}
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              title="Sync latest metrics"
              className={cn(
                "flex h-[38px] shrink-0 items-center gap-1.5 rounded-none border border-[#DDE4ED] bg-white/90 px-3 text-[11px] font-semibold text-[#334155] shadow-xs transition-all hover:bg-white hover:text-[#0A66C2] active:scale-98",
                isSyncing && "opacity-75 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("size-3.5 text-[#0A66C2]", isSyncing && "animate-spin")} />
              <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync Live"}</span>
            </button>

            {/* Date Range Selector */}
            <div className="flex h-[38px] items-center gap-2 rounded-xl border border-[#DDE4ED] bg-white/90 px-3 shadow-xs transition-colors hover:bg-white">
              <CalendarDays className="size-3.5 shrink-0 text-[#0A66C2]" />
              <div className="text-left leading-none">
                <p className="text-[10px] font-semibold text-[#172044]">{dateRangeText}</p>
                <p className="text-[10px] text-[#64748B]">{dateRangeSubtext}</p>
              </div>
              <ChevronDown className="size-3 text-[#94A3B8]" />
            </div>

            {/* Export Report Button */}
            <button
              onClick={onExport}
              className="flex h-[38px] items-center gap-1.5 rounded-xl border border-[#DDE4ED] bg-white/90 px-3 text-[11px] font-semibold text-[#334155] shadow-xs transition-all hover:bg-white hover:text-[#0A66C2]"
            >
              <Download className="size-3.5 text-[#64748B]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Channel-Specific Extra Actions */}
            {extraActions}

            {/* Primary Action Button */}
            {config.primaryActionLabel && (
              <button
                onClick={onPrimaryAction}
                className="flex h-[38px] items-center gap-1.5 rounded-xl bg-[#0A66C2] px-3.5 text-[11.5px] font-semibold text-white shadow-[0_2px_8px_rgb(10_102_194/0.25)] transition-all hover:bg-[#0958A8] active:scale-98"
                style={{
                  backgroundColor: channel === "youtube" ? "#DC2626" : channel === "whatsapp" ? "#16A34A" : "#0A66C2",
                }}
              >
                <PrimaryIcon className="size-3.5" />
                <span>{config.primaryActionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
