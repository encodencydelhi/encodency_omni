"use client";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Maximize2, Crop, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Toggle } from "./ui-fields";
import type { Platform, ContentType, MediaRatio, AutoAdaptOptions } from "../types/content.types";
import { PLATFORM_META, getRatiosForPlatform, AUTO_ADAPT_MAP } from "../config/platform-config";
import { PlatformBadge } from "./ui-platform";

type Props = {
  masterRatio: MediaRatio;
  onMasterRatioChange: (r: MediaRatio) => void;
  platforms: Platform[];
  contentTypes: Partial<Record<Platform, ContentType>>;
  platformRatios: Partial<Record<Platform, string>>;
  onPlatformRatioChange: (platform: Platform, ratio: string) => void;
  autoAdapt: AutoAdaptOptions;
  onAutoAdaptChange: (options: AutoAdaptOptions) => void;
};

const ALL_RATIOS: Array<{ ratio: MediaRatio; label: string; resolution: string }> = [
  { ratio: "1:1", label: "Square", resolution: "1080 × 1080" },
  { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" },
  { ratio: "9:16", label: "Vertical", resolution: "1080 × 1920" },
  { ratio: "16:9", label: "Landscape", resolution: "1920 × 1080" },
  { ratio: "1.91:1", label: "Wide", resolution: "1200 × 627" },
  { ratio: "2:3", label: "Pinterest", resolution: "1000 × 1500" },
  { ratio: "custom", label: "Custom", resolution: "Define your own" },
];

export function RatioSelector({
  masterRatio,
  onMasterRatioChange,
  platforms,
  contentTypes,
  platformRatios,
  onPlatformRatioChange,
  autoAdapt,
  onAutoAdaptChange,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleAutoAdapt = (key: keyof AutoAdaptOptions) => {
    onAutoAdaptChange({ ...autoAdapt, [key]: !autoAdapt[key] });
  };

  return (
    <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-semibold text-[#172044]">Aspect Ratio</h3>
          <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">Master ratio + per-platform adaptation</p>
        </div>
        {isOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
      </button>

      {isOpen && (
        <div className="p-3">
          {/* Master ratio selector */}
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {ALL_RATIOS.map((r) => (
              <button
                key={r.ratio}
                onClick={() => {
                  onMasterRatioChange(r.ratio);
                  setShowCustom(r.ratio === "custom");
                }}
                className={cn(
                  "flex flex-col items-center rounded-sm border px-1 py-2 text-center transition",
                  masterRatio === r.ratio ? "border-[#1769DF] bg-[#F0F6FF]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                )}
              >
                <span className="text-[10.5px] font-semibold text-[#24365A]">{r.ratio}</span>
                <span className="text-[8px] text-[#7A87A0] leading-tight">{r.label}</span>
              </button>
            ))}
          </div>

          {/* Custom size editor */}
          {showCustom && masterRatio === "custom" && (
            <div className="mt-2 rounded-sm border border-[#E2E8F0] bg-[#F8FAFD] p-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#33445F]">
                <Crop className="size-3.5" /> Custom Dimensions
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-semibold text-[#7A87A0]">Width (px)</span>
                  <input type="number" defaultValue={1080} className="h-8 w-full rounded-sm border border-[#D9E1EC] bg-white px-2 text-[11px] text-[#24365A] outline-none focus:border-[#1769DF]" />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-semibold text-[#7A87A0]">Height (px)</span>
                  <input type="number" defaultValue={1350} className="h-8 w-full rounded-sm border border-[#D9E1EC] bg-white px-2 text-[11px] text-[#24365A] outline-none focus:border-[#1769DF]" />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-semibold text-[#7A87A0]">Aspect Ratio</span>
                  <div className="flex h-8 items-center rounded-sm border border-[#D9E1EC] bg-[#F1F5F9] px-2 text-[11px] font-semibold text-[#33445F]">4 : 5</div>
                </label>
              </div>
              <div className="mt-2 flex gap-1">
                <button className="flex items-center gap-1 rounded-sm border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] hover:bg-white">
                  <Maximize2 className="size-2.5" /> Fit
                </button>
                <button className="flex items-center gap-1 rounded-sm border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] hover:bg-white">
                  <Crop className="size-2.5" /> Smart Crop
                </button>
                <button className="flex items-center gap-1 rounded-sm border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] hover:bg-white">
                  <RotateCcw className="size-2.5" /> Reset
                </button>
                <button className="ml-auto rounded-sm bg-[#1769DF] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#1259BD]">Save as Preset</button>
              </div>
            </div>
          )}

          {/* Auto Adapt */}
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between rounded-sm border border-[#E2E8F0] px-2.5 py-1.5">
              <div>
                <p className="text-[11.5px] font-semibold text-[#33445F]">Auto Adapt</p>
                <p className="text-[10px] text-[#7A87A0]">Resize per platform automatically</p>
              </div>
              <Toggle on={autoAdapt.autoResize} onChange={() => toggleAutoAdapt("autoResize")} label="Auto resize" />
            </div>

            {autoAdapt.autoResize && (
              <>
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: "smartCrop" as const, label: "Smart Crop" },
                    { key: "preserveSubject" as const, label: "Preserve Subject" },
                    { key: "preserveLogo" as const, label: "Preserve Logo" },
                    { key: "preserveText" as const, label: "Preserve Text" },
                    { key: "preserveFaces" as const, label: "Preserve Faces" },
                    { key: "respectSafeZones" as const, label: "Safe Zones" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => toggleAutoAdapt(opt.key)}
                      className={cn(
                        "flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-semibold transition",
                        autoAdapt[opt.key] ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-[#E2E8F0] text-[#687797] hover:bg-slate-50"
                      )}
                    >
                      {autoAdapt[opt.key] && <Check className="size-2.5" />}
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Per-platform adapted ratios */}
                <div className="mt-1 space-y-0.5">
                  {platforms.map((p) => {
                    const meta = PLATFORM_META[p];
                    const adapted = AUTO_ADAPT_MAP[masterRatio]?.[p] ?? masterRatio;
                    const customRatio = platformRatios[p];
                    const displayRatio = customRatio || adapted;

                    return (
                      <div key={p} className="flex items-center gap-2 rounded-sm border border-[#E2E8F0] px-2 py-1">
                        <PlatformBadge platform={p} size="sm" />
                        <span className="flex-1 text-[10.5px] font-semibold text-[#33445F]">{meta.label}</span>
                        <div className="flex gap-1">
                          {(getRatiosForPlatform(p, contentTypes[p]).slice(0, 4)).map((r) => (
                            <button
                              key={r.ratio}
                              onClick={() => onPlatformRatioChange(p, r.ratio)}
                              className={cn(
                                "rounded border px-1.5 py-0.5 text-[9px] font-semibold transition",
                                displayRatio === r.ratio
                                  ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)] text-[color:var(--pc)]"
                                  : "border-[#E2E8F0] text-[#7A87A0] hover:border-[#CBD5E1]"
                              )}
                              style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
                            >
                              {r.ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
