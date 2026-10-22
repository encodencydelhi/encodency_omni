"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { Tab } from "../types/content.types";
import { CreateContentTab, type CreateSeed } from "./CreateContentTab";
import { AIAssistantTab } from "./AIAssistantTab";
import { TemplatesTab, type TemplateSeed } from "./TemplatesTab";
import { DraftsTab } from "./DraftsTab";
import { IdeasTab } from "./IdeasTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { FeatureGate } from "@/lib/feature-flags/feature-gate";

const TABS: Array<{ id: Tab; hint: string }> = [
  { id: "Create", hint: "Compose post" },
  { id: "AI Assistant", hint: "Generate with AI" },
  { id: "Templates", hint: "Starter and saved" },
  { id: "Saved Drafts", hint: "From workspace" },
  { id: "Content Ideas", hint: "Starter prompts" },
  { id: "Approvals", hint: "From workspace" },
];

export default function ContentStudioShell({ initialTab = "Create" }: { initialTab?: Tab } = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);
  const [aiType, setAiType] = useState<string | undefined>(undefined);
  const [createSeed, setCreateSeed] = useState<{ seed: CreateSeed; key: number } | undefined>(undefined);

  const handleCustomizeWithAi = (idea: { title: string; description: string; contentType?: string }) => {
    const type = idea.contentType === "carousel" ? "Carousel" : idea.contentType === "video" ? "Reel Script" : "Social Post";
    setAiPrompt(`Create an engaging post for "${idea.title}": ${idea.description}`);
    setAiType(type);
    setActiveTab("AI Assistant");
  };

  const startFromSeed = (seed: CreateSeed) => {
    setCreateSeed((prev) => ({ seed, key: (prev?.key ?? 0) + 1 }));
    setActiveTab("Create");
  };

  const handleUseTemplate = (template: TemplateSeed) => startFromSeed(template);

  const handleUseIdea = (idea: { suggestedCTA: string }) => startFromSeed({ caption: "", hashtags: [], cta: idea.suggestedCTA });

  const content = useMemo(() => {
    switch (activeTab) {
      case "Create": return <CreateContentTab key={createSeed?.key ?? 0} seed={createSeed?.seed} />;
      // key: remount when a fresh prompt/type arrives so the tab resets cleanly
      case "AI Assistant": return <FeatureGate flag="content.ai_generator"><AIAssistantTab key={`${aiType}|${aiPrompt}`} initialPrompt={aiPrompt} initialType={aiType} /></FeatureGate>;
      case "Templates": return <TemplatesTab onUseTemplate={handleUseTemplate} />;
      case "Saved Drafts": return <DraftsTab />;
      case "Content Ideas": return <IdeasTab onCustomizeWithAi={handleCustomizeWithAi} onUseIdea={handleUseIdea} />;
      case "Approvals": return <ApprovalsTab />;
    }
  }, [activeTab, aiPrompt, aiType, createSeed]);

  return (
    <div className="w-full min-w-0 space-y-3 text-[#172044]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#111B43]">
            Content Studio
          </h1>
          <p className="mt-0.5 text-[11.5px] text-[#687797]">Create, customize and publish content across all your channels.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "relative whitespace-nowrap pb-3 text-[13px] font-semibold transition",
                activeTab === t.id ? "text-[#EB0711]" : "text-[#687797] hover:text-[#33445F]",
              )}
            >
              {t.id}
              {activeTab === t.id && <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-t-full bg-[#EB0711]" />}
            </button>
          ))}
        </nav>
      </div>

      {content}
    </div>
  );
}
