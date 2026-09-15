"use client";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PlatformBadge } from "./ui-platform";
import type { Platform, ContentType } from "../types/content.types";
import { PLATFORM_CONTENT_TYPES, PLATFORM_META } from "../config/platform-config";

type Props = {
  platform: Platform;
  selected: ContentType | null;
  onSelect: (ct: ContentType) => void;
};

export function ContentTypeSelector({ platform, selected, onSelect }: Props) {
  const specs = PLATFORM_CONTENT_TYPES[platform] ?? [];
  const meta = PLATFORM_META[platform];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <PlatformBadge platform={platform} size="sm" />
        <span className="text-[11px] font-semibold text-[#33445F]">{meta.label}</span>
        <span className="text-[10px] text-[#7A87A0]">— Content Type</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {specs.map((spec) => (
          <button
            key={spec.id}
            onClick={() => onSelect(spec.id)}
            className={cn(
              "flex items-center gap-1 rounded-sm border px-2.5 py-1.5 text-[10.5px] font-semibold transition",
              selected === spec.id
                ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)] text-[color:var(--pc)]"
                : "border-[#E2E8F0] text-[#687797] hover:border-[#CBD5E1] hover:bg-slate-50"
            )}
            style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
          >
            {selected === spec.id && <Check className="size-2.5" />}
            <span>{spec.icon}</span>
            {spec.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Compact inline version for the main type selector ── */
type InlineProps = {
  platforms: Platform[];
  contentTypes: Partial<Record<Platform, ContentType>>;
  onChange: (platform: Platform, contentType: ContentType) => void;
};

export function ContentTypeSelectorInline({ platforms, contentTypes, onChange }: InlineProps) {
  const [expanded, setExpanded] = useState<Platform | null>(null);

  return (
    <div className="space-y-1">
      {platforms.map((p) => {
        const specs = PLATFORM_CONTENT_TYPES[p] ?? [];
        const meta = PLATFORM_META[p];
        const current = contentTypes[p];
        const isExpanded = expanded === p;

        return (
          <div key={p}>
            <button
              onClick={() => setExpanded(isExpanded ? null : p)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition hover:bg-slate-50"
            >
              {isExpanded ? <ChevronDown className="size-3 text-[#7A87A0]" /> : <ChevronRight className="size-3 text-[#7A87A0]" />}
              <PlatformBadge platform={p} size="sm" />
              <span className="flex-1 text-[11px] font-semibold text-[#33445F]">{meta.label}</span>
              {current && (
                <span className="text-[10px] font-semibold text-[#7A87A0]">
                  {specs.find(s => s.id === current)?.label ?? current}
                </span>
              )}
            </button>
            {isExpanded && (
              <div className="ml-7 flex flex-wrap gap-1 py-1.5">
                {specs.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => onChange(p, spec.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-semibold transition",
                      current === spec.id
                        ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)] text-[color:var(--pc)]"
                        : "border-[#E2E8F0] text-[#687797] hover:border-[#CBD5E1]"
                    )}
                    style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
                  >
                    {current === spec.id && <Check className="size-2" />}
                    <span>{spec.icon}</span>
                    {spec.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
