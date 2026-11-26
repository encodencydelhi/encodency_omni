"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Heart, Loader2, Lock, MessageSquare, RefreshCcw, Reply, Sparkles, ThumbsUp, Trash2, Unlock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInActor, type LinkedInAiReview, type LinkedInComment, type LinkedInConversations } from "../../integrations/live/integrations-api";
import { LinkedInAiAssist } from "./linkedin-ai-assist";
import { LinkedInMentionsPanel, LinkedInTopFans } from "./linkedin-inbox-extras";
import { LoadError, Loading, Notice } from "./linkedin-ads-leads";

const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const postLink = (urn: string) => `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`;
/** LinkedIn's reaction names as members see them. */
const REACTION_LABEL: Record<string, string> = { LIKE: "Like", PRAISE: "Celebrate", EMPATHY: "Love", INTEREST: "Insightful", APPRECIATION: "Support", ENTERTAINMENT: "Funny" };
const REACTION_EMOJI: Record<string, string> = { LIKE: "👍", PRAISE: "👏", EMPATHY: "❤️", INTEREST: "💡", APPRECIATION: "🤝", ENTERTAINMENT: "😄" };
const INTENT_STYLE: Record<string, [string, string]> = {
  lead: ["Lead", "bg-emerald-50 text-emerald-700 border-emerald-200"], question: ["Question", "bg-sky-50 text-sky-700 border-sky-200"],
  praise: ["Praise", "bg-violet-50 text-violet-700 border-violet-200"], complaint: ["Complaint", "bg-red-50 text-red-700 border-red-200"],
  spam: ["Spam", "bg-slate-100 text-slate-600 border-slate-200"], other: ["Other", "bg-slate-50 text-slate-600 border-slate-200"],
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

function Avatar({ actor, own }: { actor: LinkedInActor | undefined; own: boolean }) {
  return <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${own ? "bg-[#0A66C2] text-white" : actor?.kind === "organization" ? "bg-[#E8F3EE] text-[#1F7A4D]" : "bg-[#EAF3FB] text-[#0A66C2]"}`}>{actor ? initials(actor.name) : "?"}</span>;
}

/** Name with a link to the LinkedIn profile or page, and a fallback when LinkedIn hides who it was. */
function ActorName({ actor, urn, own }: { actor: LinkedInActor | undefined; urn: string | null; own: boolean }) {
  const name = actor?.name ?? (urn?.startsWith("urn:li:organization:") ? "A company page" : "A LinkedIn member");
  return <span className="font-semibold text-[#172044]">
    {actor?.profileUrl ? <a href={actor.profileUrl} target="_blank" rel="noreferrer" className="hover:text-[#0A66C2] hover:underline">{name}</a> : name}
    {own && <span className="ml-1.5 rounded-sm bg-[#EAF3FB] px-1 py-px text-[9px] font-semibold text-[#0A66C2]">This page</span>}
  </span>;
}

/** Comments and reactions on the page's recent posts, with replies, likes and deletes done as the page. */
export function LinkedInConversationsPanel() {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<LinkedInConversations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [replyTo, setReplyTo] = useState<LinkedInComment | null>(null);
  const [newComment, setNewComment] = useState<string | null>(null);
  const [openReactions, setOpenReactions] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<LinkedInAiReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [onlyNeedsReply, setOnlyNeedsReply] = useState(false);
  const [view, setView] = useState<"comments" | "mentions" | "fans">("comments");

  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInConversations(companyId, clientId, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load the comments."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, tick]);
  const reload = useCallback(() => { setLoading(true); setTick((value) => value + 1); }, []);
  const actor = (urn: string | null) => (urn ? data?.actors?.[urn] : undefined);
  /** How often someone engaged with the page's recent posts, so AI can thank regulars and welcome newcomers. */
  const history = (urn: string | null) => {
    if (!urn || !data) return undefined;
    const reacted = data.posts.filter((post) => post.reactions.some((row) => row.actorUrn === urn)).length;
    const commented = data.posts.reduce((sum, post) => sum + post.comments.filter((row) => row.actorUrn === urn).length, 0);
    return `Reacted to ${reacted} of the page's last ${data.posts.length} active posts; wrote ${commented} comment(s) on them`;
  };
  const pageName = data ? actor(data.organizationUrn)?.name ?? "the company page" : "";
  /** Comments the page has answered later in the same thread: never "Needs reply", whatever AI said earlier. */
  const answered = new Set<string>();
  for (const post of data?.posts ?? []) for (const comment of post.comments) {
    if (comment.byThisPage) continue;
    const thread = comment.parentUrn ?? comment.urn;
    if (post.comments.some((reply) => reply.byThisPage && reply.parentUrn === thread && (reply.createdAt ?? "") > (comment.createdAt ?? ""))) answered.add(comment.urn);
  }
  const verdictOf = (urn: string) => {
    const verdict = review?.items[urn] ?? data?.triage?.[urn];
    return verdict ? { ...verdict, needsReply: verdict.needsReply && !answered.has(urn) } : undefined;
  };
  const saveLead = (postUrn: string, comment: LinkedInComment) => {
    if (!companyId || !clientId) return;
    void run(`lead:${comment.urn}`, async () => {
      const result = await integrationsApi.linkedInLeadFromComment(companyId, clientId, { postUrn, commentUrn: comment.urn, threadUrn: comment.parentUrn ?? undefined });
      if (!result.created) toast.info(`${result.name} is already in the CRM.`);
      else if (result.insight) toast.info(`AI: ${result.insight.interest || "lead saved"} · score ${result.insight.score}${result.insight.nextStep ? ` · next: ${result.insight.nextStep}` : ""}`, { duration: 9000 });
    }, "Saved as a CRM lead.");
  };
  const toggleComments = (postUrn: string, open: boolean) => {
    if (!companyId || !clientId) return;
    if (!open && !window.confirm("Turn off comments on this post? People will not be able to comment until you turn them on again.")) return;
    void run(`lock:${postUrn}`, () => integrationsApi.setLinkedInComments(companyId, clientId, postUrn, open), open ? "Comments turned on." : "Comments turned off.");
  };
  const runReview = async () => {
    if (!companyId || !clientId || !data) return;
    const comments = data.posts.flatMap((post) => post.comments.filter((row) => !row.parentUrn && !row.byThisPage).map((row) => ({
      urn: row.urn, author: actor(row.actorUrn)?.name ?? "A LinkedIn member", headline: actor(row.actorUrn)?.headline ?? undefined, text: row.text.slice(0, 1250), postText: post.text.slice(0, 300),
      pageReplied: post.comments.some((reply) => reply.parentUrn === row.urn && reply.byThisPage),
    }))).slice(0, 60);
    if (!comments.length) { toast.info("No comments from other people to review."); return; }
    setReviewing(true);
    try { setReview(await integrationsApi.reviewLinkedInComments(companyId, clientId, { pageName, comments })); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "AI review failed."); }
    finally { setReviewing(false); }
  };

  const run = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await task(); toast.success(done); setReplyTo(null); setNewComment(null); setText(""); reload(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "LinkedIn did not accept this."); }
    finally { setBusy(null); }
  };
  const send = (postUrn: string, parentUrn?: string) => {
    if (!companyId || !clientId || !text.trim()) return;
    void run(`send:${parentUrn ?? postUrn}`, () => integrationsApi.commentOnLinkedIn(companyId, clientId, { postUrn, parentUrn, text: text.trim() }), parentUrn ? "Reply posted on LinkedIn as the page." : "Comment posted on LinkedIn as the page.");
  };

  const composer = (postUrn: string, parent?: LinkedInComment) => <div className="mt-2 rounded border border-[#C8DDF0] bg-[#F7FBFF] p-2">
    <LinkedInAiAssist task={parent ? "reply" : "comment"} postUrn={postUrn} commentUrn={parent?.urn} threadUrn={parent?.parentUrn ?? undefined} history={parent ? history(parent.actorUrn) : undefined} draft={text} onUse={setText} />
    <label className="sr-only" htmlFor={`li-reply-${parent?.id ?? postUrn}`}>{parent ? "Reply" : "Comment"}</label>
    <textarea id={`li-reply-${parent?.id ?? postUrn}`} rows={2} maxLength={1250} autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={parent ? `Reply to ${actor(parent.actorUrn)?.name ?? "this comment"} as the page…` : "Write a comment as the page…"} className="mt-2 w-full border border-[#DDE4ED] bg-white p-2 text-[12px] text-[#253352]" />
    <div className="mt-1 flex items-center justify-between gap-2">
      <span className="text-[10px] text-[#8A97AF]">{text.length}/1,250 · posts publicly as the page</span>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setReplyTo(null); setNewComment(null); setText(""); }} className="h-7 border border-[#DDE4ED] bg-white px-2.5 text-[10.5px] font-semibold text-[#253352]">Cancel</button>
        <button type="button" disabled={!text.trim() || busy !== null} onClick={() => send(postUrn, parent?.parentUrn ?? parent?.urn)} className="inline-flex h-7 items-center gap-1 bg-[#0A66C2] px-2.5 text-[10.5px] font-semibold text-white disabled:opacity-50">{busy?.startsWith("send") ? <Loader2 className="size-3 animate-spin" /> : <Reply className="size-3" />}{parent ? "Reply" : "Comment"}</button>
      </div>
    </div>
  </div>;

  const row = (comment: LinkedInComment, postUrn: string, nested: boolean) => {
    const who = actor(comment.actorUrn);
    const verdict = verdictOf(comment.urn);
    const lead = comment.actorUrn ? data?.leads?.[comment.actorUrn] : undefined;
    return <div key={comment.urn} className={nested ? "ml-10 border-l-2 border-[#E8EDF3] pl-3" : ""}>
      <div className="flex items-start gap-2.5 py-2">
        <Avatar actor={who} own={comment.byThisPage} />
        <div className="min-w-0 flex-1 rounded-md bg-[#F6F8FB] px-3 py-2">
          <p className="flex flex-wrap items-center gap-1.5 text-[11.5px]"><ActorName actor={who} urn={comment.actorUrn} own={comment.byThisPage} />
            {verdict && <span className={`rounded-sm border px-1 py-px text-[9px] font-semibold ${INTENT_STYLE[verdict.intent]?.[1] ?? ""}`}>{INTENT_STYLE[verdict.intent]?.[0] ?? verdict.intent}</span>}
            {verdict?.needsReply && <span className="rounded-sm border border-amber-200 bg-amber-50 px-1 py-px text-[9px] font-semibold text-amber-700">Needs reply{verdict.priority === "high" ? " · high" : ""}</span>}
          </p>
          {verdict?.note && <p className="text-[10px] italic text-[#6D4AE0]">AI: {verdict.note}</p>}
          {who?.headline && <p className="truncate text-[10px] text-[#7B89A4]">{who.headline}</p>}
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[#172044]">{comment.text || <span className="italic text-[#8A97AF]">No text</span>}</p>
        </div>
      </div>
      <div className="mb-1 ml-10.5 flex flex-wrap items-center gap-3 text-[10.5px] font-semibold text-[#7B89A4]">
        <span className="font-normal">{when(comment.createdAt)}</span>
        {comment.likes > 0 && <span className="inline-flex items-center gap-1 font-normal"><ThumbsUp className="size-3" />{comment.likes}</span>}
        {data?.canReply && <>
          {!(nested && comment.byThisPage) && <button type="button" onClick={() => { setReplyTo(comment); setNewComment(null); setText(""); }} className="inline-flex items-center gap-1 text-[#0A66C2] hover:underline"><Reply className="size-3" />Reply</button>}
          <button type="button" disabled={busy !== null} onClick={() => companyId && clientId && void run(`like:${comment.urn}`, () => integrationsApi.reactOnLinkedIn(companyId, clientId, comment.urn), "Liked as the page.")} className="inline-flex items-center gap-1 hover:text-[#0A66C2]">{busy === `like:${comment.urn}` ? <Loader2 className="size-3 animate-spin" /> : <ThumbsUp className="size-3" />}Like</button>
          {comment.byThisPage && <button type="button" disabled={busy !== null} onClick={() => { if (companyId && clientId && window.confirm("Delete this comment from LinkedIn?")) void run(`del:${comment.urn}`, () => integrationsApi.deleteLinkedInComment(companyId, clientId, comment.urn), "Comment deleted."); }} className="inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 className="size-3" />Delete</button>}
        </>}
        {!comment.byThisPage && comment.actorUrn && (lead
          ? <Link href="/admin/crm/leads" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><CheckCircle2 className="size-3" />In CRM</Link>
          : <button type="button" disabled={busy !== null} onClick={() => saveLead(postUrn, comment)} className="inline-flex items-center gap-1 text-[#1F7A4D] hover:underline">{busy === `lead:${comment.urn}` ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}Save as lead</button>)}
      </div>
      {replyTo?.urn === comment.urn && <div className="ml-10.5">{nested && <p className="mt-1 text-[10px] text-[#7B89A4]">LinkedIn keeps replies one level deep, so this goes into the same thread, answering {actor(comment.actorUrn)?.name ?? "this reply"}.</p>}{composer(postUrn, comment)}</div>}
    </div>;
  };

  const totals = data ? data.posts.reduce((sum, post) => ({ reactions: sum.reactions + post.counts.totalReactions, comments: sum.comments + post.counts.comments }), { reactions: 0, comments: 0 }) : null;

  return <div className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE4ED] px-5 py-3">
      <div>
        <h3 className="text-[13px] font-bold text-[#172044]">Page conversations</h3>
        <p className="mt-0.5 text-[10.5px] text-[#7B89A4]">Who commented on and reacted to the page&apos;s recent posts. Replies and likes go out as the page.{totals ? ` · ${data?.posts.length} post(s) · ${totals.comments} comment(s) · ${totals.reactions} reaction(s)` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void runReview()} disabled={reviewing || loading || !data?.posts.length} className="inline-flex h-8 items-center gap-1.5 bg-[#6D4AE0] px-3 text-[10.5px] font-semibold text-white disabled:opacity-60">{reviewing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{review ? "Review again with AI" : "AI review comments"}</button>
      <button type="button" onClick={reload} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#DDE4ED] px-3 text-[10.5px] font-semibold text-[#253352] hover:bg-[#F8FAFC] disabled:opacity-60"><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
    </div>
    <div className="flex gap-1 border-b border-[#DDE4ED] px-5">{([["comments", "Comments"], ["mentions", "Mentions & reshares"], ["fans", "Top fans"]] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`-mb-px border-b-2 px-3 py-2 text-[11px] font-semibold ${view === key ? "border-[#0A66C2] text-[#0A66C2]" : "border-transparent text-[#52617D] hover:text-[#172044]"}`}>{label}</button>)}</div>
    {view === "mentions" ? <LinkedInMentionsPanel /> : view === "fans" ? (data ? <LinkedInTopFans data={data} onSaved={reload} /> : <Loading text="Loading…" />) : loading && !data ? <Loading text="Loading comments and reactions…" /> : error && !data ? <LoadError message={error} retry={reload} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {(review || Object.keys(data.triage ?? {}).length > 0) && <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E1D9F7] bg-[#FBFAFF] px-5 py-3">
        <p className="min-w-0 flex-1 text-[11px] leading-5 text-[#253352]"><Sparkles className="mr-1 inline size-3.5 text-[#6D4AE0]" /><span className="font-semibold">AI:</span> {review?.summary || "New comments are tagged by AI as they arrive."} <span className="text-[#7B89A4]">· {data.posts.flatMap((post) => post.comments).filter((row) => verdictOf(row.urn)?.needsReply).length} need a reply · {data.posts.flatMap((post) => post.comments).filter((row) => verdictOf(row.urn)?.intent === "lead").length} lead(s)</span></p>
        <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#52617D]"><input type="checkbox" checked={onlyNeedsReply} onChange={(event) => setOnlyNeedsReply(event.target.checked)} />Show only comments that need a reply</label>
      </div>}
      <div className="divide-y divide-[#EDF1F5]">{data.posts.map((post) => {
        const top = post.comments.filter((comment) => !comment.parentUrn && (!onlyNeedsReply || [comment, ...post.comments.filter((reply) => reply.parentUrn === comment.urn)].some((row) => verdictOf(row.urn)?.needsReply)));
        if (onlyNeedsReply && !top.length) return null;
        const showReactions = openReactions === post.postUrn;
        return <div key={post.postUrn} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-[11.5px] text-[#52617D]"><MessageSquare className="mr-1 inline size-3.5 text-[#0A66C2]" /><span className="font-semibold text-[#253352]">Post</span> · {when(post.publishedAt)} · <span className="italic">{post.text.slice(0, 120)}{post.text.length > 120 ? "…" : ""}</span></p>
            <div className="flex gap-3 text-[10.5px] font-semibold">
              {data.canReply && <button type="button" onClick={() => { setNewComment(post.postUrn); setReplyTo(null); setText(""); }} className="text-[#0A66C2] hover:underline">Comment</button>}
              {data.canReply && <button type="button" disabled={busy !== null} onClick={() => toggleComments(post.postUrn, post.counts.commentsOpen === false)} className="inline-flex items-center gap-1 text-[#52617D] hover:text-[#0A66C2]">{busy === `lock:${post.postUrn}` ? <Loader2 className="size-3 animate-spin" /> : post.counts.commentsOpen === false ? <Unlock className="size-3" /> : <Lock className="size-3" />}{post.counts.commentsOpen === false ? "Turn on comments" : "Turn off comments"}</button>}
              <a href={postLink(post.postUrn)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0A66C2] hover:underline">Open <ExternalLink className="size-3" /></a>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-[#52617D]">
            {post.counts.totalReactions > 0 ? <button type="button" onClick={() => setOpenReactions(showReactions ? null : post.postUrn)} className="inline-flex items-center gap-1.5 font-semibold text-[#0A66C2] hover:underline">
              <span>{Object.keys(post.counts.reactions).map((type) => REACTION_EMOJI[type] ?? "👍").join("")}</span>
              {post.counts.totalReactions} reaction{post.counts.totalReactions === 1 ? "" : "s"} · {showReactions ? "hide" : "see who"}
            </button> : <span className="inline-flex items-center gap-1"><Heart className="size-3" />No reactions yet</span>}
            <span>{post.counts.comments} comment{post.counts.comments === 1 ? "" : "s"}</span>
            {post.counts.commentsOpen === false && <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-1.5 py-px text-[9.5px] font-semibold text-slate-600"><Lock className="size-2.5" />Comments off</span>}
          </div>
          {showReactions && <ul className="mt-2 divide-y divide-[#EDF1F5] rounded border border-[#E3E9F0]">
            {post.reactions.length === 0 && <li className="px-3 py-2 text-[10.5px] text-[#7B89A4]">LinkedIn did not return the list of who reacted.</li>}
            {post.reactions.map((reaction) => {
              const who = actor(reaction.actorUrn);
              return <li key={`${reaction.actorUrn}:${reaction.reaction}`} className="flex items-center gap-2.5 px-3 py-2">
                <Avatar actor={who} own={reaction.actorUrn === data.organizationUrn} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px]"><ActorName actor={who} urn={reaction.actorUrn} own={reaction.actorUrn === data.organizationUrn} /></p>
                  {who?.headline && <p className="truncate text-[10px] text-[#7B89A4]">{who.headline}</p>}
                </div>
                <span className="shrink-0 text-[10.5px] text-[#52617D]">{REACTION_EMOJI[reaction.reaction] ?? "👍"} {REACTION_LABEL[reaction.reaction] ?? reaction.reaction}</span>
                <span className="hidden shrink-0 text-[10px] text-[#8A97AF] sm:inline">{when(reaction.at)}</span>
              </li>;
            })}
          </ul>}
          {newComment === post.postUrn && composer(post.postUrn)}
          <div className="mt-1">{top.map((comment) => <div key={comment.urn}>{row(comment, post.postUrn, false)}{post.comments.filter((reply) => reply.parentUrn === comment.urn).sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")).map((reply) => row(reply, post.postUrn, true))}</div>)}</div>
        </div>;
      })}</div>
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">Names come from LinkedIn&apos;s member lookup for people who engaged with this page. Click a name to open their LinkedIn profile. Replies need the page admin role and the LinkedIn Community app.</p>
    </>}
  </div>;
}
