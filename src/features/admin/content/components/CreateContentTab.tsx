"use client";
import Link from "next/link";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check, ChevronDown, ChevronRight, Download, Plus, Send, X,
  Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformBadge } from "./ui-platform";
import { useContentAccess } from "../live/use-content-access";
import { draftsApi, type DraftRecord } from "../live/drafts-api";
import { mediaApi } from "../live/media-api";
import { schedulingApi, type PublishTarget } from "../live/scheduling-api";
import { immediateScheduledFor, scheduleWindowError } from "../live/schedule-datetime";
import { deliveryCaption, deliveryTiming } from "../live/composer-delivery";
import { selectedPublishingTarget } from "../live/publishing-destination";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { env } from "@/config/env";
import { useMetaOverview } from "@/features/admin/channels/live/meta-instagram-hooks";
import { ApiError } from "@/types/api";
import { getPublishablePlatforms, overviewProviderForPlatform } from "../live/publishable-platforms";
import { instagramPublishError, type InstagramMediaKind } from "../live/instagram-publish-policy";
import type {
  Platform, ContentType, MediaRatio, MasterContent, PlatformOverride,
  PlatformSchedule, PlatformValidation, UTMConfig, AutoAdaptOptions,
  MediaAsset,
} from "../types/content.types";
import {
  ALL_PLATFORMS, PLATFORM_META, PLATFORM_CONTENT_TYPES,
  MOCK_CONNECTIONS, PLATFORM_CHAR_LIMITS, MEDIA_CAPABLE_PLATFORMS,
} from "../config/platform-config";
import { clientsApi } from "@/features/clients/data/clients-api";
import { ContentPreviewPanel } from "./ContentPreview";
import { htmlToPlainText, plainTextToHtml } from "../lib/rich-text";
import { ContentChecklist } from "./ContentChecklist";
import { MasterContentEditor } from "./MasterContentEditor";
import { ContentTypeSelectorInline } from "./ContentTypeSelector";
import { PlatformOverrideEditor } from "./PlatformOverrideEditor";
import { RatioSelector } from "./RatioSelector";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { useFeature } from "@/lib/feature-flags/use-feature";
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

/** Wording the Create tab starts with, e.g. from a template or an idea. */
export interface CreateSeed {
  caption: string;
  hashtags: string[];
  cta?: string;
  media?: MediaAsset[];
  draft?: DraftRecord;
}

export function CreateContentTab({ seed, initialPlatforms = ["instagram", "facebook"], onAiAction }: { seed?: CreateSeed; initialPlatforms?: Platform[]; onAiAction?: (action: string, caption: string) => void } = {}) {
  const queryClient = useQueryClient();
  const {canWrite, canPublish} = useContentAccess();
  /* ── State ── */
  const { companyId, clientId, setClientId } = useTenancyContext();
  const overviewQuery = useMetaOverview(companyId, clientId, env.dataSource === "api" && Boolean(companyId && clientId));
  const channelAvailabilityLoading = env.dataSource === "api" && overviewQuery.isLoading;
  const channelAvailabilityError = env.dataSource === "api" ? overviewQuery.error : null;
  const linkedinFeature = useFeature("channels.linkedin_publishing");
  const linkedinOff = linkedinFeature.status === "disabled";
  const connectedPlatforms = useMemo(() => {
    const platforms = env.dataSource === "api"
      ? getPublishablePlatforms(overviewQuery.data)
      : ALL_PLATFORMS.filter(p => MOCK_CONNECTIONS[p].status === "connected");
    return linkedinOff ? platforms.filter((platform) => platform !== "linkedin") : platforms;
  }, [overviewQuery.data, linkedinOff]);

  const [requestedChannels, setChannels] = useState<Platform[]>(seed?.draft ? seed.draft.variants.map(v => CHANNEL_TO_PLATFORM[v.channel]).filter((p): p is Platform => Boolean(p)) : initialPlatforms);
  const draftingPlatforms: Platform[] = ["facebook", "instagram", "linkedin"];
  const channels = useMemo(() => requestedChannels.filter(platform => ["facebook","instagram","linkedin"].includes(platform)), [requestedChannels]);
  /* Default channels start selected, so their content types must exist too —
     otherwise every channel fails validation before the user touches anything. */
  const [contentTypes, setContentTypes] = useState<Partial<Record<Platform, ContentType>>>(() => {
    const initial: Partial<Record<Platform, ContentType>> = {};
    for (const platform of [...new Set([...initialPlatforms, ...(seed?.draft?.variants.map(v => CHANNEL_TO_PLATFORM[v.channel]).filter((p): p is Platform => Boolean(p)) ?? [])])]) {
      const specs = PLATFORM_CONTENT_TYPES[platform];
      if (specs?.length) initial[platform] = platform === "instagram" && (seed?.media?.some(m => m.type === "video") || seed?.draft?.media.some(m => m.asset.kind === "VIDEO")) ? "reel" : specs[0]!.id;
    }
    return initial;
  });
  const [masterContent, setMasterContent] = useState<MasterContent>({
    caption: seed?.draft ? (/<(p|div|br|strong|em)\b/i.test(seed.draft.content) ? seed.draft.content : plainTextToHtml(seed.draft.content)) : (seed?.caption ? plainTextToHtml(seed.caption) : ""),
    headline: seed?.draft?.title ?? "",
    description: "",
    cta: seed?.cta ?? "",
    ctaUrl: "",
    hashtags: seed?.hashtags ?? [],
    mentions: [],
    media: seed?.media ?? seed?.draft?.media.map(({ asset }) => ({ id: asset.id, url: asset.url, type: asset.kind === "VIDEO" ? "video" as const : "image" as const, name: asset.id, width: asset.width ?? undefined, height: asset.height ?? undefined })) ?? [],
    link: "",
    location: "",
    altText: "",
    firstComment: "",
    language: "English",
    tone: "Positive",
  });
  const [platformOverrides, setPlatformOverrides] = useState<Partial<Record<Platform, PlatformOverride>>>(() => Object.fromEntries((seed?.draft?.variants ?? []).map(v => [CHANNEL_TO_PLATFORM[v.channel], {enabled: v.content !== null && htmlToPlainText(v.content) !== htmlToPlainText(seed?.draft?.content ?? ""), caption: v.content ?? undefined}]).filter(([p]) => Boolean(p))));
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
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("instagram");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);

  const [savedDraftId, setSavedDraftId] = useState<string | null>(seed?.draft?.id ?? null);
  const [currentRevision, setCurrentRevision] = useState<number | null>(seed?.draft?.revision ?? null);
  const [savedAssetIds, setSavedAssetIds] = useState<string[]>(seed?.draft?.media.map(m => m.asset.id) ?? []);

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
  const [variantIds, setVariantIds] = useState<Partial<Record<Platform, string>>>(variantsToPlatformMap(seed?.draft?.variants ?? []));
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
  }, [setMasterContent]);

  const removeMedia = useCallback((id: string) => {
    setMasterContent((prev) => ({ ...prev, media: (prev.media ?? []).filter((m) => m.id !== id) }));
  }, [setMasterContent]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!companyId || !clientId) return toast.error("Verified Company and Client context are required.");
      const isVideo = file.type.startsWith("video/");
      const maxBytes = isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024;
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
    [companyId, clientId, setMasterContent],
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
        caption: /<(p|div|br|strong|em)\b/i.test(latest.content) ? latest.content : plainTextToHtml(latest.content),
        hashtags: [],
        link: "",
        media: latest.media.map(({ asset }) => ({id:asset.id,url:asset.url,type:asset.kind === "VIDEO" ? "video" : "image",name:asset.id,width:asset.width ?? undefined,height:asset.height ?? undefined})),
        headline: latest.title || prev.headline,
      }));
      setPlatformOverrides(Object.fromEntries(latest.variants.map(v => [CHANNEL_TO_PLATFORM[v.channel], {enabled:v.content !== null && htmlToPlainText(v.content) !== htmlToPlainText(latest.content),caption:v.content ?? undefined}])));
      setConflictNotice(null);
      toast.success(`Reloaded draft (Revision ${latest.revision})`);
    } catch {
      toast.error("Failed to reload draft.");
    }
  }, [companyId, clientId, savedDraftId, setMasterContent, setPlatformOverrides]);

  const handleSaveDraft = useCallback(async (): Promise<{ draftId: string; revision: number; variantIds: Partial<Record<Platform, string>> } | null> => {
    if (!canWrite) { toast.error("Your role cannot edit content in this company."); return null; }
    if (!companyId || !clientId) {
      toast.error("Verified Company and Client context are required.");
      return null;
    }
    if (!htmlToPlainText(masterContent.caption).trim()) {
      toast.error("Please enter a caption before saving draft.");
      return null;
    }

    // Map supported channels (FACEBOOK_PAGE, INSTAGRAM_ACCOUNT, LINKEDIN_ORGANIZATION)
    const variants: Record<string, { content?: string | null }> = {};
    for (const platform of ["facebook", "instagram", "linkedin"] as const) {
      if (!channels.includes(platform)) continue;
      let content: string;
      try { content = deliveryCaption(masterContent, platformOverrides[platform], platformUtms[platform] ?? globalUtm); }
      catch { toast.error("Enter a valid HTTP or HTTPS link before saving tracking settings."); return null; }
      const key = platform === "facebook" ? "FACEBOOK_PAGE" : platform === "instagram" ? "INSTAGRAM_ACCOUNT" : "LINKEDIN_ORGANIZATION";
      variants[key] = { content };
    }
    if (!Object.keys(variants).length) {toast.error("Select at least one channel before saving a draft.");return null;}
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
          content: deliveryCaption(masterContent),
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
          content: deliveryCaption(masterContent),
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
    if (result) for (const key of ["content-drafts", "content-approvals", "content-approval-counts", "content-approval-detail"]) void queryClient.invalidateQueries({queryKey:[key,companyId,clientId]});
    return result;
  }, [canWrite, queryClient, companyId, clientId, masterContent, channels, platformOverrides, platformUtms, globalUtm, savedDraftId, currentRevision, savedAssetIds]);

  /** Saves the draft, then asks an owner or admin to review it (the draft review flow; an approver is decided by role, not chosen here). */
  const handleSendForReview = useCallback(async () => {
    const saved = await handleSaveDraft();
    if (!saved || !companyId || !clientId) return;
    try {
      const reviewed = await draftsApi.submitReview(companyId, clientId, saved.draftId, saved.revision);
      setCurrentRevision(reviewed.revision);
      for (const key of ["content-drafts", "content-approvals", "content-approval-counts", "content-approval-detail"]) void queryClient.invalidateQueries({queryKey:[key,companyId,clientId]});
      toast.success("Sent for review", { description: "An owner or admin can approve it under Approvals." });
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The draft could not be sent for review.");
    }
  }, [handleSaveDraft, companyId, clientId, queryClient]);

  /* ── Derived ── */
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
      if (!connectedPlatforms.includes(p)) items.push({field:"connection",level:"error",message:"Link this channel to the selected client before publishing. You can still save a draft."});
      const ct = contentTypes[p];
      const specs = PLATFORM_CONTENT_TYPES[p] ?? [];
      const spec = specs.find(s => s.id === ct);

      if (!ct) {
        items.push({ field: "contentType", level: "error", message: "Content type not selected" });
      }

      const override = platformOverrides[p];
      let caption: string;
      try { caption = deliveryCaption(masterContent, override, platformUtms[p] ?? globalUtm); }
      catch { caption = ""; items.push({field:"link", level:"error", message:"Enter a valid HTTP or HTTPS link for tracking."}); }
      const maxChars = PLATFORM_CHAR_LIMITS[p];
      const mediaCount = (masterContent.media ?? []).length;

      if (!caption && spec?.fields.includes("caption")) {
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
        const instagramError = instagramPublishError(ct, (masterContent.media ?? []).filter(m => m.type === "image" || m.type === "video").map((media) => media.type as InstagramMediaKind));
        if (instagramError) items.push({ field: "media", level: "error", message: instagramError });
        const image = masterContent.media.find(media => media.type === "image");
        if (image?.width && image.height && (image.width < 320 || image.width > 1440 || image.width / image.height < 0.8 || image.width / image.height > 1.91)) {
          items.push({ field: "media", level: "error", message: "Instagram requires an image 320?1440 px wide with an aspect ratio between 4:5 and 1.91:1. Upload a compatible image; preview framing does not resize it." });
        }
      } else if (mediaCount > 0 && !MEDIA_CAPABLE_PLATFORMS.includes(p)) {
        items.push({ field: "media", level: "error", message: `${PLATFORM_META[p].label} is text-only here — scheduling with media is refused` });
      }

      if (p === "google-business") {
        items.push({ field: "channel", level: "error", message: "Google Business draft variants are not supported by the backend yet — it cannot be scheduled" });
      }

      const level = items.some(i => i.level === "error") ? "error" : items.some(i => i.level === "warning") ? "warning" : "ready";
      return { platform: p, level, items };
    });
  }, [channels, contentTypes, masterContent, platformOverrides, platformUtms, globalUtm, connectedPlatforms]);

  const errorCount = validations.filter(v => v.level === "error" && schedules.find(item => item.platform === v.platform)?.schedule !== "draft").length;

  // Save a revision snapshot, then explicitly review destinations before enqueueing.
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishReview, setPublishReview] = useState<{
    companyId: string; clientId: string; draftId: string; revision: number;
    destinations: Array<{ platform: Platform; variantId: string; targets: PublishTarget[]; scheduledFor: string; immediate: boolean }>;
  } | null>(null);
  const [publishTargets, setPublishTargets] = useState<Partial<Record<Platform, string>>>({});
  const [queuedPlatforms, setQueuedPlatforms] = useState<Platform[]>([]);
  const handlePublishNow = useCallback(async () => {
    if (!canPublish) return toast.error("An owner or admin can publish this post.");
    if (isPublishing || isSavingDraft) return;
    if (errorCount > 0) return toast.error("Fix the flagged channels before publishing.");
    if (!companyId || !clientId || channels.length === 0) return;
    setIsPublishing(true);
    try {
      const saved = await handleSaveDraft();
      if (!saved) return;
      const deliveryChannels = channels.filter(platform => schedules.find(item => item.platform === platform)?.schedule !== "draft");
      if (!deliveryChannels.length) { toast.success("Draft saved. All selected channels are set to Draft."); return; }
      const destinations = await Promise.all(deliveryChannels.map(async platform => {
        const choice = schedules.find(item => item.platform === platform);
        const timing = deliveryTiming(choice);
        if ("draft" in timing) throw new Error("Draft channels cannot be queued.");
        if ("error" in timing) throw new Error(`${PLATFORM_META[platform].label}: ${timing.error}`);
        const variantId = saved.variantIds[platform];
        if (!variantId) throw new Error(`Save a supported variant for ${PLATFORM_META[platform]?.label ?? platform}.`);
        const { items } = await schedulingApi.targets(companyId, clientId, saved.draftId, variantId);
        const targets = items.filter(target => target.publishable);
        if (targets.length === 0) throw new Error(`No publishable account is linked for ${PLATFORM_META[platform]?.label ?? platform}.`);
        return { platform, variantId, targets, scheduledFor: timing.scheduledFor, immediate: choice?.schedule !== "later" };
      }));
      setPublishTargets({});
      setQueuedPlatforms([]);
      setPublishReview({ companyId, clientId, draftId: saved.draftId, revision: saved.revision, destinations });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Publishing accounts could not be loaded."); }
    finally { setIsPublishing(false); }
  }, [canPublish, isPublishing, isSavingDraft, errorCount, companyId, clientId, channels, schedules, handleSaveDraft, setPublishTargets, setPublishReview]);

  const confirmPublish = async () => {
    if (!publishReview || isPublishing) return;
    if (publishReview.companyId !== companyId || publishReview.clientId !== clientId) {
      setPublishReview(null);
      toast.error("The selected workspace changed. Review the post again.");
      return;
    }
    const pending = publishReview.destinations.filter(item => !queuedPlatforms.includes(item.platform));
    if (pending.some(item => !selectedPublishingTarget(item.targets, publishTargets[item.platform]))) return;
    setIsPublishing(true);
    const done = [...queuedPlatforms];
    try {
      // Validate every fixed slot before queueing the first destination.
      for (const item of pending) {
        const timingError = !item.immediate && scheduleWindowError(new Date(item.scheduledFor));
        if (timingError) throw new Error(`${PLATFORM_META[item.platform].label}: ${timingError}`);
      }
      for (const item of pending) {
        const scheduledFor = item.immediate ? immediateScheduledFor() : item.scheduledFor;
        await schedulingApi.schedule(publishReview.companyId, publishReview.clientId, publishReview.draftId, item.variantId, {
          resourceMappingId: publishTargets[item.platform]!, scheduledFor, expectedDraftRevision: publishReview.revision,
        });
        done.push(item.platform);
        setQueuedPlatforms([...done]);
        void queryClient.invalidateQueries({ queryKey: ["content", "scheduled-posts"] });
        void queryClient.invalidateQueries({ queryKey: ["meta-hub"] });
      }
      setPublishReview(null);
      toast.success("Posts queued", { description: "Queued for the reviewed times. Check final delivery status in Scheduled posts.", duration: 10000 });
    } catch (error) {
      toast.error("Some posts were not queued", { description: `${done.length} queued. ${error instanceof Error ? error.message : "Try again for the remaining destinations."}`, duration: 10000 });
    } finally { setIsPublishing(false); }
  };

  const effectivePreviewPlatform = channels.includes(previewPlatform) ? previewPlatform : channels[0] ?? previewPlatform;

  return (
    <>
    <div className="grid min-w-0 grid-cols-1 items-start gap-1 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ─── LEFT: Editor ─── */}
      <div className="space-y-1 min-w-0">

        <div className="flex items-center gap-3 rounded-sm border border-[#E2E8F0] bg-white px-3.5 py-2 shadow-xs"><span id="composer-client-label" className="text-[0.8125rem] font-medium text-[#172044]">Client <span className="text-danger">*</span></span><Select value={clientId} onValueChange={changeClient} disabled={!clientOptions.length}><SelectTrigger size="sm" aria-labelledby="composer-client-label" className="ml-auto min-w-0 flex-1 sm:max-w-xs"><SelectValue placeholder={clientOptions.length ? "Select a client" : "Loading clients..."} /></SelectTrigger><SelectContent>{clientOptions.map(client=><SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>

        {/* Channels & Content Types */}
        <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-xs">
          <button
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="flex w-full items-center justify-between gap-2 min-h-[40px] border-b border-[#EDF1F5] px-3.5 py-2 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold text-[#172044]">Channels & Content Types</h3>
              <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">Select platforms and their content types</p>
            </div>
            {channelsOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
          </button>

          {channelsOpen && (
            <div className="p-3.5">
              <div className="grid gap-1 sm:grid-cols-2">
                {channelAvailabilityLoading ? (
                  <p className="px-2 py-3 text-[11px] text-[#7A87A0]">Checking this Client&apos;s mapped publishing accounts…</p>
                ) : draftingPlatforms.length === 0 ? (
                  <div className="px-2 py-3 text-[11px] text-[#7A87A0]">
                    {channelAvailabilityError instanceof Error
                      ? channelAvailabilityError.message
                      : "No publishable accounts are mapped to this Client. Connect and map an account in Integrations."}
                  </div>
                ) : draftingPlatforms.map((p) => {
                  const backendProvider = overviewProviderForPlatform(p);
                  const providerOverview = backendProvider
                    ? overviewQuery.data?.providers.find((item) => item.provider === backendProvider)
                    : undefined;
                  const conn = env.dataSource === "api"
                    ? { status: connectedPlatforms.includes(p) ? "connected" as const : "disconnected" as const, account: connectedPlatforms.includes(p) ? providerOverview?.resources[0]?.externalResourceId ?? "Mapped account" : "Drafts available" }
                    : MOCK_CONNECTIONS[p];
                  const on = channels.includes(p);
                  const meta = PLATFORM_META[p];

                  return (
                    <div key={p}>
                      <button
                        onClick={() => toggleChannel(p)}
                        disabled={!canWrite}
                        className={cn(
                          "flex w-full flex-wrap items-center gap-2 rounded-sm px-2 py-1.5 text-left transition",
                          on ? "bg-[#F0F6FF]" : "hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition", on ? "border-[#1769DF] bg-[#1769DF] text-white" : "border-[#CBD5E1] text-transparent")}>
                          <Check className="size-2" />
                        </span>
                        <PlatformBadge platform={p} size="sm" />
                        <span className="flex-1 text-[11.5px] font-semibold text-[#33445F]">{meta.label}</span>
                        <span className="max-w-[120px] truncate text-[9.5px] text-[#7A87A0]">{conn.account}</span>
                        {conn.status === "connected" && <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold text-emerald-600">Connected</span>}
                        {conn.status === "disconnected" && <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-500">Link to publish</span>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {channels.some(platform => !connectedPlatforms.includes(platform)) && <p className="mt-2 text-[11px] text-slate-500">Draft now, connect before publishing. <Link href="/admin/integrations" className="font-semibold text-blue-600 hover:underline">Manage channel connections</Link></p>}
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

        {/* Master Content */}
        <MasterContentEditor onAiAction={onAiAction ? action => onAiAction(action, htmlToPlainText(masterContent.caption)) : undefined} content={masterContent} onChange={setMasterContent} />

        {/* Media */}
        <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-xs">
          <button
            onClick={() => setMediaOpen(!mediaOpen)}
            className="flex w-full items-center justify-between gap-2 min-h-[40px] border-b border-[#EDF1F5] px-3.5 py-2 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold text-[#172044]">Media</h3>
              <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">JPG, PNG, WebP up to 8 MB · MP4/MOV up to 50 MB</p>
            </div>
            {mediaOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
          </button>

          {mediaOpen && (
            <div className="p-3.5">
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
              <div className="rounded-sm border-2 border-dashed border-[#B9CFF2] bg-[#F7FAFF] py-3 text-center transition hover:border-[#1769DF] hover:bg-[#F0F6FF]">
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
                      {m.type === "video" ? <video src={m.url} muted preload="metadata" className="h-14 w-full object-cover" aria-label={m.name} /> : <img src={m.url} alt={m.alt ?? m.name} className="h-14 w-full object-cover" />}
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
                        {m.type === "video" ? <video src={m.url} muted preload="metadata" className="h-14 w-full object-cover" aria-label={m.name} /> : <img src={m.url} alt={m.alt ?? m.name} className="h-14 w-full object-cover" />}
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
      <div className="min-w-0 space-y-1">
        <ContentPreviewPanel
          platform={effectivePreviewPlatform}
          setPlatform={setPreviewPlatform}
          channels={channels}
          caption={deliveryCaption(masterContent, platformOverrides[effectivePreviewPlatform])}
          hashtags={[]}
          mediaType={masterContent.media[0]?.type}
          ratio={platformRatios[effectivePreviewPlatform] || masterRatio}
          image={masterContent.media[0]?.url ?? null}
          accountName={clientOptions.find((client) => client.id === clientId)?.name}
        />


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


        {/* Approval */}
        <Card>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !canWrite}
            >
              {isSavingDraft ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {savedDraftId && currentRevision !== null ? `Save Draft (r${currentRevision})` : "Save Draft"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary-subtle"
              onClick={() => void handleSendForReview()}
              disabled={isSavingDraft || !canWrite}
            >
              Send for Review
            </Button>
            <Button size="sm" variant="outline" className="col-span-2" onClick={() => {
              const blob = new Blob([JSON.stringify({ caption: htmlToPlainText(masterContent.caption), hashtags: masterContent.hashtags, channels, platformOverrides, schedules, media: masterContent.media }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a"); link.href = url; link.download = "content-draft.json"; link.click(); URL.revokeObjectURL(url);
            }}>
              <Download className="size-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="col-span-2"
              onClick={() => void handlePublishNow()}
              title={!canPublish ? "An owner or admin can publish content" : undefined}
              disabled={!canPublish || errorCount > 0 || isPublishing || isSavingDraft || channelAvailabilityLoading || channels.length === 0}
            >
              {(isPublishing || isSavingDraft) ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {errorCount > 0 ? `${errorCount} channel${errorCount > 1 ? "s" : ""} need attention` : isPublishing ? "Publishing..." : "Review & publish"}
            </Button>
          </div>
        </Card>

        {/* Validation */}
        <PlatformValidationPanel
          validations={validations}
          totalPlatforms={channels.length}
        />

        <ContentChecklist
          checks={[
            {label:"Client selected",done:Boolean(clientId)},
            {label:"Channels selected",done:channels.length>0},
            {label:"Caption added",done:Boolean(htmlToPlainText(masterContent.caption).trim())},
            {label:"Channel requirements",done:channels.length>0&&errorCount===0},
            {label:"Draft saved",done:Boolean(savedDraftId)},
            {label:"Media attached (optional)",done:masterContent.media.length>0},
          ]}
        />


      </div>
    </div>
    <div className="mt-1">        <ScheduledPostsPanel
          draftId={savedDraftId}
          revision={currentRevision}
          channels={channels}
          schedules={schedules}
          variantIds={variantIds}
          onReloadDraft={() => void reloadLatestDraft()}
        />
    </div>
    <AlertDialog open={publishReview !== null} onOpenChange={open => { if (!open && !isPublishing) setPublishReview(null); }}>
      <AlertDialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg" onEscapeKeyDown={event => { if (isPublishing) event.preventDefault(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Review publishing destinations</AlertDialogTitle>
          <AlertDialogDescription>Select the exact account and check the time for every channel. Now queues about 3 minutes ahead. Draft channels are excluded. Media processing can take longer.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          {publishReview?.destinations.map(item => <label key={item.platform} className="block space-y-1 text-xs font-semibold">
            <span>{PLATFORM_META[item.platform]?.label ?? item.platform}{queuedPlatforms.includes(item.platform) ? " - already queued" : ""}</span>
            <span className="block text-[11px] font-normal text-slate-500">{item.immediate ? "Now ? queues about 3 minutes after confirmation" : new Date(item.scheduledFor).toLocaleString()}</span>
            <select className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs" value={publishTargets[item.platform] ?? ""} disabled={isPublishing || queuedPlatforms.includes(item.platform)} onChange={event => setPublishTargets(previous => ({ ...previous, [item.platform]: event.target.value }))}>
              <option value="">Select a publishing account</option>
              {item.targets.map(target => <option key={target.resourceMappingId} value={target.resourceMappingId}>{target.resourceName ?? target.externalResourceId} ({target.externalResourceId})</option>)}
            </select>
          </label>)}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
          <Button onClick={() => void confirmPublish()} disabled={isPublishing || !publishReview || publishReview.destinations.some(item => !queuedPlatforms.includes(item.platform) && !publishTargets[item.platform])}>{isPublishing ? "Queueing..." : "Confirm & queue posts"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
