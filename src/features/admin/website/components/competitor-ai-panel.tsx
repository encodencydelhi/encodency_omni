"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  Info,
  Lightbulb,
  Mail,
  MessageCircle,
  MousePointerClick,
  Phone,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Tag,
  Target,
  ThumbsUp,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { useCompetitorMutations } from "../data/hooks";
import { formatDateTime, formatNumber, formatRelative, type Tone } from "../data/selectors";
import type { CompetitorAiAction, CompetitorAiAnalysis, CompetitorAiPoint, CompetitorScore, CompetitorSiteMetrics } from "../data/types";
import { ChartLegend, ChartTooltip, SERIES_COLORS } from "./ui/charts";
import { Chip, ScoreDial, WButton } from "./ui/kit";

/** Fixed identity colours: the client is always series 1, the competitor series 2. */
const YOU = SERIES_COLORS[0];
const THEM = SERIES_COLORS[1];

const PRIORITY_TONE: Record<CompetitorAiAction["priority"], Tone> = { high: "bad", medium: "warn", low: "muted" };
const PRIORITY_ORDER: Record<CompetitorAiAction["priority"], number> = { high: 0, medium: 1, low: 2 };
const LEVELS = ["low", "medium", "high"] as const;

function pagePath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? "Home page" : parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function SourceLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-0.5 truncate text-[10.5px] text-[#2563EB] hover:underline">
      {pagePath(url)} <ArrowUpRight className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

function Panel({ title, icon: Icon, children, className, aside }: { title: string; icon: ElementType; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-[#E6EBF4] bg-white p-3", className)}>
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#111C3A]">
          <Icon className="size-3.5 text-[#3B69B8]" aria-hidden /> {title}
        </h4>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Head to head                                                        */
/* ------------------------------------------------------------------ */

function SitePreview({ image, domain }: { image: string | null | undefined; domain: string }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote share image of an arbitrary site
      <img src={image} alt={`${domain} preview`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="aspect-[1.91/1] w-full rounded-md bg-[#F4F6FA] object-contain ring-1 ring-[#E6EBF4]" />
    );
  }
  return (
    <div className="grid aspect-[1.91/1] w-full place-items-center rounded-md bg-gradient-to-br from-[#EFF4FC] to-[#F8FAFD] ring-1 ring-[#E6EBF4]">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#3B69B8]"><Globe2 className="size-4" aria-hidden /> {domain}</span>
    </div>
  );
}

function SiteTile({ label, domain, color, image, score, leads }: { label: string; domain: string; color: string; image?: string | null; score: number | null; leads: number }) {
  return (
    // Share images are 1.91:1; shown whole (never cropped) at a fixed width so the tile stays compact.
    <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-lg border border-[#E6EBF4] bg-white p-2.5 sm:flex-row sm:items-center">
      <div className="w-full shrink-0 sm:w-[240px]"><SitePreview image={image} domain={domain} /></div>
      <div className="flex min-w-0 items-center gap-2.5">
        <ScoreDial value={score} tone={score === null ? "muted" : score >= 70 ? "good" : score >= 45 ? "warn" : "bad"} size={46} label={`${label} overall ${score ?? "unavailable"}`} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7A94]"><span className="size-2 rounded-[2px]" style={{ background: color }} aria-hidden />{label}</p>
          <p className="truncate text-[12.5px] font-semibold text-[#111C3A]">{domain}</p>
          <p className="text-[10.5px] text-[#6B7A94]">{leads} strength{leads === 1 ? "" : "s"} found</p>
        </div>
      </div>
    </div>
  );
}

function overall(scores: CompetitorScore[] | undefined, side: "you" | "them") {
  if (!scores?.length) return null;
  return Math.round((scores.reduce((sum, s) => sum + s[side], 0) / (scores.length * 10)) * 100);
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function ScoreRadar({ scores }: { scores: CompetitorScore[] }) {
  const data = scores.map((s) => ({ area: s.area, You: s.you, Competitor: s.them, note: s.note }));
  return (
    <div>
      <div className="h-[230px]" role="img" aria-label={`Scorecard: ${scores.map((s) => `${s.area} you ${s.you}, competitor ${s.them}`).join("; ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%" margin={{ top: 4, right: 24, bottom: 4, left: 24 }}>
            <PolarGrid stroke="#E6EBF4" />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "#5B6B85" }} />
            <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={false} axisLine={false} />
            <Radar name="You" dataKey="You" stroke={YOU} strokeWidth={2} fill={YOU} fillOpacity={0.14} dot={{ r: 3, fill: YOU, stroke: "#fff", strokeWidth: 1.5 }} />
            <Radar name="Competitor" dataKey="Competitor" stroke={THEM} strokeWidth={2} fill={THEM} fillOpacity={0.14} dot={{ r: 3, fill: THEM, stroke: "#fff", strokeWidth: 1.5 }} />
            <Tooltip
              content={({ active, payload }) => {
                const row = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                if (!row) return null;
                return <ChartTooltip title={row.area} rows={[{ name: "You", value: `${row.You}/10`, color: YOU }, { name: "Competitor", value: `${row.Competitor}/10`, color: THEM }]} footer={row.note || undefined} />;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend className="justify-center" items={[{ key: "you", label: "You", color: YOU }, { key: "them", label: "Competitor", color: THEM }]} />
      <ul className="mt-2.5 divide-y divide-[#EEF2F8] rounded-md border border-[#EEF2F8]">
        {scores.map((s) => (
          <li key={s.area} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
            <span className="w-28 shrink-0 font-medium text-[#28354C]">{s.area}</span>
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#6B7A94]" title={s.note}>{s.note}</span>
            {[{ v: s.you, c: YOU, who: "You" }, { v: s.them, c: THEM, who: "Competitor" }].map((x) => (
              <span key={x.who} className="flex w-9 shrink-0 items-center justify-end gap-1 font-semibold tabular-nums text-[#28354C]" title={`${x.who}: ${x.v}/10`}>
                <span className="size-1.5 rounded-[2px]" style={{ background: x.c }} aria-hidden />{x.v}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PairedBar({ label, you, them }: { label: string; you: number; them: number }) {
  const max = Math.max(you, them, 1);
  const bar = (value: number, color: string, who: string) => (
    <div className="flex items-center gap-2" title={`${who}: ${formatNumber(value)}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F4F9]">
        <div className="h-full rounded-full" style={{ width: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%`, background: color }} />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[#28354C]">{formatNumber(value)}</span>
    </div>
  );
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-medium text-[#5B6B85]">{label}</p>
      <div className="space-y-1">
        {bar(you, YOU, "You")}
        {bar(them, THEM, "Competitor")}
      </div>
    </div>
  );
}

const CHANNELS: { key: keyof CompetitorSiteMetrics["contact"]; label: string; icon: ElementType }[] = [
  { key: "phone", label: "Phone", icon: Phone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "email", label: "Email", icon: Mail },
  { key: "form", label: "Form", icon: SquarePen },
];

function Has({ yes, who }: { yes: boolean; who: string }) {
  return yes ? (
    <span className="grid size-5 place-items-center rounded-full bg-[#E7F6EF] text-[#0F9D6E]" title={`${who}: yes`}><Check className="size-3" aria-label={`${who}: yes`} /></span>
  ) : (
    <span className="grid size-5 place-items-center rounded-full bg-[#F4F6FA] text-[#A3B0C2]" title={`${who}: no`}><X className="size-3" aria-label={`${who}: no`} /></span>
  );
}

function Measured({ own, competitor }: { own: CompetitorSiteMetrics; competitor: CompetitorSiteMetrics }) {
  // WhatsApp links already have their own row under contact channels.
  const socials = [...new Set([...own.social, ...competitor.social])].filter((s) => !/^(wa\.me|(api\.)?whatsapp\.com)$/.test(s)).sort();
  return (
    <div className="space-y-3">
      <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        <PairedBar label="Words on pages read" you={own.words} them={competitor.words} />
        <PairedBar label="Headings" you={own.headings} them={competitor.headings} />
        <PairedBar label="Different calls to action" you={own.ctas} them={competitor.ctas} />
        <PairedBar label="Images" you={own.images} them={competitor.images} />
      </div>
      <div className="overflow-hidden rounded-md border border-[#EEF2F8]">
        <table className="w-full text-[11px]">
          <thead className="bg-[#F8FAFD] text-[10px] uppercase text-[#6B7A94]">
            <tr><th className="px-2 py-1.5 text-left font-semibold">Reach them by</th><th className="w-16 px-2 py-1.5 font-semibold">You</th><th className="w-20 px-2 py-1.5 font-semibold">Competitor</th></tr>
          </thead>
          <tbody>
            {CHANNELS.map(({ key, label, icon: Icon }) => (
              <tr key={key} className="border-t border-[#EEF2F8]">
                <td className="px-2 py-1"><span className="flex items-center gap-1.5 text-[#28354C]"><Icon className="size-3.5 text-[#6B7A94]" aria-hidden />{label}</span></td>
                <td className="px-2 py-1"><span className="flex justify-center"><Has yes={own.contact[key]} who="You" /></span></td>
                <td className="px-2 py-1"><span className="flex justify-center"><Has yes={competitor.contact[key]} who="Competitor" /></span></td>
              </tr>
            ))}
            {socials.map((social) => (
              <tr key={social} className="border-t border-[#EEF2F8]">
                <td className="px-2 py-1"><span className="flex items-center gap-1.5 text-[#28354C]"><Globe2 className="size-3.5 text-[#6B7A94]" aria-hidden />{social.replace(/\.com$/, "")}</span></td>
                <td className="px-2 py-1"><span className="flex justify-center"><Has yes={own.social.includes(social)} who="You" /></span></td>
                <td className="px-2 py-1"><span className="flex justify-center"><Has yes={competitor.social.includes(social)} who="Competitor" /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function Points({ items, color, empty }: { items: CompetitorAiPoint[]; color: string; empty: string }) {
  if (!items.length) return <p className="text-[11.5px] text-[#6B7A94]">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.point} className="rounded-md border-l-[3px] bg-[#FAFBFD] py-1.5 pl-2.5 pr-2" style={{ borderLeftColor: color }}>
          <p className="text-[11.5px] font-semibold leading-snug text-[#111C3A]">{item.point}</p>
          <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[#6B7A94]" title={item.evidence}>{item.evidence}</p>
          <SourceLink url={item.url} />
        </li>
      ))}
    </ul>
  );
}

function EffortMatrix({ actions }: { actions: (CompetitorAiAction & { n: number })[] }) {
  const rows = ["high", "medium", "low"] as const;
  return (
    <div className="shrink-0" aria-hidden>
      <div className="grid grid-cols-[auto_repeat(3,44px)] gap-[2px] text-[9.5px] text-[#8494AC]">
        <span />
        {LEVELS.map((e) => <span key={e} className="pb-0.5 text-center capitalize">{e}</span>)}
        {rows.map((p) => (
          <div key={p} className="contents">
            <span className="pr-1.5 text-right capitalize leading-[40px]">{p}</span>
            {LEVELS.map((e) => {
              const here = actions.filter((a) => a.priority === p && a.effort === e);
              const quick = p === "high" && e === "low";
              return (
                <div key={e} className={cn("flex h-10 flex-wrap content-center items-center justify-center gap-0.5 rounded", quick ? "bg-[#E7F6EF]" : "bg-[#F4F6FA]")}>
                  {here.map((a) => <span key={a.n} className="grid size-4 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: PRIORITY_DOT[p] }}>{a.n}</span>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[9.5px] text-[#8494AC]">Priority ↕ · Effort ↔ · <span className="text-[#0F9D6E]">green = quick win</span></p>
    </div>
  );
}

const PRIORITY_DOT: Record<CompetitorAiAction["priority"], string> = { high: "#DC3A32", medium: "#E29208", low: "#94A3B8" };

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/**
 * Competitor insights: generated on request from up to five public pages of each site. Each run is a paid call inside
 * the daily insights budget, so nothing runs on page load; the last saved result is shown until the user refreshes it.
 */
export function CompetitorAiPanel({ clientId, competitorId, domain, ai }: { clientId: string; competitorId?: string; domain: string; ai?: CompetitorAiAnalysis | null }) {
  const { analyzeWithAi } = useCompetitorMutations(clientId);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const run = () => {
    if (!competitorId) return;
    setError(null);
    analyzeWithAi.mutate(competitorId, {
      onSuccess: (data) => {
        if (data.reused) toast.info(`Showing insights from ${formatRelative(data.ai.generatedAt)}. They can be refreshed 10 minutes after the last run.`);
        else toast.success(`Insights for ${domain} are ready`);
      },
      onError: (err) => setError(ApiError.isApiError(err) ? err.message : "The insights could not be generated."),
    });
  };

  const result = ai?.result;
  const ownDomain = (() => {
    try {
      return ai?.pagesRead.own[0] ? new URL(ai.pagesRead.own[0]).hostname.replace(/^www\./, "") : "Your website";
    } catch {
      return "Your website";
    }
  })();
  const actions = result
    ? [...result.actions].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).map((a, i) => ({ ...a, n: i + 1 }))
    : [];
  const quickWins = actions.filter((a) => a.priority === "high" && a.effort === "low").length;
  const competitorDomain = domain.replace(/^www\./, "");

  return (
    // normal-case: the Website shell capitalizes every word, which makes generated sentences hard to read.
    <div className="mt-3 rounded-lg border border-[#DCE6FB] bg-gradient-to-b from-[#F7F9FF] to-[#FBFCFE] p-3 normal-case">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-[26px] place-items-center rounded-lg bg-[#F1ECFE] text-[#7C3AED] ring-1 ring-inset ring-[#E4DAFC]"><Sparkles className="size-3.5" aria-hidden /></span>
          <div>
            <h3 className="text-[12.5px] font-semibold text-[#111C3A]">Competitor insights</h3>
            <p className="text-[10.5px] text-[#6B7A94]">
              {ai ? `Updated ${formatDateTime(ai.generatedAt)} · ${ai.pagesRead.competitor.length + ai.pagesRead.own.length} pages read` : "Compares their key public pages with yours: scores, strengths, gaps and a step-by-step plan."}
            </p>
          </div>
        </div>
        <WButton size="sm" tone={ai ? "secondary" : "primary"} icon={Sparkles} disabled={!competitorId || analyzeWithAi.isPending} disabledReason="Analyze this competitor first" onClick={run}>
          {analyzeWithAi.isPending ? "Generating…" : ai ? "Refresh insights" : "Generate insights"}
        </WButton>
      </div>

      {analyzeWithAi.isPending ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-[#DCE6FB] bg-white p-2.5 text-[11.5px] text-[#4B5872]">
          <span className="size-3.5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" aria-hidden /> Reading up to five pages of each site and comparing them. This takes 15–40 seconds.
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 rounded-md border border-[#F0C9C6] bg-[#FDF4F3] p-2.5 text-[11.5px] text-[#C0261F]">{error}</p> : null}

      {result ? (
        <div className="mt-3 space-y-3">
          {/* Head to head */}
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <SiteTile label="You" domain={ownDomain} color={YOU} image={ai.metrics?.own.image} score={overall(result.scores, "you")} leads={result.youDoBetter.length} />
            <span className="mx-auto grid size-8 shrink-0 place-items-center rounded-full bg-[#111C3A] text-[10px] font-bold text-white">VS</span>
            <SiteTile label="Competitor" domain={competitorDomain} color={THEM} image={ai.metrics?.competitor.image} score={overall(result.scores, "them")} leads={result.theyDoBetter.length} />
          </div>

          {/* Who they are */}
          <div className="rounded-lg border border-[#E6EBF4] bg-white p-3">
            <p className="text-[12px] leading-relaxed text-[#111C3A]">{result.summary}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {result.audience ? <p className="rounded-md bg-[#F8FAFD] p-2 text-[11px] leading-snug text-[#4B5872]"><span className="mb-0.5 flex items-center gap-1 font-semibold text-[#111C3A]"><Target className="size-3.5 text-[#3B69B8]" aria-hidden />Who they speak to</span>{result.audience}</p> : null}
              {result.positioning ? <p className="rounded-md bg-[#F8FAFD] p-2 text-[11px] leading-snug text-[#4B5872]"><span className="mb-0.5 flex items-center gap-1 font-semibold text-[#111C3A]"><Tag className="size-3.5 text-[#3B69B8]" aria-hidden />How they position</span>{result.positioning}</p> : null}
            </div>
            {result.offerings.length ? <div className="mt-2 flex flex-wrap gap-1.5">{result.offerings.map((o) => <Chip key={o} tone="info">{o}</Chip>)}</div> : null}
          </div>

          {/* Charts */}
          {result.scores?.length || ai.metrics ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {result.scores?.length ? (
                <Panel title="Scorecard (out of 10)" icon={TrendingUp} aside={<span className="text-[10px] text-[#8494AC]">Judged from the pages read</span>}>
                  <ScoreRadar scores={result.scores} />
                </Panel>
              ) : null}
              {ai.metrics ? (
                <Panel title="Measured side by side" icon={FileText} aside={<ChartLegend items={[{ key: "you", label: "You", color: YOU }, { key: "them", label: "Competitor", color: THEM }]} />}>
                  <Measured own={ai.metrics.own} competitor={ai.metrics.competitor} />
                </Panel>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 rounded-md border border-dashed border-[#DCE6FB] bg-white p-2.5 text-[11px] text-[#6B7A94]"><Info className="size-3.5" aria-hidden />Refresh the insights to see the scorecard and side-by-side charts.</p>
          )}

          {/* Strengths */}
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title={`Where ${competitorDomain} leads`} icon={TrendingUp} aside={<Chip tone="muted">{result.theyDoBetter.length}</Chip>}>
              <Points items={result.theyDoBetter} color={THEM} empty="Nothing the pages clearly show." />
            </Panel>
            <Panel title="Where you lead" icon={ThumbsUp} aside={<Chip tone="muted">{result.youDoBetter.length}</Chip>}>
              <Points items={result.youDoBetter} color={YOU} empty={ai.pagesRead.own.length ? "Nothing the pages clearly show." : "Your website could not be read."} />
            </Panel>
          </div>

          {/* Action plan */}
          <Panel title="Action plan" icon={Zap} aside={quickWins ? <Chip tone="good">{quickWins} quick win{quickWins === 1 ? "" : "s"}</Chip> : null}>
            <div className="flex flex-col gap-3 md:flex-row">
              <EffortMatrix actions={actions} />
              <ol className="min-w-0 flex-1 space-y-1.5">
                {actions.map((item) => (
                  <li key={item.n} className="flex gap-2 rounded-md border border-[#EEF2F8] bg-[#FAFBFD] p-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: PRIORITY_DOT[item.priority] }}>{item.n}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-semibold leading-snug text-[#111C3A]">{item.action}</p>
                      {item.reason ? <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[#6B7A94]" title={item.reason}>{item.reason}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Chip tone={PRIORITY_TONE[item.priority]}>{item.priority}</Chip>
                      <span className="text-[9.5px] text-[#8494AC]">{item.effort} effort</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

          {/* Gaps, keywords, conversion */}
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Content they have, you don't" icon={Lightbulb} aside={<Chip tone="muted">{result.contentGaps.length}</Chip>}>
              {result.contentGaps.length ? (
                <ul className="space-y-1.5">
                  {(showAll ? result.contentGaps : result.contentGaps.slice(0, 4)).map((gap) => (
                    <li key={gap.topic} className="rounded-md bg-[#FAFBFD] p-2">
                      <p className="text-[11.5px] font-semibold leading-snug text-[#111C3A]">{gap.topic}</p>
                      {gap.why ? <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[#6B7A94]" title={gap.why}>{gap.why}</p> : null}
                      <SourceLink url={gap.url} />
                    </li>
                  ))}
                  {result.contentGaps.length > 4 ? (
                    <li><button type="button" onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1 text-[10.5px] font-medium text-[#2563EB]">{showAll ? "Show less" : `Show ${result.contentGaps.length - 4} more`}<ChevronDown className={cn("size-3", showAll && "rotate-180")} aria-hidden /></button></li>
                  ) : null}
                </ul>
              ) : <p className="text-[11.5px] text-[#6B7A94]">No clear gaps found.</p>}
            </Panel>
            <Panel title="Topics they target" icon={Tag} aside={<Chip tone="muted">{result.keywordThemes.length}</Chip>}>
              {result.keywordThemes.length ? <div className="flex flex-wrap gap-1.5">{result.keywordThemes.map((k) => <Chip key={k} tone="violet">{k}</Chip>)}</div> : <p className="text-[11.5px] text-[#6B7A94]">None found.</p>}
            </Panel>
            <Panel title="How they win trust & action" icon={ShieldCheck}>
              {result.conversion.trustSignals.length ? (
                <ul className="space-y-1">
                  {result.conversion.trustSignals.map((t) => <li key={t} className="flex gap-1.5 text-[11px] leading-snug text-[#28354C]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#0F9D6E]" aria-hidden />{t}</li>)}
                </ul>
              ) : <p className="text-[11.5px] text-[#6B7A94]">No trust signals found.</p>}
              {result.conversion.ctas.length ? (
                <div className="mt-2.5 border-t border-[#EEF2F8] pt-2">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase text-[#6B7A94]"><MousePointerClick className="size-3" aria-hidden />Their buttons</p>
                  <div className="flex flex-wrap gap-1.5">{result.conversion.ctas.map((c) => <Chip key={c}>{c}</Chip>)}</div>
                </div>
              ) : null}
            </Panel>
          </div>

          <details className="rounded-lg border border-[#E6EBF4] bg-white p-2.5 text-[11px] text-[#4B5872]">
            <summary className="cursor-pointer font-semibold text-[#111C3A]">Pages read ({ai.pagesRead.competitor.length + ai.pagesRead.own.length})</summary>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div><p className="mb-1 font-semibold">{competitorDomain}</p><ul className="space-y-0.5">{ai.pagesRead.competitor.map((url) => <li key={url}><SourceLink url={url} /></li>)}</ul></div>
              <div><p className="mb-1 font-semibold">{ownDomain}</p>{ai.pagesRead.own.length ? <ul className="space-y-0.5">{ai.pagesRead.own.map((url) => <li key={url}><SourceLink url={url} /></li>)}</ul> : <p>Could not be read.</p>}</div>
            </div>
          </details>

          <p className="flex gap-1.5 text-[10.5px] leading-snug text-[#8494AC]">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            Based only on the public pages listed. Traffic, rankings and backlinks are not visible on pages, so they are not shown. Every point links to its source page{ai.dropped ? `; ${ai.dropped} unsupported point(s) were removed` : ""}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
