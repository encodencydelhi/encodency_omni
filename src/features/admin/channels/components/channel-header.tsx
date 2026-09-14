"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Download,
  ExternalLink,
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
    badge: "LinkedIn Page Admin",
    tagline: "Manage LinkedIn Company Page, employee advocacy, newsletters, articles, and competitor benchmarking.",
    accountHandle: "Namo Gange Trust (12,482 Followers)",
    statusText: "Page Live • 482 Posts",
    gradientBg: "bg-gradient-to-r from-[#EFF6FF]/90 via-[#F0F9FF]/60 to-white",
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

const allChannelsList: { id: ChannelType; name: string; href: string; iconLabel: string }[] = [
  { id: "meta", name: "Meta & Instagram", href: "/admin/meta", iconLabel: "Meta" },
  { id: "linkedin", name: "LinkedIn", href: "/admin/linkedin", iconLabel: "LinkedIn" },
  { id: "google", name: "Google Business", href: "/admin/google-business", iconLabel: "Google Business" },
  { id: "whatsapp", name: "WhatsApp", href: "/admin/whatsapp", iconLabel: "WhatsApp" },
  { id: "youtube", name: "YouTube", href: "/admin/youtube", iconLabel: "YouTube" },
  { id: "website", name: "Website", href: "/admin/website", iconLabel: "Website" },
];

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
  const [showChannelSwitcher, setShowChannelSwitcher] = useState(false);
  const config = CHANNEL_CONFIGS[channel];

  const handleSyncClick = () => {
    setIsSyncing(true);
    if (onSync) onSync();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const PrimaryIcon = config.primaryActionIcon || Plus;

  return (
    <header className="relative space-y-2.5">
      {/* Top Breadcrumb & Quick Switcher Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
        <div className="flex items-center gap-1.5 text-[#687797]">
          <Link href="/admin" className="hover:text-[#0A66C2] transition-colors">
            Admin
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#8A97AF]">Channels</span>
          <span className="text-[#CBD5E1]">/</span>
          <div className="relative inline-block">
            <button
              onClick={() => setShowChannelSwitcher(!showChannelSwitcher)}
              className="flex items-center gap-1 font-bold text-[#172044] hover:text-[#0A66C2] transition-colors"
            >
              <span>{config.name}</span>
              <ChevronDown className="size-3 text-[#8A97AF]" />
            </button>

            {/* Dropdown Switcher */}
            {showChannelSwitcher && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowChannelSwitcher(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-xl border border-[#DDE4ED] bg-white p-1.5 shadow-[0_10px_25px_rgb(0_0_0/0.12)]">
                  <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#8A97AF]">
                    Channels
                  </p>
                  <div className="space-y-0.5">
                    {allChannelsList.map((ch) => (
                      <Link
                        key={ch.id}
                        href={ch.href}
                        onClick={() => setShowChannelSwitcher(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                          ch.id === channel
                            ? "bg-[#EFF6FF] text-[#0A66C2]"
                            : "text-[#334155] hover:bg-[#F8FAFD]"
                        )}
                      >
                        {ch.id === "website" ? (
                          <span className="grid size-5 place-items-center rounded bg-[#EFF6FF] text-[#2563EB]">
                            <Globe2 className="size-3.5" />
                          </span>
                        ) : (
                          <ChannelLogo channel={ch.iconLabel} className="size-5 rounded" />
                        )}
                        <span>{ch.name}</span>
                        {ch.id === channel && (
                          <span className="ml-auto size-1.5 rounded-full bg-[#0A66C2]" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick channel tabs switcher pill bar (Desktop) */}
        <div className="hidden items-center gap-1 rounded-full border border-[#E2E8F0] bg-white/80 p-0.5 shadow-sm backdrop-blur-sm md:flex">
          {allChannelsList.map((ch) => {
            const isActive = ch.id === channel;
            return (
              <Link
                key={ch.id}
                href={ch.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all",
                  isActive
                    ? "bg-[#172044] text-white shadow-sm"
                    : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                )}
              >
                {ch.id === "website" ? (
                  <Globe2 className={cn("size-3.5", isActive ? "text-white" : "text-[#2563EB]")} />
                ) : (
                  <ChannelLogo channel={ch.iconLabel} className="size-4 rounded-full bg-white p-0.5 shadow-2xs" />
                )}
                <span>{ch.id === "google" ? "Google" : ch.id === "meta" ? "Meta" : ch.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Glassmorphic Gradient Header Card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-[0_2px_12px_rgb(31_50_81/0.06)] backdrop-blur-md transition-all sm:p-5",
          config.gradientBg,
          config.borderAccent
        )}
      >
        {/* Subtle decorative glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: config.brandColor }}
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Column: Icon + Title + Account details + Status */}
          <div className="flex items-start gap-3.5">
            {/* Brand Logo Box */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "grid size-12 place-items-center rounded-2xl shadow-[0_4px_14px_rgb(0_0_0/0.12)] sm:size-13",
                  channel === "meta" && "bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#405DE6]",
                  channel === "linkedin" && "bg-gradient-to-tr from-[#0A66C2] to-[#004182]",
                  channel === "google" && "bg-gradient-to-tr from-[#1A73E8] to-[#0D47A1]",
                  channel === "whatsapp" && "bg-gradient-to-tr from-[#25D366] to-[#128C7E]",
                  channel === "youtube" && "bg-gradient-to-tr from-[#FF0000] to-[#B91C1C]",
                  channel === "website" && "bg-gradient-to-tr from-[#2563EB] to-[#06B6D4]"
                )}
              >
                <div className="grid size-8 place-items-center rounded-xl bg-white shadow-xs">
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
              </div>
              {/* Online indicator ping */}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full border-2 border-white bg-[#10B981]" />
              </span>
            </div>

            {/* Text details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-black tracking-tight text-[#111B43] sm:text-[23px]">
                  {customTitle || config.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#DDE4ED] bg-white/90 px-2 py-0.5 text-[10.5px] font-bold text-[#475569] shadow-xs">
                  <span className="size-1.5 rounded-full bg-[#10B981]" />
                  {config.statusText}
                </span>
                {config.externalUrl && (
                  <a
                    href={config.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden items-center gap-0.5 text-[10.5px] font-semibold text-[#0A66C2] hover:underline sm:inline-flex"
                  >
                    <span>View Live</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>

              <p className="mt-0.5 line-clamp-1 text-[11.5px] font-medium text-[#475569] sm:text-[12px]">
                {customAccountHandle || config.accountHandle}
              </p>

              <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[#64748B]">
                {customTagline || config.tagline}
              </p>
            </div>
          </div>

          {/* Right Column: Actions & Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Live Sync Action */}
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              title="Sync latest metrics"
              className={cn(
                "flex h-[38px] items-center gap-1.5 rounded-xl border border-[#DDE4ED] bg-white/90 px-3 text-[11px] font-bold text-[#334155] shadow-xs transition-all hover:bg-white hover:text-[#0A66C2] active:scale-98",
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
                <p className="text-[10px] font-bold text-[#172044]">{dateRangeText}</p>
                <p className="text-[10px] text-[#64748B]">{dateRangeSubtext}</p>
              </div>
              <ChevronDown className="size-3 text-[#94A3B8]" />
            </div>

            {/* Export Report Button */}
            <button
              onClick={onExport}
              className="flex h-[38px] items-center gap-1.5 rounded-xl border border-[#DDE4ED] bg-white/90 px-3 text-[11px] font-bold text-[#334155] shadow-xs transition-all hover:bg-white hover:text-[#0A66C2]"
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
                className="flex h-[38px] items-center gap-1.5 rounded-xl bg-[#0A66C2] px-3.5 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgb(10_102_194/0.25)] transition-all hover:bg-[#0958A8] active:scale-98"
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
