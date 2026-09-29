"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Check, ChevronDown, ChevronRight, Download, Plus, Send, X,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import { draftsApi } from "../live/drafts-api";
import { mediaApi } from "../live/media-api";
import { schedulingApi } from "../live/scheduling-api";
import { immediateScheduledFor } from "../live/schedule-datetime";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { env } from "@/config/env";
import { useMetaOverview } from "@/features/admin/channels/live/meta-instagram-hooks";
import { ApiError } from "@/types/api";
import { getPublishablePlatforms, overviewProviderForPlatform } from "../live/publishable-platforms";
import { instagramPublishError } from "../live/instagram-publish-policy";
import type {
  Platform, ContentType, MediaRatio, MasterContent, PlatformOverride,
  PlatformSchedule, PlatformValidation, UTMConfig, AutoAdaptOptions,
  MediaAsset,
} from "../types/content.types";
import {
  ALL_PLATFORMS, PLATFORM_META, PLATFORM_CONTENT_TYPES,
  MOCK_CONNECTIONS, PLATFORM_CHAR_LIMITS, MEDIA_CAPABLE_PLATFORMS,
} from "../config/platform-config";
import { clientsApi } from "@/features/admin/projects/live/clients-api";
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

/** Composer platform → the backend draft-variant/schedule channel. */
const PLATFORM_TO_CHANNEL: Partial<Record<Platform, string>> = {
  instagram: "INSTAGRAM_ACCOUNT",
  facebook: "FACEBOOK_PAGE",
  linkedin: "LINKEDIN_ORGANIZATION",
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
  /* Default channels start selected, so their content types must exist too —
     otherwise every channel fails validation before the user touches anything. */
  const [contentTypes, setContentTypes] = useState<Partial<Record<Platform, ContentType>>>(() => {
    const initial: Partial<Record<Platform, ContentType>> = {};
    for (const platform of ["instagram", "facebook", "linkedin"] as Platform[]) {
      const specs = PLATFORM_CONTENT_TYPES[platform];
      if (specs?.length) initial[platform] = specs[0]!.id;
    }
    return initial;
  });
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
  /* ── Tenancy & Live Draft State (TASK-11A) ── */
  const { companyId, clientId, setClientId } = useTenancyContext();
  const overviewQuery = useMetaOverview(companyId, clientId, env.dataSource === "api" && Boolean(companyId && clientId));
  const channelAvailabilityLoading = env.dataSource === "api" && overviewQuery.isLoading;
  const channelAvailabilityError = env.dataSource === "api" ? overviewQuery.error : null;
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("instagram");
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [currentRevision, setCurrentRevision] = useState<number | null>(null);
  const [savedAssetIds, setSavedAssetIds] = useState<string[]>([]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    clientsApi
      .list(companyId)
      .then((clients) => {
        if (cancelled || !clients.length) return;
        setClientOptions(clients.map((client) => ({ id: client.id, name: client.displayName || client.name })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [companyId]);
  const [variantIds, setVariantIds] = useState<Partial<Record<Platform, string>>>({});
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  /* Live media library (GET /media) — feeds the picker strip instead of sample rows. */
  const [libraryMedia, setLibraryMedia] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (!companyId || !clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await mediaApi.list(companyId, clientId);
        if (cancelled) return;
        setLibraryMedia(
          res.items.map((asset) => ({
            id: asset.id,
            url: asset.url,
            type: asset.kind === "IMAGE" ? "image" : "video",
            name: `asset-${asset.id.slice(0, 8)}.${asset.format?.toLowerCase() || (asset.kind === "IMAGE" ? "jpg" : "mp4")}`,
            alt: asset.mimeType,
          })),
        );
      } catch (err) {
        if (!cancelled) console.warn("Could not load the media library:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, clientId]);

  /* ── Media attachment ── */
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const toggleMedia = useCallback((asset: MediaAsset) => {
    setMasterContent((prev) => {
      const current = prev.media ?? [];
      const attached = current.some((m) => m.id === asset.id);
      return { ...prev, media: attached ? current.filter((m) => m.id !== asset.id) : [...current, asset] };
    });
  }, []);

  const removeMedia = useCallback((id: string) => {
    setMasterContent((prev) => ({ ...prev, media: (prev.media ?? []).filter((m) => m.id !== id) }));
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!companyId || !clientId) return toast.error("Verified Company and Client context are required.");
      const isVideo = file.type.startsWith("video/");
      const maxBytes = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > maxBytes) {
        return toast.error(`${file.name} is too large`, { description: isVideo ? "Videos must be 50 MB or less." : "Images must be 8 MB or less." });
      }
      setIsUploading(true);
      const loadingId = toast.loading(`Uploading ${file.name}...`);
      try {
        const record = await mediaApi.upload(companyId, clientId, file);
        const asset: MediaAsset = {
          id: record.id,
          url: record.url,
          type: record.kind === "IMAGE" ? "image" : "video",
          name: file.name,
          alt: record.mimeType,
        };
        setLibraryMedia((prev) => (prev.some((m) => m.id === asset.id) ? prev : [asset, ...prev]));
        setMasterContent((prev) => {
          const current = prev.media ?? [];
          return current.some((m) => m.id === asset.id) ? prev : { ...prev, media: [...current, asset] };
        });
        toast.success("Media uploaded and attached", { id: loadingId });
      } catch (err) {
        toast.error(ApiError.isApiError(err) ? err.message : "Upload failed.", { id: loadingId });
      } finally {
        setIsUploading(false);
      }
    },
    [companyId, clientId],
  );

  const reloadLatestDraft = useCallback(async () => {
    if (!companyId || !clientId || !savedDraftId) return;
    try {
      const latest = await draftsApi.get(companyId, clientId, savedDraftId);
      setCurrentRevision(latest.revision);
      setVariantIds(variantsToPlatformMap(latest.variants));
      setSavedAssetIds(latest.media.map((item) => item.asset.id));
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

  const handleSaveDraft = useCallback(async (): Promise<{ draftId: string; revision: number; variantIds: Partial<Record<Platform, string>> } | null> => {
    if (!companyId || !clientId) {
      toast.error("Verified Company and Client context are required.");
      return null;
    }
    if (!masterContent.caption.trim()) {
      toast.error("Please enter a caption before saving draft.");
      return null;
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
    // NOTE: Google Business has no draft-variant support in the backend yet
    // (`drafts.service.ts` DRAFT_CHANNELS). Sending GOOGLE_BUSINESS_LOCATION
    // fails the whole save, so it is deliberately not emitted here.

    const title = masterContent.headline?.trim() || masterContent.caption.slice(0, 45).trim() || "Untitled Draft";

    setIsSavingDraft(true);
    setConflictNotice(null);

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const assetIds = (masterContent.media ?? [])
      .map((m) => m.id)
      .filter((id) => uuidPattern.test(id));
    let draftContentSaved = false;
    let result: { draftId: string; revision: number; variantIds: Partial<Record<Platform, string>> } | null = null;

    try {
      if (savedDraftId && currentRevision !== null) {
        // Optimistic concurrency: send expectedRevision
        const updated = await draftsApi.update(companyId, clientId, savedDraftId, {
          expectedRevision: currentRevision,
          title,
          content: masterContent.caption,
          variants,
        });

        draftContentSaved = true;
        setCurrentRevision(updated.revision);
        setVariantIds(variantsToPlatformMap(updated.variants));
        const mediaChanged = assetIds.length !== savedAssetIds.length || assetIds.some((id, index) => id !== savedAssetIds[index]);
        let savedRevision = updated.revision;
        if (mediaChanged) {
          const mediaUpdated = await mediaApi.setDraftMedia(companyId, clientId, savedDraftId, updated.revision, assetIds);
          savedRevision = mediaUpdated.revision;
          setSavedAssetIds(assetIds);
        }

        setCurrentRevision(savedRevision);
        result = { draftId: savedDraftId, revision: savedRevision, variantIds: variantsToPlatformMap(updated.variants) };
        toast.success(`Draft updated successfully (Revision ${savedRevision})`);
      } else {
        // Create new draft
        const created = await draftsApi.create(companyId, clientId, {
          title,
          content: masterContent.caption,
          assetIds: assetIds.length > 0 ? assetIds : undefined,
          variants,
        });
        setSavedDraftId(created.id);
        setCurrentRevision(created.revision);
        setSavedAssetIds(assetIds);
        setVariantIds(variantsToPlatformMap(created.variants));
        result = { draftId: created.id, revision: created.revision, variantIds: variantsToPlatformMap(created.variants) };
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
        const message = draftContentSaved
          ? `Draft content saved, but media sync failed: ${err.message}`
          : `Failed to save draft: ${err.message}`;
        toast.error(message, { description, duration: 6000 });
      } else if (err instanceof Error) {
        const message = draftContentSaved
          ? `Draft content saved, but media sync failed: ${err.message}`
          : `Failed to save draft: ${err.message}`;
        toast.error(message, { duration: 6000 });
      } else {
        toast.error("An unexpected error occurred while saving draft.", { duration: 6000 });
      }
    } finally {
      setIsSavingDraft(false);
    }
    return result;
  }, [companyId, clientId, masterContent, channels, platformOverrides, savedDraftId, currentRevision, savedAssetIds]);

  /* ── Derived ── */
  const connectedPlatforms = useMemo(() => env.dataSource === "api"
    ? getPublishablePlatforms(overviewQuery.data)
    : ALL_PLATFORMS.filter(p => MOCK_CONNECTIONS[p].status === "connected"), [overviewQuery.data]);

  useEffect(() => {
    if (channelAvailabilityLoading) return;
    setChannels((current) => {
      const stillPublishable = current.filter((platform) => connectedPlatforms.includes(platform));
      if (stillPublishable.length > 0) return stillPublishable;
      return connectedPlatforms.includes("instagram") ? ["instagram"] : connectedPlatforms.slice(0, 1);
    });
  }, [channelAvailabilityLoading, connectedPlatforms]);

  const changeClient = (nextClientId: string) => {
    if (nextClientId === clientId) return;
    setClientId(nextClientId);
    setSavedDraftId(null);
    setCurrentRevision(null);
    setSavedAssetIds([]);
    setVariantIds({});
    setLibraryMedia([]);
    setMasterContent((current) => ({ ...current, media: [] }));
    setSchedules([]);
  };

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

      const caption = platformOverrides[p]?.caption || masterContent.caption;
      const maxChars = PLATFORM_CHAR_LIMITS[p];
      const mediaCount = (masterContent.media ?? []).length;

      if (!masterContent.caption && spec?.fields.includes("caption")) {
        items.push({ field: "caption", level: "error", message: "Caption is required" });
      } else if (maxChars && caption.length > maxChars) {
        items.push({ field: "caption", level: "error", message: `Caption exceeds ${maxChars} characters for ${PLATFORM_META[p].label}` });
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

      /* Mirrors publishing.constants.ts: `checkMediaForChannel`. */
      if (p === "instagram") {
        const instagramError = instagramPublishError(ct, (masterContent.media ?? []).map((media) => media.type));
        if (instagramError) items.push({ field: "media", level: "error", message: instagramError });
      } else if (mediaCount > 0 && !MEDIA_CAPABLE_PLATFORMS.includes(p)) {
        items.push({ field: "media", level: "warning", message: `${PLATFORM_META[p].label} is text-only here — scheduling with media is refused` });
      }

      if (p === "google-business") {
        items.push({ field: "channel", level: "warning", message: "Google Business draft variants are not supported by the backend yet — it cannot be scheduled" });
      }

      const level = items.some(i => i.level === "error") ? "error" : items.some(i => i.level === "warning") ? "warning" : "ready";
      return { platform: p, level, items };
    });
  }, [channels, contentTypes, masterContent, platformOverrides]);

  const errorCount = validations.filter(v => v.level === "error").length;

  /* Publish now: save the draft, then queue one scheduled post per selected
     channel at a target the backend reports as publishable. */
  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublishNow = useCallback(async () => {
    if (isPublishing || isSavingDraft) return;
    if (errorCount > 0) return toast.error("Fix the flagged channels before publishing.");
    if (!companyId || !clientId) return toast.error("Verified Company and Client context are required.");
    if (channels.length === 0) return toast.error("Select at least one channel.");

    setIsPublishing(true);
    try {
      const saved = await handleSaveDraft();
      if (!saved) return;

      const scheduledFor = immediateScheduledFor();
      const published: string[] = [];
      const failed: string[] = [];

      for (const platform of channels) {
        const channel = PLATFORM_TO_CHANNEL[platform];
        const variantId = saved.variantIds[platform];
        if (!channel) continue; // e.g. Google Business — no backend draft channel
        if (!variantId) {
          failed.push(`${PLATFORM_META[platform].label}: draft variant missing`);
          continue;
        }
        try {
          const { items } = await schedulingApi.targets(companyId, clientId, saved.draftId, variantId);
          const target = items.find((t) => t.publishable);
          if (!target) {
            failed.push(`${PLATFORM_META[platform].label}: ${items[0]?.reason ?? "no mapped publishing target"}`);
            continue;
          }
          await schedulingApi.schedule(companyId, clientId, saved.draftId, variantId, {
            resourceMappingId: target.resourceMappingId,
            scheduledFor,
            expectedDraftRevision: saved.revision,
          });
          published.push(PLATFORM_META[platform].label);
        } catch (error) {
          failed.push(`${PLATFORM_META[platform].label}: ${ApiError.isApiError(error) ? error.message : error instanceof Error ? error.message : "unknown error"}`);
        }
      }

      if (published.length > 0) {
        toast.success(`Publishing queued for ${published.join(", ")}`, {
          description: "The worker picks it up within seconds — see Scheduled posts for the outcome.",
          duration: 8000,
        });
      }
      if (failed.length > 0) {
        toast.error("Some channels were not queued", { description: failed.join(" | "), duration: 10_000 });
      }
    } finally {
      setIsPublishing(false);
    }
  }, [isPublishing, isSavingDraft, errorCount, companyId, clientId, channels, handleSaveDraft]);

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
                {channelAvailabilityLoading ? (
                  <p className="px-2 py-3 text-[11px] text-[#7A87A0]">Checking this Client's mapped publishing accounts…</p>
                ) : connectedPlatforms.length === 0 ? (
                  <div className="px-2 py-3 text-[11px] text-[#7A87A0]">
                    {channelAvailabilityError instanceof Error
                      ? channelAvailabilityError.message
                      : "No publishable accounts are mapped to this Client. Connect and map an account in Integrations."}
                  </div>
                ) : connectedPlatforms.map((p) => {
                  const backendProvider = overviewProviderForPlatform(p);
                  const providerOverview = backendProvider
                    ? overviewQuery.data?.providers.find((item) => item.provider === backendProvider)
                    : undefined;
                  const conn = env.dataSource === "api"
                    ? { status: "connected" as const, account: providerOverview?.resources[0]?.externalResourceId ?? "Mapped account" }
                    : MOCK_CONNECTIONS[p];
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
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">Client <span className="text-red-500">*</span></span>
              <select
                value={clientId}
                onChange={(event) => changeClient(event.target.value)}
                disabled={clientOptions.length === 0}
                className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] font-medium text-[#24365A] outline-none focus:border-[#1769DF] disabled:bg-slate-50"
              >
                {clientOptions.length === 0 && <option value="">Loading Clients…</option>}
                {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
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
              <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">JPG, PNG, WebP up to 8 MB · MP4/MOV up to 50 MB</p>
            </div>
            {mediaOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
          </button>

          {mediaOpen && (
            <div className="p-3">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUpload(file);
                }}
              />
              <div className="rounded-sm border-2 border-dashed border-[#B9CFF2] bg-[#F7FAFF] py-4 text-center transition hover:border-[#1769DF] hover:bg-[#F0F6FF]">
                <p className="text-[12px] font-semibold text-[#24365A]">Upload a file from your device</p>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-1.5 h-7 rounded-sm bg-[#1769DF] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1259BD] disabled:opacity-50"
                >
                  {isUploading ? "Uploading…" : "Upload from device"}
                </button>
                <p className="mt-1 text-[10px] text-[#7A87A0]">Instagram needs exactly one image or video — recommended 1080 × 1350 (4:5)</p>
              </div>

              {/* Attached to this post */}
              <div className="mt-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#7A87A0]">
                  Attached ({(masterContent.media ?? []).length})
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {(masterContent.media ?? []).map((m, i) => (
                    <div key={m.id} className="relative overflow-hidden rounded-sm border border-[#1769DF]">
                      <img src={m.url} alt={m.alt ?? m.name} className="h-14 w-full object-cover" />
                      <span className="absolute left-0.5 top-0.5 grid size-3.5 place-items-center rounded bg-[#1769DF] text-[8px] font-semibold text-white">{i + 1}</span>
                      <button
                        onClick={() => removeMedia(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5 text-slate-600 hover:bg-white"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                  {(masterContent.media ?? []).length === 0 && (
                    <p className="col-span-5 text-[10.5px] text-[#7A87A0]">
                      Nothing attached yet — pick from your library below or upload a file.
                    </p>
                  )}
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isUploading}
                    className="grid h-14 place-items-center rounded-sm border border-dashed border-[#CBD5E1] text-[#7A87A0] hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Plus className="size-3.5" /><span className="mt-0.5 text-[9px] font-semibold">Add</span>
                  </button>
                </div>
              </div>

              {/* Library picker */}
              <div className="mt-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#7A87A0]">Media library — click to attach</p>
                <div className="grid grid-cols-5 gap-1">
                  {libraryMedia.map((m) => {
                    const attached = (masterContent.media ?? []).some((a) => a.id === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMedia(m)}
                        title={attached ? "Detach from post" : "Attach to post"}
                        className={cn(
                          "relative overflow-hidden rounded-sm border transition",
                          attached ? "border-[#1769DF] ring-1 ring-[#1769DF]" : "border-[#E2E8F0] hover:border-[#9DBBEA]"
                        )}
                      >
                        <img src={m.url} alt={m.alt ?? m.name} className="h-14 w-full object-cover" />
                        {attached && (
                          <span className="absolute right-0.5 top-0.5 grid size-3.5 place-items-center rounded bg-[#1769DF] text-white">
                            <Check className="size-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {libraryMedia.length === 0 && (
                    <p className="col-span-5 text-[10.5px] text-[#7A87A0]">No files in your library yet — upload one to attach it.</p>
                  )}
                </div>
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
            { label: "Media added", done: (masterContent.media ?? []).length > 0 },
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
            errorCount > 0 || isPublishing || isSavingDraft || channelAvailabilityLoading || channels.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-[#EB0711] hover:bg-[#D60811]"
          )}
            onClick={() => void handlePublishNow()}
            disabled={errorCount > 0 || isPublishing || isSavingDraft || channelAvailabilityLoading || channels.length === 0}
          >
            {(isPublishing || isSavingDraft) ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            {errorCount > 0 ? `${errorCount} channel${errorCount > 1 ? "s" : ""} need attention` : isPublishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
