"use client";

import { useEffect, useState } from "react";
import { Sparkles, Camera, Grid2X2, Video, BookOpen, Zap, Tag, AlignLeft, Loader2, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { MOCK_AI_CONTENT, IMG } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { aiApi, type GeneratedAiResult } from "../live/ai-api";
import { draftsApi } from "../live/drafts-api";
import { toast } from "sonner";
import { ApiError } from "@/types/api";

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

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (initialType) setSelected(initialType);
  }, [initialType]);

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

  // Load existing AI token usage summary
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    aiApi.getUsage(companyId)
      .then((data) => {
        if (cancelled) return;
        setRemainingTokens(data.limits.remainingAiTokens);
        setQuotaLimit(data.limits.maxAiTokens);
      })
      .catch(() => {
        // Quiet fallback if usage cannot be loaded
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleGenerate = async (refinements: string[] = []) => {
    if (!prompt.trim()) {
      toast.error("Please enter a topic or prompt first.");
      return;
    }

    if (!companyId) {
      toast.error("Company context required to generate AI content.");
      return;
    }

    setIsGenerating(true);

    const combinedRefinements = [...refinements];
    if (customInstructions.trim()) {
      combinedRefinements.push(`Specific instructions: ${customInstructions.trim()}`);
    }

    try {
      const response = await aiApi.generate(companyId, {
        promptType: selected,
        context: {
          topic: prompt,
          tone,
          targetAudience: audience,
          language,
          imageStyle: ["Realistic", "Nature", "Minimal", "Community", "River", "Forest"][imageStyleIdx],
          refinements: combinedRefinements,
        },
      });

      setResult(response.generatedContent);
      setGenerated(true);
      setTokensUsed(response.tokensConsumed);
      setRemainingTokens(response.usage.remainingAiTokens);
      setQuotaLimit(response.usage.maxAiTokens);

      toast.success("AI content generated successfully!", {
        description: `${response.tokensConsumed} tokens consumed with Gemini` + (response.usage.remainingAiTokens !== null ? ` • ${response.usage.remainingAiTokens.toLocaleString()} tokens left` : ""),
      });
    } catch (err: any) {
      if (ApiError.isApiError(err) && err.status === 402) {
        toast.error("Monthly AI Token quota exhausted!", {
          description: "Please upgrade your subscription plan in Billing to get more AI tokens.",
          duration: 7000,
        });
      } else {
        toast.error(ApiError.isApiError(err) ? err.message : "Failed to generate AI content. Please try again.");
      }
    } finally {
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
      });
      toast.success("Draft saved to Content Studio!", { description: "Your customized copy was saved to Saved Drafts." });
    } catch (err: any) {
      toast.error(ApiError.isApiError(err) ? err.message : "Could not save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUsePost = () => {
    const fullText = (result.headline ? `${result.headline}\n\n` : "") + result.caption + (result.hashtags.length > 0 ? `\n\n${result.hashtags.join(" ")}` : "");
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      toast.success("Post copied to clipboard!", { description: "Your edited copy is ready to paste into any editor." });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      {/* 1. What would you like to create? */}
      <Card
        title="What would you like to create?"
        action={
          remainingTokens !== null && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10.5px] font-semibold text-[#7C3AED]">
              {remainingTokens.toLocaleString()} tokens left
            </span>
          )
        }
      >
        <div className="grid grid-cols-4 gap-1.5">
          {AI_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                if (!prompt || Object.values(PROMPT_HINTS).includes(prompt)) {
                  setPrompt(PROMPT_HINTS[t.id] || prompt);
                }
              }}
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

        {/* Prompt */}
        <div className="mt-3">
          <label className="mb-1 block text-[11.5px] font-semibold text-[#33445F]">Topic / prompt *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            spellCheck
            placeholder="What should the post be about?"
            className="w-full resize-none rounded-sm border border-[#D9E1EC] p-2.5 text-[12px] leading-5 outline-none focus:border-[#7C3AED]"
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
        <p className="mb-1 mt-3 text-[11.5px] font-semibold text-[#33445F]">Image style</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[IMG.river, IMG.nature, IMG.water, IMG.people, IMG.lake, IMG.forest].map((src, i) => (
            <button
              key={i}
              onClick={() => setImageStyleIdx(i)}
              className={cn("overflow-hidden rounded-sm border text-left transition", imageStyleIdx === i ? "border-[#7C3AED] ring-2 ring-purple-100" : "border-[#E2E8F0]")}
            >
              <img src={src} alt="" className="h-12 w-full object-cover" />
              <span className="block px-1.5 py-1 text-[9.5px] font-semibold text-[#687797]">
                {["Realistic", "Nature", "Minimal", "Community", "River", "Forest"][i]}
              </span>
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-sm bg-[#7C3AED] text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#6D28D9] disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating with Gemini...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate content
            </>
          )}
        </button>
      </Card>

      {/* 2. AI Result (EVERY SINGLE FIELD IS EDITABLE!) */}
      <Card
        title="AI result"
        subtitle={tokensUsed ? `${tokensUsed} tokens consumed • Gemini AI` : "Review & edit every field directly"}
        action={
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="text-[11px] font-semibold text-[#1769DF] hover:underline disabled:opacity-50"
          >
            Regenerate
          </button>
        }
      >
        {generated ? (
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
                className="w-full resize-y rounded-sm border border-[#D9E1EC] p-2.5 text-[12px] leading-relaxed text-[#33445F] outline-none focus:border-[#7C3AED]"
              />
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
              <label className="mb-1 block text-[11px] font-semibold text-[#33445F]">Hashtags (space separated)</label>
              <input
                type="text"
                value={result.hashtags.join(" ")}
                onChange={(e) => {
                  const raw = e.target.value;
                  const tags = raw.split(/\s+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
                  setResult({ ...result, hashtags: tags });
                }}
                placeholder="#tag1 #tag2 #tag3"
                className="w-full rounded-sm border border-[#D9E1EC] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1769DF] outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Image Preview & Selection */}
            <div>
              <img
                src={[IMG.river, IMG.nature, IMG.water, IMG.people, IMG.lake, IMG.forest][imageStyleIdx]}
                alt=""
                className="aspect-video w-full rounded-sm object-cover"
              />
              <div className="mt-1.5 grid grid-cols-5 gap-1">
                {[IMG.people, IMG.cleanup, IMG.river, IMG.lake, IMG.nature].map((s, i) => (
                  <img
                    key={i}
                    src={s}
                    alt=""
                    onClick={() => setImageStyleIdx(i % 6)}
                    className={`h-11 w-full cursor-pointer rounded object-cover transition ${i === imageStyleIdx ? "ring-2 ring-[#7C3AED]" : "opacity-80 hover:opacity-100"}`}
                  />
                ))}
              </div>
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
          platform="instagram"
          setPlatform={() => {}}
          channels={["instagram", "facebook"]}
          caption={result.caption}
          hashtags={result.hashtags}
          image={[IMG.river, IMG.nature, IMG.water, IMG.people, IMG.lake, IMG.forest][imageStyleIdx]}
        />
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