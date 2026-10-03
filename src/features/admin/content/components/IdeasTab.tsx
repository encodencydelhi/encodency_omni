"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { MOCK_IDEAS } from "../mocks/content.mock";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { aiApi, type GeneratedAiResult } from "../live/ai-api";
import { toast } from "sonner";

interface IdeasTabProps {
  onCustomizeWithAi?: (idea: (typeof MOCK_IDEAS)[0]) => void;
  onUseIdea?: (idea: (typeof MOCK_IDEAS)[0]) => void;
}

export function IdeasTab({ onCustomizeWithAi, onUseIdea }: IdeasTabProps = {}) {
  const { companyId } = useTenancyContext();
  const [selected, setSelected] = useState(0);
  const active = MOCK_IDEAS[selected]!;

  const [inlineResult, setInlineResult] = useState<GeneratedAiResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCustomizeClick = () => {
    if (onCustomizeWithAi) {
      onCustomizeWithAi(active);
    } else {
      handleInlineGenerate();
    }
  };

  const handleInlineGenerate = async () => {
    if (!companyId) {
      toast.error("Company context required for AI generation.");
      return;
    }
    setIsGenerating(true);
    try {
      const promptType = active.contentType === "carousel" ? "Carousel" : active.contentType === "video" ? "Reel Script" : "Social Post";
      const response = await aiApi.generate(companyId, {
        promptType,
        context: {
          topic: `${active.title}: ${active.description}`,
          tone: "Positive",
          targetAudience: "General Public",
          language: "English",
        },
      });
      setInlineResult(response.generatedContent);
      toast.success("Idea customized with AI!", {
        description: `${response.tokensConsumed} tokens consumed • Generated with Gemini`,
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not generate content with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!inlineResult) return;
    const full = `${inlineResult.headline ? inlineResult.headline + "\n\n" : ""}${inlineResult.caption}\n\n${inlineResult.hashtags.join(" ")}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        title="Content ideas"
        subtitle="Curated prompts for your next post"
        action={
          <button
            onClick={handleCustomizeClick}
            className="flex h-8 items-center gap-1.5 rounded-sm bg-purple-50 px-3 text-[11.5px] font-semibold text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100 transition"
          >
            <Sparkles className="size-3.5" /> Generate with AI
          </button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {MOCK_IDEAS.map((idea, i) => (
            <button
              key={idea.id}
              onClick={() => {
                setSelected(i);
                setInlineResult(null);
              }}
              className={cn(
                "overflow-hidden rounded-sm border text-left transition",
                selected === i ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#E2E8F0] hover:shadow-md"
              )}
            >
              <img src={idea.image} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-2">
                <span className="rounded bg-[#F0F6FF] px-1.5 py-px text-[9.5px] font-semibold text-[#1769DF]">#{idea.tag}</span>
                <p className="mt-1 text-[12px] font-semibold text-[#24365A]">{idea.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#7A87A0]">{idea.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Idea details" className="xl:sticky xl:top-4">
        <img src={active.image} alt="" className="aspect-video w-full rounded-sm object-cover" />
        <p className="mt-2 text-[13px] font-semibold text-[#172044]">{active.title}</p>
        <p className="mt-0.5 text-[11.5px] leading-4 text-[#7A87A0]">{active.description}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {active.channels.map((c) => <PlatformBadge key={c} platform={c} size="sm" />)}
        </div>
        <div className="mt-2 space-y-1 text-[10.5px]">
          {[["Content Type", active.contentType], ["Suggested CTA", active.suggestedCTA], ["Best Time", "9–11 AM"]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-[#7A87A0]">{k}</dt><dd className="font-semibold text-[#33445F]">{v}</dd></div>
          ))}
        </div>
        <button
          onClick={() => {
            if (onUseIdea) onUseIdea(active);
            else toast.info("Idea selected!");
          }}
          className="mt-2.5 h-9 w-full rounded-sm bg-[#EB0711] text-[12px] font-semibold text-white transition hover:bg-[#D60811]"
        >
          Use this idea
        </button>
        <button
          onClick={handleCustomizeClick}
          disabled={isGenerating}
          className="mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-sm border border-purple-200 bg-purple-50/70 text-[11.5px] font-semibold text-[#7C3AED] hover:bg-purple-100 disabled:opacity-60 transition"
        >
          {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Customize with AI
        </button>

        {inlineResult && (
          <div className="mt-2.5 rounded-sm border border-purple-200 bg-purple-50/30 p-2.5 text-[11px] leading-4 text-[#33445F]">
            <div className="mb-1 flex items-center justify-between border-b border-purple-100 pb-1">
              <span className="font-bold text-[#7C3AED]">AI Generated Copy</span>
              <button onClick={handleCopy} className="flex items-center gap-1 font-semibold text-[#1769DF] hover:underline">
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{inlineResult.caption}</div>
            {inlineResult.hashtags.length > 0 && (
              <div className="mt-1 font-semibold text-[#1769DF]">{inlineResult.hashtags.join(" ")}</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}