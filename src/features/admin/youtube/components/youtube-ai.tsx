"use client";

import { useState } from "react";
import { Check, Clapperboard, ImagePlus, Lightbulb, Loader2, Sparkles, ThumbsUp, TrendingUp, Wand2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useYouTubeScope } from "../data/hooks";
import { youtubeApi, type YtAiInsights, type YtAiLanguage, type YtAiMetadata, type YtAiReplies, type YtAiShorts } from "../live/youtube-api";
import { fetchDynamicAiVisual, generatedImageFile } from "@/features/admin/content/services/ai-image.service";

const LANGUAGES: Array<[YtAiLanguage, string]> = [["auto", "Auto"], ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]];
const box = "rounded-md border border-[#E1D9F7] bg-[#FBFAFF] p-3";
const aiBtn = "inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#6D4AE0] px-3 text-[12px] font-semibold text-white disabled:opacity-60";
const sel = "h-8 rounded-sm border border-[#C9D1DC] bg-white px-1.5 text-[12px]";
const useBtn = "inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border border-[#6D4AE0] px-2 text-[11px] font-semibold text-[#6D4AE0] hover:bg-[#F3EFFF]";
const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof Error ? cause.message : fallback);

/**
 * AI writer for a video's title, description, tags (and chapters only from real timestamps in your notes).
 * Reads the channel and, for an existing video, its current details on the server. Fills the form; you save.
 */
export function YtAiMetadataPanel({ videoId, brief, onApply }: { videoId?: string; brief: string; onApply: (patch: { title?: string; description?: string; tags?: string[] }) => void }) {
  const scope = useYouTubeScope();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<YtAiLanguage>("auto");
  const [result, setResult] = useState<YtAiMetadata | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!scope) return;
    const about = topic.trim() || brief.trim();
    if (!videoId && !about) { toast.info("Write in a few words what the video is about."); return; }
    setBusy(true);
    try { setResult(await youtubeApi.aiMetadata(scope, { videoId, brief: about || undefined, notes: notes.trim() || undefined, language })); }
    catch (cause) { fail(cause, "AI could not write the details."); }
    finally { setBusy(false); }
  };
  const fullDescription = (r: YtAiMetadata) => [r.hashtags.join(" "), r.description, r.chapters.length ? `\nChapters:\n${r.chapters.join("\n")}` : ""].filter(Boolean).join("\n\n").slice(0, 5000);
  return <div className={box}>
    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#24324F]"><Wand2 className="size-4 text-[#6D4AE0]" />Write title, description and tags with AI</p>
    <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={2000} placeholder={videoId ? "Optional: anything to highlight" : "What is the video about? e.g. “why Vruum is safer than roadside taxis”"} className="h-8 w-full rounded-sm border border-[#C9D1DC] bg-white px-2 text-[12px]" />
    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={6000} placeholder="Optional notes: key points, links to include, and timestamps (0:00 Intro, 1:20 Booking…) to create chapters" className="mt-2 w-full rounded-sm border border-[#C9D1DC] bg-white p-2 text-[12px]" />
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-[11.5px] text-[#4B5874]">Language<select className={sel} value={language} onChange={(e) => setLanguage(e.target.value as YtAiLanguage)}>{LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button type="button" onClick={() => void run()} disabled={busy} className={aiBtn}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{result ? "Write again" : "Write with AI"}</button>
      {result && <button type="button" onClick={() => { onApply({ title: result.titles[0], description: fullDescription(result), tags: result.tags }); toast.success("AI title, description and tags added. Review before saving."); }} className={useBtn + " h-8 px-3"}><Check className="size-3" />Use all</button>}
    </div>
    {result && <div className="mt-3 space-y-3 text-[12.5px]">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7890]">Titles</p>
        <ul className="space-y-1">{result.titles.map((title) => <li key={title} className="flex items-center gap-2 rounded-sm border border-[#E4E7EC] bg-white px-2 py-1.5"><span className="min-w-0 flex-1">{title} <span className="text-[10.5px] text-[#98A2B3]">{title.length}/100</span></span><button type="button" onClick={() => onApply({ title })} className={useBtn}>Use</button></li>)}</ul>
      </div>
      <div>
        <p className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#6B7890]">Description <button type="button" onClick={() => onApply({ description: fullDescription(result) })} className={useBtn}>Use</button></p>
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-sm border border-[#E4E7EC] bg-white p-2 text-[12px] leading-5">{fullDescription(result)}</p>
        {!result.chapters.length && <p className="mt-1 text-[10.5px] text-[#98A2B3]">No chapters: add real timestamps in the notes to get them (AI never makes up times).</p>}
      </div>
      <div>
        <p className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#6B7890]">Tags <span className="normal-case">{result.tagCharacters}/500 · <button type="button" onClick={() => onApply({ tags: result.tags })} className={useBtn}>Use</button></span></p>
        <div className="flex flex-wrap gap-1">{result.tags.map((tag) => <span key={tag} className="rounded-sm bg-[#F2F4F7] px-1.5 py-0.5 text-[11px]">{tag}</span>)}</div>
      </div>
      <p className="text-[10.5px] text-[#98A2B3]">AI can be wrong; check facts before saving. {result.tokensConsumed.toLocaleString("en-IN")} AI tokens.</p>
    </div>}
  </div>;
}

/** Burns short bold text onto the bottom of a 1280x720 image (readable on phones). */
async function withOverlay(url: string, text: string): Promise<string> {
  if (!text.trim()) return url;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 1280, 720);
  let size = 96;
  ctx.font = `900 ${size}px Arial Black, Arial, sans-serif`;
  while (ctx.measureText(text).width > 1160 && size > 48) { size -= 6; ctx.font = `900 ${size}px Arial Black, Arial, sans-serif`; }
  const gradient = ctx.createLinearGradient(0, 720 - size * 2.2, 0, 720);
  gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 720 - size * 2.2, 1280, size * 2.2);
  ctx.lineWidth = Math.round(size / 8); ctx.strokeStyle = "#000"; ctx.fillStyle = "#FFE600"; ctx.textBaseline = "bottom";
  ctx.strokeText(text, 56, 720 - size * 0.45); ctx.fillText(text, 56, 720 - size * 0.45);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** AI thumbnail: AI writes the image prompt from the video, the image model draws 1280x720, bold text is added on top. */
export function YtAiThumbnailButton({ videoId, brief, onImage }: { videoId?: string; brief: string; onImage: (file: File, preview: string) => void }) {
  const scope = useYouTubeScope();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!scope) return;
    if (!videoId && !brief.trim()) { toast.info("Add a title first, so AI knows what the thumbnail is about."); return; }
    setBusy(true);
    try {
      const idea = await youtubeApi.aiThumbnailPrompt(scope, { videoId, brief: brief.trim() || undefined });
      const visual = await fetchDynamicAiVisual(idea.prompt, "Vibrant", 0, idea.prompt, scope.companyId, { size: "1536x1024", canvas: { width: 1280, height: 720, ratio: "16:9" }, quality: "high" });
      const preview = await withOverlay(visual.url, idea.overlayText);
      const file = await generatedImageFile(preview);
      if (file.size > 2 * 1024 * 1024) throw new Error("The AI thumbnail is over 2 MB (YouTube's limit). Try again.");
      onImage(file, preview);
      toast.success("AI thumbnail ready. Check it before saving.");
    } catch (cause) { fail(cause, "AI could not make a thumbnail."); }
    finally { setBusy(false); }
  };
  return <button type="button" onClick={() => void run()} disabled={busy} className="flex aspect-video flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#C7B8F5] bg-[#FBFAFF] text-[12px] font-medium text-[#6D4AE0] hover:border-[#6D4AE0] disabled:opacity-60">
    {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{busy ? "Creating…" : "AI thumbnail"}
  </button>;
}

/** AI reply box for one comment: reads the video and the whole thread. Fills the reply; you send it. */
export function YtAiCommentReply({ videoId, commentId, draft, onUse }: { videoId: string; commentId: string; draft: string; onUse: (text: string) => void }) {
  const scope = useYouTubeScope();
  const [language, setLanguage] = useState<YtAiLanguage>("auto");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<YtAiReplies | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ask = async (mode?: string) => {
    if (!scope) return;
    setBusy(mode ?? "suggest");
    try {
      const next = await youtubeApi.aiCommentReply(scope, { videoId, commentId, language, instruction: instruction.trim() || undefined, ...(mode ? { draft, mode } : {}) });
      if (mode) { if (next.options[0]) { onUse(next.options[0].text); toast.success("Draft improved."); } } else setResult(next);
    } catch (cause) { fail(cause, "AI could not suggest a reply."); }
    finally { setBusy(null); }
  };
  return <div className={box}>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void ask()} disabled={busy !== null} className={aiBtn}>{busy === "suggest" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{result ? "Suggest again" : "Suggest replies with AI"}</button>
      <select className={sel} value={language} onChange={(e) => setLanguage(e.target.value as YtAiLanguage)} aria-label="Language">{LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l === "Auto" ? "Same as the comment" : l}</option>)}</select>
      {draft.trim() && <select className={sel} value="" disabled={busy !== null} onChange={(e) => { if (e.target.value) void ask(e.target.value); }} aria-label="Improve draft">
        <option value="">{busy && busy !== "suggest" ? "Improving…" : "Improve my draft…"}</option>
        {[["polish", "Fix & polish"], ["shorter", "Shorter"], ["friendlier", "Friendlier"], ["Hindi", "To Hindi"], ["English", "To English"], ["Hinglish", "To Hinglish"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>}
    </div>
    <input value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={500} placeholder="Optional note for AI" className="mt-2 h-8 w-full rounded-sm border border-[#C9D1DC] bg-white px-2 text-[12px]" />
    {result && <div className="mt-2 space-y-1.5">
      {result.insight && <p className="rounded-sm border border-[#E4E7EC] bg-white px-2 py-1.5 text-[11.5px]"><b>Wants:</b> {result.insight.wants} <b className="ml-2">Approach:</b> {result.insight.approach}</p>}
      {result.options.map((option, i) => <div key={i} className="flex items-start gap-2 rounded-sm border border-[#E4E7EC] bg-white px-2 py-1.5"><p className="min-w-0 flex-1 whitespace-pre-wrap text-[12.5px]">{option.text}{option.why && <span className="block text-[10.5px] text-[#98A2B3]">{option.why}</span>}</p><button type="button" onClick={() => onUse(option.text)} className={useBtn}>Use</button></div>)}
      <p className="text-[10.5px] text-[#98A2B3]">Nothing is posted until you press Reply.</p>
    </div>}
  </div>;
}

/** Last 28 days explained with real numbers, plus five next-video ideas. */
export function YtAiInsightsCard() {
  const scope = useYouTubeScope();
  const [data, setData] = useState<YtAiInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!scope) return;
    setBusy(true);
    try { setData(await youtubeApi.aiInsights(scope)); } catch (cause) { fail(cause, "AI insights failed."); } finally { setBusy(false); }
  };
  const list = (title: string, icon: React.ReactNode, items: string[]) => items.length > 0 && <div><p className="mb-1 flex items-center gap-1 text-[12.5px] font-semibold text-[#24324F]">{icon}{title}</p><ul className="list-disc space-y-0.5 pl-5 text-[12.5px] leading-5 text-[#3C4A66]">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
  return <div className={box}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[13px] text-[#24324F]"><Sparkles className="mr-1 inline size-4 text-[#6D4AE0]" /><b>AI channel insights</b> <span className="text-[#6B7890]">· last 28 days: what worked, what to fix, and 5 next video ideas</span></p>
      <button type="button" onClick={() => void run()} disabled={busy} className={aiBtn}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{data ? "Analyse again" : "Analyse my channel"}</button>
    </div>
    {data && <div className="mt-3 space-y-3">
      {data.reason && <p className="text-[12.5px] text-amber-800">{data.reason}</p>}
      <p className="text-[12px] text-[#4B5874]">{data.range.startDate} – {data.range.endDate}: <b>{data.totals.views ?? "—"}</b> views · <b>{data.totals.estimatedMinutesWatched ?? "—"}</b> watch minutes · avg <b>{data.totals.averageViewDurationSeconds ?? "—"}s</b> · +{data.totals.subscribersGained ?? 0} / −{data.totals.subscribersLost ?? 0} subscribers</p>
      {data.insights && <div className="grid gap-3 rounded-sm border border-[#E4E7EC] bg-white p-3 lg:grid-cols-2">
        <div className="space-y-3"><p className="flex gap-1 text-[12.5px] leading-5"><TrendingUp className="mt-0.5 size-4 shrink-0 text-[#6D4AE0]" />{data.insights.summary}</p>{list("What works", <ThumbsUp className="size-3.5 text-emerald-600" />, data.insights.whatWorks)}{list("Improve", <Wrench className="size-3.5 text-amber-600" />, data.insights.improve)}</div>
        <div><p className="mb-1 flex items-center gap-1 text-[12.5px] font-semibold text-[#24324F]"><Lightbulb className="size-3.5 text-[#6D4AE0]" />Next video ideas</p><ul className="space-y-1.5">{data.insights.ideas.map((idea) => <li key={idea.title} className="text-[12.5px]"><b>{idea.title}</b><span className="block text-[11.5px] text-[#6B7890]">{idea.why}</span></li>)}</ul></div>
      </div>}
      <p className="text-[10.5px] text-[#98A2B3]">Numbers come from YouTube Analytics (the last 2 days are still being counted). AI explains them and can be wrong.</p>
    </div>}
  </div>;
}

/** Five Shorts ideas (hook + script) cut from one long video. */
export function YtAiShortsPanel({ videoId }: { videoId: string }) {
  const scope = useYouTubeScope();
  const [data, setData] = useState<YtAiShorts | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!scope) return;
    setBusy(true);
    try { setData(await youtubeApi.aiShorts(scope, { videoId })); } catch (cause) { fail(cause, "AI could not suggest Shorts."); } finally { setBusy(false); }
  };
  return <div className={box}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[13px] text-[#24324F]"><Clapperboard className="mr-1 inline size-4 text-[#6D4AE0]" /><b>Shorts from this video</b> <span className="text-[#6B7890]">· 5 ideas with a hook and script</span></p>
      <button type="button" onClick={() => void run()} disabled={busy} className={aiBtn}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{data ? "Again" : "Suggest Shorts"}</button>
    </div>
    {data && <ul className="mt-3 space-y-2">{data.ideas.map((idea) => <li key={idea.title} className="rounded-sm border border-[#E4E7EC] bg-white p-2 text-[12.5px]">
      <p className="font-semibold text-[#24324F]">{idea.title}</p>
      <p className="text-[#6D4AE0]">Hook: “{idea.hook}”</p>
      <p className="mt-1 whitespace-pre-wrap text-[#3C4A66]">{idea.script}</p>
      {idea.fromVideo && <p className="mt-1 text-[10.5px] text-[#98A2B3]">From: {idea.fromVideo}</p>}
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(`${idea.title}\n\nHook: ${idea.hook}\n\n${idea.script}`); toast.success("Copied."); }} className={useBtn + " mt-1"}>Copy</button>
    </li>)}</ul>}
  </div>;
}
