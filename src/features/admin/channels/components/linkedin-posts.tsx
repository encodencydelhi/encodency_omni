"use client";

import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, BarChart2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileText, Images, Link2, Loader2, Pencil, Play, RefreshCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LinkedInAiPostInsights } from "./linkedin-ai-insights";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInPostsPage } from "../../integrations/live/integrations-api";
import { LinkedInRemoteImage } from "./linkedin-remote-image";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {});
const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : null);
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const PAGE_SIZES = [10, 25, 50] as const;
const safeUrl = (value: string | null) => (value && /^https:\/\//.test(value) ? value : null);

/**
 * LinkedIn post text arrives in LinkedIn's "little text" format: hashtags as {hashtag|\#|Name}, mentions as
 * @[Name](urn:li:organization:1), and reserved characters escaped with a backslash. This turns it into plain text.
 */
export function cleanLinkedInText(value: string): string {
  return value
    .replace(/\{hashtag\|\\?#\|([^}]+)\}/g, "#$1")
    .replace(/@\[([^\]]+)\]\((?:urn:li:[^)]+)\)/g, "@$1")
    .replace(/\\([\\|{}@[\]()<>#*_~])/g, "$1");
}

const STATUS: Record<string, { label: string; tone: string }> = {
  PUBLISHED: { label: "Published", tone: "text-emerald-700" },
  PUBLISH_REQUESTED: { label: "Publishing", tone: "text-amber-700" },
  DRAFT: { label: "Draft", tone: "text-[#64748B]" },
  PUBLISH_FAILED: { label: "Failed", tone: "text-red-700" },
};

interface MediaItem { type: "image" | "video" | "document"; url: string | null; thumbnail: string | null; alt: string | null; durationMs: number | null; title: string | null }
interface Media {
  kind: "text" | "image" | "images" | "video" | "document" | "article" | "event" | "poll" | "other";
  items: MediaItem[];
  article: { title: string | null; description: string | null; url: string | null; thumbnail: string | null } | null;
  eventUrn: string | null;
  poll: { question: string | null; options: string[] } | null;
}
const KIND_LABEL: Record<Media["kind"], string> = { text: "Text", image: "Photo", images: "Photos", video: "Video", document: "Document", article: "Link", event: "Event", poll: "Poll", other: "Post" };
const duration = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}` : "");

function toMedia(value: unknown): Media {
  const media = record(value);
  const items = Array.isArray(media.items) ? (media.items as MediaItem[]) : [];
  const kind = typeof media.kind === "string" && media.kind in KIND_LABEL ? (media.kind as Media["kind"]) : "text";
  return { kind, items, article: (media.article as Media["article"]) ?? null, eventUrn: text(media.eventUrn), poll: (media.poll as Media["poll"]) ?? null };
}

function toRow(raw: unknown, index: number) {
  const post = record(raw);
  const id = text(post.id) || `post-${index}`;
  const content = record(post.content);
  const article = record(content.article);
  const stats = record(post.stats);
  const media = toMedia(post.media);
  const cover = safeUrl(media.items[0]?.thumbnail ?? media.items[0]?.url ?? null) ?? safeUrl(media.article?.thumbnail ?? null);
  return {
    id, body: cleanLinkedInText(text(post.commentary) || text(article.title) || ""), state: text(post.lifecycleState) || "PUBLISHED",
    publishedAt: typeof post.publishedAt === "number" ? post.publishedAt : null, media, cover,
    impressions: count(stats.impressionCount), likes: count(stats.likeCount), comments: count(stats.commentCount), shares: count(stats.shareCount), clicks: count(stats.clickCount),
    engagement: typeof stats.engagement === "number" ? stats.engagement : null,
    hasStats: Object.keys(stats).length > 0,
  };
}

function Thumb({ row }: { row: ReturnType<typeof toRow> }) {
  const Icon = row.media.kind === "video" ? Play : row.media.kind === "images" ? Images : row.media.kind === "article" ? Link2 : row.media.kind === "event" ? CalendarDays : row.media.kind === "poll" ? BarChart2 : FileText;
  const fallback = <div className="grid size-14 shrink-0 place-items-center bg-[#EAF3FB] text-[#0A66C2]"><Icon className="size-5" /></div>;
  if (!row.cover) return fallback;
  return <div className="relative size-14 shrink-0 overflow-hidden bg-[#EAF3FB]">
    <LinkedInRemoteImage src={row.cover} alt={row.media.items[0]?.alt || "Post media"} fill sizes="56px" className="object-cover" fallback={fallback} />
    {row.media.kind === "video" && <span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play className="size-4 fill-white" /></span>}
    {row.media.kind === "images" && row.media.items.length > 1 && <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[9px] font-semibold text-white">{row.media.items.length}</span>}
  </div>;
}

/** The post's photos, video, link preview, event or poll, as LinkedIn shows it. */
function MediaView({ media }: { media: Media }) {
  if (media.kind === "image" || media.kind === "images") {
    const shown = media.items.filter((item) => safeUrl(item.url));
    if (!shown.length) return <p className="text-[11px] text-[#8A97AF]">LinkedIn did not return a link for this picture.</p>;
    return <div className={`grid gap-2 ${shown.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "max-w-xl"}`}>{shown.map((item, index) =>
      <a key={`${item.url}-${index}`} href={item.url!} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="relative block aspect-square overflow-hidden bg-[#EAF3FB] sm:aspect-[4/3]" title="Open full size">
        <LinkedInRemoteImage src={item.url!} alt={item.alt || `Picture ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 400px" className="object-contain" fallback={<span className="grid h-full place-items-center text-[10px] text-[#8A97AF]">Picture unavailable</span>} />
      </a>)}</div>;
  }
  if (media.kind === "video") {
    const video = media.items[0];
    const src = safeUrl(video?.url ?? null);
    if (!src) return <p className="text-[11px] text-[#8A97AF]">LinkedIn did not return a playable link for this video.</p>;
    return <video controls preload="none" poster={safeUrl(video?.thumbnail ?? null) ?? undefined} src={src} className="max-h-[420px] w-full max-w-xl bg-black" onClick={(event) => event.stopPropagation()}>Your browser cannot play this video.</video>;
  }
  if (media.kind === "document") {
    const doc = media.items[0];
    const href = safeUrl(doc?.url ?? null);
    return href ? <a href={href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0A66C2] hover:underline"><FileText className="size-3.5" />{doc?.title || "Open document"}</a> : null;
  }
  if (media.kind === "article" && media.article) {
    const href = safeUrl(media.article.url);
    const thumb = safeUrl(media.article.thumbnail);
    const body = <><div className="relative h-20 w-28 shrink-0 bg-[#EAF3FB]">{thumb ? <LinkedInRemoteImage src={thumb} alt="" fill sizes="112px" className="object-cover" fallback={<Link2 className="m-auto size-5 text-[#0A66C2]" />} /> : <Link2 className="m-auto mt-7 size-5 text-[#0A66C2]" />}</div>
      <div className="min-w-0 p-3"><p className="line-clamp-2 text-[12px] font-semibold text-[#172044]">{media.article.title || href || "Shared link"}</p>{media.article.description && <p className="mt-1 line-clamp-2 text-[10.5px] text-[#687797]">{media.article.description}</p>}{href && <p className="mt-1 truncate text-[10px] text-[#0A66C2]">{new URL(href).hostname}</p>}</div></>;
    return href ? <a href={href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="flex max-w-xl overflow-hidden border border-[#DDE4ED] bg-white hover:bg-[#F8FAFC]">{body}</a> : <div className="flex max-w-xl overflow-hidden border border-[#DDE4ED] bg-white">{body}</div>;
  }
  if (media.kind === "event" && media.eventUrn) {
    const eventId = media.eventUrn.split(":").pop();
    return <a href={`https://www.linkedin.com/events/${eventId}/`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0A66C2] hover:underline"><CalendarDays className="size-3.5" />Shared a LinkedIn event (see the Events tab) <ExternalLink className="size-3" /></a>;
  }
  if (media.kind === "poll" && media.poll) {
    return <div className="max-w-md border border-[#DDE4ED] bg-white p-3"><p className="text-[12px] font-semibold text-[#172044]">{media.poll.question || "Poll"}</p><ul className="mt-2 space-y-1">{media.poll.options.map((option) => <li key={option} className="border border-[#E8EDF3] px-2 py-1 text-[11px] text-[#253352]">{option}</li>)}</ul><p className="mt-2 text-[10px] text-[#8A97AF]">Vote counts are shown on LinkedIn.</p></div>;
  }
  return null;
}

/** Company-page posts, paged by the server (LinkedIn start/count), each with its media and lifetime statistics. */
export function LinkedInPostsTable() {
  const { companyId, clientId } = useTenancyContext();
  const [start, setStart] = useState(0);
  const [size, setSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState<LinkedInPostsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await task(); toast.success(done); setEditing(null); setLoading(true); setReload((value) => value + 1); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "LinkedIn did not accept this."); }
    finally { setBusy(null); }
  };

  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInPosts(companyId, clientId, start, size, controller.signal)
      .then((next) => { setPage(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load LinkedIn posts."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, start, size, reload]);

  const go = (nextStart: number) => { setLoading(true); setOpen(null); setStart(Math.max(0, nextStart)); };
  const rows = (page?.items ?? []).map(toRow);
  const filtered = rows.filter((row) => (status === "ALL" || row.state === status) && (kind === "ALL" || row.media.kind === kind) && (!query.trim() || row.body.toLowerCase().includes(query.trim().toLowerCase())));
  const statuses = [...new Set(rows.map((row) => row.state))];
  const kinds = [...new Set(rows.map((row) => row.media.kind))];
  const show = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-IN"));
  const pageNumber = Math.floor(start / size) + 1;

  return <div className="bg-white">
    <LinkedInAiPostInsights />
    <div className="flex flex-wrap items-center gap-2 border-b border-[#DDE4ED] px-5 py-3">
      <div className="relative min-w-56 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8A97AF]" /><label className="sr-only" htmlFor="linkedin-post-search">Search this page</label><input id="linkedin-post-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this page…" className="h-8 w-full border border-[#DDE4ED] pl-8 pr-2 text-[11px] text-[#253352]" /></div>
      <label className="sr-only" htmlFor="linkedin-post-kind">Type</label>
      <select id="linkedin-post-kind" value={kind} onChange={(event) => setKind(event.target.value)} className="h-8 border border-[#DDE4ED] bg-white px-2 text-[11px] text-[#253352]"><option value="ALL">All types</option>{kinds.map((value) => <option key={value} value={value}>{KIND_LABEL[value]}</option>)}</select>
      <label className="sr-only" htmlFor="linkedin-post-status">Status</label>
      <select id="linkedin-post-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 border border-[#DDE4ED] bg-white px-2 text-[11px] text-[#253352]"><option value="ALL">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{STATUS[value]?.label ?? value}</option>)}</select>
      <button type="button" onClick={() => { setLoading(true); setReload((value) => value + 1); }} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#DDE4ED] px-3 text-[10.5px] font-semibold text-[#253352] hover:bg-[#F8FAFC] disabled:opacity-60"><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
    </div>

    {error && <div className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-[11px] text-red-700" role="alert"><AlertTriangle className="mt-0.5 size-3.5" />{error}</div>}
    {page && page.state !== "live" && page.state !== "empty" && <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-[11px] text-amber-900" role="status">{page.reason}</div>}

    {loading && !page ? <div className="flex min-h-60 items-center justify-center"><Loader2 className="size-5 animate-spin text-[#0A66C2]" /></div> : <>
      <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}><table className="w-full min-w-[1020px] text-left"><thead><tr className="bg-[#F7F9FC] text-[10px] font-semibold uppercase text-[#6C7B97]">
        <th className="w-8 px-3 py-3" aria-label="Details" /><th className="w-[44%] px-3 py-3">Post</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Published</th>
        <th className="px-3 py-3 text-right">Impressions</th><th className="px-3 py-3 text-right">Likes</th><th className="px-3 py-3 text-right">Comments</th><th className="px-3 py-3 text-right">Shares</th><th className="px-5 py-3 text-right">Clicks</th>
      </tr></thead><tbody className="divide-y divide-[#E8EDF3]">{filtered.map((row) => {
        const expanded = open === row.id;
        const state = STATUS[row.state] ?? { label: row.state, tone: "text-[#64748B]" };
        const typeLabel = row.media.kind === "images" ? `${row.media.items.length} photos` : row.media.kind === "video" ? `Video ${duration(row.media.items[0]?.durationMs ?? null)}`.trim() : KIND_LABEL[row.media.kind];
        return <Fragment key={row.id}>
          <tr className="cursor-pointer hover:bg-[#FAFCFE]" onClick={() => setOpen(expanded ? null : row.id)}>
            <td className="px-3 py-4 text-[#7B89A4]">{expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</td>
            <td className="px-3 py-4"><div className="flex gap-3"><Thumb row={row} /><div className="min-w-0"><p className="line-clamp-2 text-[12px] font-semibold leading-5 text-[#172044]">{row.body || <span className="font-normal italic text-[#8A97AF]">No text</span>}</p><p className="mt-1 text-[10px] font-semibold uppercase text-[#8A97AF]">{typeLabel}</p></div></div></td>
            <td className={`px-3 py-4 text-[10.5px] font-semibold ${state.tone}`}>{state.label}</td>
            <td className="whitespace-nowrap px-3 py-4 text-[11px] text-[#52617D]">{row.publishedAt ? new Date(row.publishedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            <td className="px-3 py-4 text-right text-[12px] font-semibold text-[#253352]">{show(row.impressions)}</td>
            <td className="px-3 py-4 text-right text-[12px] font-semibold text-[#253352]">{show(row.likes)}</td>
            <td className="px-3 py-4 text-right text-[12px] font-semibold text-[#253352]">{show(row.comments)}</td>
            <td className="px-3 py-4 text-right text-[12px] font-semibold text-[#253352]">{show(row.shares)}</td>
            <td className="px-5 py-4 text-right text-[12px] font-semibold text-[#253352]">{show(row.clicks)}</td>
          </tr>
          {expanded && <tr><td colSpan={9} className="bg-[#F8FAFC] px-12 py-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                {editing?.id === row.id ? <div onClick={(event) => event.stopPropagation()}>
                  <label className="sr-only" htmlFor={`li-edit-${row.id}`}>Post text</label>
                  <textarea id={`li-edit-${row.id}`} rows={6} maxLength={3000} value={editing.text} onChange={(event) => setEditing({ id: row.id, text: event.target.value })} className="w-full border border-[#C8DDF0] bg-white p-2 text-[12px] leading-5 text-[#253352]" />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#8A97AF]">{editing.text.length}/3,000 · LinkedIn lets you change the text only (not photos or video)</span>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setEditing(null)} className="h-7 border border-[#DDE4ED] bg-white px-2.5 text-[10.5px] font-semibold text-[#253352]">Cancel</button>
                      <button type="button" disabled={!editing.text.trim() || busy !== null} onClick={() => companyId && clientId && void act(`edit:${row.id}`, () => integrationsApi.updateLinkedInPost(companyId, clientId, row.id, editing.text), "Post updated on LinkedIn.")} className="inline-flex h-7 items-center gap-1 bg-[#0A66C2] px-2.5 text-[10.5px] font-semibold text-white disabled:opacity-50">{busy === `edit:${row.id}` && <Loader2 className="size-3 animate-spin" />}Save on LinkedIn</button>
                    </div>
                  </div>
                </div> : row.body && <p className="whitespace-pre-wrap text-[12px] leading-6 text-[#253352]">{row.body}</p>}
                {row.hasStats && <p className="mt-3 text-[10.5px] text-[#687797]">Engagement rate: <span className="font-semibold text-[#253352]">{row.engagement === null ? "—" : `${(row.engagement * 100).toFixed(2)}%`}</span></p>}
              </div>
              <div className="min-w-0"><MediaView media={row.media} /></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] text-[#687797]">
              {row.state === "PUBLISHED" && <a href={`https://www.linkedin.com/feed/update/${encodeURIComponent(row.id)}/`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 font-semibold text-[#0A66C2] hover:underline">View on LinkedIn <ExternalLink className="size-3" /></a>}
              {row.state === "PUBLISHED" && editing?.id !== row.id && <button type="button" onClick={(event) => { event.stopPropagation(); setEditing({ id: row.id, text: row.body }); }} className="inline-flex items-center gap-1 font-semibold text-[#0A66C2] hover:underline"><Pencil className="size-3" />Edit text</button>}
              {row.state === "PUBLISHED" && <button type="button" disabled={busy !== null} onClick={(event) => { event.stopPropagation(); if (companyId && clientId && window.confirm("Delete this post from LinkedIn? This cannot be undone.")) void act(`del:${row.id}`, () => integrationsApi.deleteLinkedInPost(companyId, clientId, row.id), "Post deleted from LinkedIn."); }} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline">{busy === `del:${row.id}` ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}Delete post</button>}
              <span className="truncate">ID: {row.id}</span>
            </div>
          </td></tr>}
        </Fragment>;
      })}</tbody></table></div>
      {filtered.length === 0 && <p className="px-5 py-10 text-center text-[11px] text-[#687797]">{rows.length ? "No posts on this page match the search, type or status." : page?.reason ?? "No posts."}</p>}
    </>}

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1F5] px-5 py-3">
      <p className="text-[10px] text-[#8A97AF]">{rows.some((row) => row.hasStats) ? "Impressions, likes, comments, shares and clicks are lifetime totals from LinkedIn page analytics." : "A dash means LinkedIn returned no statistics for that post (not zero)."} Pictures and videos open from LinkedIn&apos;s own links. Comments, replies and who liked each post are in the Inbox tab.</p>
      <div className="flex items-center gap-2 text-[10.5px] text-[#52617D]">
        <label htmlFor="linkedin-post-size">Rows</label>
        <select id="linkedin-post-size" value={size} onChange={(event) => { setLoading(true); setStart(0); setSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); }} className="h-8 border border-[#DDE4ED] bg-white px-2 text-[11px]">{PAGE_SIZES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <button type="button" onClick={() => go(start - size)} disabled={loading || start === 0} className="inline-flex h-8 items-center gap-1 border border-[#DDE4ED] px-2.5 font-semibold disabled:opacity-40"><ChevronLeft className="size-3.5" /> Previous</button>
        <span>Page {pageNumber}{page ? ` · posts ${page.items.length ? start + 1 : 0}–${start + page.items.length}` : ""}</span>
        <button type="button" onClick={() => go(start + size)} disabled={loading || !page?.hasMore} className="inline-flex h-8 items-center gap-1 border border-[#DDE4ED] px-2.5 font-semibold disabled:opacity-40">Next <ChevronRight className="size-3.5" /></button>
      </div>
    </div>
  </div>;
}
