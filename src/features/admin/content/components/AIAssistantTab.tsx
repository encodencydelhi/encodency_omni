"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Camera, Grid2X2, Video, BookOpen, Zap, Tag, AlignLeft, Loader2, Check, Copy, AlertTriangle, ImageIcon, RefreshCw, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { MOCK_AI_CONTENT, IMG } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { aiApi, type GeneratedAiResult, type AiProvider } from "../live/ai-api";
import { draftsApi } from "../live/drafts-api";
import { mediaApi } from "../live/media-api";
import { toast } from "sonner";
import { ApiError } from "@/types/api";
import type { Platform } from "../types/content.types";
import { PLATFORM_CHAR_LIMITS, PLATFORM_HASHTAG_LIMITS, PLATFORM_META } from "../config/platform-config";
import { fetchDynamicAiVisual, type AiGeneratedVisual, PRESET_STYLE_LABELS } from "../services/ai-image.service";

/** Mirrors `AiContextDto.topic` @MaxLength(1000) — anything longer is a 400 from the API. */
const TOPIC_MAX_CHARS = 1000;

const PROVIDER_LABEL: Record<AiProvider, string> = {
  GEMINI: "Gemini",
  OPENAI: "OpenAI",
  LOCAL: "Encodency AI",
};

const AI_TYPES = [
  { id: "Social Post", desc: "Engaging posts with images", icon: <Sparkles className="size-4" /> },
  { id: "Carousel", desc: "Multi-slide content", icon: <Grid2X2 className="size-4" /> },
  { id: "Reel Script", desc: "Script for short videos", icon: <Video className="size-4" /> },
  { id: "Story", desc: "Quick engaging stories", icon: <Camera className="size-4" /> },
  { id: "Blog", desc: "Long-form content", icon: <BookOpen className="size-4" /> },
  { id: "Ad Copy", desc: "Conversion focused", icon: <Zap className="size-4" /> },
  { id: "Hashtags", desc: "Trending hashtags", icon: <Tag className="size-4" /> },
  { id: "Variations", desc: "Multiple options", icon: <AlignLeft className="size-4" /> },
];

const AUDIENCE_OPTIONS = ["General Public", "Small Business Owners", "Tech Professionals", "Gen Z / Youth", "B2B Decision Makers"];
const TONE_OPTIONS = ["Positive", "Professional", "Casual & Friendly", "Bold & Authoritative", "Urgent / Promotional", "Humorous"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "Spanish", "French", "German"];

const PROMPT_HINTS: Record<string, string> = {
  "Social Post": "Create an Instagram post about Clean Ganga awareness with a motivating, eco-friendly tone.",
  "Carousel": "Create a 5-slide educational carousel on the 5 daily habits for a cleaner environment.",
  "Reel Script": "Write a 30-second viral reel script demonstrating river cleanup efforts and youth participation.",
  "Story": "Create a 3-part interactive Instagram story with a poll asking followers about eco-friendly habits.",
  "Blog": "Write a comprehensive article exploring the history, challenges, and future of river conservation.",
  "Ad Copy": "Write a high-converting conversion ad copy for our weekend community volunteering drive.",
  "Hashtags": "Generate a curated set of trending, high-reach, and niche community hashtags for river conservation.",
  "Variations": "Provide 3 different creative angles for our upcoming riverbank tree plantation campaign.",
};

export function AIAssistantTab({
  initialPrompt,
  initialType,
}: {
  initialPrompt?: string;
  initialType?: string;
} = {}) {
  const { companyId, clientId } = useTenancyContext();
  const [selected, setSelected] = useState(initialType || "Social Post");
  const [prompt, setPrompt] = useState(
    initialPrompt || "Create an Instagram post about Clean Ganga awareness with a motivating, eco-friendly tone."
  );
  const [customInstructions, setCustomInstructions] = useState("");
  const [audience, setAudience] = useState("General Public");
  const [isCustomAudience, setIsCustomAudience] = useState(false);
  const [tone, setTone] = useState("Positive");
  const [isCustomTone, setIsCustomTone] = useState(false);
  const [language, setLanguage] = useState("English");
  const [imageStyleIdx, setImageStyleIdx] = useState(0);

  // initialPrompt / initialType are applied through `key` on the parent, so a
  // fresh prompt remounts this tab instead of syncing state in an effect.

  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [copied, setCopied] = useState(false);

  const [result, setResult] = useState<GeneratedAiResult>({
    caption: MOCK_AI_CONTENT.caption,
    hashtags: MOCK_AI_CONTENT.hashtags,
    headline: "Clean Ganga Awareness Drive",
    callToAction: "Join the movement today!",
  });

  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [usageError, setUsageError] = useState(false);
  const [provider, setProvider] = useState<AiProvider | null>(null);

  /* Per-type prompt drafts: switching Content Type never destroys what was typed. */
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});

  /* Result presentation: raw text (editable) or rendered preview. */
  const [resultView, setResultView] = useState<"edit" | "preview">("edit");

  /* Preview platform drives every limit shown next to the result. */
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("instagram");

  /* Image: pure AI visual generated via OpenAI, user upload, or deliberately removed. */
  const [customImage, setCustomImage] = useState<{ url: string; assetId?: string; local?: boolean } | null>(null);
  const [aiVisual, setAiVisual] = useState<AiGeneratedVisual | null>(null);
  const [visualVariation, setVisualVariation] = useState(0);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* One in-flight generation at a time; unmount aborts it. */
  const abortRef = useRef<AbortController | null>(null);
  const usageAbortRef = useRef<AbortController | null>(null);

  const refreshUsage = useCallback(() => {
    usageAbortRef.current?.abort();
    const controller = new AbortController();
    usageAbortRef.current = controller;
    if (!companyId) return;

    aiApi
      .getUsage(companyId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setRemainingTokens(data.limits.remainingAiTokens ?? 10000);
        setQuotaLimit(data.limits.maxAiTokens ?? 10000);
        setUsageLoaded(true);
        setUsageError(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setQuotaLimit(10000);
        setRemainingTokens(10000);
        setUsageLoaded(true);
        setUsageError(false);
      });
  }, [companyId]);

  // Load existing AI token usage summary
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // A generation that is still in flight when the tab unmounts must not setState.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      usageAbortRef.current?.abort();
    },
    [],
  );

  /* ── Derived limits (shown live next to every field) ── */
  const promptLength = prompt.length;
  const promptOverLimit = promptLength > TOPIC_MAX_CHARS;
  const captionLength = result.caption.length;
  const captionLimit = PLATFORM_CHAR_LIMITS[previewPlatform] ?? null;
  const captionOverLimit = captionLimit !== null && captionLength > captionLimit;
  const captionNearLimit = captionLimit !== null && !captionOverLimit && captionLength > captionLimit * 0.8;
  const hashtagCount = result.hashtags.length;
  const hashtagLimit = PLATFORM_HASHTAG_LIMITS[previewPlatform] ?? null;
  const hashtagsOverLimit = hashtagLimit !== null && hashtagCount > hashtagLimit;
  const effectiveLimit = quotaLimit ?? 10000;
  const effectiveRemaining = remainingTokens ?? 10000;
  const usedTokens = Math.max(0, effectiveLimit - effectiveRemaining);
  const quotaPercent = Math.min(100, Math.round((usedTokens / effectiveLimit) * 100));
  const quotaLow = effectiveRemaining <= effectiveLimit * 0.1;

  const selectedImage: string | null = imageRemoved
    ? null
    : (customImage?.url ?? aiVisual?.url ?? null);

  /* ── Content Type switch: keep each type's own prompt, fall back to its hint ── */
  const handleTypeSelect = (typeId: string) => {
    if (typeId === selected) return;
    setPromptDrafts((prev) => ({ ...prev, [selected]: prompt }));
    setSelected(typeId);
    const saved = promptDrafts[typeId];
    setPrompt(saved && saved.trim() ? saved : (PROMPT_HINTS[typeId] ?? ""));
    setResultView("edit");
  };

  /* ── Image: pick a style, generate with AI, upload your own, or remove it entirely ── */
  const handlePickPreset = (index: number) => {
    setImageStyleIdx(index);
    setCustomImage(null);
    setImageRemoved(false);
    const style = PRESET_STYLE_LABELS[index] || "Realistic";
    const currentTopic = imagePrompt.trim() || prompt;
    if (!currentTopic) return;
    setIsGeneratingImage(true);
    fetchDynamicAiVisual(currentTopic, style, visualVariation, imagePrompt, companyId)
      .then((resolved) => {
        if (resolved) {
          setAiVisual(resolved);
          toast.success(`✨ Generated AI image in ${style} style!`);
        }
      })
      .catch((err) => {
        toast.error(`Image generation failed: ${err.message || "Unknown error"}`);
      })
      .finally(() => {
        setIsGeneratingImage(false);
      });
  };

  const handleGenerateAiImage = async (nextStyleIdx?: number, explicitPrompt?: string) => {
    const targetIdx = typeof nextStyleIdx === "number" ? nextStyleIdx : imageStyleIdx;
    const nextVar = visualVariation + 1;
    setVisualVariation(nextVar);
    const targetPrompt = typeof explicitPrompt === "string" ? explicitPrompt : imagePrompt;
    const style = PRESET_STYLE_LABELS[targetIdx] || "Realistic";
    const currentTopic = targetPrompt.trim() || prompt;

    if (!currentTopic) {
      toast.error("Please enter a topic or image description to generate an AI image.");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const visual = await fetchDynamicAiVisual(currentTopic, style, nextVar, targetPrompt, companyId);
      if (visual) {
        setAiVisual(visual);
        setCustomImage(null);
        setImageRemoved(false);
        const queryLabel = targetPrompt.trim() || prompt.slice(0, 30);
        toast.success(`✨ AI visual generated for "${queryLabel.slice(0, 35)}..." in ${style} style!`);
      } else {
        toast.error("Could not generate image. Please verify your OPENAI_API_KEY.");
      }
    } catch (err: any) {
      toast.error(`Image generation failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setCustomImage(null);
    setImageRemoved(true);
  };

  const handleAddImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (companyId && clientId) {
      setIsUploadingImage(true);
      try {
        const record = await mediaApi.upload(companyId, clientId, file);
        setCustomImage({ url: record.url, assetId: record.id });
        setImageRemoved(false);
        toast.success("Image added!", { description: "Saved to your client media library." });
        return;
      } catch (err) {
        toast.error(ApiError.isApiError(err) ? err.message : "Upload failed — showing a local preview instead.");
      } finally {
        setIsUploadingImage(false);
      }
    }
    // No client selected: preview locally so the flow is never blocked.
    setCustomImage({ url: URL.createObjectURL(file), local: true });
    setImageRemoved(false);
    toast.info("Using a local preview.", { description: "Select a Client to save the image to your library." });
  };

  const handleGenerate = async (refinements: string[] = []) => {
    if (!prompt.trim()) {
      toast.error("Please enter a topic or prompt first.");
      return;
    }

    if (promptOverLimit) {
      toast.error(`Prompt is too long (${promptLength.toLocaleString()} characters).`, {
        description: `The backend accepts a maximum of ${TOPIC_MAX_CHARS.toLocaleString()} characters.`,
      });
      return;
    }

    if (!companyId) {
      toast.error("Company context required to generate AI content.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);

    const combinedRefinements = [...refinements];
    if (customInstructions.trim()) {
      combinedRefinements.push(`Specific instructions: ${customInstructions.trim()}`);
    }

    try {
      const response = await aiApi.generate(
        companyId,
        {
          promptType: selected,
          context: {
            topic: prompt,
            tone,
            targetAudience: audience,
            language,
            imageStyle: PRESET_STYLE_LABELS[imageStyleIdx],
            refinements: combinedRefinements,
          },
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;

      setResult(response.generatedContent);
      setGenerated(true);

      // Synthesize matching AI visual strictly with OpenAI if user hasn't uploaded or removed image
      if (!customImage && !imageRemoved) {
        const style = PRESET_STYLE_LABELS[imageStyleIdx] || "Realistic";
        const nextVar = visualVariation + 1;
        setVisualVariation(nextVar);
        const currentTopic = imagePrompt.trim() || prompt;
        if (currentTopic) {
          setIsGeneratingImage(true);
          fetchDynamicAiVisual(currentTopic, style, nextVar, imagePrompt, companyId)
            .then((resolved) => {
              if (resolved) setAiVisual(resolved);
            })
            .catch((err) => {
              console.error("AI image generation error:", err);
            })
            .finally(() => {
              setIsGeneratingImage(false);
            });
        }
      }

      setTokensUsed(response.tokensConsumed);
      setRemainingTokens(response.usage.remainingAiTokens);
      setQuotaLimit(response.usage.maxAiTokens);
      setUsageLoaded(true);
      setUsageError(false);
      setProvider(response.provider ?? null);
      setResultView("edit");

      const label = response.provider ? PROVIDER_LABEL[response.provider] : "AI";
      toast.success("AI content generated successfully!", {
        description: `${response.tokensConsumed} tokens consumed with ${label}` + (response.usage.remainingAiTokens !== null ? ` • ${response.usage.remainingAiTokens.toLocaleString()} tokens left` : ""),
      });
    } catch (err: unknown) {
      if (ApiError.isApiError(err) && err.status === 402) {
        // Sync the quota pill with the numbers the API returned instead of guessing.
        const limit = err.detail<number>("limit");
        const current = err.detail<number>("current");
        if (typeof limit === "number") {
          setQuotaLimit(limit);
          setRemainingTokens(typeof current === "number" ? Math.max(0, limit - current) : 0);
          setUsageLoaded(true);
        }
        toast.error("Monthly AI Token quota exhausted!", {
          description: "Please upgrade your subscription plan in Billing to get more AI tokens.",
          duration: 7000,
        });
      } else if (ApiError.isApiError(err) && err.status === 0) {
        toast.error("Unable to reach the platform API.", { description: "Check your connection and try again." });
      } else {
        toast.error(ApiError.isApiError(err) ? err.message : "Failed to generate AI content. Please try again.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!companyId || !clientId) {
      toast.info("Draft saved locally!", { description: "Select a Client to persist drafts to the cloud." });
      return;
    }

    setIsSavingDraft(true);
    try {
      const fullText = result.caption + (result.hashtags.length > 0 ? `\n\n${result.hashtags.join(" ")}` : "");
      await draftsApi.create(companyId, clientId, {
        title: result.headline || `${selected} - ${prompt.slice(0, 30)}`,
        content: fullText,
        variants: {
          INSTAGRAM_ACCOUNT: { content: fullText },
          FACEBOOK_PAGE: { content: fullText },
        },
        // Attach the uploaded image so the draft keeps its media.
        ...(customImage?.assetId ? { assetIds: [customImage.assetId] } : {}),
      });
      toast.success("Draft saved to Content Studio!", { description: "Your customized copy was saved to Saved Drafts." });
    } catch (err: unknown) {
      toast.error(ApiError.isApiError(err) ? err.message : "Could not save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUsePost = () => {
    const fullText = (result.headline ? `${result.headline}\n\n` : "") + result.caption + (result.hashtags.length > 0 ? `\n\n${result.hashtags.join(" ")}` : "");
    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        setCopied(true);
        toast.success("Post copied to clipboard!", { description: "Your edited copy is ready to paste into any editor." });
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        toast.error("Could not access the clipboard.", { description: "Your browser blocked clipboard access — copy from the editor instead." });
      });
  };

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      {/* 1. What would you like to create? */}
      <Card
        title="What would you like to create?"
        action={
          usageLoaded && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10.5px] font-semibold text-[#7C3AED]">
              {quotaLimit === null ? "Unlimited AI tokens" : `${(remainingTokens ?? 0).toLocaleString()} tokens left`}
            </span>
          )
        }
      >
        <div className="grid grid-cols-4 gap-1.5">
          {AI_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTypeSelect(t.id)}
              className={cn(
                "rounded-sm border p-2 text-left transition",
                selected === t.id ? "border-purple-300 bg-purple-50 shadow-sm" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
              )}
            >
              <span className={cn("mb-1 grid size-7 place-items-center rounded-sm", selected === t.id ? "bg-[#7C3AED] text-white" : "bg-[#F1F5F9] text-[#64748B]")}>
                {t.icon}
              </span>
              <span className="block text-[10.5px] font-semibold text-[#24365A]">{t.id}</span>
              <span className="block text-[9.5px] text-[#7A87A0]">{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Prompt — each Content Type loads its own prompt (custom text is kept per type) */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11.5px] font-semibold text-[#33445F]">Topic / prompt *</label>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                promptOverLimit ? "font-semibold text-red-500" : promptLength > TOPIC_MAX_CHARS * 0.8 ? "text-amber-500" : "text-slate-400",
              )}
            >
              {promptLength.toLocaleString()} / {TOPIC_MAX_CHARS.toLocaleString()} characters
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            spellCheck
            placeholder={PROMPT_HINTS[selected] || "What should the post be about?"}
            className={cn(
              "w-full resize-none rounded-sm border p-2.5 text-[12px] leading-5 outline-none focus:border-[#7C3AED]",
              promptOverLimit ? "border-red-300 bg-red-50/40" : "border-[#D9E1EC]",
            )}
          />
        </div>

        {/* Custom instructions / What to include */}
        <div className="mt-2.5">
          <label className="mb-1 block text-[11.5px] font-semibold text-[#33445F]">
            Custom instructions / Specific details to include (optional)
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Include 20% discount offer, mention Saturday 10 AM event, keep it punchy"
            className="w-full rounded-sm border border-[#D9E1EC] px-2.5 py-1.5 text-[12px] outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Audience, Tone, Language with Custom inputs */}
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <div>
            <SelectField
              label="Audience"
              value={isCustomAudience ? "Custom..." : audience}
              options={[...AUDIENCE_OPTIONS, "Custom..."]}
              onChange={(val) => {
                if (val === "Custom...") {
                  setIsCustomAudience(true);
                } else {
                  setIsCustomAudience(false);
                  setAudience(val);
                }
              }}
            />
            {isCustomAudience && (
              <input
                type="text"
                placeholder="Type custom audience..."
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-1 w-full rounded-sm border border-purple-300 px-2 py-1 text-[11px] outline-none focus:border-[#7C3AED]"
              />
            )}
          </div>

          <div>
            <SelectField
              label="Tone"
              value={isCustomTone ? "Custom..." : tone}
              options={[...TONE_OPTIONS, "Custom..."]}
              onChange={(val) => {
                if (val === "Custom...") {
                  setIsCustomTone(true);
                } else {
                  setIsCustomTone(false);
                  setTone(val);
                }
              }}
            />
            {isCustomTone && (
              <input
                type="text"
                placeholder="Type custom tone..."
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full rounded-sm border border-purple-300 px-2 py-1 text-[11px] outline-none focus:border-[#7C3AED]"
              />
            )}
          </div>

          <SelectField label="Language" value={language} options={LANGUAGE_OPTIONS} onChange={setLanguage} />
        </div>

        {/* Image style */}
        <div className="mb-2 mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-[#172044]">Image</p>
            {aiVisual && !customImage && !imageRemoved && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
                <Sparkles className="size-2.5" /> AI Visual
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAddImage(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="flex items-center gap-1 whitespace-nowrap rounded-sm border border-[#D7E0EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#33445F] transition hover:bg-[#F8FAFD] disabled:opacity-50"
            >
              {isUploadingImage ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
              <span>{isUploadingImage ? "Uploading…" : "Add image"}</span>
            </button>
            {selectedImage !== null && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="whitespace-nowrap rounded-sm border border-red-200 bg-red-50/60 px-2 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Dynamic style visual cards with clean aesthetic tags */}
        <div className="grid grid-cols-3 gap-1.5">
          {PRESET_STYLE_LABELS.map((styleName, i) => {
            const isSelected = !customImage && !imageRemoved && imageStyleIdx === i;
            const gradients = [
              "from-emerald-400 to-teal-500",
              "from-blue-400 to-indigo-500",
              "from-amber-400 to-orange-500",
              "from-purple-400 to-pink-500",
              "from-rose-400 to-red-500",
              "from-slate-400 to-gray-600",
            ];
            const bg = gradients[i % gradients.length];
            return (
              <button
                key={i}
                type="button"
                onClick={() => handlePickPreset(i)}
                className={cn(
                  "overflow-hidden rounded-sm border p-2 text-left transition group",
                  isSelected
                    ? "border-[#7C3AED] ring-2 ring-purple-100 bg-purple-50/40"
                    : "border-[#E2E8F0] hover:border-purple-200 bg-white",
                )}
              >
                <div className={cn("h-6 w-full rounded-xs bg-gradient-to-r mb-1.5 opacity-80 group-hover:opacity-100 transition", bg)} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#1E293B] truncate">{styleName}</span>
                  {isSelected && (
                    <span className="rounded bg-[#7C3AED] p-0.5 text-white shadow-xs">
                      <Check className="size-2.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dedicated Custom Image Prompt */}
        <div className="mt-2.5 rounded-sm border border-purple-200/90 bg-purple-50/40 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#33445F]">
              <Wand2 className="size-3 text-[#7C3AED]" /> Custom Image Prompt
            </label>
            {imagePrompt.trim() && (
              <button
                type="button"
                onClick={() => {
                  setImagePrompt("");
                  handleGenerateAiImage(undefined, "");
                }}
                className="text-[10px] text-slate-400 hover:text-red-500"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerateAiImage(undefined, imagePrompt);
                }
              }}
              placeholder="e.g. River clean Ganga awareness drive at sunrise, volunteers, vibrant 4K..."
              className="flex-1 rounded-sm border border-[#D7E0EB] bg-white px-2.5 py-1.5 text-[11px] text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[#7C3AED] focus:ring-1 focus:ring-purple-200"
            />
            <button
              type="button"
              onClick={() => handleGenerateAiImage(undefined, imagePrompt)}
              disabled={isGeneratingImage}
              className="flex shrink-0 whitespace-nowrap items-center gap-1 rounded-sm bg-[#7C3AED] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#6D28D9] disabled:opacity-50"
            >
              {isGeneratingImage ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              <span>{isGeneratingImage ? "Generating…" : "Generate Visual"}</span>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="text-[9.5px] font-medium text-slate-400">Quick ideas:</span>
            {[
              "River cleanup campaign",
              "Community volunteers at work",
              "20% discount offer banner",
              "Inspiring nature & river",
              "Eco-friendly awareness poster",
            ].map((suggest) => (
              <button
                key={suggest}
                type="button"
                onClick={() => {
                  setImagePrompt(suggest);
                  handleGenerateAiImage(undefined, suggest);
                }}
                className="whitespace-nowrap rounded-full border border-purple-200/80 bg-white px-2 py-0.5 text-[9.5px] font-medium text-[#7C3AED] transition hover:bg-purple-100"
              >
                + {suggest}
              </button>
            ))}
          </div>
        </div>

        {aiVisual && !customImage && !imageRemoved && (
          <div className="mt-2 flex items-center justify-between rounded border border-purple-100 bg-purple-50/50 p-1.5 px-2 text-[10px] text-[#7C3AED]">
            <span className="truncate font-medium flex items-center gap-1">
              <Sparkles className="size-3 shrink-0" /> {aiVisual.prompt}
            </span>
            <button
              type="button"
              onClick={() => handleGenerateAiImage()}
              className="ml-2 shrink-0 font-semibold underline hover:text-purple-900"
            >
              Regenerate
            </button>
          </div>
        )}

        {customImage && (
          <p className="mt-1 text-[10px] text-[#7C3AED]">
            Custom image in use {customImage.local ? "(local preview)" : "(from your media library)"} — picking an AI style above replaces it.
          </p>
        )}
        {imageRemoved && <p className="mt-1 text-[10px] text-slate-400">No image selected — this post will be text-only.</p>}

        {/* Generate button */}
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating || promptOverLimit}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-sm bg-[#7C3AED] text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#6D28D9] disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating{provider ? ` with ${PROVIDER_LABEL[provider]}` : ""}…
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate content
            </>
          )}
        </button>
        {promptOverLimit && (
          <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-red-500">
            <AlertTriangle className="size-3" /> Prompt exceeds the {TOPIC_MAX_CHARS.toLocaleString()}-character limit.
          </p>
        )}
      </Card>

      {/* 2. AI Result — switch between editing every field and a rendered preview */}
      <Card
        title="AI result"
        subtitle={
          <>
            {usageError && remainingTokens === null && quotaLimit === null ? (
              <span className="text-[#DC2626]">
                Usage unavailable{" "}
                <button onClick={refreshUsage} className="font-semibold underline">
                  retry
                </button>
              </span>
            ) : usageLoaded ? (
              <>
                {quotaLimit === null ? (
                  <span className="font-semibold text-[#7C3AED]">Unlimited AI tokens</span>
                ) : (
                  <>
                    <span className="font-semibold text-[#7C3AED]">
                      {(remainingTokens ?? 0).toLocaleString()} left
                    </span>
                    <span> of {quotaLimit.toLocaleString()}</span>
                  </>
                )}
                <span> • </span>
                {tokensUsed !== null ? (
                  <>
                    <span className="font-semibold text-[#7C3AED]">{tokensUsed.toLocaleString()} tokens consumed</span>
                    <span> this run • </span>
                  </>
                ) : usedTokens !== null ? (
                  <span>{usedTokens.toLocaleString()} used this cycle • </span>
                ) : null}
                <span>{provider ? `${PROVIDER_LABEL[provider]} AI` : "AI generated"}</span>
              </>
            ) : (
              "Review, edit and approve every field"
            )}
          </>
        }
        action={
          <div className="flex shrink-0 items-center gap-2">
            {usageLoaded && (
              <span
                className={cn(
                  "whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                  quotaLow ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-[#7C3AED]",
                )}
                title="AI tokens remaining this billing cycle"
              >
                {usageError && quotaLimit === null
                  ? "Usage —"
                  : quotaLimit === null
                    ? "Unlimited"
                    : `${(remainingTokens ?? 0).toLocaleString()} left`}
              </span>
            )}
            <div className="flex overflow-hidden rounded-sm border border-[#D7E0EB]">
              <button
                onClick={() => setResultView("edit")}
                className={cn("px-2 py-1 text-[10.5px] font-semibold transition", resultView === "edit" ? "bg-[#1769DF] text-white" : "text-[#687797] hover:bg-[#F8FAFD]")}
              >
                Edit
              </button>
              <button
                onClick={() => setResultView("preview")}
                className={cn("px-2 py-1 text-[10.5px] font-semibold transition", resultView === "preview" ? "bg-[#1769DF] text-white" : "text-[#687797] hover:bg-[#F8FAFD]")}
              >
                Preview
              </button>
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="text-[11px] font-semibold text-[#1769DF] hover:underline disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        }
      >
        {generated ? (
          resultView === "preview" ? (
            <div className="space-y-2.5">
              <div className="max-h-[460px] overflow-auto rounded-sm border border-[#E2E8F0] bg-[#F8FAFD] p-3 text-[12px] leading-relaxed text-[#33445F] [&_blockquote]:mt-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#7C3AED] [&_blockquote]:pl-2 [&_blockquote]:italic [&_h3]:mb-1.5 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:text-[#172044] [&_h4]:mb-1.5 [&_h4]:text-[12.5px] [&_h4]:font-semibold [&_h4]:text-[#172044] [&_li]:mb-0.5 [&_ol]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1">
                {selectedImage && (
                  <div className="mb-2.5 overflow-hidden rounded-sm border border-slate-200">
                    <img src={selectedImage} alt="" className="h-44 w-full object-cover" />
                  </div>
                )}
                <h3>{result.headline || "Untitled"}</h3>
                <div dangerouslySetInnerHTML={{ __html: renderRichText(result.caption) }} />
                {result.callToAction && (
                  <p className="mt-2 rounded-sm bg-purple-50 px-2 py-1.5 text-[11.5px] font-semibold text-[#7C3AED]">
                    {result.callToAction}
                  </p>
                )}
                {result.hashtags.length > 0 && (
                  <p className="mt-1.5 text-[11.5px] font-medium text-[#1769DF]">{result.hashtags.join(" ")}</p>
                )}
              </div>
              <p className="text-center text-[10.5px] text-slate-400">
                Read-only preview — switch to <span className="font-semibold text-[#1769DF]">Edit</span> to change any field.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Editable Headline */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#33445F]">Headline / Title</label>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#7C3AED]">
                    {selected}
                  </span>
                </div>
                <input
                  type="text"
                  value={result.headline || ""}
                  onChange={(e) => setResult({ ...result, headline: e.target.value })}
                  placeholder="Title or hook"
                  className="w-full rounded-sm border border-[#D9E1EC] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#1E293B] outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Editable Content Body / Slides / Script */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#33445F]">
                    {selected === "Carousel"
                      ? "Carousel Slides (editable)"
                      : selected === "Reel Script"
                        ? "Reel Script & Audio Cues (editable)"
                        : selected === "Blog"
                          ? "Blog Article Copy (editable)"
                          : selected === "Variations"
                            ? "Content Variations A/B/C (editable)"
                            : "Main Content / Caption (editable)"}
                  </label>
                  <span className="text-[10px] text-slate-400">✏️ Editable</span>
                </div>
                <textarea
                  value={result.caption}
                  onChange={(e) => setResult({ ...result, caption: e.target.value })}
                  rows={selected === "Carousel" || selected === "Reel Script" || selected === "Blog" || selected === "Variations" ? 11 : 6}
                  spellCheck
                  className={cn(
                    "w-full resize-y rounded-sm border p-2.5 text-[12px] leading-relaxed text-[#33445F] outline-none focus:border-[#7C3AED]",
                    captionOverLimit ? "border-red-300 bg-red-50/40" : "border-[#D9E1EC]",
                  )}
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">
                    {captionLimit !== null ? `Platform limit for ${previewPlatform}: ${captionLimit.toLocaleString()} characters` : `No character limit for ${previewPlatform}`}
                  </span>
                  <span className={cn("tabular-nums", captionOverLimit ? "font-semibold text-red-500" : captionNearLimit ? "text-amber-500" : "text-slate-400")}>
                    {captionLength.toLocaleString()}
                    {captionLimit !== null ? ` / ${captionLimit.toLocaleString()}` : ""}
                  </span>
                </div>
              </div>

              {/* Editable Call To Action */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#33445F]">Call To Action (CTA)</label>
                <input
                  type="text"
                  value={result.callToAction || ""}
                  onChange={(e) => setResult({ ...result, callToAction: e.target.value })}
                  placeholder="e.g. Save this post, Comment START, Link in bio"
                  className="w-full rounded-sm border border-[#D9E1EC] px-2.5 py-1.5 text-[11.5px] text-[#33445F] outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Editable Hashtags */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#33445F]">Hashtags (space separated)</label>
                  <span className={cn("text-[10px] tabular-nums", hashtagsOverLimit ? "font-semibold text-red-500" : "text-slate-400")}>
                    {hashtagCount} used{hashtagLimit !== null ? ` / ${hashtagLimit} allowed` : ""}
                  </span>
                </div>
                <input
                  type="text"
                  value={result.hashtags.join(" ")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const tags = raw.split(/\s+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
                    setResult({ ...result, hashtags: tags });
                  }}
                  placeholder="#tag1 #tag2 #tag3"
                  className={cn(
                    "w-full rounded-sm border px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1769DF] outline-none focus:border-[#7C3AED]",
                    hashtagsOverLimit ? "border-red-300 bg-red-50/40" : "border-[#D9E1EC]",
                  )}
                />
                {hashtagsOverLimit && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-500">
                    <AlertTriangle className="size-3" /> {previewPlatform} allows at most {hashtagLimit} hashtags.
                  </p>
                )}
              </div>

              {/* Image — fully removable & replaceable */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#33445F]">Image</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="rounded-sm border border-[#D7E0EB] px-2 py-0.5 text-[10.5px] font-semibold text-[#33445F] transition hover:bg-[#F8FAFD] disabled:opacity-50"
                    >
                      {isUploadingImage ? "Uploading…" : selectedImage ? "Replace" : "Add image"}
                    </button>
                    {selectedImage && (
                      <button
                        onClick={handleRemoveImage}
                        className="rounded-sm border border-[#D7E0EB] px-2 py-0.5 text-[10.5px] font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {selectedImage ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-slate-100 group">
                    <img src={selectedImage} alt="" className="h-full w-full object-cover" />
                    {aiVisual && !customImage && !imageRemoved && (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/65 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur-sm shadow-sm">
                        <Sparkles className="size-2.5 text-purple-300" /> AI Visual ({aiVisual.style})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGenerateAiImage()}
                      disabled={isGeneratingImage}
                      title="Regenerate with a different AI visual"
                      className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-black/85 transition shadow-sm"
                    >
                      <RefreshCw className={cn("size-2.5", isGeneratingImage && "animate-spin")} />
                      Regenerate Visual
                    </button>
                  </div>
                ) : (
                  <div className="grid aspect-video w-full place-items-center rounded-sm border border-dashed border-[#CBD5E1] bg-[#F8FAFD] p-4 text-center">
                    <div>
                      <ImageIcon className="mx-auto size-6 text-[#CBD5E1]" />
                      <p className="mt-1.5 text-[11.5px] font-semibold text-[#64748B]">No image selected</p>
                      <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">Click 'Generate AI image' or upload a file.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex h-8.5 flex-1 items-center justify-center gap-1 rounded-sm border border-[#D7E0EB] bg-white text-[11.5px] font-semibold text-[#687797] hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {isSavingDraft ? <Loader2 className="size-3 animate-spin" /> : null} Save draft
                </button>
                <button
                  onClick={handleUsePost}
                  className="flex h-8.5 flex-1 items-center justify-center gap-1 rounded-sm bg-[#1769DF] text-[11.5px] font-semibold text-white hover:bg-blue-600 transition"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied!" : "Use this post"}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="grid min-h-[220px] place-items-center rounded-sm border border-dashed border-[#CBD5E1] bg-[#F8FAFD] p-6 text-center">
            <Sparkles className="size-7 text-[#CBD5E1]" />
            <p className="mt-2 text-[12px] font-semibold text-[#64748B]">Your AI result will appear here</p>
            <p className="mt-0.5 text-[11px] text-[#94A3B8]">Add a prompt, customize fields, and generate content</p>
          </div>
        )}
      </Card>

      {/* 3. Live Preview & Quick Refinements */}
      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel
          platform={previewPlatform}
          setPlatform={setPreviewPlatform}
          channels={["instagram", "facebook"]}
          caption={result.caption}
          hashtags={result.hashtags}
          image={selectedImage}
          isLoadingImage={isGeneratingImage}
        />

        {/* Platform limits for the selected preview channel */}
        <Card title="Platform limits" subtitle={PLATFORM_META[previewPlatform]?.label ?? previewPlatform}>
          <ul className="space-y-1.5 text-[11px] text-[#687797]">
            <li className="flex items-center justify-between gap-2">
              <span>Caption characters</span>
              <span className={cn("font-semibold tabular-nums", captionOverLimit ? "text-red-500" : "text-[#33445F]")}>
                {captionLength}
                {captionLimit !== null ? ` / ${captionLimit}` : ""}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Hashtags</span>
              <span className={cn("font-semibold tabular-nums", hashtagsOverLimit ? "text-red-500" : "text-[#33445F]")}>
                {hashtagCount}
                {hashtagLimit !== null ? ` / ${hashtagLimit}` : ""}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Prompt characters</span>
              <span className={cn("font-semibold tabular-nums", promptOverLimit ? "text-red-500" : "text-[#33445F]")}>
                {promptLength} / {TOPIC_MAX_CHARS.toLocaleString()}
              </span>
            </li>
          </ul>
        </Card>

        {/* AI token budget from the Usage API */}
        <Card title="Usage & limits" subtitle={quotaPercent !== null ? `${quotaPercent}% of monthly AI tokens used` : "Monthly AI token budget"}>
          {quotaPercent !== null ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF1F5]">
              <div
                className={cn("h-full rounded-full transition-all", quotaLow ? "bg-amber-400" : "bg-[#7C3AED]")}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          ) : (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF1F5]">
              <div className="h-full w-0 rounded-full bg-[#7C3AED]" />
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#687797]">
              {effectiveRemaining.toLocaleString()} tokens left
            </span>
            <span className="text-slate-400">of {effectiveLimit.toLocaleString()}/mo</span>
          </div>
          {usedTokens > 0 && (
            <p className="mt-1 text-[10.5px] text-slate-400">{usedTokens.toLocaleString()} used this cycle</p>
          )}
          {quotaLow && (
            <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-amber-600">
              <AlertTriangle className="size-3" /> Running low — consider upgrading your plan in Billing.
            </p>
          )}
        </Card>

        <Card title="Quick refinements">
          <div className="grid grid-cols-2 gap-1">
            {["Make shorter", "Add CTA", "Change tone", "More hashtags", "Hindi version", "Add emojis"].map((x) => (
              <button
                key={x}
                onClick={() => handleGenerate([x])}
                disabled={isGenerating}
                className="rounded-sm border border-[#E2E8F0] px-2 py-1.5 text-left text-[11px] font-semibold text-[#687797] hover:border-purple-200 hover:bg-purple-50/50 disabled:opacity-50 transition"
              >
                ✨ {x}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Tiny escape-first markdown renderer for the read-only Preview view.
 * Everything is HTML-escaped first; only our own tags are injected, so
 * model output can never smuggle in markup or scripts.
 */
function renderRichText(src: string): string {
  const escaped = src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const inline = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(6, (heading[1]?.length ?? 1) + 2);
      out.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      out.push("<hr/>");
      continue;
    }

    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${inline(quote[1] ?? "")}</blockquote>`);
      continue;
    }

    const ul = line.match(/^[-*•]\s+(.*)$/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(ul[1] ?? "")}</li>`);
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(ol[1] ?? "")}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return out.join("");
}