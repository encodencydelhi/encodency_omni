"use client";
import { MoreHorizontal, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import type { Platform } from "../types/content.types";
import { PLATFORM_META } from "../config/platform-config";
import { IMG } from "../mocks/content.mock";

export function ContentPreviewPanel({ platform, setPlatform, channels }: { platform: Platform; setPlatform: (p: Platform) => void; channels: Platform[] }) {
  const meta = PLATFORM_META[platform];
  return (
    <Card>
      <div className="flex items-center gap-1.5 border-b border-[#EDF1F5] pb-2 mb-2">
        <span className="text-[11px] font-bold text-[#7A87A0]">Preview</span>
        <div className="ml-auto flex gap-0.5">
          {channels.map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={cn("flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition", platform === p ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0] hover:bg-slate-50")}>
              <PlatformBadge platform={p} size="sm" />
              {PLATFORM_META[p].short}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
        <div className="flex items-center justify-between bg-[#F8FAFD] px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <PlatformBadge platform={platform} size="sm" />
            <span className="text-[10.5px] font-bold text-[#172044]">{meta.label}</span>
          </div>
          <MoreHorizontal className="size-3 text-[#94A3B8]" />
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="grid size-6 place-items-center rounded-full bg-green-100 text-[11px]">🌿</span>
          <div>
            <p className="text-[10.5px] font-bold text-[#172044]">Moksha Sewa</p>
            <p className="text-[8.5px] text-[#94A3B8]">Sponsored</p>
          </div>
        </div>
        <div className="relative">
          <img src={IMG.river} alt="" className="aspect-[4/3.4] w-full object-cover" />
          <div className="absolute inset-x-3 bottom-3">
            <p className="max-w-[160px] text-[16px] font-black leading-[1.02] text-white drop-shadow-lg">CLEAN RIVERS<br />BRIGHTER TOMORROW</p>
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between text-[#1d2f50]">
            <div className="flex items-center gap-2.5"><Heart className="size-3.5 fill-red-500 text-red-500" /><MessageCircle className="size-3.5" /><Send className="size-3.5" /></div>
            <Bookmark className="size-3.5" />
          </div>
          <p className="mt-0.5 text-[10.5px] font-bold text-[#172044]">1,246 likes</p>
          <p className="mt-0.5 text-[10.5px] leading-3.5 text-[#64748B]"><b className="text-[#172044]">Moksha Sewa</b> Small actions create a cleaner tomorrow… <span className="text-[#94A3B8]">more</span></p>
          <p className="mt-0.5 text-[10px] font-medium text-[#1769DF]">#CleanGanga #HealthyIndia #Sustainability</p>
        </div>
      </div>
    </Card>
  );
}
