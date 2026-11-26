"use client";

import { useState } from "react";
import { Check, Lightbulb, Loader2, MessageSquareWarning, Sparkles, ThumbsUp, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { gbpAiApi, type GbpAiLanguage, type GbpAiOptions, type GbpAiReply, type GbpAiReviewInsights } from "../live/google-business-api";

const LANGUAGES: Array<[GbpAiLanguage, string]> = [["auto", "Same as the review"], ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]];
const TONES = ["Warm", "Professional", "Short", "Formal", "Friendly"];
const select = "h-7 rounded border border-[#DADCE0] bg-white px-1.5 text-[11.5px] text-[#3C4043]";

function Options({ result, onUse, render }: { result: GbpAiOptions; onUse: (option: GbpAiOptions["options"][number]) => void; render?: (option: GbpAiOptions["options"][number]) => React.ReactNode }) {
  return <div className="space-y-2">
    {result.options.map((option, index) => <div key={index} className="flex items-start gap-2 rounded-md border border-[#E8EAED] bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        {option.title && <p className="text-[12px] font-semibold text-[#202124]">{option.title}</p>}
        <p className="whitespace-pre-wrap text-[12.5px] leading-5 text-[#202124]">{option.text}</p>
        {render?.(option)}
        {option.why && <p className="mt-0.5 text-[11px] text-[#80868B]">{option.why}</p>}
      </div>
      <button type="button" onClick={() => onUse(option)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-[#7C4DFF] px-2 text-[11px] font-medium text-[#6D4AE0] hover:bg-[#F3EFFF]"><Check className="size-3" />Use</button>
    </div>)}
    <p className="text-[10.5px] text-[#80868B]">AI suggestions can be wrong. Check before publishing; nothing is posted until you press the button.{result.tokensConsumed ? ` · ${result.tokensConsumed.toLocaleString("en-IN")} AI tokens` : ""}</p>
  </div>;
}

/** AI reply for one review: reads the stars, the text and the business profile on the server; three replies to choose from. */
export function GbpAiReplyAssist({ locationId, reviewId, onUse }: { locationId: string; reviewId: string; onUse: (text: string) => void }) {
  const [language, setLanguage] = useState<GbpAiLanguage>("auto");
  const [tone, setTone] = useState("Warm");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<GbpAiReply | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setResult(await gbpAiApi.reviewReply(locationId, { reviewId, tone, language, instruction: instruction.trim() || undefined })); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI could not suggest a reply."); }
    finally { setBusy(false); }
  };
  return <div className="rounded-lg border border-[#E1D9F7] bg-[#FBFAFF] p-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded bg-[#6D4AE0] px-3 text-[12px] font-medium text-white disabled:opacity-60">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{result ? "Suggest again" : "Suggest replies with AI"}</button>
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Language<select className={select} value={language} onChange={(event) => setLanguage(event.target.value as GbpAiLanguage)}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Tone<select className={select} value={tone} onChange={(event) => setTone(event.target.value)}>{TONES.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    <input value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} placeholder="Optional note for AI, e.g. “mention our 24x7 helpline” or “apologise for the delay”" className="mt-2 h-8 w-full rounded border border-[#DADCE0] bg-white px-2 text-[11.5px]" />
    {result && <div className="mt-3 space-y-2">
      {result.insight && <div className="rounded-md border border-[#E8EAED] bg-white px-3 py-2 text-[11.5px] leading-5 text-[#3C4043]">
        <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#6D4AE0]">AI read the review</p>
        {result.insight.sentiment && <p><b>Feeling:</b> {result.insight.sentiment}</p>}
        {result.insight.about && <p><b>About:</b> {result.insight.about}</p>}
        {result.insight.approach && <p><b>Best approach:</b> {result.insight.approach}</p>}
      </div>}
      <Options result={result} onUse={(option) => onUse(option.text)} />
    </div>}
  </div>;
}

const POST_TYPES = [["STANDARD", "Update"], ["OFFER", "Offer"], ["EVENT", "Event"]] as const;
export type GbpAiPostChoice = { text: string; title: string; button: string | null; topicType: "STANDARD" | "OFFER" | "EVENT"; website: string | null };

/** AI post writer: uses the profile, what people search for and recent posts; follows Google's post rules. */
export function GbpAiPostAssist({ locationId, defaultType = "STANDARD", onUse }: { locationId: string; defaultType?: "STANDARD" | "OFFER" | "EVENT"; onUse: (choice: GbpAiPostChoice) => void }) {
  const [brief, setBrief] = useState("");
  const [topicType, setTopicType] = useState<"STANDARD" | "OFFER" | "EVENT">(defaultType);
  const [language, setLanguage] = useState<GbpAiLanguage>("auto");
  const [tone, setTone] = useState("Warm");
  const [result, setResult] = useState<(GbpAiOptions & { website: string | null }) | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (brief.trim().length < 3) { toast.info("Write in a few words what the post is about."); return; }
    setBusy(true);
    try { setResult(await gbpAiApi.post(locationId, { brief: brief.trim(), topicType, tone, language })); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI could not write the post."); }
    finally { setBusy(false); }
  };
  return <div className="rounded-lg border border-[#E1D9F7] bg-[#FBFAFF] p-3">
    <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[#202124]"><Wand2 className="size-4 text-[#6D4AE0]" />Write with AI</p>
    <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={2} maxLength={1000} placeholder="What is the post about? e.g. “24x7 cremation arrangements in Ghaziabad, explain how families can reach us any time”" className="w-full rounded border border-[#DADCE0] bg-white p-2 text-[12px]" />
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Type<select className={select} value={topicType} onChange={(event) => setTopicType(event.target.value as typeof topicType)}>{POST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Language<select className={select} value={language} onChange={(event) => setLanguage(event.target.value as GbpAiLanguage)}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{value === "auto" ? "Same as my brief" : label}</option>)}</select></label>
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Tone<select className={select} value={tone} onChange={(event) => setTone(event.target.value)}>{TONES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => void run()} disabled={busy} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded bg-[#6D4AE0] px-3 text-[12px] font-medium text-white disabled:opacity-60">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{result ? "Write again" : "Write 3 posts"}</button>
    </div>
    <p className="mt-1.5 text-[10.5px] text-[#80868B]">AI reads your profile, what people search for on Google, and your recent posts (so it does not repeat them). Google&apos;s rules are applied: no phone numbers or links in the text — the button does that.</p>
    {result && <div className="mt-3"><Options result={result} render={(option) => option.button ? <p className="mt-1 text-[10.5px] font-medium text-[#1A73E8]">Button: {option.button.replace("_", " ").toLowerCase()}</p> : null}
      onUse={(option) => onUse({ text: option.text, title: option.title ?? "", button: option.button ?? null, topicType, website: result.website })} /></div>}
  </div>;
}

/** AI business description: two options within Google's 750-character rules, from the profile, reviews and searches. */
export function GbpAiDescriptionAssist({ locationId, onUse }: { locationId: string; onUse: (text: string) => void }) {
  const [instruction, setInstruction] = useState("");
  const [language, setLanguage] = useState<GbpAiLanguage>("English");
  const [result, setResult] = useState<GbpAiOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setResult(await gbpAiApi.description(locationId, { instruction: instruction.trim() || undefined, language })); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI could not write the description."); }
    finally { setBusy(false); }
  };
  return <div className="mt-1 rounded-lg border border-[#E1D9F7] bg-[#FBFAFF] p-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded bg-[#6D4AE0] px-3 text-[12px] font-medium text-white disabled:opacity-60">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{result ? "Write again" : "Improve description with AI"}</button>
      <label className="flex items-center gap-1 text-[11px] text-[#5F6368]">Language<select className={select} value={language} onChange={(event) => setLanguage(event.target.value as GbpAiLanguage)}>{LANGUAGES.filter(([value]) => value !== "auto").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <input value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} placeholder="Optional: what to highlight" className="h-8 min-w-48 flex-1 rounded border border-[#DADCE0] bg-white px-2 text-[11.5px]" />
    </div>
    <p className="mt-1.5 text-[10.5px] text-[#80868B]">AI uses your current description, categories, what customers praise in reviews, and what people search for. Google&apos;s rules: max 750 characters, no links, no phone numbers, no offers.</p>
    {result && <div className="mt-3"><Options result={result} render={(option) => <p className="mt-1 text-[10.5px] text-[#80868B]">{option.text.length}/750 characters</p>} onUse={(option) => onUse(option.text)} /></div>}
  </div>;
}

/** AI review report: numbers computed from the reviews, AI summarises praise, complaints and next steps. */
export function GbpReviewInsights({ locationId, onReply }: { locationId: string; onReply?: (reviewId: string) => void }) {
  const [data, setData] = useState<GbpAiReviewInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setData(await gbpAiApi.reviewInsights(locationId)); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI review insights failed."); }
    finally { setBusy(false); }
  };
  const block = (title: string, icon: React.ReactNode, items: string[]) => items.length > 0 && <div>
    <p className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-[#202124]">{icon}{title}</p>
    <ul className="list-disc space-y-0.5 pl-5 text-[12px] leading-5 text-[#3C4043]">{items.map((item) => <li key={item}>{item}</li>)}</ul>
  </div>;
  return <div className="rounded-lg border border-[#E1D9F7] bg-[#FBFAFF] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12.5px] text-[#202124]"><Sparkles className="mr-1 inline size-4 text-[#6D4AE0]" /><b>AI review insights</b> <span className="text-[#5F6368]">· what customers love, what they complain about, and what to do next</span></p>
      <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded bg-[#6D4AE0] px-3 text-[12px] font-medium text-white disabled:opacity-60">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{data ? "Analyse again" : "Analyse reviews"}</button>
    </div>
    {data && <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-[#E8EAED] bg-white px-3 py-2 text-[12px] text-[#3C4043]">
        <span><b>{data.stats.average ?? "—"}</b> ★ average</span><span><b>{data.stats.total}</b> reviews</span><span><b>{data.stats.replyRate}%</b> replied</span><span><b>{data.stats.unanswered}</b> waiting for a reply</span><span><b>{data.stats.last90Days}</b> in the last 90 days</span>
        <span className="text-[#80868B]">{[5, 4, 3, 2, 1].map((stars) => `${stars}★ ${data.stats.ratings[stars] ?? 0}`).join(" · ")}</span>
      </div>
      {data.insights && <div className="grid gap-3 rounded-md border border-[#E8EAED] bg-white p-3 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[12.5px] leading-5 text-[#202124]">{data.insights.summary}</p>
          {block("Customers love", <ThumbsUp className="size-3.5 text-emerald-600" />, data.insights.praise)}
          {block("Complaints", <MessageSquareWarning className="size-3.5 text-red-600" />, data.insights.complaints)}
        </div>
        <div className="space-y-3">
          {block("What to do next", <Lightbulb className="size-3.5 text-[#6D4AE0]" />, data.insights.actions)}
          {data.insights.keywords.length > 0 && <div><p className="mb-1 text-[12px] font-semibold text-[#202124]">Words customers use</p><div className="flex flex-wrap gap-1.5">{data.insights.keywords.map((word) => <span key={word} className="rounded-full bg-[#F3EFFF] px-2 py-0.5 text-[11px] text-[#6D4AE0]">{word}</span>)}</div></div>}
        </div>
      </div>}
      {data.unanswered.length > 0 && onReply && <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="mb-1.5 text-[12px] font-semibold text-amber-900">Waiting for a reply</p>
        <ul className="space-y-1">{data.unanswered.map((review) => <li key={review.id} className="flex items-center justify-between gap-2 text-[12px] text-[#3C4043]"><span className="min-w-0 truncate"><b>{review.name ?? "Customer"}</b> · {review.stars ?? "?"}★ · {review.text || "(rating only)"}</span><button type="button" onClick={() => onReply(review.id)} className="shrink-0 text-[11.5px] font-medium text-[#1A73E8] hover:underline">Reply</button></li>)}</ul>
      </div>}
      <p className="text-[10.5px] text-[#80868B]">Numbers are counted from Google&apos;s reviews (newest 200). AI summarises them and can be wrong.{data.tokensConsumed ? ` · ${data.tokensConsumed.toLocaleString("en-IN")} AI tokens` : ""}</p>
    </div>}
  </div>;
}
