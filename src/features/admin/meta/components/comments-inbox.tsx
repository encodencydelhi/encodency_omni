"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, MessageSquare, RefreshCcw, Reply, Sparkles, ThumbsUp, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { metaCommentsApi, type SocialAiSuggestion, type SocialComment, type SocialPlatform, type SocialThreads } from "../live/meta-social-api";

const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const initials = (name: string | null) => (name ?? "?").replace(/^@/, "").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
const LANGUAGES = [["auto", "Same as the comment"], ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]] as const;
const TONES = ["Friendly", "Professional", "Warm", "Short", "Formal"];

/** AI box inside the reply composer: reads the post, thread and comment on the server; nothing is posted. */
function AiAssist({ platform, accountId, postId, commentId, draft, onUse }: { platform: SocialPlatform; accountId: string; postId: string; commentId?: string; draft: string; onUse: (text: string) => void }) {
  const { companyId } = useTenancyContext();
  const [language, setLanguage] = useState("auto");
  const [tone, setTone] = useState("Friendly");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<SocialAiSuggestion | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ask = async (mode?: string) => {
    if (!companyId) return;
    setBusy(mode ?? "suggest");
    try {
      const next = await metaCommentsApi.suggest(companyId, platform, accountId, mode
        ? { task: "improve", postId, commentId, draft, mode, tone, language, instruction: instruction.trim() || undefined }
        : { task: commentId ? "reply" : "comment", postId, commentId, tone, language, instruction: instruction.trim() || undefined });
      if (mode) { if (next.options[0]) { onUse(next.options[0].text); toast.success("Draft improved. Review it before posting."); } }
      else setResult(next);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI could not suggest a reply."); }
    finally { setBusy(null); }
  };
  const select = "h-7 rounded border border-slate-200 bg-white px-1 text-[11px]";
  return <div className="rounded-md border border-violet-200 bg-violet-50/40 p-2.5">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy !== null} onClick={() => void ask()} className="inline-flex h-7 items-center gap-1.5 rounded bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-60">{busy === "suggest" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{result ? "Suggest again" : commentId ? "Suggest replies with AI" : "Suggest comments with AI"}</button>
      <label className="flex items-center gap-1 text-[10.5px] text-slate-600">Language<select className={select} value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex items-center gap-1 text-[10.5px] text-slate-600">Tone<select className={select} value={tone} onChange={(event) => setTone(event.target.value)}>{TONES.map((value) => <option key={value}>{value}</option>)}</select></label>
      {draft.trim() && <select className={select} value="" disabled={busy !== null} onChange={(event) => { if (event.target.value) void ask(event.target.value); }}>
        <option value="">{busy && busy !== "suggest" ? "Improving…" : "Improve my draft…"}</option>
        {[["polish", "Fix & polish"], ["shorter", "Shorter"], ["friendlier", "Friendlier"], ["formal", "More formal"], ["English", "To English"], ["Hindi", "To Hindi"], ["Hinglish", "To Hinglish"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>}
    </div>
    <input value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} placeholder="Optional note for AI, e.g. “ask them to DM their pickup location”" className="mt-2 h-7 w-full rounded border border-slate-200 bg-white px-2 text-[11px]" />
    {result && <div className="mt-2 space-y-1.5">
      {result.insight && (result.insight.wants || result.insight.approach) && <p className="rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700"><b>Wants:</b> {result.insight.wants} {result.insight.approach && <><br /><b>Best approach:</b> {result.insight.approach}</>}</p>}
      {result.options.map((option, index) => <div key={index} className="flex items-start gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
        <div className="min-w-0 flex-1"><p className="whitespace-pre-wrap text-[12px] text-slate-800">{option.text}</p>{option.why && <p className="text-[10px] text-slate-400">{option.why}</p>}</div>
        <button type="button" onClick={() => onUse(option.text)} className="h-6 shrink-0 rounded border border-violet-500 px-2 text-[10px] font-semibold text-violet-700 hover:bg-violet-50">Use</button>
      </div>)}
      <p className="text-[10px] text-slate-400">AI can be wrong. Nothing is posted until you press Reply.</p>
    </div>}
  </div>;
}

/** Comments on a Facebook Page's or Instagram account's recent posts: reply, like, hide, delete, AI and CRM. */
export function CommentsInbox({ platform, accountId }: { platform: SocialPlatform; accountId: string }) {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<SocialThreads | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [composer, setComposer] = useState<{ postId: string; comment: SocialComment | null } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);

  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    metaCommentsApi.threads(companyId, platform, accountId, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load comments."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, platform, accountId, tick]);
  const reload = useCallback(() => { setLoading(true); setTick((value) => value + 1); }, []);

  const run = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await task(); toast.success(done); setComposer(null); setText(""); reload(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Meta did not accept this."); }
    finally { setBusy(null); }
  };

  if (!clientId) return <p className="p-6 text-sm text-slate-500">Choose a client to see the comments of its linked {platform === "facebook" ? "Page" : "Instagram account"}.</p>;
  if (loading && !data) return <div className="flex min-h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-blue-600" /></div>;
  if (error && !data) return <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={reload} className="ml-2 font-semibold underline">Try again</button></div>;
  if (!data || !companyId) return null;

  const label = platform === "facebook" ? "Page" : "account";
  const answered = (post: SocialThreads["posts"][number], comment: SocialComment) => {
    const thread = comment.parentId ?? comment.id;
    return post.comments.some((reply) => reply.byAccount && (reply.parentId === thread) && (reply.createdAt ?? "") >= (comment.createdAt ?? ""));
  };
  const open = data.posts.flatMap((post) => post.comments.filter((c) => !c.byAccount && !c.parentId && !answered(post, c))).length;
  const send = () => {
    if (!composer || !text.trim()) return;
    const target = composer.comment ? (platform === "facebook" ? composer.comment.parentId ?? composer.comment.id : composer.comment.parentId ?? composer.comment.id) : composer.postId;
    void run("send", () => metaCommentsApi.reply(companyId, platform, accountId, { targetId: target, targetType: composer.comment ? "comment" : "post", text: text.trim() }), composer.comment ? `Reply posted as the ${label}.` : `Comment posted as the ${label}.`);
  };

  const row = (post: SocialThreads["posts"][number], comment: SocialComment) => {
    const lead = data.leads[comment.authorId ?? comment.authorName ?? ""];
    const nested = Boolean(comment.parentId);
    return <div key={comment.id} className={nested ? "ml-10 border-l-2 border-slate-100 pl-3" : ""}>
      <div className={`flex items-start gap-2.5 py-2 ${comment.hidden ? "opacity-60" : ""}`}>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${comment.byAccount ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{initials(comment.authorName)}</span>
        <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-slate-900">{comment.authorName ?? "Someone"}
            {comment.byAccount && <span className="rounded bg-blue-50 px-1 text-[9.5px] text-blue-700">This {label}</span>}
            {comment.hidden && <span className="rounded bg-slate-200 px-1 text-[9.5px] text-slate-600">Hidden</span>}
            {!comment.byAccount && !nested && !answered(post, comment) && <span className="rounded bg-amber-50 px-1 text-[9.5px] text-amber-700">Needs reply</span>}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-800">{comment.text || <i className="text-slate-400">No text</i>}</p>
        </div>
      </div>
      <div className="mb-1 ml-10.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <span className="font-normal">{when(comment.createdAt)}</span>
        {comment.likes > 0 && <span className="inline-flex items-center gap-1 font-normal"><ThumbsUp className="size-3" />{comment.likes}</span>}
        {data.permissions.canWrite && <>
          {!comment.byAccount && <button type="button" onClick={() => { setComposer({ postId: post.postId, comment }); setText(platform === "instagram" && comment.authorName ? `${comment.authorName} ` : ""); }} className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Reply className="size-3" />Reply</button>}
          {platform === "facebook" && comment.canLike && <button type="button" disabled={busy !== null} onClick={() => void run(`like:${comment.id}`, () => metaCommentsApi.like(companyId, accountId, comment.id, !comment.likedByAccount), comment.likedByAccount ? "Like removed." : `Liked as the ${label}.`)} className={`inline-flex items-center gap-1 ${comment.likedByAccount ? "text-blue-600" : "hover:text-blue-600"}`}><ThumbsUp className="size-3" />{comment.likedByAccount ? "Liked" : "Like"}</button>}
          {comment.canHide && <button type="button" disabled={busy !== null} onClick={() => void run(`hide:${comment.id}`, () => metaCommentsApi.hide(companyId, platform, accountId, comment.id, !comment.hidden), comment.hidden ? "Comment visible again." : "Comment hidden (only the writer and their friends see it).")} className="inline-flex items-center gap-1 hover:text-slate-800">{comment.hidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}{comment.hidden ? "Unhide" : "Hide"}</button>}
          {comment.canDelete && <button type="button" disabled={busy !== null} onClick={() => { if (window.confirm(`Delete this comment from ${platform === "facebook" ? "Facebook" : "Instagram"}? This cannot be undone.`)) void run(`del:${comment.id}`, () => metaCommentsApi.remove(companyId, platform, accountId, comment.id), "Comment deleted."); }} className="inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 className="size-3" />Delete</button>}
        </>}
        {!comment.byAccount && (lead
          ? <Link href="/admin/crm/leads" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><CheckCircle2 className="size-3" />In CRM</Link>
          : <button type="button" disabled={busy !== null} onClick={() => void run(`lead:${comment.id}`, async () => { const r = await metaCommentsApi.lead(companyId, platform, accountId, post.postId, comment.id); if (r.insight) toast.info(`AI: ${r.insight.interest || "lead saved"} · score ${r.insight.score}`); }, "Saved as a CRM lead.")} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">{busy === `lead:${comment.id}` ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}Save as lead</button>)}
      </div>
      {composer?.comment?.id === comment.id && <div className="ml-10.5">{editor(post.postId, comment)}</div>}
    </div>;
  };

  const editor = (postId: string, comment: SocialComment | null) => <div className="mt-2 space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-2">
    <AiAssist platform={platform} accountId={accountId} postId={postId} commentId={comment?.id} draft={text} onUse={setText} />
    <textarea autoFocus rows={3} value={text} onChange={(event) => setText(event.target.value)} maxLength={platform === "facebook" ? 8000 : 2200} placeholder={comment ? `Reply to ${comment.authorName ?? "this comment"} as the ${label}…` : `Write a comment as the ${label}…`} className="w-full rounded border border-slate-200 bg-white p-2 text-[12.5px]" />
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10.5px] text-slate-400">Posts publicly as {data.accountName}</span>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setComposer(null); setText(""); }} className="h-7 rounded border border-slate-200 bg-white px-2.5 text-[11px] font-semibold">Cancel</button>
        <button type="button" disabled={!text.trim() || busy !== null} onClick={send} className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50">{busy === "send" ? <Loader2 className="size-3 animate-spin" /> : <Reply className="size-3" />}{comment ? "Reply" : "Comment"}</button>
      </div>
    </div>
  </div>;

  const posts = data.posts.filter((post) => post.comments.length || !onlyOpen).filter((post) => !onlyOpen || post.comments.some((c) => !c.byAccount && !c.parentId && !answered(post, c)));
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
      <p className="text-xs text-slate-500">Comments on the last {data.posts.length} posts · <b className="text-amber-700">{open} need a reply</b></p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><input type="checkbox" checked={onlyOpen} onChange={(event) => setOnlyOpen(event.target.checked)} />Only comments that need a reply</label>
        <button type="button" onClick={reload} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} />Refresh</button>
      </div>
    </div>
    {data.permissions.missing.length > 0 && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
      <b>Reconnect Meta to use everything here.</b> The current connection did not grant: {data.permissions.missing.join(", ")}. Go to Integrations → Meta → Reconnect and allow all permissions.{!data.permissions.canWrite && " Until then you can read comments but not reply, hide or delete."}
    </div>}
    <div className="divide-y divide-slate-100">{posts.map((post) => <div key={post.postId} className="px-5 py-4">
      <div className="flex items-start gap-3">
        {post.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={post.imageUrl} alt="" className="size-12 shrink-0 rounded object-cover" />}
        <p className="min-w-0 flex-1 text-xs text-slate-600"><MessageSquare className="mr-1 inline size-3.5 text-blue-600" /><b className="text-slate-800">Post</b> · {when(post.publishedAt)} · {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}<br /><span className="italic">{post.text.slice(0, 140) || "(no caption)"}{post.text.length > 140 ? "…" : ""}</span></p>
        <div className="flex shrink-0 gap-3 text-[11px] font-semibold">
          {data.permissions.canWrite && <button type="button" onClick={() => { setComposer({ postId: post.postId, comment: null }); setText(""); }} className="text-blue-600 hover:underline">Comment</button>}
          {post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Open <ExternalLink className="size-3" /></a>}
        </div>
      </div>
      {composer && !composer.comment && composer.postId === post.postId && editor(post.postId, null)}
      <div className="mt-1">{post.comments.filter((c) => !c.parentId).map((comment) => <div key={comment.id}>{row(post, comment)}{post.comments.filter((reply) => reply.parentId === comment.id).map((reply) => row(post, reply))}</div>)}</div>
      {!post.comments.length && <p className="mt-1 text-[11px] text-slate-400">No comments yet.</p>}
    </div>)}</div>
    {!posts.length && <p className="p-8 text-center text-sm text-slate-500">{onlyOpen ? "Every comment has a reply." : "No posts yet."}</p>}
  </div>;
}
