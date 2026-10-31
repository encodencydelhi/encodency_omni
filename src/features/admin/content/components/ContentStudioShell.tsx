"use client";

import { PenLine, Sparkles, LayoutTemplate, Files, Lightbulb, ShieldCheck, Plus } from "lucide-react";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { useState } from "react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import type { Tab } from "../types/content.types";
import { useReviewCounts } from "../live/review-status";
import { CreateContentTab, type CreateSeed } from "./CreateContentTab";
import { AIAssistantTab } from "./AIAssistantTab";
import { TemplatesTab, type TemplateSeed } from "./TemplatesTab";
import { DraftsTab } from "./DraftsTab";
import { IdeasTab } from "./IdeasTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FeatureGate } from "@/lib/feature-flags/feature-gate";

const TABS: Array<{ id: Tab; hint: string; icon: typeof PenLine }> = [
  { id: "Create", hint: "Compose your post", icon: PenLine },
  { id: "AI Assistant", hint: "Ideas into content", icon: Sparkles },
  { id: "Templates", hint: "Start with a template", icon: LayoutTemplate },
  { id: "Saved Drafts", hint: "Pick up where you left off", icon: Files },
  { id: "Content Ideas", hint: "Find your next story", icon: Lightbulb },
  { id: "Approvals", hint: "Review as a team", icon: ShieldCheck },
];

export default function ContentStudioShell({ initialTab = "Create" }: { initialTab?: Tab } = {}) {
  const { companyId, clientId } = useTenancyContext();
  return <ContentStudioSession key={`${companyId}|${clientId}`} initialTab={initialTab} />;
}
function ContentStudioSession({ initialTab }: { initialTab: Tab }) {
  const { companyId, clientId } = useTenancyContext();
  const {Clients} = useAdminContext();
  const counts = useReviewCounts();
  const clientName = Clients.find(client => client.id === clientId)?.name;
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set(["Create", initialTab]));
  const [confirmNew, setConfirmNew] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [aiScope, setAiScope] = useState("");
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);
  const [aiType, setAiType] = useState<string | undefined>(undefined);
  const [createSeed, setCreateSeed] = useState<{ seed: CreateSeed; key: number; scope: string } | undefined>(undefined);

  const openTab = (tab: Tab) => {
    setVisited(previous => new Set([...previous, tab]));
    setActiveTab(tab);
  };

  const handleCustomizeWithAi = (idea: { title: string; description: string; contentType?: string }) => {
    const type = idea.contentType === "carousel" ? "Carousel" : idea.contentType === "video" ? "Reel Script" : "Social Post";
    setAiScope(`${companyId}|${clientId}`);
    setAiPrompt(`Create an engaging post for "${idea.title}": ${idea.description}`);
    setAiType(type);
    openTab("AI Assistant");
  };

  const startFromSeed = (seed: CreateSeed) => {
    setCreateSeed((prev) => ({ seed, key: (prev?.key ?? 0) + 1, scope: `${companyId}|${clientId}` }));
    openTab("Create");
  };

  const handleUseTemplate = (template: TemplateSeed) => startFromSeed(template);

  const handleUseIdea = (idea: { title: string; description: string; suggestedCTA: string }) => startFromSeed({ caption: `${idea.title}\n\n${idea.description}`, hashtags: [], cta: idea.suggestedCTA });

  const renderPanel = (tab: Tab) => {
    switch (tab) {
      case "Create": return <CreateContentTab key={createSeed?.key ?? 0} onAiAction={(action, caption) => { setAiScope(`${companyId}|${clientId}`); setAiPrompt(`${action}: ${caption}`.slice(0, 1000)); setAiType("Social Post"); openTab("AI Assistant"); }} seed={createSeed?.seed} />;
      // key: remount when a fresh prompt/type arrives so the tab resets cleanly
      case "AI Assistant": return <FeatureGate flag="content.ai_generator"><AIAssistantTab key={`${companyId}|${clientId}|${aiType}|${aiPrompt}`} initialPrompt={aiScope === `${companyId}|${clientId}` ? aiPrompt : undefined} initialType={aiType} onUsePost={startFromSeed} /></FeatureGate>;
      case "Templates": return <TemplatesTab key={companyId} onUseTemplate={handleUseTemplate} />;
      case "Saved Drafts": return <DraftsTab key={`${companyId}|${clientId}`} onEdit={(draft) => startFromSeed({ caption: draft.content, hashtags: [], draft })} onCreate={() => startFromSeed({ caption: "", hashtags: [] })} />;
      case "Content Ideas": return <IdeasTab key={`${companyId}|${clientId}`} onCustomizeWithAi={handleCustomizeWithAi} onUseIdea={handleUseIdea} />;
      case "Approvals": return <ApprovalsTab key={`${companyId}|${clientId}`} onEdit={draft => startFromSeed({ caption: draft.content, hashtags: [], draft })} />;
    }
  };

  const creationTabs: Tab[] = ["Create","AI Assistant","Templates","Content Ideas"];
  const creating = creationTabs.includes(activeTab);
  const purpose: Record<Tab,string> = {
    "Create":"Write your post, choose channels and attach media. Review accounts and timing before anything is queued.",
    "AI Assistant":"Generate and edit copy or an image. Open it in the composer to choose channels and publishing accounts.",
    "Templates":"Reusable text for recurring posts. Use a template to start a post in the composer.",
    "Content Ideas":"Find a starting topic. Use it in the composer or ask AI to turn it into draft copy.",
    "Saved Drafts":"Your saved posts are not live. Continue editing a draft in the composer when you are ready.",
    "Approvals":"Review the actual caption and media. Approval records a decision; publishing is a separate step.",
  };
  // The composer itself is "write it yourself"; these are the other ways to fill it.
  const startFrom = [{id:"AI Assistant" as Tab,label:"AI",icon:Sparkles},{id:"Templates" as Tab,label:"Template",icon:LayoutTemplate},{id:"Content Ideas" as Tab,label:"Idea",icon:Lightbulb}];
  const draftTotal = counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : null;
  const pending = counts.data?.PENDING_REVIEW ?? 0;
  const count = (value: number | null, tone: "neutral" | "warning") => value ? <Badge tone={tone} className="px-1.5 py-0">{value}</Badge> : null;
  return (
    <div className="w-full min-w-0 space-y-1 text-[#172044]">
      <AdminPageTitle
        eyebrow="Marketing / Content Studio"
        title="Content Studio"
        description={`${clientName ? `${clientName} - ` : ""}${purpose[activeTab]}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-1">
        <Tabs value={creating ? "Create" : activeTab} onValueChange={(value) => openTab(value as Tab)}>
          <TabsList aria-label="Content Studio sections">
            <TabsTrigger value="Create" aria-label="Create" onClick={() => openTab("Create")}><PenLine /> Composer</TabsTrigger>
            <TabsTrigger value="Saved Drafts" aria-label="Saved Drafts"><Files /> Saved Drafts {count(draftTotal, "neutral")}</TabsTrigger>
            <TabsTrigger value="Approvals" aria-label="Approvals"><ShieldCheck /> Approvals {count(pending, "warning")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {creating && (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Fill the composer from">
            <span className="px-1.5 text-xs text-muted-foreground">Start from</span>
            {startFrom.map(item => (
              <Button
                key={item.id}
                size="xs"
                variant="outline"
                aria-label={item.id}
                aria-pressed={activeTab === item.id}
                onClick={() => openTab(item.id)}
                className={cn(activeTab === item.id && "border-primary/40 bg-primary-subtle text-primary hover:bg-primary-subtle")}
              ><item.icon className="size-3.5" />{item.label}</Button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
            <Button size="xs" variant="outline" aria-label="New post" onClick={() => setConfirmNew(true)}><Plus className="size-3.5" />New Post</Button>
          </div>
        )}
      </div>
      {TABS.filter(tab => visited.has(tab.id)).map(tab => <div key={tab.id} hidden={activeTab !== tab.id} data-content-panel={tab.id} className="space-y-1">{renderPanel(tab.id)}</div>)}
      <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new post?</AlertDialogTitle>
            <AlertDialogDescription>The composer will be cleared. Anything you have not saved as a draft is lost. Saved drafts stay in your library and nothing is published.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => startFromSeed({ caption: "", hashtags: [] })}>Start new post</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
