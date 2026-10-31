"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { STARTER_IDEAS, type StarterIdea } from "../config/starter-ideas";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { aiApi, type GeneratedAiResult } from "../live/ai-api";
import { toast } from "sonner";
import { useFeature } from "@/lib/feature-flags/use-feature";
import { FeatureCheckFailed, FeatureUnavailable } from "@/lib/feature-flags/feature-gate";

interface IdeasTabProps {
  onCustomizeWithAi?: (idea: StarterIdea) => void;
  onUseIdea?: (idea: StarterIdea) => void;
}

export function IdeasTab({ onCustomizeWithAi, onUseIdea }: IdeasTabProps = {}) {
  const { companyId } = useTenancyContext();
  const ai = useFeature("content.ai_generator");
  const [selected, setSelected] = useState(0);
  const active = STARTER_IDEAS[selected]!;

  const [inlineResult, setInlineResult] = useState<GeneratedAiResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCustomizeClick = () => {
    if (!ai.canUse) return;
    if (onCustomizeWithAi) {
      onCustomizeWithAi(active);
    } else {
      handleInlineGenerate();
    }
  };

  const handleInlineGenerate = async () => {
    if (isGenerating || !ai.canUse) return;
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
        description: `${response.tokensConsumed} tokens consumed • Generated with ${response.provider ?? "AI"}`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not generate content with AI");
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
    }).catch(() => toast.error("Unable to copy. Select the text and copy it manually."));
  };

  return (
    <div className="space-y-1">
    {ai.status === "disabled" ? <FeatureUnavailable feature={ai} /> : <FeatureCheckFailed feature={ai} />}
    <div className="grid min-w-0 grid-cols-1 items-start gap-1 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        title="Starter ideas"
        subtitle="The same prompts for every workspace. Use one as it is, or let the AI adapt it to your topic."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleCustomizeClick}
            disabled={isGenerating || !ai.canUse}
            title={ai.status === "disabled" ? ai.explanation : undefined}
          >
            <Sparkles className="size-3.5" /> Generate with AI
          </Button>
        }
      >
        <div className="grid gap-1 sm:grid-cols-2 2xl:grid-cols-3">
          {STARTER_IDEAS.map((idea, i) => (
            <button
              key={idea.id}
              onClick={() => {
                if (isGenerating) return;
                setSelected(i);
                setInlineResult(null);
              }}
              className={cn(
                "overflow-hidden rounded-sm border text-left transition-colors",
                selected === i ? "border-primary/40 bg-primary-subtle" : "border-[#E2E8F0] bg-white hover:bg-slate-50"
              )}
            >
              <div className="p-2.5">
                <Badge tone="info">#{idea.tag}</Badge>
                <p className="mt-1.5 text-[13px] font-semibold text-[#172044]">{idea.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{idea.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Idea details" className="xl:sticky xl:top-[108px]">
        <p className="text-[13px] font-semibold text-[#172044]">{active.title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{active.description}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {active.channels.map((c) => <PlatformBadge key={c} platform={c} size="sm" />)}
        </div>
        <dl className="mt-2 space-y-1 text-xs">
          {[["Content Type", active.contentType], ["Suggested CTA", active.suggestedCTA]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold text-[#172044]">{v}</dd></div>
          ))}
        </dl>
        <Button
          size="sm"
          className="mt-2.5 w-full"
          onClick={() => {
            if (onUseIdea) onUseIdea(active);
            else toast.info("Idea selected!");
          }}
        >
          Use this idea
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="mt-1 w-full"
          onClick={handleCustomizeClick}
          disabled={isGenerating || !ai.canUse}
          title={ai.status === "disabled" ? ai.explanation : undefined}
        >
          {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Customize with AI
        </Button>

        {inlineResult && (
          <div className="mt-2.5 rounded-lg border border-purple-200 bg-purple-50/30 p-2.5 text-[11px] leading-4 text-[#33445F]">
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
    </div>
  );
}
