"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Lightbulb, Loader2, Sparkles, ThumbsUp, TrendingUp, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInPostInsights } from "../../integrations/live/integrations-api";

/**
 * AI insights on the page's last 50 posts. The best weekday, time window and format are computed from LinkedIn's
 * real numbers on the server; AI explains them and suggests ideas. Runs only when asked (it uses AI credits).
 */
export function LinkedInAiPostInsights() {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<LinkedInPostInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!companyId || !clientId) return;
    setBusy(true);
    try { setData(await integrationsApi.getLinkedInPostInsights(companyId, clientId)); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI insights failed."); }
    finally { setBusy(false); }
  };
  const slots = (title: string, list: LinkedInPostInsights["times"]["weekdays"]) => <div className="min-w-0">
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#7B89A4]">{title}</p>
    {list.length ? <ol className="space-y-1">{list.slice(0, 3).map((slot, index) => <li key={slot.label} className="flex items-center justify-between gap-2 text-[11px]">
      <span className={index === 0 ? "font-semibold text-[#172044]" : "text-[#52617D]"}>{index === 0 ? "★ " : ""}{slot.label}</span>
      <span className="text-[10px] text-[#7B89A4]">{slot.avgEngagementRate}% · {slot.avgImpressions} views · {slot.posts} posts</span>
    </li>)}</ol> : <p className="text-[10.5px] text-[#8A97AF]">Not enough posts yet (needs 2+ per slot).</p>}
  </div>;

  return <div className="border-b border-[#E1D9F7] bg-[#FBFAFF] px-5 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-[#253352]"><Sparkles className="mr-1 inline size-3.5 text-[#6D4AE0]" /><span className="font-semibold">AI post insights</span> <span className="text-[#7B89A4]">· what works, the best time to post (from your real numbers) and 5 new post ideas</span></p>
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 bg-[#6D4AE0] px-3 text-[10.5px] font-semibold text-white disabled:opacity-60">{busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{data ? "Analyse again" : "Analyse my posts"}</button>
    </div>
    {data && <div className="mt-3 space-y-3">
      {data.reason && <p className="text-[11px] text-amber-800">{data.reason}</p>}
      {data.totals && <p className="text-[10.5px] text-[#52617D]">Last {data.posts.length} posts: <b>{data.totals.impressions.toLocaleString("en-IN")}</b> impressions · <b>{data.totals.clicks}</b> clicks · <b>{data.totals.likes}</b> likes · <b>{data.totals.comments}</b> comments · <b>{data.totals.shares}</b> shares</p>}
      <div className="grid gap-4 rounded border border-[#E3E9F0] bg-white p-3 sm:grid-cols-3">
        {slots("Best weekday", data.times.weekdays)}{slots("Best time (India)", data.times.hours)}{slots("Best format", data.times.formats)}
      </div>
      {data.insights && <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-[#E3E9F0] bg-white p-3 text-[11px] leading-5 text-[#253352]">
          <p className="mb-1 flex items-center gap-1 font-semibold text-[#172044]"><TrendingUp className="size-3.5 text-[#6D4AE0]" />Summary</p>
          <p>{data.insights.summary}</p>
          {data.insights.bestTime && <p className="mt-2 flex gap-1"><Clock className="mt-0.5 size-3.5 shrink-0 text-[#6D4AE0]" /><span><b>When to post:</b> {data.insights.bestTime}</span></p>}
          {data.insights.whatWorks.length > 0 && <><p className="mt-2 flex items-center gap-1 font-semibold text-[#172044]"><ThumbsUp className="size-3.5 text-emerald-600" />What works</p><ul className="list-disc pl-5">{data.insights.whatWorks.map((item) => <li key={item}>{item}</li>)}</ul></>}
          {data.insights.improve.length > 0 && <><p className="mt-2 flex items-center gap-1 font-semibold text-[#172044]"><Wrench className="size-3.5 text-amber-600" />Improve</p><ul className="list-disc pl-5">{data.insights.improve.map((item) => <li key={item}>{item}</li>)}</ul></>}
        </div>
        <div className="rounded border border-[#E3E9F0] bg-white p-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[#172044]"><Lightbulb className="size-3.5 text-[#6D4AE0]" />Post ideas</p>
          <ul className="space-y-2">{data.insights.ideas.map((idea) => <li key={idea.title} className="text-[11px] leading-5">
            <p className="font-semibold text-[#172044]">{idea.title} <span className="ml-1 rounded-sm bg-[#F3EFFF] px-1 py-px text-[9px] font-semibold uppercase text-[#6D4AE0]">{idea.format}</span></p>
            <p className="text-[#52617D]">“{idea.hook}”</p>
            <Link href={`/admin/linkedin/create-post?text=${encodeURIComponent(`${idea.hook}\n\n`)}`} className="text-[10px] font-semibold text-[#0A66C2] hover:underline">Write this post →</Link>
          </li>)}</ul>
        </div>
      </div>}
      <p className="text-[9.5px] text-[#8A97AF]">Numbers are LinkedIn&apos;s lifetime totals per post. Times are India time. AI explains the numbers; it can be wrong, so check before acting.{data.tokensConsumed ? ` · ${data.tokensConsumed.toLocaleString("en-IN")} AI tokens` : ""}</p>
    </div>}
  </div>;
}
