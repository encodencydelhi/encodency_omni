"use client";
import { FaFacebookF, FaGoogle, FaInstagram, FaLinkedinIn, FaWhatsapp, FaYoutube, FaTiktok, FaXTwitter, FaPinterest, FaThreads } from "react-icons/fa6";
import { cn } from "@/lib/utils/cn";
import type { Platform } from "../types/content.types";
import { PLATFORM_META, ALL_PLATFORMS } from "../config/platform-config";

export function PlatformBadge({ platform, size = "md" }: { platform: Platform | string; size?: "sm" | "md" }) {
  const raw = typeof platform === "string" ? platform.toLowerCase().trim() : "";
  const normalizedKey = (raw === "twitter" ? "x" : raw) as Platform;
  const meta = PLATFORM_META[normalizedKey] || {
    label: typeof platform === "string" && platform ? platform : "Platform",
    short: typeof platform === "string" && platform ? platform.slice(0, 2).toUpperCase() : "PL",
    color: "#475569",
    bg: "#F1F5F9",
    icon: "🌐",
  };

  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-sm font-semibold", meta.bg, size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-[13px]")} style={{ color: meta.color }}>
      {normalizedKey === "instagram" && <FaInstagram />}
      {normalizedKey === "facebook" && <FaFacebookF />}
      {normalizedKey === "linkedin" && <FaLinkedinIn />}
      {normalizedKey === "youtube" && <FaYoutube />}
      {normalizedKey === "tiktok" && <FaTiktok />}
      {normalizedKey === "x" && <FaXTwitter />}
      {normalizedKey === "pinterest" && <FaPinterest />}
      {normalizedKey === "threads" && <FaThreads />}
      {normalizedKey === "whatsapp" && <FaWhatsapp />}
      {normalizedKey === "google-business" && <FaGoogle />}
      {(normalizedKey === "website" || normalizedKey === "email") && <span>{meta.icon}</span>}
      {!["instagram", "facebook", "linkedin", "youtube", "tiktok", "x", "pinterest", "threads", "whatsapp", "google-business", "website", "email"].includes(normalizedKey) && (
        <span>{meta.short}</span>
      )}
    </span>
  );
}

export function PlatformStrip({ selected, onSelect }: { selected: Platform | "all"; onSelect: (p: Platform | "all") => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#EDF1F5] pb-2">
      <button onClick={() => onSelect("all")} className={cn("flex h-7 shrink-0 items-center gap-1 rounded-sm px-2.5 text-[10.5px] font-semibold transition", selected === "all" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>All</button>
      {ALL_PLATFORMS.map((p) => (
        <button key={p} onClick={() => onSelect(p)} className={cn("flex h-7 shrink-0 items-center gap-1 rounded-sm px-2.5 text-[10.5px] font-semibold transition", selected === p ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>
          <PlatformBadge platform={p} size="sm" />
          {PLATFORM_META[p].label}
        </button>
      ))}
    </div>
  );
}
