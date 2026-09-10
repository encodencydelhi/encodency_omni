"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock3, Copy, FileText, ImageIcon, MoreHorizontal, Search, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type View = "ai-assistant" | "templates" | "drafts";

const tabs = [
  ["Create", "/admin/content", "create"],
  ["AI Assistant", "/admin/content/ai-assistant", "ai-assistant"],
  ["Templates", "/admin/content/templates", "templates"],
  ["Saved Drafts", "/admin/content/drafts", "drafts"],
] as const;

const templates = [
  ["Campaign Announcement", "Launch a campaign with a clear message and CTA.", "Campaign", "bg-rose-50 text-rose-600"],
  ["Event Promotion", "Build excitement and drive event registrations.", "Event", "bg-blue-50 text-blue-600"],
  ["Impact Story", "Share outcomes, milestones and community impact.", "Story", "bg-emerald-50 text-emerald-600"],
  ["Volunteer Call", "Invite supporters to join your next initiative.", "Community", "bg-violet-50 text-violet-600"],
  ["Festival Greeting", "Create a thoughtful seasonal social post.", "Greeting", "bg-amber-50 text-amber-600"],
  ["Quick Update", "Publish a concise project or organization update.", "Update", "bg-cyan-50 text-cyan-600"],
];

const drafts = [
  ["Clean Ganga Awareness – Week 2", "Small actions create a cleaner tomorrow...", "Instagram, Facebook", "Today, 10:42 AM"],
  ["Volunteer Spotlight: Riya Sharma", "Meet Riya, one of the changemakers...", "LinkedIn", "Yesterday, 4:18 PM"],
  ["World Environment Day", "This Environment Day, let us renew...", "All channels", "Jun 2, 2025"],
  ["Monthly Impact Report", "Together we collected 1.8 tons of waste...", "Facebook, LinkedIn", "May 29, 2025"],
];

export function ContentLibraryPage({ view }: { view: View }) {
  const [prompt, setPrompt] = useState("");
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <header className="flex items-start justify-between gap-4">
        <div><h1 className="text-[26px] font-bold tracking-tight">Content Studio</h1><p className="mt-0.5 text-[13px] text-muted-foreground">Create, customize and publish content across all your channels.</p></div>
        <Link href="/admin/content" className="flex h-9 items-center gap-2 rounded-md bg-[#e20611] px-4 text-[13px] font-semibold text-white"><FileText className="size-4" />Create Post</Link>
      </header>
      <nav className="flex items-center gap-7 border-b">
        {tabs.map(([label, href, id]) => <Link key={id} href={href} className={cn("border-b-2 pb-2.5 text-[13px] font-semibold", view === id ? "border-[#e20611] text-[#e20611]" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</Link>)}
      </nav>
      {view === "ai-assistant" && <AiAssistant prompt={prompt} setPrompt={setPrompt} />}
      {view === "templates" && <Templates />}
      {view === "drafts" && <Drafts />}
    </div>
  );
}

function AiAssistant({ prompt, setPrompt }: { prompt: string; setPrompt: (v: string) => void }) {
  return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-[#e20611]"><Sparkles className="size-5" /></span><div><h2 className="text-[16px] font-bold">AI Content Assistant</h2><p className="text-[12px] text-muted-foreground">Turn a simple idea into platform-ready content.</p></div></div>
      <label className="mb-2 block text-[12px] font-bold">What would you like to create?</label>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7} placeholder="Example: Create an inspiring Instagram post for our Clean Ganga volunteer drive..." className="w-full resize-none rounded-lg border p-3 text-[13px] outline-none focus:border-[#e20611] focus:ring-1 focus:ring-[#e20611]" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{["Social post", "Caption ideas", "Hashtags", "Rewrite text"].map(x => <button key={x} onClick={() => setPrompt(x)} className="rounded-lg border px-3 py-2 text-[11px] font-semibold hover:bg-gray-50">{x}</button>)}</div>
      <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#e20611] text-[13px] font-bold text-white"><Sparkles className="size-4" />Generate Content</button>
    </section>
    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-[15px] font-bold">Generated Content</h2><div className="mt-4 grid min-h-[260px] place-items-center rounded-lg border border-dashed bg-gray-50/60 p-8 text-center"><div><Sparkles className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-[13px] font-semibold">Your AI result will appear here</p><p className="mt-1 text-[11px] text-muted-foreground">Add an idea and generate a caption, hashtags and CTA.</p></div></div></section>
  </div>;
}

function Templates() {
  return <div><div className="mb-4 flex items-center justify-between"><div><h2 className="text-[16px] font-bold">Content Templates</h2><p className="text-[12px] text-muted-foreground">Start faster with reusable, channel-ready formats.</p></div><div className="flex h-9 w-64 items-center gap-2 rounded-md border bg-white px-3"><Search className="size-4 text-muted-foreground" /><input className="w-full bg-transparent text-[12px] outline-none" placeholder="Search templates..." /></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map(([title, description, tag, color]) => <article key={title} className="group rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={cn("mb-4 grid h-28 place-items-center rounded-lg", color)}><ImageIcon className="size-8 opacity-70" /></div><span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold">{tag}</span><h3 className="mt-3 text-[14px] font-bold">{title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{description}</p><button className="mt-4 h-8 w-full rounded-md border text-[11px] font-bold text-[#e20611] hover:bg-rose-50">Use Template</button></article>)}</div></div>;
}

function Drafts() {
  return <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><div><h2 className="text-[16px] font-bold">Saved Drafts</h2><p className="text-[12px] text-muted-foreground">Continue editing content you saved earlier.</p></div><div className="flex h-9 w-64 items-center gap-2 rounded-md border px-3"><Search className="size-4 text-muted-foreground" /><input className="w-full text-[12px] outline-none" placeholder="Search drafts..." /></div></div><div className="divide-y">{drafts.map(([title, excerpt, channels, updated], i) => <article key={title} className="grid grid-cols-[44px_1fr_150px_130px_90px] items-center gap-3 px-4 py-3 hover:bg-gray-50"><span className="grid size-10 place-items-center rounded-lg bg-rose-50 text-[#e20611]"><FileText className="size-5" /></span><div className="min-w-0"><h3 className="truncate text-[13px] font-bold">{title}</h3><p className="truncate text-[11px] text-muted-foreground">{excerpt}</p></div><span className="text-[11px] text-muted-foreground">{channels}</span><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{updated}</span><div className="flex justify-end gap-1"><button className="rounded p-2 text-blue-600 hover:bg-blue-50"><Copy className="size-4" /></button><button className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button><button className="rounded p-2 hover:bg-gray-100"><MoreHorizontal className="size-4" /></button></div></article>)}</div></section>;
}
