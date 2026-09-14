"use client";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SelectField, TextField, TextareaField, Toggle } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import { ContentTypeSelector } from "./ContentTypeSelector";
import type { Platform, ContentType, PlatformOverride, MasterContent } from "../types/content.types";
import { PLATFORM_CONTENT_TYPES, PLATFORM_META, getRatiosForPlatform } from "../config/platform-config";

type Props = {
  platforms: Platform[];
  contentTypes: Partial<Record<Platform, ContentType>>;
  overrides: Partial<Record<Platform, PlatformOverride>>;
  masterContent: MasterContent;
  onContentTypeChange: (platform: Platform, contentType: ContentType) => void;
  onOverrideChange: (platform: Platform, override: PlatformOverride) => void;
  selectedPlacement: Partial<Record<Platform, string>>;
  onPlacementChange: (platform: Platform, placement: string) => void;
  selectedRatio: Partial<Record<Platform, string>>;
  onRatioChange: (platform: Platform, ratio: string) => void;
};

export function PlatformOverrideEditor({
  platforms,
  contentTypes,
  overrides,
  masterContent,
  onContentTypeChange,
  onOverrideChange,
  selectedPlacement,
  onPlacementChange,
  selectedRatio,
  onRatioChange,
}: Props) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [expanded, setExpanded] = useState<Platform | null>(null);

  const toggleExpand = (p: Platform) => {
    setExpanded(expanded === p ? null : p);
  };

  const getOverride = (p: Platform): PlatformOverride => {
    return overrides[p] ?? { enabled: false };
  };

  const updateOverride = (p: Platform, fields: Partial<PlatformOverride>) => {
    onOverrideChange(p, { ...getOverride(p), ...fields });
  };

  const copyFromMaster = (p: Platform) => {
    updateOverride(p, {
      enabled: true,
      caption: masterContent.caption,
      headline: masterContent.headline,
      description: masterContent.description,
      hashtags: [...masterContent.hashtags],
      cta: masterContent.cta,
      ctaUrl: masterContent.ctaUrl,
      firstComment: masterContent.firstComment,
      altText: masterContent.altText,
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
      <button
        onClick={() => setSectionOpen(!sectionOpen)}
        className="flex w-full items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-bold text-[#172044]">Platform Overrides</h3>
          <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">Customize content for each platform</p>
        </div>
        {sectionOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
      </button>

      {sectionOpen && (
        <div className="p-3">
          <div className="space-y-1">
            {platforms.map((p) => {
          const meta = PLATFORM_META[p];
          const isExpanded = expanded === p;
          const override = getOverride(p);
          const specs = PLATFORM_CONTENT_TYPES[p] ?? [];
          const currentCT = contentTypes[p];
          const spec = specs.find(s => s.id === currentCT);
          const ratios = getRatiosForPlatform(p, currentCT);
          const placements = spec?.placements ?? [];
          const fields = spec?.fields ?? [];

          return (
            <div key={p} className="rounded-lg border border-[#E2E8F0] overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleExpand(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                {isExpanded ? <ChevronDown className="size-3.5 text-[#7A87A0]" /> : <ChevronRight className="size-3.5 text-[#7A87A0]" />}
                <PlatformBadge platform={p} size="sm" />
                <span className="flex-1 text-[11.5px] font-bold text-[#33445F]">{meta.label}</span>
                {currentCT && (
                  <span className="text-[10px] font-semibold text-[#7A87A0]">
                    {specs.find(s => s.id === currentCT)?.label}
                  </span>
                )}
                {override.enabled && (
                  <span className="rounded bg-[color:var(--pc-bg)] px-1.5 py-0.5 text-[9px] font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>
                    Customized
                  </span>
                )}
                {!override.enabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyFromMaster(p); }}
                    className="flex items-center gap-0.5 rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#687797] hover:bg-slate-50"
                  >
                    <Copy className="size-2.5" /> Use Master
                  </button>
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[#EDF1F5] bg-[#F8FAFD] p-3 space-y-3">
                  {/* Content Type */}
                  <ContentTypeSelector
                    platform={p}
                    selected={currentCT ?? null}
                    onSelect={(ct) => onContentTypeChange(p, ct)}
                  />

                  {/* Placement */}
                  {placements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {placements.map((pl) => (
                        <button
                          key={pl}
                          onClick={() => onPlacementChange(p, pl)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[10px] font-semibold transition",
                            selectedPlacement[p] === pl
                              ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)] text-[color:var(--pc)]"
                              : "border-[#E2E8F0] text-[#687797] hover:border-[#CBD5E1]"
                          )}
                          style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
                        >
                          {selectedPlacement[p] === pl && <Check className="mr-0.5 inline size-2.5" />}
                          {pl}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ratio */}
                  {ratios.length > 0 && (
                    <div>
                      <span className="mb-1 block text-[10.5px] font-bold text-[#7A87A0]">Aspect Ratio</span>
                      <div className="flex flex-wrap gap-1">
                        {ratios.map((r) => (
                          <button
                            key={r.ratio}
                            onClick={() => onRatioChange(p, r.ratio)}
                            className={cn(
                              "flex flex-col items-center rounded-lg border px-2 py-1.5 text-center transition",
                              selectedRatio[p] === r.ratio
                                ? "border-[color:var(--pc)] bg-[color:var(--pc-bg)]"
                                : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                            )}
                            style={{ "--pc": meta.color, "--pc-bg": meta.bg } as React.CSSProperties}
                          >
                            <span className="text-[10px] font-bold text-[#33445F]">{r.ratio}</span>
                            <span className="text-[8px] text-[#7A87A0]">{r.label}</span>
                            {r.recommended && <span className="text-[7px] font-bold text-emerald-600">Rec.</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform-specific fields */}
                  <div className="space-y-2">
                    {(override.enabled ? fields : ["caption", "hashtags", "firstComment", "altText"]).map((field) => (
                      <PlatformField
                        key={field}
                        field={field}
                        platform={p}
                        override={override}
                        masterContent={masterContent}
                        onChange={(key, val) => updateOverride(p, { [key]: val })}
                      />
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1 pt-1 border-t border-[#EDF1F5]">
                    <button
                      onClick={() => copyFromMaster(p)}
                      className="flex items-center gap-1 rounded-md border border-[#E2E8F0] px-2 py-1 text-[10px] font-semibold text-[#687797] hover:bg-white"
                    >
                      <Copy className="size-2.5" /> Copy from Master
                    </button>
                    <button className="flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700 hover:bg-purple-100">
                      <Sparkles className="size-2.5" /> AI Rewrite for {meta.short}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Individual platform field renderer ── */
function PlatformField({
  field,
  override,
  masterContent,
  onChange,
}: {
  field: string;
  platform: Platform;
  override: PlatformOverride;
  masterContent: MasterContent;
  onChange: (key: keyof PlatformOverride, val: unknown) => void;
}) {
  const fieldValue = (override as Record<string, unknown>)[field] ?? (masterContent as Record<string, unknown>)[field] ?? "";

  switch (field) {
    case "caption":
      return (
        <TextareaField
          label="Caption"
          value={fieldValue as string}
          rows={3}
          placeholder="Platform-specific caption..."
          onChange={(v) => onChange("caption", v)}
        />
      );
    case "headline":
      return (
        <TextField
          label="Headline"
          value={fieldValue as string}
          placeholder="Headline..."
          onChange={(v) => onChange("headline", v)}
        />
      );
    case "description":
      return (
        <TextareaField
          label="Description"
          value={fieldValue as string}
          rows={2}
          placeholder="Description..."
          onChange={(v) => onChange("description", v)}
        />
      );
    case "hashtags":
      return (
        <TextField
          label="Hashtags"
          value={Array.isArray(fieldValue) ? fieldValue.join(" ") : (fieldValue as string)}
          placeholder="#hashtag1 #hashtag2"
          onChange={(v) => onChange("hashtags", v.split(" ").filter(Boolean))}
        />
      );
    case "firstComment":
      return (
        <TextareaField
          label="First Comment"
          value={fieldValue as string}
          rows={2}
          placeholder="First comment..."
          onChange={(v) => onChange("firstComment", v)}
        />
      );
    case "altText":
      return (
        <TextField
          label="Alt Text"
          value={fieldValue as string}
          placeholder="Describe the image..."
          onChange={(v) => onChange("altText", v)}
        />
      );
    case "cta":
      return (
        <SelectField
          label="CTA"
          value={fieldValue as string}
          options={["Learn More", "Sign Up", "Shop Now", "Contact Us", "Download", "Register", "Book Now", "Call Now", "Order Online", "Get Offer"]}
          onChange={(v) => onChange("cta", v)}
        />
      );
    case "ctaUrl":
      return (
        <TextField
          label="CTA URL"
          value={fieldValue as string}
          placeholder="https://..."
          onChange={(v) => onChange("ctaUrl", v)}
        />
      );
    case "link":
      return (
        <TextField
          label="Link"
          value={fieldValue as string}
          placeholder="https://..."
          onChange={(v) => onChange("link", v)}
        />
      );
    case "location":
      return (
        <TextField
          label="Location"
          value={fieldValue as string}
          placeholder="e.g. Varanasi, India"
          onChange={(v) => onChange("location", v)}
        />
      );
    case "mentions":
      return (
        <TextField
          label="Mentions"
          value={Array.isArray(fieldValue) ? fieldValue.join(" ") : ""}
          placeholder="@mention1 @mention2"
          onChange={(v) => onChange("mentions", v.split(" ").filter(Boolean))}
        />
      );
    case "title":
      return (
        <TextField
          label="Title"
          value={fieldValue as string}
          placeholder="Title..."
          onChange={(v) => onChange("fields", { ...override.fields, title: v })}
        />
      );
    case "tags":
      return (
        <TextField
          label="Tags"
          value={fieldValue as string}
          placeholder="tag1, tag2, tag3"
          onChange={(v) => onChange("fields", { ...override.fields, tags: v })}
        />
      );
    case "visibility":
      return (
        <SelectField
          label="Visibility"
          value={fieldValue as string}
          options={["Public", "Unlisted", "Private", "Friends"]}
          onChange={(v) => onChange("fields", { ...override.fields, visibility: v })}
        />
      );
    case "templateName":
      return (
        <SelectField
          label="Template"
          value={fieldValue as string}
          options={["Clean Ganga Alert", "Donation Thank You", "Event Invitation", "Weekly Update"]}
          onChange={(v) => onChange("fields", { ...override.fields, templateName: v })}
        />
      );
    case "language":
      return (
        <SelectField
          label="Language"
          value={fieldValue as string}
          options={["English", "Hindi", "Bilingual"]}
          onChange={(v) => onChange("fields", { ...override.fields, language: v })}
        />
      );
    case "board":
      return (
        <SelectField
          label="Board"
          value={fieldValue as string}
          options={["Clean India", "Sustainability", "NGO Work", "Events"]}
          onChange={(v) => onChange("fields", { ...override.fields, board: v })}
        />
      );
    case "subject":
      return (
        <TextField
          label="Subject"
          value={fieldValue as string}
          placeholder="Email subject line..."
          onChange={(v) => onChange("fields", { ...override.fields, subject: v })}
        />
      );
    case "previewText":
      return (
        <TextField
          label="Preview Text"
          value={fieldValue as string}
          placeholder="Email preview text..."
          onChange={(v) => onChange("fields", { ...override.fields, previewText: v })}
        />
      );
    case "sound":
      return (
        <TextField
          label="Sound"
          value={fieldValue as string}
          placeholder="Select a sound..."
          onChange={(v) => onChange("fields", { ...override.fields, sound: v })}
        />
      );
    case "madeForKids":
      return (
        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-[#33445F]">Made for Kids</span>
          <Toggle on={!!fieldValue} onChange={() => onChange("fields", { ...override.fields, madeForKids: !fieldValue })} label="Made for kids" />
        </div>
      );
    case "allowComments":
    case "allowDuet":
    case "allowStitch":
    case "linkPreview":
      return (
        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-[#33445F]">{field.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</span>
          <Toggle on={!!fieldValue} onChange={() => onChange("fields", { ...override.fields, [field]: !fieldValue })} label={field} />
        </div>
      );
    default:
      return (
        <TextField
          label={field.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
          value={fieldValue as string}
          placeholder={`Enter ${field}...`}
          onChange={(v) => onChange("fields", { ...override.fields, [field]: v })}
        />
      );
  }
}
