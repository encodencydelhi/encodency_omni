"use client";
import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "./ui-card";
import { TextField } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import type { Platform, UTMConfig } from "../types/content.types";
import { PLATFORM_META, PLATFORM_UTM_DEFAULTS } from "../config/platform-config";

type Props = {
  platforms: Platform[];
  globalUtm: UTMConfig;
  platformUtms: Partial<Record<Platform, UTMConfig>>;
  campaignName: string;
  onGlobalUtmChange: (utm: UTMConfig) => void;
  onPlatformUtmChange: (platform: Platform, utm: UTMConfig) => void;
};

export function UTMBuilder({
  platforms,
  globalUtm,
  platformUtms,
  campaignName,
  onGlobalUtmChange,
  onPlatformUtmChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);

  const generateAutoUtm = (platform: Platform): UTMConfig => {
    const defaults = PLATFORM_UTM_DEFAULTS[platform];
    return {
      source: defaults.source,
      medium: defaults.medium,
      campaign: campaignName.toLowerCase().replace(/\s+/g, "_"),
      content: `${defaults.source}_feed_01`,
      term: "",
    };
  };

  const generateAll = () => {
    onGlobalUtmChange({
      source: "social",
      medium: "campaign",
      campaign: campaignName.toLowerCase().replace(/\s+/g, "_"),
      content: "feed_01",
      term: "",
    });
    platforms.forEach(p => {
      onPlatformUtmChange(p, generateAutoUtm(p));
    });
  };

  return (
    <Card
      title="Tracking"
      subtitle="UTM parameters for campaign tracking"
      action={
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-semibold text-[#1769DF]">
          {expanded ? "Collapse" : "Expand"}
        </button>
      }
    >
      {!expanded && (
        <p className="text-[10px] text-[#94A3B8]">
          {platforms.length} platforms · Auto-generate UTM for each
        </p>
      )}

      {expanded && (
        <div className="space-y-3">
          {/* Global UTM */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#33445F]">Global UTM</span>
              <button onClick={generateAll} className="flex items-center gap-1 rounded-sm bg-[#F0F6FF] px-2 py-1 text-[10px] font-semibold text-[#1769DF] hover:bg-[#E0EDFF]">
                <RefreshCw className="size-2.5" /> Auto Generate
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <TextField label="Source" value={globalUtm.source} placeholder="instagram" onChange={(v) => onGlobalUtmChange({ ...globalUtm, source: v })} />
              <TextField label="Medium" value={globalUtm.medium} placeholder="social" onChange={(v) => onGlobalUtmChange({ ...globalUtm, medium: v })} />
              <TextField label="Campaign" value={globalUtm.campaign} placeholder="campaign_name" onChange={(v) => onGlobalUtmChange({ ...globalUtm, campaign: v })} />
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <TextField label="Content" value={globalUtm.content} placeholder="feed_01" onChange={(v) => onGlobalUtmChange({ ...globalUtm, content: v })} />
              <TextField label="Term" value={globalUtm.term} placeholder="optional" onChange={(v) => onGlobalUtmChange({ ...globalUtm, term: v })} />
            </div>
            <div className="mt-1.5 rounded-sm bg-[#F8FAFD] border border-[#E2E8F0] px-2.5 py-1.5">
              <span className="text-[9.5px] font-semibold text-[#7A87A0]">Preview: </span>
              <span className="text-[10px] font-mono text-[#33445F] break-all">
                ?utm_source={globalUtm.source || "source"}&utm_medium={globalUtm.medium || "medium"}&utm_campaign={globalUtm.campaign || "campaign"}&utm_content={globalUtm.content || "content"}{globalUtm.term ? `&utm_term=${globalUtm.term}` : ""}
              </span>
            </div>
          </div>

          {/* Per-platform UTMs */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#33445F]">Platform-Specific UTMs</span>
            {platforms.map((p) => {
              const meta = PLATFORM_META[p];
              const utm = platformUtms[p] ?? generateAutoUtm(p);
              const isPExpanded = expandedPlatform === p;

              return (
                <div key={p} className="rounded-sm border border-[#E2E8F0] overflow-hidden">
                  <button
                    onClick={() => setExpandedPlatform(isPExpanded ? null : p)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    {isPExpanded ? <ChevronDown className="size-3 text-[#7A87A0]" /> : <ChevronRight className="size-3 text-[#7A87A0]" />}
                    <PlatformBadge platform={p} size="sm" />
                    <span className="flex-1 text-[10.5px] font-semibold text-[#33445F]">{meta.label}</span>
                    <span className="text-[9px] font-mono text-[#7A87A0] truncate max-w-[140px]">
                      utm_source={utm.source}
                    </span>
                  </button>

                  {isPExpanded && (
                    <div className="border-t border-[#EDF1F5] bg-[#F8FAFD] p-2.5">
                      <div className="grid grid-cols-3 gap-1.5">
                        <TextField label="Source" value={utm.source} onChange={(v) => onPlatformUtmChange(p, { ...utm, source: v })} />
                        <TextField label="Medium" value={utm.medium} onChange={(v) => onPlatformUtmChange(p, { ...utm, medium: v })} />
                        <TextField label="Campaign" value={utm.campaign} onChange={(v) => onPlatformUtmChange(p, { ...utm, campaign: v })} />
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <TextField label="Content" value={utm.content} onChange={(v) => onPlatformUtmChange(p, { ...utm, content: v })} />
                        <TextField label="Term" value={utm.term} onChange={(v) => onPlatformUtmChange(p, { ...utm, term: v })} />
                      </div>
                      <div className="mt-1.5 rounded bg-white border border-[#E2E8F0] px-2 py-1">
                        <span className="text-[9px] font-mono text-[#33445F] break-all">
                          ?utm_source={utm.source}&utm_medium={utm.medium}&utm_campaign={utm.campaign}&utm_content={utm.content}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
