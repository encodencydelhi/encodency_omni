"use client";
import { FaFacebookF, FaGoogle, FaInstagram, FaLinkedinIn, FaWhatsapp, FaYoutube } from "react-icons/fa6";
import { cn } from "@/lib/utils/cn";
import type { Platform } from "../types/content.types";
import { PLATFORM_META, ALL_PLATFORMS } from "../config/platform-config";

export function PlatformBadge({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const meta = PLATFORM_META[platform];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", meta.bg, size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-[13px]")} style={{ color: meta.color }}>
      {platform === "instagram" && <FaInstagram />}
      {platform === "facebook" && <FaFacebookF />}
      {platform === "linkedin" && <FaLinkedinIn />}
      {platform === "google-business" && <FaGoogle />}
      {platform === "whatsapp" && <FaWhatsapp />}
      {platform === "youtube" && <FaYoutube />}
      {platform === "website" && <span>{meta.icon}</span>}
    </span>
  );
}

export function PlatformStrip({ selected, onSelect }: { selected: Platform | "all"; onSelect: (p: Platform | "all") => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#EDF1F5] pb-2">
      <button onClick={() => onSelect("all")} className={cn("flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-[10.5px] font-semibold transition", selected === "all" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>All</button>
      {ALL_PLATFORMS.map((p) => (
        <button key={p} onClick={() => onSelect(p)} className={cn("flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-[10.5px] font-semibold transition", selected === p ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>
          <PlatformBadge platform={p} size="sm" />
          {PLATFORM_META[p].label}
        </button>
      ))}
    </div>
  );
}
