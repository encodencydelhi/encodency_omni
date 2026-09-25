"use client";
import { useState, useMemo, useCallback } from "react";
import {
  Check, ChevronDown, ChevronRight, Download, Plus, Send, Sparkles, MoreHorizontal,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import { draftsApi, isRevisionConflict } from "../live/drafts-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import type {
  Platform, ContentType, MediaRatio, MasterContent, PlatformOverride,
  PlatformSchedule, PlatformValidation, UTMConfig, AutoAdaptOptions,
} from "../types/content.types";
import {
  ALL_PLATFORMS, PLATFORM_META, PLATFORM_CONTENT_TYPES,
  MOCK_CONNECTIONS,
} from "../config/platform-config";
import { MOCK_MEDIA, MOCK_CLIENTS } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";
import { ContentChecklist } from "./ContentChecklist";
import { MasterContentEditor } from "./MasterContentEditor";
import { ContentTypeSelectorInline } from "./ContentTypeSelector";
import { PlatformOverrideEditor } from "./PlatformOverrideEditor";
import { RatioSelector } from "./RatioSelector";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { ScheduledPostsPanel } from "./ScheduledPostsPanel";
import { UTMBuilder } from "./UTMBuilder";
import { PlatformValidationPanel } from "./PlatformValidation";

/** Backend draft-variant channel → the composer's platform key. */
const CHANNEL_TO_PLATFORM: Record<string, Platform> = {
  FACEBOOK_PAGE: "facebook",
  INSTAGRAM_ACCOUNT: "instagram",
  LINKEDIN_ORGANIZATION: "linkedin",
  GOOGLE_BUSINESS_LOCATION: "google-business",
};

function variantsToPlatformMap(
  variants: { id: string; channel: string }[],
): Partial<Record<Platform, string>> {
  const map: Partial<Record<Platform, string>> = {};
  for (const variant of variants) {
    const platform = CHANNEL_TO_PLATFORM[variant.channel];
    if (platform) map[platform] = variant.id;
  }
  return map;
}

export function CreateContentTab() {
  /* ── State ── */
  const [channels, setChannels] = useState<Platform[]>(["instagram", "facebook", "linkedin"]);
  const [contentTypes, setContentTypes] = useState<Partial<Record<Platform, ContentType>>>({});
  const [masterContent, setMasterContent] = useState<MasterContent>({
    caption: "Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa",
    headline: "CLEAN RIVERS BRIGHTER TOMORROW",
    description: "",
    cta: "Learn More",
    ctaUrl: "https://mokshasewa.org",
    hashtags: ["#CleanGanga", "#HealthyIndia", "#Sustainability", "#MokshaSewa"],
    mentions: ["@mokshasewa"],
    media: [],
    link: "https://mokshasewa.org",
    location: "Varanasi, India",
    altText: "",
    firstComment: "What small action will you take today?",
    language: "English",
    tone: "Positive",
  });
  const [platformOverrides, setPlatformOverrides] = useState<Partial<Record<Platform, PlatformOverride>>>({});
  const [masterRatio, setMasterRatio] = useState<MediaRatio>("4:5");
  const [platformRatios, setPlatformRatios] = useState<Partial<Record<Platform, string>>>({});
  const [selectedPlacement, setSelectedPlacement] = useState<Partial<Record<Platform, string>>>({});
  const [autoAdapt, setAutoAdapt] = useState<AutoAdaptOptions>({
    autoResize: true,
    smartCrop: true,
    preserveSubject: true,
    preserveLogo: false,
    preserveText: false,
    preserveFaces: false,
    respectSafeZones: true,
  });
  const [schedules, setSchedules] = useState<PlatformSchedule[]>([]);
  const [globalUtm, setGlobalUtm] = useState<UTMConfig>({ source: "", medium: "", campaign: "", content: "", term: "" });
  const [platformUtms, setPlatformUtms] = useState<Partial<Record<Platform, UTMConfig>>>({});
  const [selectedClient, setSelectedClient] = useState(MOCK_CLIENTS[0]!.name);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("instagram");
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  /* ── Tenancy & Live Draft State (TASK-11A) ── */
  const { companyId, clientId } = useTenancyContext();
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [currentRevision, setCurrentRevision] = useState<number | null>(null);
  const [variantIds, setVariantIds] = useState<Partial<Record<Platform, string>>>({});
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const reloadLatestDraft = useCallback(async () => {
    if (!companyId || !clientId || !savedDraftId) return;
    try {
      const latest = await draftsApi.get(companyId, clientId, savedDraftId);
      setCurrentRevision(latest.revision);
      setVariantIds(variantsToPlatformMap(latest.variants));
      setMasterContent((prev) => ({
        ...prev,
        caption: latest.content,
        headline: latest.title || prev.headline,
      }));
      setConflictNotice(null);
      toast.success(`Reloaded draft (Revision ${latest.revision})`);
    } catch {
      toast.error("Failed to reload draft.");
    }
  }, [companyId, clientId, savedDraftId]);

  const handleSaveDraft = useCallback(async () => {
    if (!companyId || !clientId) {
      toast.error("Verified Company and Client context are required.");
      return;
    }
    if (!masterContent.caption.trim()) {
      toast.error("Please enter a caption before saving draft.");
      return;
    }

    // Map supported channels (FACEBOOK_PAGE, INSTAGRAM_ACCOUNT, LINKEDIN_ORGANIZATION)
    const variants: Record<string, { content?: string | null }> = {};
    if (channels.includes("facebook")) {
      variants.FACEBOOK_PAGE = {
        content: platformOverrides.facebook?.caption || masterContent.caption,
      };
    }
    if (channels.includes("instagram")) {
      variants.INSTAGRAM_ACCOUNT = {
        content: platformOverrides.instagram?.caption || masterContent.caption,
      };
    }
    if (channels.includes("linkedin")) {
      variants.LINKEDIN_ORGANIZATION = {
        content: platformOverrides.linkedin?.caption || masterContent.caption,
      };
    }

    const title = masterContent.headline?.trim() || masterContent.caption.slice(0, 45).trim() || "Untitled Draft";

    setIsSavingDraft(true);
    setConflictNotice(null);

    try {
      if (savedDraftId && currentRevision !== null) {
        // Optimistic concurrency: send expectedRevision
        const updated = await draftsApi.update(companyId, clientId, savedDraftId, {
          expectedRevision: currentRevision,
          title,
          content: masterContent.caption,
          variants,
        });
        setCurrentRevision(updated.revision);
        setVariantIds(variantsToPlatformMap(updated.variants));
        toast.success(`Draft updated successfully (Revision ${updated.revision})`);
      } else {
        // Create new draft
        const created = await draftsApi.create(companyId, clientId, {
          title,
          content: masterContent.caption,
          variants,
        });
        setSavedDraftId(created.id);
        setCurrentRevision(created.revision);
        setVariantIds(variantsToPlatformMap(created.variants));
        toast.success(`Draft saved successfully (Revision ${created.revision})`);
      }
    } catch (err: unknown) {
      if (draftsApi.isRevisionConflict(err)) {
        setConflictNotice("This draft was modified by another session (409 Conflict). Reload to view latest changes.");
        toast.error("Revision conflict: draft has been modified by another request.");
      } else if (ApiError.isApiError(err)) {
        const detailsList: string[] = [];
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => detailsList.push(`${field}: ${msg}`));
        }
        if (err.reason) detailsList.push(`Reason: ${err.reason}`);
        const description = detailsList.length > 0 ? detailsList.join(" | ") : (err.status ? `Status HTTP ${err.status}` : undefined);
        toast.error(`Failed to save draft: ${err.message}`, { description, duration: 6000 });
      } else if (err instanceof Error) {
        toast.error(`Failed to save draft: ${err.message}`, { duration: 6000 });
      } else {
        toast.error("An unexpected error occurred while saving draft.", { duration: 6000 });
      }
    } finally {
      setIsSavingDraft(false);
    }
  }, [companyId, clientId, masterContent, channels, platformOverrides, savedDraftId, currentRevision]);

  /* ── Derived ── */
  const connectedPlatforms = useMemo(() =>
    ALL_PLATFORMS.filter(p => MOCK_CONNECTIONS[p].status === "connected"),
    []);

  /* ── Handlers ── */
  const toggleChannel = (p: Platform) => {
    setChannels(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      if (!next.includes(previewPlatform) && next.length > 0) setPreviewPlatform(next[0]!);
      return next;
    });
    if (!contentTypes[p]) {
      const specs = PLATFORM_CONTENT_TYPES[p];
      if (specs?.length) setContentTypes(prev => ({ ...prev, [p]: specs[0]!.id }));
    }
  };

  /* ── Validation ── */
  const validations: PlatformValidation[] = useMemo(() => {
    return channels.map(p => {
      const items: PlatformValidation["items"] = [];
      const ct = contentTypes[p];
      const specs = PLATFORM_CONTENT_TYPES[p] ?? [];
      const spec = specs.find(s => s.id === ct);

      if (!ct) {
        items.push({ field: "contentType", level: "error", message: "Content type not selected" });
      }

      if (!masterContent.caption && spec?.fields.includes("caption")) {
        items.push({ field: "caption", level: "error", message: "Caption is required" });
      } else if (masterContent.caption && masterContent.caption.length > 2200) {
        items.push({ field: "caption", level: "error", message: "Caption exceeds 2200 characters" });
      }

      if (spec?.fields.includes("altText") && !masterContent.altText && !platformOverrides[p]?.altText) {
        items.push({ field: "altText", level: "warning", message: "Alt text recommended for accessibility" });
      }

      if (spec?.fields.includes("title") && !(platformOverrides[p]?.fields as Record<string, string>)?.title && p !== "instagram" && p !== "facebook") {
        items.push({ field: "title", level: "error", message: "Title is required" });
      }

      if (p === "whatsapp" && spec?.fields.includes("templateName") && !(platformOverrides[p]?.fields as Record<string, string>)?.templateName) {
        items.push({ field: "template", level: "warning", message: "Template not selected" });
      }

      const level = items.some(i => i.level === "error") ? "error" : items.some(i => i.level === "warning") ? "warning" : "ready";
      return { platform: p, level, items };
    });
  }, [channels, contentTypes, masterContent, platformOverrides]);

  const errorCount = validations.filter(v => v.level === "error").length;

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
      {/* ─── LEFT: Editor ─── */}
      <div className="space-y-2.5 min-w-0">

        {/* Channels & Content Types */}
        <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <button
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="flex w-full items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <h3 className="truncate text-[13.5px] font-semibold text-[#172044]">Channels & Content Types</h3>
              <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">Select platforms and their content types</p>
            </div>
            {channelsOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
          </button>

          {channelsOpen && (
            <div className="p-3">
              <div className="space-y-0.5">
                {connectedPlatforms.map((p) => {
                  const conn = MOCK_CONNECTIONS[p];
                  const on = channels.includes(p);
                  const meta = PLATFORM_META[p];

                  return (
                    <div key={p}>
                      <button
                        onClick={() => toggleChannel(p)}
                        disabled={conn.status === "disconnected"}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition",
                          conn.status === "disconnected" ? "opacity-50 cursor-not-allowed" : on ? "bg-[#F0F6FF]" : "hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition", on ? "border-[#1769DF] bg-[#1769DF] text-white" : "border-[#CBD5E1] text-transparent")}>
                          <Check className="size-2" />
                        </span>
                        <PlatformBadge platform={p} size="sm" />
                        <span className="flex-1 text-[11.5px] font-semibold text-[#33445F]">{meta.label}</span>
                        <span className="text-[9.5px] text-[#7A87A0]">{conn.account}</span>
                        {conn.status === "connected" && <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold text-emerald-600">Connected</span>}
                        {conn.status === "disconnected" && <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-500">Reconnect</span>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Content types for selected platforms */}
              {channels.length > 0 && (
                <div className="mt-3 border-t border-[#EDF1F5] pt-3">
                  <ContentTypeSelectorInline
                    platforms={channels}
                    contentTypes={contentTypes}
                    onChange={(p, ct) => setContentTypes(prev => ({ ...prev, [p]: ct }))}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Client selection */}
        <Card>
          <div className="mb-2.5 border-b border-[#EDF1F5] pb-2.5">
            <span className="text-[12.5px] font-semibold text-[#172044]">Post Details</span>
            <p className="text-[10.5px] text-[#7A87A0]">Create a standalone post for the selected client.</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <SelectField
              label="Client"
              value={selectedClient}
              options={MOCK_CLIENTS.map(c => c.name)}
              onChange={setSelectedClient}
              required
            />
          </div>
        </Card>

        {/* Master Content */}
        <MasterContentEditor content={masterContent} onChange={setMasterContent} />

        {/* Media */}
        <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <button
            onClick={() => setMediaOpen(!mediaOpen)}
            className="flex w-full items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <h3 className="truncate text-[13.5px] font-semibold text-[#172044]">Media</h3>
              <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">JPG, PNG, GIF, MP4 up to 100MB</p>
            </div>
            {mediaOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
          </button>

          {mediaOpen && (
            <div className="p-3">
              <div className="rounded-sm border-2 border-dashed border-[#B9CFF2] bg-[#F7FAFF] py-4 text-center transition hover:border-[#1769DF] hover:bg-[#F0F6FF]">
                <p className="text-[12px] font-semibold text-[#24365A]">Drag & drop files here, or click to browse</p>
                <button className="mt-1.5 h-7 rounded-sm bg-[#1769DF] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1259BD]">Upload from device</button>
                <p className="mt-1 text-[10px] text-[#7A87A0]">Recommended 1080 × 1350 (4:5) for Instagram</p>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1">
                {MOCK_MEDIA.slice(0, 4).map((m, i) => (
                  <div key={m.id} className="relative overflow-hidden rounded-sm border border-[#E2E8F0]">
                    <img src={m.url} alt={m.alt} className="h-14 w-full object-cover" />
                    <span className="absolute left-0.5 top-0.5 grid size-3.5 place-items-center rounded bg-[#172044]/80 text-[8px] font-semibold text-white">{i + 1}</span>
                    <button className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5"><MoreHorizontal className="size-2.5 text-slate-500" /></button>
                  </div>
                ))}
                <button className="grid h-14 place-items-center rounded-sm border border-dashed border-[#CBD5E1] text-[#7A87A0] hover:bg-slate-50">
                  <Plus className="size-3.5" /><span className="mt-0.5 text-[9px] font-semibold">Add</span>
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {["Media Library", "Unsplash", "Pexels", "Google Drive", "AI Generate"].map((s) => (
                  <button key={s} className="flex h-6 items-center gap-1 rounded-sm border border-[#E2E8F0] px-2 text-[10px] font-semibold text-[#687797] hover:bg-slate-50">
                    {s === "AI Generate" && <Sparkles className="size-2.5 text-purple-500" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Ratio Selector */}
        <RatioSelector
          masterRatio={masterRatio}
          onMasterRatioChange={setMasterRatio}
          platforms={channels}
          contentTypes={contentTypes}
          platformRatios={platformRatios}
          onPlatformRatioChange={(p, r) => setPlatformRatios(prev => ({ ...prev, [p]: r }))}
          autoAdapt={autoAdapt}
          onAutoAdaptChange={setAutoAdapt}
        />

        {/* Platform Overrides */}
        <PlatformOverrideEditor
          platforms={channels}
          contentTypes={contentTypes}
          overrides={platformOverrides}
          masterContent={masterContent}
          onContentTypeChange={(p, ct) => setContentTypes(prev => ({ ...prev, [p]: ct }))}
          onOverrideChange={(p, o) => setPlatformOverrides(prev => ({ ...prev, [p]: o }))}
          selectedPlacement={selectedPlacement}
          onPlacementChange={(p, pl) => setSelectedPlacement(prev => ({ ...prev, [p]: pl }))}
          selectedRatio={platformRatios}
          onRatioChange={(p, r) => setPlatformRatios(prev => ({ ...prev, [p]: r }))}
        />

        {/* UTM Builder */}
        <UTMBuilder
          platforms={channels}
          globalUtm={globalUtm}
          platformUtms={platformUtms}
          campaignName="standalone_post"
          onGlobalUtmChange={setGlobalUtm}
          onPlatformUtmChange={(p, utm) => setPlatformUtms(prev => ({ ...prev, [p]: utm }))}
        />
      </div>

      {/* ─── CENTER: Schedule + Approval ─── */}
      <div className="space-y-2.5 xl:sticky xl:top-4">
        {/* Schedule */}
        <ScheduleBuilder
          platforms={channels}
          schedules={schedules}
          onChange={setSchedules}
        />

        {/* Revision Conflict Notice Banner (TASK-11A Concurrency) */}
        {conflictNotice && (
          <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] p-2.5 text-[11px] text-[#721c24]">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle size={14} className="shrink-0 text-[#721c24]" />
              <span>Revision Conflict (409)</span>
            </div>
            <p className="mt-1">{conflictNotice}</p>
            <button
              onClick={reloadLatestDraft}
              className="mt-2 flex items-center gap-1 rounded bg-[#721c24] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#501319]"
            >
              <RefreshCw size={10} /> Reload Latest Revision
            </button>
          </div>
        )}

        {/* Publishing targets, schedule creation, scheduled-post list (TASK-11B) */}
        <ScheduledPostsPanel
          draftId={savedDraftId}
          revision={currentRevision}
          channels={channels}
          schedules={schedules}
          variantIds={variantIds}
          onReloadDraft={() => void reloadLatestDraft()}
        />

        {/* Approval */}
        <Card>
          <SelectField label="Approver" value="Content Team" />
          <div className="mt-1.5 flex gap-1">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm border border-[#E2E8F0] text-[10.5px] font-semibold text-[#687797] hover:bg-slate-50 disabled:opacity-50"
            >
              {isSavingDraft ? <Loader2 className="size-3 animate-spin" /> : null}
              {savedDraftId && currentRevision !== null ? `Save Draft (r${currentRevision})` : "Save Draft"}
            </button>
            <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm bg-[#1769DF] text-[10.5px] font-semibold text-white hover:bg-[#1259BD]">
              Send for Review
            </button>
          </div>
        </Card>
      </div>

      {/* ─── RIGHT: Preview + Validation + Checklist ─── */}
      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform={previewPlatform} setPlatform={setPreviewPlatform} channels={channels} />

        {/* Validation */}
        <PlatformValidationPanel
          validations={validations}
          totalPlatforms={channels.length}
        />

        <ContentChecklist
          checks={[
            { label: "Client selected", done: true },
            { label: "Standalone Post (No Campaign)", done: true },
            { label: "Platforms selected", done: channels.length > 0 },
            { label: "Content types set", done: channels.every(p => !!contentTypes[p]) },
            { label: "Caption added", done: masterContent.caption.length > 0 },
            { label: "Media added", done: MOCK_MEDIA.length > 0 },
            { label: "Ratio configured", done: !!masterRatio },
            { label: "Platform overrides reviewed", done: true },
            { label: "Tracking configured", done: !!globalUtm.source },
            { label: "Schedule configured", done: schedules.length > 0 },
          ]}
        />

        <div className="flex gap-1">
          <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm border border-[#E2E8F0] text-[10.5px] font-semibold text-[#687797] hover:bg-slate-50">
            <Download className="size-3" /> Export
          </button>
          <button className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1 rounded-sm text-[10.5px] font-semibold text-white shadow-sm transition",
            errorCount > 0 ? "bg-gray-400 cursor-not-allowed" : "bg-[#EB0711] hover:bg-[#D60811]"
          )}>
            <Send className="size-3" />
            {errorCount > 0 ? `${errorCount} channel${errorCount > 1 ? "s" : ""} need attention` : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
