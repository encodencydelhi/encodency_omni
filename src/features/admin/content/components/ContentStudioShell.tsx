"use client";

import { useMemo, useState } from "react";
import { Send, Bookmark, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tab } from "../types/content.types";
import { CreateContentTab } from "./CreateContentTab";
import { AIAssistantTab } from "./AIAssistantTab";
import { TemplatesTab } from "./TemplatesTab";
import { DraftsTab } from "./DraftsTab";
import { IdeasTab } from "./IdeasTab";
import { ApprovalsTab } from "./ApprovalsTab";

const TABS: Array<{ id: Tab; hint: string }> = [
  { id: "Create", hint: "Compose post" },
  { id: "AI Assistant", hint: "Generate with AI" },
  { id: "Templates", hint: "124 ready designs" },
  { id: "Saved Drafts", hint: "8 drafts" },
  { id: "Content Ideas", hint: "Fresh prompts" },
  { id: "Approvals", hint: "12 pending" },
];

export default function ContentStudioShell() {
  const [activeTab, setActiveTab] = useState<Tab>("Create");

  const content = useMemo(() => {
    switch (activeTab) {
      case "Create": return <CreateContentTab />;
      case "AI Assistant": return <AIAssistantTab />;
      case "Templates": return <TemplatesTab />;
      case "Saved Drafts": return <DraftsTab />;
      case "Content Ideas": return <IdeasTab />;
      case "Approvals": return <ApprovalsTab />;
    }
  }, [activeTab]);

  return (
    <div className="w-full min-w-0 space-y-3 text-[#172044]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#111B43]">Content Studio</h1>
          <p className="mt-0.5 text-[11.5px] text-[#687797]">Create, customize and publish content across all your channels.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D7E0EB] bg-white px-3.5 text-[12.5px] font-semibold text-[#33445F] shadow-[0_1px_3px_rgb(31_50_81/0.06)] transition hover:bg-[#F8FAFD]">
            <Bookmark className="size-3.5 text-[#71809D]" /> Save draft
          </button>
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-[#EB0711] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_3px_rgb(235_7_17/0.25)] transition hover:bg-[#D60811]">
            <Send className="size-3.5" /> Publish <ChevronDown className="size-3.5 opacity-80" />
          </button>
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
