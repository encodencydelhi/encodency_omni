"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, BarChart2, CalendarClock, CalendarDays, FileText, ImageIcon, Loader2, Plus, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { FeatureGate } from "@/lib/feature-flags/feature-gate";
import { draftsApi, type DraftRecord } from "@/features/admin/content/live/drafts-api";
import { MEDIA_LIMITS, describeMediaError, mediaApi, type MediaAssetRecord } from "@/features/admin/content/live/media-api";
import { schedulingApi, describeScheduleError, describeScheduleWarning, type PublishTarget } from "@/features/admin/content/live/scheduling-api";
import { useLinkedInOverview, linkedinProvider } from "@/features/admin/channels/live/linkedin-hooks";
import { integrationsApi, type LinkedInEvent } from "@/features/admin/integrations/live/integrations-api";

const LINKEDIN_CHANNEL = "LINKEDIN_ORGANIZATION" as const;
const MIN_SCHEDULE_DELAY_MS = 2 * 60 * 1000;
/** LinkedIn organization posts: up to 20 pictures or one video; one document; a poll; or one of the page's events. */
const MAX_IMAGES = 20;
const ALT_MAX = 1000;
const TITLE_MAX = 400;
const DOCUMENT_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
const DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;
const POLL_DURATIONS = [["ONE_DAY", "1 day"], ["THREE_DAYS", "3 days"], ["SEVEN_DAYS", "1 week"], ["FOURTEEN_DAYS", "2 weeks"]] as const;

type Format = "text" | "media" | "document" | "poll" | "event";
const FORMATS: Array<{ key: Format; label: string; icon: typeof FileText; hint: string }> = [
  { key: "text", label: "Text", icon: FileText, hint: "Text only" },
  { key: "media", label: "Photos / video", icon: ImageIcon, hint: "20 photos or 1 video" },
  { key: "document", label: "Document", icon: FileText, hint: "PDF, DOC, PPT" },
  { key: "poll", label: "Poll", icon: BarChart2, hint: "2–4 options" },
  { key: "event", label: "Event", icon: CalendarDays, hint: "Page event" },
];

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDatetimeToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Choose a valid schedule time.");
  return parsed.toISOString();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "LinkedIn action failed.";
}

function LinkedInCreatePost() {
  const router = useRouter();
  const { companyId, clientId, isReady } = useTenancyContext();
  const overviewQuery = useLinkedInOverview(companyId || "", clientId || "", isReady && Boolean(companyId) && Boolean(clientId));
  const linkedinStatus = linkedinProvider(overviewQuery.data);
  const mappedResources = linkedinStatus?.resources.filter((resource) => resource.resourceType === LINKEDIN_CHANNEL) ?? [];
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(() => toDatetimeLocal(new Date(Date.now() + 10 * 60 * 1000)));
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [format, setFormat] = useState<Format>("text");
  const [media, setMedia] = useState<MediaAssetRecord[]>([]);
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [mediaTitle, setMediaTitle] = useState("");
  const [documentAsset, setDocumentAsset] = useState<MediaAssetRecord | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [poll, setPoll] = useState({ question: "", options: ["", ""], duration: "SEVEN_DAYS" });
  const [events, setEvents] = useState<LinkedInEvent[] | null>(null);
  const [eventUrn, setEventUrn] = useState("");
  const [uploading, setUploading] = useState(0);
  // "Write this post" from AI post insights opens this page with the idea's opening line (?text=...).
  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get("text");
    if (seed) setContent((current) => current || seed.slice(0, 3000));
  }, []);

  // The page's events load only when the Event format is chosen.
  useEffect(() => {
    if (format !== "event" || events !== null || !companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInEvents(companyId, clientId, controller.signal)
      .then((response) => setEvents(response.events))
      .catch(() => { if (!controller.signal.aborted) setEvents([]); });
    return () => controller.abort();
  }, [format, events, companyId, clientId]);

  const selectedResourceMappingId = selectedMappingId || mappedResources[0]?.mappingId || "";
  const connected = linkedinStatus?.state === "connected" || linkedinStatus?.status === "CONNECTED" || linkedinStatus?.status === "MAPPED";
  const reconnectRequired = Boolean(linkedinStatus?.reconnectRequired || linkedinStatus?.health === "expired" || linkedinStatus?.health === "revoked");
  const plainContent = content.trim();
  const characterCount = plainContent.length;
  const hasVideo = media.some((item) => item.kind === "VIDEO");
  const pollOptions = poll.options.map((option) => option.trim());
  const busy = isSaving || isScheduling || uploading > 0;

  let validationMessage: string | null = null;
  if (!companyId || !clientId) validationMessage = "Select a company and client before publishing.";
  else if (!connected) validationMessage = "Connect LinkedIn before creating a post.";
  else if (reconnectRequired) validationMessage = "Your LinkedIn connection needs to be renewed.";
  else if (!selectedResourceMappingId) validationMessage = "Map a LinkedIn Company Page before publishing.";
  else if (!plainContent) validationMessage = "Write the post text before saving or scheduling.";
  else if (characterCount > 3000) validationMessage = "LinkedIn posts are limited to 3,000 characters.";
  else if (uploading > 0) validationMessage = "Wait for the uploads to finish.";
  else if (format === "media" && media.length === 0) validationMessage = "Add photos or a video, or choose the Text format.";
  else if (format === "document" && !documentAsset) validationMessage = "Upload the document.";
  else if (format === "document" && !mediaTitle.trim()) validationMessage = "Give the document a title.";
  else if (format === "poll" && !poll.question.trim()) validationMessage = "Write the poll question.";
  else if (format === "poll" && (pollOptions.some((option) => !option) || new Set(pollOptions.map((option) => option.toLowerCase())).size !== pollOptions.length)) validationMessage = "Fill every poll option (all different).";
  else if (format === "event" && !eventUrn) validationMessage = "Choose the event to share.";

  /** Variant settings and attachments for the chosen format (other formats' inputs are ignored, never sent). */
  function buildPost(): { assetIds: string[]; options: Record<string, unknown> | null } {
    if (format === "media") {
      const alts = Object.fromEntries(media.filter((item) => item.kind === "IMAGE" && altTexts[item.id]?.trim()).map((item) => [item.id, altTexts[item.id]!.trim()]));
      const options: Record<string, unknown> = {};
      if (Object.keys(alts).length) options.altTexts = alts;
      if (hasVideo && mediaTitle.trim()) options.mediaTitle = mediaTitle.trim();
      return { assetIds: media.map((item) => item.id), options: Object.keys(options).length ? options : null };
    }
    if (format === "document" && documentAsset) return { assetIds: [documentAsset.id], options: { mediaTitle: mediaTitle.trim() } };
    if (format === "poll") return { assetIds: [], options: { poll: { question: poll.question.trim(), options: pollOptions, duration: poll.duration } } };
    if (format === "event") return { assetIds: [], options: { eventUrn } };
    return { assetIds: [], options: null };
  }

  async function createDraft(): Promise<DraftRecord> {
    if (!companyId || !clientId) throw new Error("Company and client context are required.");
    const built = buildPost();
    return draftsApi.create(companyId, clientId, {
      title: title.trim() || `LinkedIn ${FORMATS.find((item) => item.key === format)?.label.toLowerCase()} post`,
      content: plainContent,
      variants: { [LINKEDIN_CHANNEL]: { content: plainContent, ...(built.options ? { options: built.options } : {}) } },
      assetIds: built.assetIds,
    });
  }

  async function resolvePublishableTarget(draft: DraftRecord): Promise<PublishTarget> {
    if (!companyId || !clientId) throw new Error("Company and client context are required.");
    const variant = draft.variants.find((item) => item.channel === LINKEDIN_CHANNEL);
    if (!variant) throw new Error("LinkedIn draft variant was not created.");
    const targets = await schedulingApi.targets(companyId, clientId, draft.id, variant.id);
    const target = targets.items.find((item) => item.resourceMappingId === selectedResourceMappingId);
    if (!target) throw new Error("Selected LinkedIn Company Page is no longer available for this client.");
    if (!target.publishable) {
      if (target.reason === "integration_reconnect_required") throw new Error("Your LinkedIn connection needs to be renewed.");
      throw new Error("This LinkedIn Company Page is not publishable right now.");
    }
    return target;
  }

  async function saveDraftOnly() {
    if (validationMessage && plainContent.length === 0) {
      toast.error(validationMessage);
      return;
    }
    try {
      setIsSaving(true);
      await createDraft();
      toast.success("LinkedIn draft saved", { description: "Saved as a real tenant-scoped content draft." });
      router.push("/admin/linkedin");
    } catch (error) {
      toast.error("Could not save LinkedIn draft", { description: errorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  async function schedulePost(mode: "now" | "later") {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    try {
      setIsScheduling(true);
      if (!companyId || !clientId) throw new Error("Company and client context are required.");
      const draft = await createDraft();
      const variant = draft.variants.find((item) => item.channel === LINKEDIN_CHANNEL);
      if (!variant) throw new Error("LinkedIn draft variant was not created.");
      const target = await resolvePublishableTarget(draft);
      const requestedTime = mode === "now" ? new Date(Date.now() + MIN_SCHEDULE_DELAY_MS + 15_000).toISOString() : localDatetimeToIso(scheduledFor);
      const scheduled = await schedulingApi.schedule(companyId, clientId, draft.id, variant.id, {
        resourceMappingId: target.resourceMappingId,
        scheduledFor: requestedTime,
        expectedDraftRevision: draft.revision,
      });
      const warningText = scheduled.warnings.map(describeScheduleWarning).join(" ");
      toast.success(mode === "now" ? "LinkedIn publishing queued" : "LinkedIn post scheduled", {
        description: warningText || `Status: ${scheduled.status}. Provider success will be shown only after LinkedIn confirms publishing.`,
      });
      router.push("/admin/linkedin");
    } catch (error) {
      toast.error("LinkedIn post was not scheduled", { description: describeScheduleError(error) });
    } finally {
      setIsScheduling(false);
    }
  }

  /** Uploads pictures (up to 20) or one video to the Client's media library; they go to LinkedIn when the post publishes. */
  async function addMedia(files: FileList | null) {
    if (!files?.length || !companyId || !clientId) return;
    const list = Array.from(files);
    const videos = list.filter((file) => file.type.startsWith("video/"));
    if (videos.length && (videos.length > 1 || list.length > 1 || media.length)) { toast.error("A LinkedIn post carries either pictures or exactly one video."); return; }
    if (hasVideo) { toast.error("This post already has a video. Remove it to add pictures."); return; }
    if (media.length + list.length > MAX_IMAGES) { toast.error(`A LinkedIn post can carry at most ${MAX_IMAGES} pictures.`); return; }
    for (const file of list) {
      const limits = file.type.startsWith("video/") ? MEDIA_LIMITS.video : MEDIA_LIMITS.image;
      if (!(limits.mimeTypes as readonly string[]).includes(file.type)) { toast.error(`${file.name}: use PNG, JPEG or WebP pictures, or an MP4/MOV video.`); return; }
      if (file.size > limits.maxBytes) { toast.error(`${file.name} is larger than ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`); return; }
    }
    setUploading(list.length);
    try {
      for (const file of list) {
        const record = await mediaApi.upload(companyId, clientId, file);
        setMedia((current) => [...current, record]);
        setUploading((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      toast.error("Upload failed", { description: describeMediaError(error) });
    } finally {
      setUploading(0);
    }
  }

  async function addDocument(files: FileList | null) {
    const file = files?.[0];
    if (!file || !companyId || !clientId) return;
    if (!DOCUMENT_TYPES.includes(file.type)) { toast.error("Use a PDF, Word (DOC/DOCX) or PowerPoint (PPT/PPTX) file."); return; }
    if (file.size > DOCUMENT_MAX_BYTES) { toast.error("The document is larger than 100 MB."); return; }
    setUploading(1);
    try {
      const record = await mediaApi.upload(companyId, clientId, file);
      if (record.kind !== "DOCUMENT") { toast.error("This file was not recognised as a document."); return; }
      setDocumentAsset(record);
      setDocumentName(file.name);
      if (!mediaTitle.trim()) setMediaTitle(file.name.replace(/\.[^.]+$/, "").slice(0, TITLE_MAX));
    } catch (error) {
      toast.error("Upload failed", { description: describeMediaError(error) });
    } finally {
      setUploading(0);
    }
  }

  const uploadButton = (label: string, accept: string, multiple: boolean, onFiles: (files: FileList | null) => void, disabled: boolean) => (
    <label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{uploading ? `Uploading ${uploading}…` : label}
      <input type="file" multiple={multiple} accept={accept} className="sr-only" disabled={disabled} onChange={(event) => { void onFiles(event.target.files); event.target.value = ""; }} />
    </label>
  );

  return (
    <div className="pb-8">
      <div className="-mx-4 -mt-5 mb-4 border-b border-slate-200 bg-white px-4 py-3 shadow-xs sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/linkedin")} className="grid size-8 place-items-center rounded-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Back to LinkedIn">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Create LinkedIn Post</h1>
              <p className="text-[11px] font-medium text-slate-500">Uses Media360 drafts and scheduled publishing for LinkedIn Organization pages.</p>
            </div>
          </div>
          <span className="rounded-sm border border-blue-100 bg-blue-50 px-2 py-1 text-[10.5px] font-bold text-[#0A66C2]">Text · Photos · Video · Document · Poll · Event</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-3">
          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Publishing target</h2>
                <p className="mt-1 text-[11px] text-slate-500">Select a mapped LinkedIn Company Page for this client.</p>
              </div>
              {overviewQuery.isLoading && <Loader2 className="size-4 animate-spin text-[#0A66C2]" />}
            </div>
            {!connected ? (
              <StatusBox tone="amber" title="LinkedIn is not connected" body="Connect LinkedIn from the channel page before creating a live post." />
            ) : reconnectRequired ? (
              <StatusBox tone="red" title="Reconnect required" body="Your LinkedIn token is expired or revoked. Reconnect LinkedIn before scheduling." />
            ) : mappedResources.length === 0 ? (
              <StatusBox tone="amber" title="No LinkedIn Company Page mapped" body="Discover and map a Company Page before organization publishing is available." />
            ) : (
              <select value={selectedResourceMappingId} onChange={(event) => setSelectedMappingId(event.target.value)} className="h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800">
                {mappedResources.map((resource) => (
                  <option key={resource.mappingId} value={resource.mappingId}>{resource.resourceName || `LinkedIn page ${resource.externalResourceId.split(":").pop()}`}</option>
                ))}
              </select>
            )}
          </section>

          <section className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900">Post type</h2>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Post type">
              {FORMATS.map(({ key, label, icon: Icon, hint }) => (
                <button key={key} type="button" role="radio" aria-checked={format === key} onClick={() => setFormat(key)} disabled={busy} title={hint} className={`min-w-0 rounded-sm border px-2.5 py-1.5 text-left ${format === key ? "border-[#0A66C2] bg-[#EAF3FB]" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <span className={`flex items-center gap-1.5 truncate text-xs font-bold ${format === key ? "text-[#0A66C2]" : "text-slate-700"}`}><Icon className="size-3.5 shrink-0" />{label}</span>
                  <span className="block truncate text-[10px] leading-4 text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700">Draft title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} className="mt-1 h-9 w-full rounded-sm border border-slate-200 px-3 text-sm" placeholder="Optional internal title" />
            <label className="mt-4 block text-xs font-bold text-slate-700">Post text</label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} maxLength={3000} className="mt-1 w-full rounded-sm border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[#0A66C2]" placeholder="Write the LinkedIn organization post text..." />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className={characterCount > 3000 ? "font-bold text-red-600" : "text-slate-500"}>{characterCount} / 3,000</span>
              <span className="text-slate-400">Provider success appears after LinkedIn confirms the scheduled publish.</span>
            </div>
          </section>

          {format === "media" && <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Photos or video</h2>
                <p className="mt-1 text-[11px] text-slate-500">Up to {MAX_IMAGES} pictures (PNG, JPEG or WebP, max 8 MB each) or one video (MP4/MOV, max 100 MB, up to 3 minutes).</p>
              </div>
              {uploadButton("Add photos or video", "image/png,image/jpeg,image/webp,video/mp4,video/quicktime", true, addMedia, busy || hasVideo || media.length >= MAX_IMAGES)}
            </div>
            {media.length > 0 && <div className="mt-3 space-y-2">{media.map((item, index) => (
              <div key={item.id} className="flex gap-3 rounded-sm border border-slate-200 p-2">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-slate-50">
                  {item.kind === "VIDEO"
                    ? <video src={item.url} className="size-full object-cover" muted preload="metadata" />
                    // eslint-disable-next-line @next/next/no-img-element -- preview of the Client's own uploaded media
                    : <img src={item.url} alt={altTexts[item.id] || `Picture ${index + 1}`} className="size-full object-cover" />}
                  {item.kind === "VIDEO" && <span className="absolute left-1 top-1 rounded-sm bg-black/60 px-1 text-[9px] font-bold text-white">VIDEO</span>}
                </div>
                <div className="min-w-0 flex-1">
                  {item.kind === "IMAGE" ? <>
                    <label className="block text-[11px] font-bold text-slate-700" htmlFor={`alt-${item.id}`}>Alt text (picture {index + 1})</label>
                    <textarea id={`alt-${item.id}`} rows={2} maxLength={ALT_MAX} value={altTexts[item.id] ?? ""} onChange={(event) => setAltTexts({ ...altTexts, [item.id]: event.target.value })} placeholder="Describe the picture for people who use screen readers, e.g. “Doctor giving an Ayurvedic back massage”" className="mt-1 w-full rounded-sm border border-slate-200 p-2 text-xs" />
                    <p className="text-right text-[10px] text-slate-400">{(altTexts[item.id] ?? "").length} / {ALT_MAX}</p>
                  </> : <>
                    <label className="block text-[11px] font-bold text-slate-700" htmlFor="video-title">Video title (optional)</label>
                    <input id="video-title" maxLength={TITLE_MAX} value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Shown with the video on LinkedIn" className="mt-1 h-8 w-full rounded-sm border border-slate-200 px-2 text-xs" />
                    <p className="mt-1 text-[10px] text-slate-400">LinkedIn&apos;s API takes no alt text for videos; the title describes it.</p>
                  </>}
                </div>
                <button type="button" onClick={() => { setMedia((current) => current.filter((row) => row.id !== item.id)); setAltTexts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== item.id))); }} disabled={busy} className="grid size-7 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100" title="Remove" aria-label={`Remove ${item.kind === "VIDEO" ? "video" : `picture ${index + 1}`}`}><X className="size-4" /></button>
              </div>
            ))}</div>}
          </section>}

          {format === "document" && <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Document</h2>
                <p className="mt-1 text-[11px] text-slate-500">One PDF, Word or PowerPoint file (max 100 MB, LinkedIn shows up to 300 pages). Readers page through it in the feed.</p>
              </div>
              {uploadButton(documentAsset ? "Replace document" : "Upload document", ".pdf,.doc,.docx,.ppt,.pptx", false, addDocument, busy)}
            </div>
            {documentAsset && <div className="mt-3 flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <FileText className="size-4 text-[#0A66C2]" /><span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{documentName}</span><span className="text-slate-500">{(documentAsset.bytes / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" onClick={() => { setDocumentAsset(null); setDocumentName(""); }} disabled={busy} className="grid size-6 place-items-center rounded-full text-slate-500 hover:bg-slate-200" aria-label="Remove document"><X className="size-3.5" /></button>
            </div>}
            <label className="mt-3 block text-[11px] font-bold text-slate-700" htmlFor="document-title">Document title (required)</label>
            <input id="document-title" maxLength={TITLE_MAX} value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Shown above the document on LinkedIn" className="mt-1 h-9 w-full rounded-sm border border-slate-200 px-3 text-sm" />
          </section>}

          {format === "poll" && <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Poll</h2>
            <label className="mt-3 block text-[11px] font-bold text-slate-700" htmlFor="poll-question">Question</label>
            <input id="poll-question" maxLength={140} value={poll.question} onChange={(event) => setPoll({ ...poll, question: event.target.value })} placeholder="e.g. When do you prefer to practise yoga?" className="mt-1 h-9 w-full rounded-sm border border-slate-200 px-3 text-sm" />
            <p className="text-right text-[10px] text-slate-400">{poll.question.length} / 140</p>
            <div className="space-y-2">{poll.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`poll-option-${index}`}>Option {index + 1}</label>
                <input id={`poll-option-${index}`} maxLength={30} value={option} onChange={(event) => setPoll({ ...poll, options: poll.options.map((value, position) => (position === index ? event.target.value : value)) })} placeholder={`Option ${index + 1}`} className="h-9 flex-1 rounded-sm border border-slate-200 px-3 text-sm" />
                <span className="w-10 text-right text-[10px] text-slate-400">{option.length}/30</span>
                {poll.options.length > 2 && <button type="button" onClick={() => setPoll({ ...poll, options: poll.options.filter((_, position) => position !== index) })} className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={`Remove option ${index + 1}`}><X className="size-3.5" /></button>}
              </div>
            ))}</div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {poll.options.length < 4 ? <button type="button" onClick={() => setPoll({ ...poll, options: [...poll.options, ""] })} className="inline-flex items-center gap-1 text-xs font-bold text-[#0A66C2]"><Plus className="size-3.5" />Add option</button> : <span className="text-[10px] text-slate-400">LinkedIn allows 4 options.</span>}
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700">Poll duration
                <select value={poll.duration} onChange={(event) => setPoll({ ...poll, duration: event.target.value })} className="h-8 rounded-sm border border-slate-200 bg-white px-2 text-xs">{POLL_DURATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>
            </div>
          </section>}

          {format === "event" && <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Share an event</h2>
            <p className="mt-1 text-[11px] text-slate-500">Shares one of this page&apos;s LinkedIn events in the feed. Create events on LinkedIn (company page → Events).</p>
            {events === null ? <Loader2 className="mt-3 size-4 animate-spin text-[#0A66C2]" />
              : events.length === 0 ? <p className="mt-3 text-xs text-slate-500">This page has no LinkedIn events.</p>
              : <div className="mt-3 space-y-2">{events.map((event) => (
                <label key={event.id} className={`flex cursor-pointer items-start gap-2 rounded-sm border p-3 ${eventUrn === `urn:li:event:${event.id}` ? "border-[#0A66C2] bg-[#EAF3FB]" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="linkedin-event" checked={eventUrn === `urn:li:event:${event.id}`} onChange={() => setEventUrn(`urn:li:event:${event.id}`)} className="mt-0.5 accent-[#0A66C2]" />
                  <span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{event.name}</span><span className="block text-[11px] text-slate-500">{event.startsAt ? new Date(event.startsAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date not set"}{event.venue ? ` · ${event.venue}` : ""}</span></span>
                </label>
              ))}</div>}
          </section>}
        </main>

        <aside className="space-y-3">
          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Actions</h2>
            {validationMessage && <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800"><AlertTriangle className="mr-1 inline size-3.5" />{validationMessage}</div>}
            <button onClick={saveDraftOnly} disabled={busy || !plainContent} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} Save Draft
            </button>
            <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={scheduleForLater} onChange={(event) => setScheduleForLater(event.target.checked)} className="size-4 accent-[#0A66C2]" />
              Schedule for later
            </label>
            {scheduleForLater && <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-2 h-9 w-full rounded-sm border border-slate-200 px-2 text-xs font-semibold" />}
            <button onClick={() => void schedulePost(scheduleForLater ? "later" : "now")} disabled={busy || Boolean(validationMessage)} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-[#0A66C2] text-xs font-bold text-white hover:bg-[#084e96] disabled:opacity-50">
              {isScheduling ? <Loader2 className="size-3.5 animate-spin" /> : scheduleForLater ? <CalendarClock className="size-3.5" /> : <Send className="size-3.5" />}
              {scheduleForLater ? "Schedule" : "Queue Publish"}
            </button>
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Truthful status</h2>
            <dl className="mt-3 space-y-2 text-[11px]">
              <Row label="Connection" value={reconnectRequired ? "Reconnect required" : connected ? "Connected" : "Not connected"} />
              <Row label="Page" value={mappedResources.length ? "Mapped" : "Not mapped"} />
              <Row label="Post type" value={FORMATS.find((item) => item.key === format)?.label ?? "Text"} />
              <Row label="Attached" value={format === "media" ? (media.length ? (hasVideo ? "1 video" : `${media.length} picture${media.length === 1 ? "" : "s"}`) : "None") : format === "document" ? (documentAsset ? "1 document" : "None") : "—"} />
              <Row label="Data mode" value="No demo publish simulation" />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-slate-800">{value}</dd></div>;
}

function StatusBox({ title, body, tone }: { title: string; body: string; tone: "amber" | "red" }) {
  const classes = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-sm border p-3 ${classes}`}><p className="text-xs font-bold">{title}</p><p className="mt-1 text-[11px] leading-5">{body}</p></div>;
}

export default function LinkedInCreatePostPage() {
  return (
    <FeatureGate flag="channels.linkedin_publishing">
      <LinkedInCreatePost />
    </FeatureGate>
  );
}
