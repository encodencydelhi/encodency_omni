"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AtSign, CheckCircle2, ExternalLink, Loader2, Repeat2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInActivity, type LinkedInConversations } from "../../integrations/live/integrations-api";
import { LoadError, Loading } from "./linkedin-ads-leads";

const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const feedLink = (urn: string) => `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`;

/** Mentions of the page and reshares of its posts in the last 60 days, read live from LinkedIn's page notifications. */
export function LinkedInMentionsPanel() {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<LinkedInActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInActivity(companyId, clientId, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load mentions."); });
    return () => controller.abort();
  }, [companyId, clientId, tick]);
  if (error && !data) return <LoadError message={error} retry={() => { setError(null); setTick((v) => v + 1); }} />;
  if (!data) return <Loading text="Loading mentions and reshares…" />;
  if (!data.items.length) return <div className="px-5 py-10 text-center text-[11.5px] text-[#7B89A4]"><AtSign className="mx-auto mb-2 size-5 text-[#A8B4C7]" />Nobody mentioned {data.pageName} or reshared its posts in the last 60 days.<p className="mt-1 text-[10px]">New ones also arrive as notifications.</p></div>;
  return <ul className="divide-y divide-[#EDF1F5]">{data.items.map((item) => {
    const who = item.actorUrn ? data.actors[item.actorUrn] : undefined;
    return <li key={item.itemUrn} className="flex items-start gap-3 px-5 py-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${item.kind === "mention" ? "bg-[#EAF3FB] text-[#0A66C2]" : "bg-[#E8F3EE] text-[#1F7A4D]"}`}>{item.kind === "mention" ? <AtSign className="size-3.5" /> : <Repeat2 className="size-3.5" />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px]"><span className="font-semibold text-[#172044]">{who?.profileUrl ? <a href={who.profileUrl} target="_blank" rel="noreferrer" className="hover:underline">{who.name}</a> : who?.name ?? "Someone"}</span> <span className="text-[#52617D]">{item.kind === "mention" ? `mentioned ${data.pageName}` : `reshared a ${data.pageName} post`}</span> · <span className="text-[10.5px] text-[#7B89A4]">{when(item.happenedAt)}</span></p>
        {who?.headline && <p className="truncate text-[10px] text-[#7B89A4]">{who.headline}</p>}
        {item.text && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11.5px] leading-5 text-[#253352]">{item.text}</p>}
      </div>
      <a href={feedLink(item.itemUrn)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-[#0A66C2] hover:underline">Open <ExternalLink className="size-3" /></a>
    </li>;
  })}</ul>;
}

/** People who engage most with the page's recent posts, from the inbox data, with one-click "Save as lead". */
export function LinkedInTopFans({ data, onSaved }: { data: LinkedInConversations; onSaved: () => void }) {
  const { companyId, clientId } = useTenancyContext();
  const [busy, setBusy] = useState<string | null>(null);
  const scores = new Map<string, { likes: number; comments: number; posts: Set<string> }>();
  for (const post of data.posts) {
    for (const reaction of post.reactions) {
      if (reaction.actorUrn === data.organizationUrn) continue;
      const row = scores.get(reaction.actorUrn) ?? { likes: 0, comments: 0, posts: new Set<string>() };
      row.likes++; row.posts.add(post.postUrn); scores.set(reaction.actorUrn, row);
    }
    for (const comment of post.comments) {
      if (!comment.actorUrn || comment.byThisPage) continue;
      const row = scores.get(comment.actorUrn) ?? { likes: 0, comments: 0, posts: new Set<string>() };
      row.comments++; row.posts.add(post.postUrn); scores.set(comment.actorUrn, row);
    }
  }
  const fans = [...scores.entries()].map(([urn, row]) => ({ urn, ...row, score: row.likes + row.comments * 3 })).sort((a, b) => b.score - a.score).slice(0, 25);
  if (!fans.length) return <div className="px-5 py-10 text-center text-[11.5px] text-[#7B89A4]">No likes or comments from other people on the recent posts yet.</div>;
  const save = async (urn: string, history: string) => {
    if (!companyId || !clientId) return;
    setBusy(urn);
    try {
      const result = await integrationsApi.linkedInLeadFromFan(companyId, clientId, { actorUrn: urn, history });
      toast.success(result.created ? `${result.name} saved as a CRM lead${result.insight ? ` (score ${result.insight.score})` : ""}.` : `${result.name} is already in the CRM.`);
      onSaved();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not save the lead."); }
    finally { setBusy(null); }
  };
  return <div>
    <p className="border-b border-[#EDF1F5] px-5 py-2.5 text-[10.5px] text-[#7B89A4]">Ranked by engagement on the page&apos;s last {data.posts.length} active posts (a comment counts 3, a reaction 1). These people already like the brand: worth a follow-up.</p>
    <ul className="divide-y divide-[#EDF1F5]">{fans.map((fan, index) => {
      const who = data.actors[fan.urn];
      const lead = data.leads?.[fan.urn];
      const history = `Reacted ${fan.likes} time(s) and commented ${fan.comments} time(s) across ${fan.posts.size} of the page's last ${data.posts.length} active posts`;
      return <li key={fan.urn} className="flex items-center gap-3 px-5 py-2.5">
        <span className="w-5 shrink-0 text-right text-[11px] font-bold text-[#A8B4C7]">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-[#172044]">{who?.profileUrl ? <a href={who.profileUrl} target="_blank" rel="noreferrer" className="hover:underline">{who.name}</a> : who?.name ?? "A LinkedIn member"}</p>
          {who?.headline && <p className="truncate text-[10px] text-[#7B89A4]">{who.headline}</p>}
        </div>
        <span className="shrink-0 text-[10.5px] text-[#52617D]">👍 {fan.likes} · 💬 {fan.comments} · {fan.posts.size} post{fan.posts.size === 1 ? "" : "s"}</span>
        {lead ? <Link href="/admin/crm/leads" className="inline-flex h-7 shrink-0 items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="size-3" />In CRM</Link>
          : <button type="button" disabled={busy !== null || !who} onClick={() => void save(fan.urn, history)} className="inline-flex h-7 shrink-0 items-center gap-1 border border-[#0A66C2] px-2 text-[10px] font-semibold text-[#0A66C2] hover:bg-[#EAF3FB] disabled:opacity-50">{busy === fan.urn ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}Save as lead</button>}
      </li>;
    })}</ul>
  </div>;
}
