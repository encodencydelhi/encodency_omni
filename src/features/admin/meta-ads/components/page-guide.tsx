"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { useAssistant } from "@/features/assistant/assistant-provider";

const GUIDES: Record<string, [string, string, string]> = {
  campaigns: ["Campaign Performance", "Compare objectives, budgets and results. Open a campaign to review its ad sets.", "Explain which campaigns need attention using only the supplied metrics."],
  adsets: ["Audience & Delivery", "Review targeting, placements and budget ownership before changing delivery.", "Explain how to compare these ad sets and improve targeting without inventing results."],
  ads: ["Ads & Creative Results", "Compare ad delivery and creative results. Confirm the budget before activation.", "Suggest creative tests based on these ads. Separate suggestions from measured facts."],
  forms: ["Instant Forms", "Review questions, privacy links and submissions. Forms need Page access.", "Suggest ways to improve lead form questions without claiming a measured conversion uplift."],
  leads: ["Lead Follow-Up", "Review retrieved submissions. Lead counts differ from attributed advertising conversions.", "Explain a practical lead follow-up process. Do not infer lead quality or personal details."],
  audiences: ["Audience Library", "Review saved, custom and lookalike audiences. Sizes are estimates reported by Meta.", "Suggest audience test ideas and explain overlap risks. Do not invent audience demographics."],
  creative: ["Creative Library", "Review existing assets and ad usage. Preview formats before planning a new test.", "Suggest copy and creative test ideas. Do not invent product claims or performance forecasts."],
  analytics: ["Reporting Scope", "Use the same account, period and filters when comparing metrics. Missing data is not zero delivery.", "Explain this performance, cite the supplied numbers, and state missing data before recommending tests."],
  issues: ["Delivery Checks", "Review current account, policy and data-access issues. Follow Meta's guidance to resolve them.", "Prioritize these reported issues and explain the next steps without assuming an unreported cause."],
  activity: ["Account Activity", "Review recent changes reported by Meta. This is a bounded feed, not a complete audit history.", "Explain how to investigate unexpected account changes using the activity feed."],
  assets: ["Connections & Ownership", "Check permissions and link assets to the right client before publishing.", "Explain the difference between a connected login, granted permission and client asset mapping."],
  help: ["Workspace Help", "Find practical guides for budgets, targeting, reporting and connection issues.", "Explain the main Meta Ads concepts for a new workspace user."],
  facebook: ["Facebook Workspace", "Review managed Pages, published posts and scheduled content. Link a Page to this client to publish.", "Suggest a Facebook content plan. Do not claim access to inbox messages or unpublished insights."],
  instagram: ["Instagram Workspace", "Review professional profiles, posts and reels. Link the right account before scheduling content.", "Suggest Instagram post and reel ideas. Separate content suggestions from measured insights."],
  settings: ["Connection Settings", "Review access, connection health and client mappings. A granted scope is not App Review approval.", "Explain the permissions needed for reading ads, publishing content and retrieving leads."],
};

export function MetaPageGuide({ context }: { context?: string }) {
  const pathname = usePathname() ?? "";
  const section = pathname.includes("/ads/") ? pathname.split("/ads/")[1]?.split("/")[0] : pathname.split("/").at(-1);
  const [title, description, question] = GUIDES[section ?? ""] ?? ["Meta Workspace", "Review accounts, performance and connections. Check the account and reporting period before acting.", "Explain these Meta metrics and recommend the next checks using only available data."];
  const [expanded, setExpanded] = useState(false);
  const assistant = useAssistant();
  return (
    <section className="my-2 rounded-lg border border-blue-100 bg-linear-to-r from-blue-50/80 via-white to-violet-50/50 px-3 py-2 capitalize">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-600">{description}</p></div>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><Sparkles className="size-3.5" />AI Help<ChevronDown className="size-3" /></button>
      </div>
      {expanded && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-2"><p className="max-w-2xl text-[11px] leading-4 text-slate-600">Explain Results · Suggest Creative Tests · Guide Issue Resolution. AI Suggestions Need Review; Budgets And Ads Are Never Changed From This Button.</p><button type="button" onClick={() => assistant.open(`${question}\nPage: ${pathname}\n${context ? `Displayed data (not a fresh provider verification): ${context}` : "No metric snapshot is attached; ask for the required data instead of assuming performance."}`)} className="rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white">Ask Assistant</button></div>}
    </section>
  );
}
