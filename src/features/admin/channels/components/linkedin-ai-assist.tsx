"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, UserSearch, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInAiImproveMode, type LinkedInAiLanguage, type LinkedInAiSuggestion } from "../../integrations/live/integrations-api";

const LANGUAGES: Array<[LinkedInAiLanguage, string]> = [["auto", "Same as the comment"], ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]];
const TONES = ["Professional", "Friendly", "Warm", "Short", "Formal"];
const IMPROVE: Array<[LinkedInAiImproveMode, string]> = [["polish", "Fix & polish"], ["shorter", "Make shorter"], ["friendlier", "Friendlier"], ["formal", "More formal"], ["English", "To English"], ["Hindi", "To Hindi"], ["Hinglish", "To Hinglish"]];

/**
 * AI inside the reply box. The server reads the post, the whole thread and the commenter's LinkedIn profile, then
 * proposes three replies (or a rewrite of the draft). Choosing one only fills the box; a person still presses Reply.
 */
export function LinkedInAiAssist({ task, postUrn, commentUrn, threadUrn, history, draft, onUse }: {
  task: "reply" | "comment"; postUrn: string; commentUrn?: string; threadUrn?: string; history?: string; draft: string; onUse: (text: string) => void;
}) {
  const { companyId, clientId } = useTenancyContext();
  const [language, setLanguage] = useState<LinkedInAiLanguage>("auto");
  const [tone, setTone] = useState("Professional");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<LinkedInAiSuggestion | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const ask = async (kind: "suggest" | LinkedInAiImproveMode) => {
    if (!companyId || !clientId) return;
    setBusy(kind);
    try {
      const next = await integrationsApi.suggestLinkedInReply(companyId, clientId, kind === "suggest"
        ? { task, postUrn, commentUrn, threadUrn, history, tone, language, instruction: instruction.trim() || undefined }
        : { task: "improve", postUrn, commentUrn, threadUrn, history, draft, mode: kind, tone, language: kind === "English" || kind === "Hindi" || kind === "Hinglish" ? kind : language, instruction: instruction.trim() || undefined });
      if (kind === "suggest") setResult(next);
      else if (next.options[0]) { onUse(next.options[0].text); toast.success("Draft improved. Review it before posting."); }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "AI could not suggest a reply right now.");
    } finally { setBusy(null); }
  };

  return <div className="mt-2 rounded border border-[#E1D9F7] bg-[#FBFAFF] p-2.5">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy !== null} onClick={() => void ask("suggest")} className="inline-flex h-7 items-center gap-1.5 bg-[#6D4AE0] px-2.5 text-[10.5px] font-semibold text-white disabled:opacity-60">
        {busy === "suggest" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{result ? "Suggest again" : task === "reply" ? "Suggest replies with AI" : "Suggest comments with AI"}
      </button>
      <label className="flex items-center gap-1 text-[10px] text-[#52617D]">Language
        <select value={language} onChange={(event) => setLanguage(event.target.value as LinkedInAiLanguage)} className="h-7 border border-[#DDE4ED] bg-white px-1 text-[10.5px]">{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#52617D]">Tone
        <select value={tone} onChange={(event) => setTone(event.target.value)} className="h-7 border border-[#DDE4ED] bg-white px-1 text-[10.5px]">{TONES.map((value) => <option key={value}>{value}</option>)}</select>
      </label>
      {draft.trim() && <label className="flex items-center gap-1 text-[10px] text-[#52617D]"><Wand2 className="size-3 text-[#6D4AE0]" />
        <select value="" disabled={busy !== null} onChange={(event) => { if (event.target.value) void ask(event.target.value as LinkedInAiImproveMode); }} className="h-7 border border-[#DDE4ED] bg-white px-1 text-[10.5px]">
          <option value="">{busy && busy !== "suggest" ? "Improving…" : "Improve my draft…"}</option>{IMPROVE.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>}
    </div>
    <input value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} placeholder="Optional note for AI, e.g. “ask them to DM their phone number” or “mention free consultation”" className="mt-2 h-7 w-full border border-[#DDE4ED] bg-white px-2 text-[10.5px] text-[#253352]" />

    {result && <div className="mt-2.5 space-y-2">
      <p className="text-[9.5px] text-[#7B89A4]">AI read: the full post{result.read.postAttachment ? ` (${result.read.postAttachment.slice(0, 60)})` : ""}{task === "reply" ? `, the comment thread (${result.read.threadLength})` : ""}, {result.read.otherComments} other comment(s){result.read.commenter?.headline ? ", and the commenter's LinkedIn headline" : ""}{history ? ` and their activity on this page (${history})` : ""}.</p>
      {result.insight && <div className="rounded border border-[#E3E9F0] bg-white px-2.5 py-2 text-[10.5px] leading-5 text-[#253352]">
        <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#6D4AE0]"><UserSearch className="size-3" />Who is commenting</p>
        {result.insight.who && <p><span className="font-semibold">Who:</span> {result.insight.who}</p>}
        {result.insight.wants && <p><span className="font-semibold">Wants:</span> {result.insight.wants}</p>}
        {result.insight.approach && <p><span className="font-semibold">Best approach:</span> {result.insight.approach}</p>}
      </div>}
      {result.options.map((option, index) => <div key={index} className="flex items-start gap-2 rounded border border-[#E3E9F0] bg-white px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[11.5px] leading-5 text-[#172044]">{option.text}</p>
          {option.why && <p className="mt-0.5 text-[9.5px] text-[#8A97AF]">{option.why}</p>}
        </div>
        <button type="button" onClick={() => onUse(option.text)} className="inline-flex h-6 shrink-0 items-center gap-1 border border-[#6D4AE0] px-2 text-[10px] font-semibold text-[#6D4AE0] hover:bg-[#F3EFFF]"><Check className="size-3" />Use</button>
      </div>)}
      <p className="text-[9.5px] text-[#8A97AF]">AI suggestions can be wrong. Edit as needed; nothing is posted until you press {task === "reply" ? "Reply" : "Comment"}.</p>
    </div>}
  </div>;
}
