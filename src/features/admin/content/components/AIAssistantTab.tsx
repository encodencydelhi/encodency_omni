"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  ImageIcon,
  PenLine,
  ArrowRight,
  Upload,
  Download,
  Loader2,
  RefreshCw,
  History,
  Check,
  X,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { useContentAccess } from "../live/use-content-access";
import { aiApi, type GeneratedAiResult } from "../live/ai-api";
import { draftsApi, type DraftRecord } from "../live/drafts-api";
import { mediaApi } from "../live/media-api";
import {
  fetchDynamicAiVisual,
  generatedImageFile,
  type ImageGenerationOptions,
} from "../services/ai-image.service";
import {
  creativeRefinements,
  imageCreativeBrief,
} from "../lib/ai-creative-brief";
import { deliveryCaption } from "../live/composer-delivery";
import {
  CANVAS_GROUPS,
  CANVAS_PRESETS,
  DEFAULT_CANVAS_ID,
  canvasPixels,
  canvasPreset,
} from "../config/canvas-presets";
import type { CreateSeed } from "./CreateContentTab";
import type { MediaAsset } from "../types/content.types";
import { Card } from "./ui-card";
import { cn } from "@/lib/utils/cn";

const input =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const button =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const formats = [
  "Social Post",
  "Ad Copy",
  "Carousel",
  "Reel Script",
  "Story",
  "Blog",
  "Hashtags",
  "Variations",
];
const empty: GeneratedAiResult = {
  caption: "",
  headline: "",
  hashtags: [],
  callToAction: "",
};
type Visual = {
  id: string;
  url: string;
  prompt: string;
  ratio: string;
  asset?: MediaAsset;
};
type CopyVersion = { id: string; result: GeneratedAiResult };

export function AIAssistantTab({
  initialPrompt,
  initialType,
  onUsePost,
}: {
  initialPrompt?: string;
  initialType?: string;
  onUsePost?: (seed: CreateSeed) => void;
} = {}) {
  const { companyId, clientId } = useTenancyContext();
  const { Clients } = useAdminContext();
  const { canWrite } = useContentAccess();
  const client = Clients.find((item) => item.id === clientId);
  const cache = useQueryClient();
  const [mode, setMode] = useState<"copy" | "image">("copy");
  const [brief, setBrief] = useState(initialPrompt ?? "");
  const [format, setFormat] = useState(initialType ?? "Social Post");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Natural and clear");
  const [language, setLanguage] = useState("English");
  const [instructions, setInstructions] = useState("");
  const [includeClient, setIncludeClient] = useState(true);
  const [channels, setChannels] = useState(["Facebook", "Instagram"]);
  const [result, setResult] = useState<GeneratedAiResult>(empty);
  const [copyHistory, setCopyHistory] = useState<CopyVersion[]>([]);
  const [change, setChange] = useState("");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState("");
  const [composition, setComposition] = useState("");
  const [palette, setPalette] = useState("");
  const [imageText, setImageText] = useState("");
  const [avoid, setAvoid] = useState("");
  const [imageChange, setImageChange] = useState("");
  const [canvasId, setCanvasId] = useState(DEFAULT_CANVAS_ID);
  const canvas = canvasPreset(canvasId);
  const [quality, setQuality] =
    useState<NonNullable<ImageGenerationOptions["quality"]>>("medium");
  const [visual, setVisual] = useState<Visual | null>(null);
  const [visualHistory, setVisualHistory] = useState<Visual[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<DraftRecord | null>(null);
  const copyRequest = useRef<AbortController | null>(null),
    imageRequest = useRef<AbortController | null>(null);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const savedAssets = useRef(new Map<string, MediaAsset>());
  const saveLock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      copyRequest.current?.abort();
      imageRequest.current?.abort();
    };
  }, []);
  const usage = useQuery({
    queryKey: ["ai-studio-usage", companyId],
    enabled: Boolean(companyId),
    queryFn: ({ signal }) => aiApi.getUsage(companyId, signal),
  });
  const remaining = usage.data?.limits.remainingAiTokens;
  const busy = copyBusy || imageBusy || saving;
  function refreshLists() {
    for (const key of [
      "content-drafts",
      "content-approvals",
      "content-approval-counts",
      "content-approval-detail",
    ])
      void cache.invalidateQueries({ queryKey: [key, companyId, clientId] });
  }
  async function generateCopy(refinement?: string) {
    if (copyRequest.current || !canWrite || !companyId) return;
    if (!brief.trim() || brief.length > 1000)
      return setCopyError(
        "Add a brief of up to 1,000 characters. Use the extra instructions for more detail.",
      );
    const controller = new AbortController();
    copyRequest.current = controller;
    setCopyBusy(true);
    setCopyError(null);
    try {
      const response = await aiApi.generate(
        companyId,
        {
          promptType: format,
          context: {
            topic: brief.trim(),
            tone,
            targetAudience: audience || undefined,
            language,
            refinements: creativeRefinements(
              {
                clientName: client?.name,
                website: client?.website,
                goal,
                channels,
                instructions,
                includeClient,
              },
              refinement ? result : undefined,
              refinement,
            ),
          },
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setCopyHistory((previous) =>
        [
          { id: crypto.randomUUID(), result: response.generatedContent },
          ...(result.caption ? [{ id: crypto.randomUUID(), result }] : []),
          ...previous,
        ].slice(0, 6),
      );
      setResult(response.generatedContent);
      setChange("");
      void usage.refetch();
      toast.success(refinement ? "Draft refined" : "Draft generated");
    } catch (error) {
      if (!controller.signal.aborted)
        setCopyError(
          error instanceof Error
            ? error.message
            : "Unable to generate a draft. Your previous content was kept.",
        );
    } finally {
      if (copyRequest.current === controller) copyRequest.current = null;
      if (mounted.current) setCopyBusy(false);
    }
  }
  async function generateVisual(variation = false) {
    if (imageRequest.current || !canWrite || !companyId) return;
    let prompt: string;
    try {
      prompt =
        variation && visual
          ? [visual.prompt, `New variation directions: ${imageChange}`].join(
              "\n",
            )
          : imageCreativeBrief(subject, {
              composition,
              palette,
              text: imageText,
              avoid,
            });
      if (prompt.length > 4000)
        throw new Error(
          "Your variation brief exceeds 4,000 characters. Shorten the directions.",
        );
    } catch (error) {
      return setImageError(
        error instanceof Error ? error.message : "Check your visual brief.",
      );
    }
    const controller = new AbortController();
    imageRequest.current = controller;
    setImageBusy(true);
    setImageError(null);
    try {
      const image = await fetchDynamicAiVisual(
        subject,
        style.trim() || "Follow the visual brief",
        0,
        prompt,
        companyId,
        {
          size: canvas.request,
          canvas: { width: canvas.width, height: canvas.height, ratio: canvas.ratio },
          quality,
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      const next: Visual = {
        id: crypto.randomUUID(),
        url: image.url,
        prompt,
        ratio: image.aspectRatio,
      };
      setVisual(next);
      setVisualHistory((previous) => [next, ...previous].slice(0, 4));
      setImageChange("");
      toast.success("Visual generated", {
        description: "Review the image before saving or using it.",
      });
    } catch (error) {
      if (!controller.signal.aborted)
        setImageError(
          error instanceof Error
            ? error.message
            : "Image generation failed. Your previous image was kept.",
        );
    } finally {
      if (imageRequest.current === controller) imageRequest.current = null;
      if (mounted.current) setImageBusy(false);
    }
  }
  async function ensureAsset(): Promise<MediaAsset | null> {
    if (!visual) return null;
    if (!companyId || !clientId)
      throw new Error("Select a client before saving media.");
    const existing = visual.asset ?? savedAssets.current.get(visual.url);
    if (existing) return existing;
    const record = await mediaApi.upload(
      companyId,
      clientId,
      await generatedImageFile(visual.url),
    );
    const asset: MediaAsset = {
      id: record.id,
      url: record.url,
      type: "image",
      name: "AI studio visual",
      width: record.width ?? undefined,
      height: record.height ?? undefined,
    };
    savedAssets.current.set(visual.url, asset);
    return asset;
  }
  async function upload(file: File) {
    if (saveLock.current || !companyId || !clientId || !canWrite) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    )
      return setImageError("Choose a JPEG, PNG or WebP image up to 8 MB.");
    saveLock.current = true;
    setSaving(true);
    setImageError(null);
    try {
      const record = await mediaApi.upload(companyId, clientId, file);
      if (!mounted.current) return;
      const asset: MediaAsset = {
        id: record.id,
        url: record.url,
        type: "image",
        name: file.name,
        width: record.width ?? undefined,
        height: record.height ?? undefined,
      };
      setVisual({
        id: record.id,
        url: record.url,
        prompt: "Uploaded image",
        ratio: "original",
        asset,
      });
      toast.success("Image saved to your client library");
    } catch (error) {
      if (mounted.current)
        setImageError(
          error instanceof Error
            ? error.message
            : "Upload failed. Your previous image was kept.",
        );
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  function payload() {
    const content = deliveryCaption({
      caption: result.caption,
      hashtags: result.hashtags,
      cta: result.callToAction,
      link: "",
    });
    const mapping: Record<string, string> = {
      Facebook: "FACEBOOK_PAGE",
      Instagram: "INSTAGRAM_ACCOUNT",
      LinkedIn: "LINKEDIN_ORGANIZATION",
    };
    return {
      title: result.headline || brief.slice(0, 80) || "AI draft",
      content,
      variants: Object.fromEntries(
        channels.map((channel) => [mapping[channel], { content }]),
      ),
    };
  }
  async function persist(asset: MediaAsset | null) {
    if (!channels.length)
      throw new Error(
        "Select a draft channel, or choose channels in the composer.",
      );
    let record: DraftRecord;
    if (saved) {
      record = await draftsApi.update(companyId, clientId, saved.id, {
        ...payload(),
        expectedRevision: saved.revision,
      });
      if (mounted.current) setSaved(record);
      const ids = asset ? [asset.id] : [];
      if (
        JSON.stringify(record.media.map((item) => item.asset.id)) !==
        JSON.stringify(ids)
      )
        record = await mediaApi.setDraftMedia(
          companyId,
          clientId,
          record.id,
          record.revision,
          ids,
        );
    } else
      record = await draftsApi.create(companyId, clientId, {
        ...payload(),
        ...(asset ? { assetIds: [asset.id] } : {}),
      });
    if (mounted.current) setSaved(record);
    refreshLists();
    return record;
  }
  async function handleSaveAction(action: "composer" | "draft" | "media") {
    if (saveLock.current || !canWrite || !clientId || busy) return;
    if (action === "draft" && !result.caption.trim())
      return toast.error(
        "Generate or write a caption first. An image can be saved to the media library separately.",
      );
    saveLock.current = true;
    setSaving(true);
    try {
      const asset = await ensureAsset();
      if (!mounted.current) return;
      if (action === "media") {
        if (!asset) throw new Error("Generate or upload an image first.");
        toast.success("Visual saved to Media Library");
        return;
      }
      if (action === "draft") {
        await persist(asset);
        if (mounted.current) toast.success("Draft saved to Content Studio!");
        return;
      }
      const record =
        saved && result.caption.trim() ? await persist(asset) : undefined;
      if (!mounted.current) return;
      onUsePost?.({
        caption: result.caption,
        hashtags: record ? [] : result.hashtags,
        cta: result.callToAction,
        media: asset ? [asset] : [],
        ...(record ? { draft: record } : {}),
      });
    } catch (error) {
      if (mounted.current)
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save your content.",
        );
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  async function download() {
    if (!visual) return;
    try {
      const file = visual.url.startsWith("data:")
        ? await generatedImageFile(visual.url)
        : await fetch(visual.url).then((r) => {
            if (!r.ok) throw new Error("Unable to download image");
            return r.blob();
          });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        file instanceof File
          ? file.name
          : `studio-visual.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Unable to download this image.");
    }
  }
  const copyReady = Boolean(result.caption.trim()),
    visualReady = Boolean(visual);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {[
            { id: "copy", label: "Write content", icon: PenLine },
            { id: "image", label: "Create image", icon: ImageIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id as "copy" | "image")}
              className={cn(
                button,
                "border-0",
                mode === item.id && "bg-violet-50 text-violet-700",
              )}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500">
          {client?.name || "Choose a client to save content"} -{" "}
          {usage.isError ? (
            <button onClick={() => void usage.refetch()} className="underline">
              Usage unavailable - refresh
            </button>
          ) : usage.isPending ? (
            "Loading usage..."
          ) : remaining === null ? (
            "No text-token cap reported"
          ) : (
            `${remaining?.toLocaleString()} text tokens left`
          )}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <Card
          title={
            mode === "copy" ? "Your creative brief" : "Describe your visual"
          }
          subtitle={
            mode === "copy"
              ? "Your facts, audience and voice. AI follows your direction."
              : "A specific scene and art direction work better than a preset."
          }
        >
          {mode === "copy" ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                What do you want to say?
                <textarea
                  aria-label="AI prompt"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Describe your announcement, product, story or question. Include the facts the AI should use."
                  className={input}
                />
                <span className="mt-1 block text-right text-[10px] text-slate-400">
                  {brief.length}/1,000
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Output format
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className={input}
                  >
                    {formats.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Goal
                  <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    maxLength={300}
                    placeholder="What should the reader do or feel?"
                    className={input}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Audience
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    maxLength={100}
                    placeholder="Describe your actual audience"
                    className={input}
                  />
                </label>
                <label className="text-xs font-medium">
                  Voice / tone
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    maxLength={100}
                    placeholder="Write your own direction"
                    className={input}
                  />
                </label>
              </div>
              <label className="block text-xs font-medium">
                Language
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  maxLength={50}
                  list="studio-languages"
                  className={input}
                />
                <datalist id="studio-languages">
                  {["English", "Hindi", "Hinglish"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </datalist>
              </label>
              <div className="flex flex-wrap gap-2">
                {["Facebook", "Instagram", "LinkedIn"].map((channel) => (
                  <label
                    key={channel}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={channels.includes(channel)}
                      onChange={() =>
                        setChannels((previous) =>
                          previous.includes(channel)
                            ? previous.filter((item) => item !== channel)
                            : [...previous, channel],
                        )
                      }
                    />
                    {channel}
                  </label>
                ))}
              </div>
              {client && (
                <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-500">
                  <input
                    type="checkbox"
                    checked={includeClient}
                    onChange={(e) => setIncludeClient(e.target.checked)}
                    className="mt-1"
                  />
                  Use {client.name}
                  {client.website ? ` and ${client.website}` : ""} as context.
                  Website content is not fetched.
                </label>
              )}
              <details>
                <summary className="cursor-pointer text-xs font-medium text-slate-600">
                  Extra instructions, facts and things to avoid
                </summary>
                <textarea
                  aria-label="Additional AI instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={4000}
                  rows={3}
                  className={input}
                  placeholder="Must-include details, claims you can support, preferred structure, words to avoid..."
                />
              </details>
              {copyError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
                >
                  {copyError}
                </p>
              )}
              <button
                disabled={copyBusy || saving || !canWrite || !brief.trim()}
                onClick={() => void generateCopy()}
                className={cn(
                  button,
                  "w-full border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
                )}
              >
                {copyBusy ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                Generate content
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                Subject, scene and details
                <textarea
                  aria-label="Image description"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={2800}
                  rows={4}
                  className={input}
                  placeholder="Describe what should be in the image, what is happening and which details matter."
                />
              </label>
              <button
                className="text-[11px] font-semibold text-violet-600 disabled:opacity-40"
                disabled={!brief.trim() && !copyReady}
                onClick={() =>
                  setSubject((brief.trim() || result.caption).slice(0, 2800))
                }
              >
                Use my content brief as a starting point
              </button>
              <label className="block text-xs font-medium">
                Visual style
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  maxLength={100}
                  placeholder="Your style: photography, illustration, collage, abstract..."
                  className={input}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Composition
                  <input
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    maxLength={240}
                    placeholder="Subject placement, framing, space"
                    className={input}
                  />
                </label>
                <label className="text-xs font-medium">
                  Palette / lighting
                  <input
                    value={palette}
                    onChange={(e) => setPalette(e.target.value)}
                    maxLength={240}
                    placeholder="Brand colors and mood"
                    className={input}
                  />
                </label>
              </div>
              <label className="block text-xs font-medium">
                Exact text in image (optional)
                <input
                  value={imageText}
                  onChange={(e) => setImageText(e.target.value)}
                  maxLength={200}
                  placeholder="Leave blank for a text-free image"
                  className={input}
                />
              </label>
              <label className="block text-xs font-medium">
                Avoid
                <input
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                  maxLength={240}
                  placeholder="Unwanted objects, colors or treatments"
                  className={input}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Canvas size
                  <select
                    value={canvasId}
                    onChange={(e) => setCanvasId(e.target.value)}
                    className={input}
                  >
                    {CANVAS_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {CANVAS_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label} - {preset.ratio} ({canvasPixels(preset)})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Quality
                  <select
                    value={quality}
                    onChange={(e) =>
                      setQuality(e.target.value as typeof quality)
                    }
                    className={input}
                  >
                    <option value="low">Draft</option>
                    <option value="medium">Standard</option>
                    <option value="high">High detail</option>
                  </select>
                </label>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">
                One image per request. Quality affects provider cost. The image
                is made at the nearest shape the model allows and then fitted to
                exactly {canvasPixels(canvas)} px for {canvas.usedFor}. Review
                text and media requirements before publishing.
              </p>
              {imageError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
                >
                  {imageError}
                </p>
              )}
              <button
                disabled={imageBusy || saving || !canWrite || !subject.trim()}
                onClick={() => void generateVisual()}
                className={cn(
                  button,
                  "w-full border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
                )}
              >
                {imageBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Generate visual
              </button>
            </div>
          )}
        </Card>
        <div className="min-w-0 space-y-3">
          <Card
            title={mode === "copy" ? "Your working draft" : "Your visual"}
            subtitle={
              mode === "copy"
                ? "Edit freely. Refinements use your current edited text."
                : "Select a result, save it, or create another direction."
            }
            action={
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                {mode === "copy"
                  ? `${result.caption.length.toLocaleString()} characters`
                  : visual
                    ? visual.ratio
                    : "No image selected"}
              </span>
            }
          >
            {mode === "copy" ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium">
                  Post title
                  <input
                    value={result.headline ?? ""}
                    onChange={(e) =>
                      setResult({ ...result, headline: e.target.value })
                    }
                    className={input}
                    placeholder="Optional title or hook"
                  />
                </label>
                <textarea
                  aria-label="Generated caption"
                  value={result.caption}
                  onChange={(e) =>
                    setResult({ ...result, caption: e.target.value })
                  }
                  rows={8}
                  className={input}
                  placeholder="Your draft appears here. You can also write or paste your own copy."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium">
                    Call to action
                    <input
                      value={result.callToAction ?? ""}
                      onChange={(e) =>
                        setResult({ ...result, callToAction: e.target.value })
                      }
                      className={input}
                      placeholder="Optional next step"
                    />
                  </label>
                  <label className="text-xs font-medium">
                    Hashtags
                    <input
                      value={result.hashtags.join(" ")}
                      onChange={(e) =>
                        setResult({
                          ...result,
                          hashtags: e.target.value
                            .split(/[\s,]+/)
                            .filter(Boolean),
                        })
                      }
                      className={input}
                      placeholder="Optional hashtags"
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <label className="block text-xs font-medium text-violet-800">
                    What should change?
                    <textarea
                      aria-label="Refinement instructions"
                      value={change}
                      onChange={(e) => setChange(e.target.value)}
                      maxLength={2000}
                      rows={2}
                      className={input}
                      placeholder="Describe your changes. What should stay, what should be different?"
                    />
                  </label>
                  <button
                    disabled={
                      !copyReady ||
                      !change.trim() ||
                      copyBusy ||
                      saving ||
                      !canWrite
                    }
                    onClick={() => void generateCopy(change)}
                    className={cn(
                      button,
                      "mt-2 border-violet-200 text-violet-700",
                    )}
                  >
                    <RefreshCw size={13} />
                    Refine draft
                  </button>
                </div>
                {copyHistory.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1 text-[11px] text-slate-500">
                      <History size={12} />
                      Session versions - selecting does not generate again
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {copyHistory.map((version, index) => (
                        <button
                          key={version.id}
                          disabled={copyBusy || saving}
                          onClick={() => setResult(version.result)}
                          className={button}
                        >
                          Version {copyHistory.length - index}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!copyReady}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(
                          deliveryCaption({
                            caption: result.caption,
                            hashtags: result.hashtags,
                            cta: result.callToAction,
                            link: "",
                          }),
                        )
                        .then(() => toast.success("Copied"))
                        .catch(() =>
                          toast.error(
                            "Unable to copy. Select the text manually.",
                          ),
                        )
                    }
                  >
                    <Copy size={13} />
                    Copy text
                  </button>
                  <button
                    className={button}
                    disabled={!copyReady || busy || !clientId || !canWrite}
                    onClick={() => void handleSaveAction("draft")}
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Save draft
                  </button>
                  <button
                    className={cn(
                      button,
                      "ml-auto border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
                    )}
                    disabled={
                      (!copyReady && !visualReady) ||
                      busy ||
                      !clientId ||
                      !canWrite ||
                      !onUsePost
                    }
                    onClick={() => void handleSaveAction("composer")}
                  >
                    <ArrowRight size={13} />
                    Open in composer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative grid min-h-56 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  {visual ? (
                    <img
                      src={visual.url}
                      alt={visual.prompt.slice(0, 180)}
                      className="max-h-[420px] w-full object-contain"
                    />
                  ) : (
                    <div className="max-w-xs p-6 text-center">
                      <ImageIcon className="mx-auto size-8 text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Build a visual around your idea
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Describe a scene, choose your art direction, then
                        generate. You can also upload an existing image.
                      </p>
                    </div>
                  )}
                  {imageBusy && (
                    <div
                      role="status"
                      className="absolute inset-0 grid place-items-center bg-white/85 text-sm font-medium text-violet-700"
                    >
                      <span className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Creating one visual?
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={uploadInput}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(file);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy || !clientId || !canWrite}
                    onClick={() => uploadInput.current?.click()}
                  >
                    <Upload size={13} />
                    Upload image
                  </button>
                  <button
                    className={button}
                    disabled={!visual || imageBusy}
                    onClick={() => void download()}
                  >
                    <Download size={13} />
                    Download
                  </button>
                  {visual && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => setVisual(null)}
                    >
                      <X size={13} />
                      Remove
                    </button>
                  )}
                </div>
                {visualHistory.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {visualHistory.map((version, index) => (
                      <button
                        key={version.id}
                        disabled={busy}
                        onClick={() => setVisual(version)}
                        aria-label={`Use visual version ${index + 1}`}
                        className={cn(
                          "overflow-hidden rounded-lg border-2",
                          visual?.id === version.id
                            ? "border-violet-500"
                            : "border-transparent",
                        )}
                      >
                        <img
                          src={version.url}
                          alt={`Visual option ${index + 1}`}
                          className="h-20 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                {visual && (
                  <>
                    <label className="block text-xs font-medium">
                      Describe another direction
                      <input
                        aria-label="Visual variation instructions"
                        value={imageChange}
                        onChange={(e) => setImageChange(e.target.value)}
                        maxLength={1000}
                        className={input}
                        placeholder="For example, change the framing or palette"
                      />
                    </label>
                    <button
                      className={button}
                      disabled={
                        !imageChange.trim() ||
                        busy ||
                        !subject.trim() ||
                        !canWrite
                      }
                      onClick={() => void generateVisual(true)}
                    >
                      <RefreshCw size={13} />
                      Generate variation
                    </button>
                    <p className="text-[10px] leading-4 text-slate-400">
                      A variation is a new image from your text brief. It does
                      not edit the pixels of the selected or uploaded image.
                    </p>
                    <details>
                      <summary className="cursor-pointer text-[11px] text-slate-500">
                        Prompt used for this visual
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                        {visual.prompt}
                      </p>
                    </details>
                  </>
                )}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    className={button}
                    disabled={!visual || busy || !clientId || !canWrite}
                    onClick={() => void handleSaveAction("media")}
                  >
                    Save visual to library
                  </button>
                  <button
                    className={cn(
                      button,
                      "ml-auto border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
                    )}
                    disabled={
                      !visual || busy || !clientId || !canWrite || !onUsePost
                    }
                    onClick={() => void handleSaveAction("composer")}
                  >
                    <ArrowRight size={13} />
                    Use in composer
                  </button>
                </div>
              </div>
            )}
          </Card>
          {mode === "copy" && visual && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <img
                src={visual.url}
                alt="Selected visual"
                className="size-12 rounded-lg object-cover"
              />
              <span className="flex-1 text-xs text-slate-500">
                This visual will travel with your copy into the composer.
              </span>
              <button className={button} onClick={() => setMode("image")}>
                Manage image
              </button>
            </div>
          )}
          <p className="px-1 text-[11px] leading-5 text-slate-400">
            Session versions stay here while you switch tabs. Save a draft or
            visual to keep it after a reload. AI does not publish anything;
            destination and format checks happen in the composer.
          </p>
        </div>
      </div>
    </div>
  );
}
