"use client";

import { useState, type ElementType, type ReactNode } from "react";
import {
  AlertTriangle, Gauge, ArrowDownRight, ArrowUpRight, BookOpen, Calendar, CalendarClock, CalendarDays, Check, CircleHelp, Crown, FileText, Flame,
  Info, Lightbulb, PlayCircle, ShieldAlert, ShieldCheck, Sparkles, Target, ThumbsDown, ThumbsUp, TrendingUp, X, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { Chip, ScoreDial } from "@/features/admin/website/components/ui/kit";
import { AXIS_PROPS, ChartLegend, ChartTooltip, GRID_PROPS } from "@/features/admin/website/components/ui/charts";
import { formatDateTime } from "@/features/admin/website/data/selectors";
import type { AnalyzerResult, RunReport, SiteEvidence, StudyDetail, StudySite } from "./api";
import { SiteFavicon, SiteLabel, SourceLink } from "./ui";

export type ColorOf = (domain: string) => string;
const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));
const tone = (score: number | null | undefined) => (score == null ? "muted" : score >= 70 ? "good" : score >= 45 ? "warn" : "bad");

/**
 * A report section. `explain` says in plain words what the section shows and how to read it; it can be folded away
 * and stays folded on this browser once closed.
 */
export function Panel({ title, icon: Icon, children, aside, className, subtitle, explain }: { title: string; icon: ElementType; children: ReactNode; aside?: ReactNode; className?: string; subtitle?: string; explain?: ReactNode }) {
  const key = `cmpz.explain.${title}`;
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(key) !== "closed";
    } catch {
      return true;
    }
  });
  const toggle = () => {
    setOpen((v) => {
      try {
        window.localStorage.setItem(key, v ? "closed" : "open");
      } catch {
        /* storage unavailable: the choice lasts for this page only */
      }
      return !v;
    });
  };
  return (
    <section className={cn("min-w-0 rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-[#EFF4FC] text-[#3B69B8] ring-1 ring-inset ring-[#DCE7F7]"><Icon className="size-3.5" aria-hidden /></span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-[#111C3A]">{title}</h2>
            {subtitle ? <p className="text-[11px] text-[#6B7A94]">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {aside}
          {explain ? (
            <button type="button" onClick={toggle} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium", open ? "bg-[#EFF4FC] text-[#2563EB]" : "text-[#6B7A94] hover:bg-[#F1F4F9]")} aria-expanded={open}>
              <CircleHelp className="size-3.5" /> How to read this
            </button>
          ) : null}
        </div>
      </header>
      {explain && open ? (
        <div className="mb-3 flex gap-2 rounded-lg border border-[#DCE6FB] bg-[#F7F9FF] p-2.5 text-[11.5px] leading-relaxed text-[#28354C]">
          <Info className="mt-0.5 size-4 shrink-0 text-[#2563EB]" aria-hidden />
          <div className="min-w-0 space-y-1">{explain}</div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Site image                                                          */
/* ------------------------------------------------------------------ */

/** The site's own share image (og:image), shown whole; nothing when the site has none. */
export function SiteImage({ ev, domain, className }: { ev?: SiteEvidence; domain: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? ev?.image ?? ev?.metrics.image ?? null : null;
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote share image of the site
    <img src={src} alt={`${domain} share image`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn("aspect-[1.91/1] w-full rounded-lg bg-[#F4F6FA] object-contain ring-1 ring-[#E6EBF4]", className)} />
  );
}

function KpiCard({ label, icon: Icon, accent, value, sub }: { label: string; icon: ElementType; accent: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-[#E6EBF4] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}14`, color: accent }}><Icon className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#6B7A94]">{label}</p>
        <div className="mt-0.5 text-[22px] font-bold leading-tight" style={{ color: accent }}>{value}</div>
        <p className="mt-1 text-[11px] leading-snug text-[#6B7A94]">{sub}</p>
      </div>
    </div>
  );
}

/** Competition rank: 1 + the number of sites with a higher score, so equal scores share a rank. */
export function rankOf(ai: AnalyzerResult, domain: string) {
  const mine = ai.overall[domain];
  if (mine === undefined) return null;
  const higher = Object.values(ai.overall).filter((v) => v > mine).length;
  const tied = Object.entries(ai.overall).filter(([d, v]) => d !== domain && v === mine).map(([d]) => d);
  return { rank: higher + 1, tied };
}

/* ------------------------------------------------------------------ */
/* Hero + leaderboard                                                  */
/* ------------------------------------------------------------------ */

export function Hero({ study, report, ai, colorOf }: { study: StudyDetail; report: RunReport; ai: AnalyzerResult | null; colorOf: ColorOf }) {
  const own = study.sites[0]!;
  const ranked = ai ? [...study.sites].sort((a, b) => (ai.overall[b.domain] ?? -1) - (ai.overall[a.domain] ?? -1)) : study.sites;
  const position = ai ? rankOf(ai, own.domain) : null;
  const ownScore = ai?.overall[own.domain] ?? null;
  const best = ai ? Math.max(...Object.values(ai.overall)) : null;
  const leads = ai?.scores.filter((s) => s.leader === own.domain).length ?? 0;
  const threat = ai?.headToHead.find((h) => h.threat === "high") ?? ai?.headToHead.find((h) => h.threat === "medium") ?? null;
  const quickWins = ai?.actions.filter((a) => a.effort === "low" && (a.impact ?? a.priority) === "high").length ?? 0;
  const winsOf = (d: string) => ai?.scores.filter((a) => a.leader === d).map((a) => a.area) ?? [];
  const pages = report.sites.reduce((n, e) => n + e.pages.length, 0);

  return (
    <div className="space-y-1">
      {/* Banner: where you stand, in one sentence */}
      <section className="rounded-xl border border-[#DCE6FB] bg-gradient-to-r from-[#F5F8FF] via-white to-[#F7F3FF] px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex shrink-0 items-center gap-3.5 md:w-[290px]">
            <div className="relative shrink-0 pb-1.5">
              <ScoreDial value={ownScore} tone={tone(ownScore)} size={72} label={`Your overall score ${ownScore ?? "not scored"}`} />
              {position ? (
                <span className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-2 ring-white", position.rank === 1 ? "bg-[#F59E0B] text-white" : "bg-[#111C3A] text-white")}>
                  {position.rank === 1 ? <Crown className="mr-0.5 inline size-3" /> : null}Rank #{position.rank}
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6B7A94]">Your website</p>
              <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-[#111C3A]"><SiteFavicon domain={own.domain} size={16} /><span className="truncate normal-case">{own.domain}</span></p>
              <p className="mt-0.5 text-[12px] text-[#4B5872]">
                {position ? <>#{position.rank} of {study.sites.length} websites</> : "Not scored yet"}
                {position?.tied.length ? <span className="block text-[11px] font-medium text-[#B45309]">Tied with <span className="normal-case">{position.tied.join(", ")}</span></span> : null}
              </p>
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-[#E6EBF4] md:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7C3AED]"><Sparkles className="size-3.5" /> The big picture</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#28354C]">{ai ? ai.overview : "The AI summary appears when the comparison completes."}</p>
            <p className="mt-1.5 text-[10.5px] text-[#94A3B8]">Checked {formatDateTime(report.finishedAt ?? report.startedAt)} · {pages} pages read across {study.sites.length} websites</p>
          </div>
        </div>
      </section>

      {/* Four headline numbers; text wraps instead of being cut */}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Your score" icon={Gauge} accent="#2563EB" value={ownScore ?? "—"} sub={best != null && ownScore != null ? (ownScore >= best ? "Highest in this comparison" : `${best - ownScore} points behind the leader`) : "Out of 100"} />
        <KpiCard label="Areas you lead" icon={Crown} accent="#12A06D" value={ai ? `${leads} of ${ai.scores.length}` : "—"} sub={leads ? "Areas where you score highest" : "No area where you lead yet"} />
        <KpiCard label="Biggest threat" icon={Flame} accent="#DC3A32" value={<span className="block break-all text-[15px] normal-case leading-snug">{threat?.competitor ?? "None"}</span>} sub={threat?.threatReason || "No strong threat found"} />
        <KpiCard label="Quick wins" icon={Zap} accent="#7C3AED" value={ai ? quickWins : "—"} sub="High impact, low effort — see Action plan" />
      </div>

      {/* Leaderboard */}
      <section className="rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[#111C3A]">
            <span className="grid size-[26px] place-items-center rounded-lg bg-[#FEF3C7] text-[#B45309] ring-1 ring-inset ring-[#FDE68A]"><Crown className="size-3.5" /></span>
            Leaderboard
          </h2>
          <p className="text-[11px] text-[#6B7A94]">Overall score out of 100 · crown = #1 in that area</p>
        </header>
        <ol className="space-y-1.5">
          {ranked.map((s) => {
            const ev = report.sites.find((e) => e.domain === s.domain);
            const score = ai?.overall[s.domain] ?? null;
            const place = ai ? rankOf(ai, s.domain)?.rank ?? null : null;
            const wins = winsOf(s.domain);
            return (
              <li key={s.domain} className={cn("grid grid-cols-[28px_minmax(0,1fr)_44px] items-center gap-3 rounded-lg px-2.5 py-2 md:grid-cols-[28px_minmax(0,240px)_minmax(0,1fr)_44px]", s.role === "own" ? "bg-[#EFF4FC] ring-1 ring-inset ring-[#DCE6FB]" : "hover:bg-[#F8FAFD]")}>
                <span className={cn("grid size-7 place-items-center rounded-full text-[12px] font-bold", place === 1 ? "bg-[#F59E0B] text-white" : "bg-[#F1F4F9] text-[#28354C]")}>{place === 1 ? <Crown className="size-3.5" /> : place ?? "–"}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <SiteFavicon domain={s.domain} size={20} />
                  <span className={cn("truncate text-[12.5px] normal-case", s.role === "own" ? "font-semibold text-[#111C3A]" : "text-[#28354C]")} title={s.domain}>{s.domain}</span>
                  {s.role === "own" ? <span className="shrink-0 rounded bg-[#2563EB] px-1.5 text-[9.5px] font-semibold uppercase text-white">You</span> : null}
                </div>
                <div className="col-span-3 min-w-0 md:col-span-1">
                  {ev?.reachable === false ? (
                    <p className="truncate text-[11px] text-[#C0261F]">{ev.error}</p>
                  ) : (
                    <>
                      <span className="block h-2 overflow-hidden rounded-full bg-[#EEF2F8]"><span className="block h-full rounded-full" style={{ width: `${score ?? 0}%`, background: colorOf(s.domain) }} /></span>
                      {wins.length ? <p className="mt-1 truncate text-[10.5px] text-[#6B7A94]" title={wins.join(", ")}><Crown className="mr-0.5 inline size-3 text-[#F59E0B]" />Best at {wins.join(", ")}</p> : null}
                    </>
                  )}
                </div>
                <span className="row-start-1 text-right text-[16px] font-bold tabular-nums text-[#111C3A] md:row-start-auto" style={{ gridColumn: "-2 / -1" }}>{score ?? "—"}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

export function Swot({ swot }: { swot: NonNullable<AnalyzerResult["swot"]> }) {
  const boxes = [
    { key: "strengths", title: "Strengths", icon: ThumbsUp, bg: "bg-[#ECFDF5]", ring: "ring-[#A7F3D0]", color: "text-[#065F46]", items: swot.strengths },
    { key: "weaknesses", title: "Weaknesses", icon: ThumbsDown, bg: "bg-[#FEF2F2]", ring: "ring-[#FECACA]", color: "text-[#991B1B]", items: swot.weaknesses },
    { key: "opportunities", title: "Opportunities", icon: Lightbulb, bg: "bg-[#EFF6FF]", ring: "ring-[#BFDBFE]", color: "text-[#1E40AF]", items: swot.opportunities },
    { key: "threats", title: "Threats", icon: ShieldAlert, bg: "bg-[#FFFBEB]", ring: "ring-[#FDE68A]", color: "text-[#92400E]", items: swot.threats },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {boxes.map(({ key, title, icon: Icon, bg, ring, color, items }) => (
        <div key={key} className={cn("rounded-lg p-2.5 ring-1 ring-inset", bg, ring)}>
          <p className={cn("mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide", color)}><Icon className="size-3.5" />{title}</p>
          {items.length ? <ul className="space-y-1">{items.map((t) => <li key={t} className="flex gap-1.5 text-[11.5px] leading-snug text-[#28354C]"><span className={cn("mt-1.5 size-1 shrink-0 rounded-full bg-current", color)} />{t}</li>)}</ul> : <p className="text-[11px] text-[#94A3B8]">Nothing clear.</p>}
        </div>
      ))}
    </div>
  );
}

/** Each site placed by its Content depth (x) and Trust & proof (y) scores: top right is strongest. */
export function PositioningMap({ ai, sites, colorOf }: { ai: AnalyzerResult; sites: StudySite[]; colorOf: ColorOf }) {
  const x = ai.scores.find((s) => s.area === "Content depth");
  const y = ai.scores.find((s) => s.area === "Trust & proof");
  if (!x || !y) return <p className="text-[11.5px] text-[#6B7A94]">Not enough scores to place the sites.</p>;
  const points = sites.filter((s) => x.scores[s.domain] !== undefined && y.scores[s.domain] !== undefined).map((s) => ({ domain: s.domain, x: x.scores[s.domain]!, y: y.scores[s.domain]!, z: ai.overall[s.domain] ?? 50, own: s.role === "own" }));
  return (
    <div>
      <div className="relative h-[260px] normal-case">
        <span className="pointer-events-none absolute right-3 top-2 z-10 rounded bg-[#ECFDF5] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#065F46]">Leaders</span>
        <span className="pointer-events-none absolute bottom-9 left-12 z-10 rounded bg-[#FEF2F2] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#991B1B]">Catching up</span>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 18, left: -8 }}>
            <CartesianGrid stroke="#EDF1F7" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" domain={[0, 10]} ticks={[0, 5, 10]} {...AXIS_PROPS} label={{ value: "Content depth →", position: "insideBottom", offset: -8, fontSize: 10, fill: "#6B7A94" }} />
            <YAxis type="number" dataKey="y" domain={[0, 10]} ticks={[0, 5, 10]} {...AXIS_PROPS} label={{ value: "Trust & proof →", angle: -90, position: "insideLeft", offset: 20, fontSize: 10, fill: "#6B7A94" }} />
            <ZAxis type="number" dataKey="z" range={[160, 520]} />
            <ReferenceLine x={5} stroke="#CBD5E1" />
            <ReferenceLine y={5} stroke="#CBD5E1" />
            <Tooltip content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as (typeof points)[number] | undefined) : undefined;
              return p ? <ChartTooltip title={p.domain} rows={[{ name: "Content depth", value: `${p.x}/10`, color: colorOf(p.domain) }, { name: "Trust & proof", value: `${p.y}/10`, color: colorOf(p.domain) }, { name: "Overall", value: `${p.z}/100` }]} /> : null;
            }} />
            <Scatter data={points}>
              {points.map((p) => <Cell key={p.domain} fill={colorOf(p.domain)} fillOpacity={p.own ? 1 : 0.7} stroke={p.own ? "#111C3A" : "#fff"} strokeWidth={p.own ? 3 : 2} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend className="justify-center normal-case" items={points.map((p) => ({ key: p.domain, label: p.own ? `${p.domain} (you)` : p.domain, color: colorOf(p.domain) }))} />
    </div>
  );
}

/** Where the client wins and loses, read straight from the scores. */
export function WinLose({ ai, own }: { ai: AnalyzerResult; own: string }) {
  const rows = ai.scores.map((s) => {
    const mine = s.scores[own] ?? 0;
    const others = Object.entries(s.scores).filter(([d]) => d !== own).map(([, v]) => v);
    const best = Math.max(...others, 0);
    return { area: s.area, mine, best, diff: mine - best, note: s.note };
  }).sort((a, b) => b.diff - a.diff);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.area} className="text-[11.5px]" title={r.note}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-[#28354C]">{r.area}</span>
            <span className={cn("flex items-center gap-0.5 font-semibold tabular-nums", r.diff > 0 ? "text-[#0B845C]" : r.diff < 0 ? "text-[#C0261F]" : "text-[#6B7A94]")}>
              {r.diff > 0 ? <ArrowUpRight className="size-3.5" /> : r.diff < 0 ? <ArrowDownRight className="size-3.5" /> : null}
              {r.diff > 0 ? `+${r.diff} ahead` : r.diff < 0 ? `${r.diff} behind` : "level"}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-[1fr] gap-0.5">
            <span className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F8]"><span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${r.mine * 10}%` }} /></span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F8]"><span className="block h-full rounded-full bg-[#94A3B8]" style={{ width: `${r.best * 10}%` }} /></span>
          </div>
        </li>
      ))}
      <li className="flex items-center gap-3 pt-1 text-[10px] text-[#6B7A94]"><span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#2563EB]" />You</span><span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#94A3B8]" />Best competitor</span></li>
    </ul>
  );
}

export function Changes({ report, colorOf, own }: { report: RunReport; colorOf: ColorOf; own: string }) {
  if (!report.changes) return <p className="text-[11.5px] text-[#6B7A94]">This is the first check. Re-check later and changes on every site show up here.</p>;
  if (!report.changes.items.length) return <p className="text-[11.5px] text-[#6B7A94]">No notable changes on any site since {formatDateTime(report.changes.since)}.</p>;
  return (
    <ul className="grid gap-1.5 md:grid-cols-2">
      {report.changes.items.map((c, i) => (
        <li key={i} className={cn("flex items-start gap-2 rounded-md p-2 text-[11.5px]", c.domain === own ? "bg-[#EFF4FC] ring-1 ring-inset ring-[#BFD3F7]" : "bg-[#FAFBFD]")}>
          {c.direction === "up" ? <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-[#0F9D6E]" /> : c.direction === "down" ? <ArrowDownRight className="mt-0.5 size-3.5 shrink-0 text-[#DC3A32]" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-[#6B7A94]" />}
          <span className="min-w-0"><SiteLabel domain={c.domain} color={colorOf(c.domain)} own={c.domain === own} /> <span className="text-[#4B5872]">{c.text}</span></span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Scorecard tab                                                       */
/* ------------------------------------------------------------------ */

export function ScoreRadar({ ai, sites, colorOf }: { ai: AnalyzerResult; sites: StudySite[]; colorOf: ColorOf }) {
  const domains = sites.map((s) => s.domain).filter((d) => ai.overall[d] !== undefined);
  const data = ai.scores.map((s) => ({ area: s.area, note: s.note, ...Object.fromEntries(domains.map((d) => [d, s.scores[d] ?? 0])) }));
  return (
    <div>
      <div className="h-[300px] normal-case" role="img" aria-label="Scorecard radar">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%" margin={{ top: 6, right: 30, bottom: 6, left: 30 }}>
            <PolarGrid stroke="#E6EBF4" />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "#5B6B85" }} />
            <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={false} axisLine={false} />
            {domains.map((d) => (
              <Radar key={d} name={d} dataKey={d} stroke={colorOf(d)} strokeWidth={sites.find((s) => s.domain === d)?.role === "own" ? 2.5 : 1.5} fill={colorOf(d)} fillOpacity={sites.find((s) => s.domain === d)?.role === "own" ? 0.18 : 0.04} dot={{ r: 2.5, fill: colorOf(d), stroke: "#fff", strokeWidth: 1 }} />
            ))}
            <Tooltip content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as Record<string, unknown> | undefined) : undefined;
              return row ? <ChartTooltip title={String(row.area)} rows={domains.map((d) => ({ name: d, value: `${row[d]}/10`, color: colorOf(d) }))} footer={row.note ? String(row.note) : undefined} /> : null;
            }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend className="justify-center normal-case" items={domains.map((d) => ({ key: d, label: sites.find((s) => s.domain === d)?.role === "own" ? `${d} (you)` : d, color: colorOf(d) }))} />
    </div>
  );
}

/** Area × site heatmap: darker blue = higher score, crown = the single leader. */
export function Heatmap({ ai, sites, colorOf }: { ai: AnalyzerResult; sites: StudySite[]; colorOf: ColorOf }) {
  const domains = sites.map((s) => s.domain).filter((d) => ai.overall[d] !== undefined);
  const cell = (v: number | undefined) => {
    if (v === undefined) return { background: "#F4F6FA", color: "#A3B0C2" };
    const a = 0.08 + (v / 10) * 0.72;
    return { background: `rgba(37, 99, 235, ${a.toFixed(2)})`, color: a > 0.45 ? "#fff" : "#111C3A" };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11.5px]">
        <thead>
          <tr>
            <th className="w-36" />
            {domains.map((d) => <th key={d} className={cn("px-1.5 pb-1 pt-1 text-left align-bottom text-[10.5px] font-normal", sites.find((s) => s.domain === d)?.role === "own" && "rounded-t-md bg-[#EFF4FC]")}><SiteLabel domain={d} color={colorOf(d)} own={sites.find((s) => s.domain === d)?.role === "own"} /></th>)}
          </tr>
        </thead>
        <tbody>
          {ai.scores.map((s) => (
            <tr key={s.area}>
              <td className="pr-2 font-medium text-[#28354C]" title={s.note}>{s.area}</td>
              {domains.map((d) => (
                <td key={d} className={cn("h-9 rounded-md text-center font-bold tabular-nums", sites.find((x) => x.domain === d)?.role === "own" && "outline outline-2 -outline-offset-2 outline-[#2563EB]")} style={cell(s.scores[d])} title={s.note}>
                  {s.leader === d ? <Crown className="mr-0.5 inline size-3" /> : null}{s.scores[d] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="pr-2 font-bold text-[#111C3A]">Overall /100</td>
            {domains.map((d) => <td key={d} className={cn("h-9 rounded-md text-center text-[13px] font-bold tabular-nums text-white", sites.find((s) => s.domain === d)?.role === "own" ? "bg-[#2563EB]" : "bg-[#111C3A]")}>{ai.overall[d]}</td>)}
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[10.5px] text-[#94A3B8]">Scores out of 10, judged only from the pages read and Google measurements. Hover a row for the reason.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Head to head                                                        */
/* ------------------------------------------------------------------ */

const THREAT = { high: { label: "High threat", cls: "bg-[#FEF2F2] text-[#B91C1C] ring-[#FECACA]" }, medium: { label: "Medium threat", cls: "bg-[#FFFBEB] text-[#92400E] ring-[#FDE68A]" }, low: { label: "Low threat", cls: "bg-[#F1F5F9] text-[#475569] ring-[#E2E8F0]" } } as const;

export function HeadToHead({ ai, own, colorOf }: { ai: AnalyzerResult; report: RunReport; own: string; colorOf: ColorOf }) {
  const promiseOf = (d: string) => ai.sites.find((s) => s.domain === d)?.promise;
  return (
    <div className="grid gap-1 xl:grid-cols-2">
      {ai.headToHead.map((h) => {
        const t = THREAT[h.threat ?? "medium"];
        return (
          <article key={h.competitor} className="overflow-hidden rounded-xl border border-[#E6EBF4] bg-white">
            <header className="flex items-start gap-3 border-b border-[#EEF2F8] bg-gradient-to-r from-[#F8FAFD] to-white p-3">
              <SiteFavicon domain={h.competitor} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold normal-case text-[#111C3A]" title={h.competitor}>{h.competitor}</p>
                <p className="mt-1"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", t.cls)}><AlertTriangle className="mr-0.5 inline size-3" />{t.label}</span></p>
                {h.threatReason ? <p className="mt-1 text-[11px] leading-snug text-[#6B7A94]">{h.threatReason}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white px-2 py-1 ring-1 ring-[#E6EBF4]">
                <div className="text-center"><p className="text-[18px] font-bold tabular-nums" style={{ color: colorOf(own) }}>{ai.overall[own] ?? "—"}</p><p className="text-[9px] uppercase text-[#94A3B8]">you</p></div>
                <span className="text-[10px] font-bold text-[#CBD5E1]">vs</span>
                <div className="text-center"><p className="text-[18px] font-bold tabular-nums" style={{ color: colorOf(h.competitor) }}>{ai.overall[h.competitor] ?? "—"}</p><p className="text-[9px] uppercase text-[#94A3B8]">them</p></div>
              </div>
            </header>
            <div className="space-y-2.5 p-3">
              {h.verdict ? <p className="rounded-md bg-[#F8FAFD] p-2 text-[11.5px] text-[#28354C]"><Sparkles className="mr-1 inline size-3.5 text-[#7C3AED]" />{h.verdict}</p> : null}
              {promiseOf(own) || promiseOf(h.competitor) ? (
                <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                  <p className="rounded-md border border-[#E6EBF4] p-2"><span className="block text-[9.5px] font-semibold uppercase text-[#6B7A94]">Your promise</span>“{promiseOf(own) ?? "—"}”</p>
                  <p className="rounded-md border border-[#E6EBF4] p-2"><span className="block text-[9.5px] font-semibold uppercase text-[#6B7A94]">Their promise</span>“{promiseOf(h.competitor) ?? "—"}”</p>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-[#0B845C]"><ThumbsUp className="size-3" /> You lead</p>
                  {h.youLead.length ? <ul className="space-y-1">{h.youLead.map((p) => <li key={p.point} className="rounded-md border-l-[3px] bg-[#F0FDF4] py-1 pl-2 pr-1 text-[11px] text-[#28354C]" style={{ borderColor: "#12A06D" }}>{p.point}<br /><SourceLink url={p.url} /></li>)}</ul> : <p className="text-[11px] text-[#94A3B8]">Nothing clear.</p>}
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-[#C0261F]"><ThumbsDown className="size-3" /> They lead</p>
                  {h.theyLead.length ? <ul className="space-y-1">{h.theyLead.map((p) => <li key={p.point} className="rounded-md border-l-[3px] bg-[#FEF2F2] py-1 pl-2 pr-1 text-[11px] text-[#28354C]" style={{ borderColor: "#DC3A32" }}>{p.point}<br /><SourceLink url={p.url} /></li>)}</ul> : <p className="text-[11px] text-[#94A3B8]">Nothing clear.</p>}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content & topics                                                    */
/* ------------------------------------------------------------------ */

export function TopicMatrix({ ai, sites, colorOf }: { ai: AnalyzerResult; sites: StudySite[]; colorOf: ColorOf }) {
  const topics = ai.topics ?? [];
  if (!topics.length) return <p className="text-[11.5px] text-[#6B7A94]">Re-check to see the topic map.</p>;
  const own = sites[0]!.domain;
  const sorted = [...topics].sort((a, b) => Number(a.sites.includes(own)) - Number(b.sites.includes(own)) || b.sites.length - a.sites.length);
  return (
    <div className="overflow-x-auto">
      <ChartLegend className="mb-2 normal-case" items={sites.map((s) => ({ key: s.domain, label: s.role === "own" ? `${s.domain} (you)` : s.domain, color: colorOf(s.domain) }))} />
      <table className="w-full min-w-[520px] text-[11.5px]">
        <thead>
          <tr className="border-b border-[#EEF2F8]">
            <th className="py-1.5 text-left text-[10px] font-semibold uppercase text-[#6B7A94]">Topic</th>
            {sites.map((s) => <th key={s.domain} className={cn("px-1 py-1.5 text-center", s.role === "own" && "rounded-t-md bg-[#EFF4FC]")}><span className="inline-flex flex-col items-center gap-0.5"><SiteFavicon domain={s.domain} size={16} />{s.role === "own" ? <span className="rounded bg-[#2563EB] px-1 text-[8.5px] font-semibold uppercase text-white">You</span> : null}</span><span className="sr-only">{s.domain}</span></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F5FA]">
          {sorted.map((t) => {
            const missing = !t.sites.includes(own);
            return (
              <tr key={t.topic} className={missing ? "bg-[#FFFBEB]" : undefined}>
                <td className="py-1.5 pr-2 text-[#28354C]">{t.topic}{missing ? <span className="ml-1.5 rounded bg-[#FDE68A] px-1 text-[9.5px] font-semibold text-[#92400E]">you don’t cover</span> : null}</td>
                {sites.map((s) => (
                  <td key={s.domain} className={cn("px-1 py-1.5 text-center", s.role === "own" && "bg-[#EFF4FC]")}>
                    {t.sites.includes(s.domain) ? <span className="mx-auto block size-3.5 rounded-full" style={{ background: colorOf(s.domain) }} title={`${s.domain} covers this`} /> : <span className="mx-auto block size-3.5 rounded-full border border-dashed border-[#CBD5E1]" title={`${s.domain} does not`} />}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[10.5px] text-[#94A3B8]">Themes found on the pages read. Highlighted rows are topics competitors cover and you don’t.</p>
    </div>
  );
}

const FORMAT_ICON = { page: FileText, blog: BookOpen, faq: CircleHelp, video: PlayCircle, guide: Lightbulb } as const;

export function ContentIdeas({ ai, colorOf }: { ai: AnalyzerResult; colorOf: ColorOf }) {
  const ideas = ai.contentIdeas ?? [];
  if (!ideas.length) return <p className="text-[11.5px] text-[#6B7A94]">Re-check to get content ideas.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ideas.map((idea) => {
        const Icon = FORMAT_ICON[idea.format] ?? FileText;
        return (
          <div key={idea.title} className="flex gap-2.5 rounded-lg border border-[#E6EBF4] bg-gradient-to-br from-white to-[#F8FAFD] p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F1ECFE] text-[#7C3AED]"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-snug text-[#111C3A]">{idea.title}</p>
              <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">{idea.why}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]"><Chip>{idea.format}</Chip>{idea.inspiredBy ? <span className="text-[#6B7A94]">inspired by <SiteLabel domain={idea.inspiredBy} color={colorOf(idea.inspiredBy)} /></span> : null}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Gaps({ ai, colorOf }: { ai: AnalyzerResult; colorOf: ColorOf }) {
  if (!ai.gaps.length) return <p className="text-[11.5px] text-[#6B7A94]">No clear gaps.</p>;
  return (
    <ul className="space-y-1.5">
      {ai.gaps.map((g) => (
        <li key={g.topic} className="rounded-md border-l-[3px] border-[#E29208] bg-[#FFFBEB]/60 p-2">
          <p className="text-[11.5px] font-semibold text-[#111C3A]">{g.topic}</p>
          {g.why ? <p className="text-[10.5px] text-[#6B7A94]">{g.why}</p> : null}
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px]">{g.competitors.map((d) => <SiteLabel key={d} domain={d} color={colorOf(d)} />)}<SourceLink url={g.url} /></p>
        </li>
      ))}
    </ul>
  );
}

export function Profiles({ ai, report, sites, colorOf }: { ai: AnalyzerResult; report: RunReport; sites: StudySite[]; colorOf: ColorOf }) {
  const [open, setOpen] = useState<string>(sites[1]?.domain ?? sites[0]?.domain ?? "");
  const profile = ai.sites.find((s) => s.domain === open);
  if (!ai.sites.length) return <p className="text-[11.5px] text-[#6B7A94]">Re-check to see each website up close.</p>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ai.sites.map((s) => (
          <button key={s.domain} type="button" onClick={() => setOpen(s.domain)} className={cn("rounded-full border px-2.5 py-1 text-[11px]", open === s.domain ? "border-[#2563EB] bg-[#EFF4FC]" : sites.find((x) => x.domain === s.domain)?.role === "own" ? "border-[#BFD3F7] bg-[#F5F8FF]" : "border-[#E6EBF4] hover:bg-[#F8FAFD]")}>
            <SiteLabel domain={s.domain} color={colorOf(s.domain)} own={sites.find((x) => x.domain === s.domain)?.role === "own"} />
          </button>
        ))}
      </div>
      {profile ? (
        <div className={cn("grid gap-3", (report.sites.find((e) => e.domain === profile.domain)?.image) && "md:grid-cols-[220px_minmax(0,1fr)]")}>
          <SiteImage ev={report.sites.find((e) => e.domain === profile.domain)} domain={profile.domain} />
          <div className="min-w-0 space-y-2.5">
            {profile.promise ? <p className="text-[15px] font-semibold leading-snug text-[#111C3A]">“{profile.promise}”</p> : null}
            <p className="text-[12px] leading-relaxed text-[#28354C]">{profile.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.tone ? <Chip tone="violet">Tone: {profile.tone}</Chip> : null}
              {profile.offerings.map((o) => <Chip key={o} tone="info">{o}</Chip>)}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {profile.audience ? <p className="rounded-md bg-[#F8FAFD] p-2 text-[11px] text-[#4B5872]"><span className="mb-0.5 flex items-center gap-1 font-semibold text-[#111C3A]"><Target className="size-3.5 text-[#3B69B8]" />Who they speak to</span>{profile.audience}</p> : null}
              {profile.positioning ? <p className="rounded-md bg-[#F8FAFD] p-2 text-[11px] text-[#4B5872]"><span className="mb-0.5 flex items-center gap-1 font-semibold text-[#111C3A]"><TrendingUp className="size-3.5 text-[#3B69B8]" />How they position</span>{profile.positioning}</p> : null}
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {[{ title: "Strengths", items: profile.strengths, color: "#12A06D", Icon: ThumbsUp }, { title: "Weak spots", items: profile.weaknesses, color: "#DC3A32", Icon: ThumbsDown }].map(({ title, items, color, Icon }) => (
                <div key={title}>
                  <p className="mb-1 flex items-center gap-1 text-[10.5px] font-bold uppercase" style={{ color }}><Icon className="size-3" />{title}</p>
                  {items.length ? <ul className="space-y-1.5">{items.map((p) => <li key={p.point} className="rounded-md border-l-[3px] bg-[#FAFBFD] py-1.5 pl-2.5 pr-2" style={{ borderLeftColor: color }}><p className="text-[11.5px] font-semibold text-[#111C3A]">{p.point}</p>{p.evidence ? <p className="line-clamp-2 text-[10.5px] text-[#6B7A94]">{p.evidence}</p> : null}<SourceLink url={p.url} /></li>)}</ul> : <p className="text-[11px] text-[#94A3B8]">Nothing the pages clearly show.</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Speed & tech                                                        */
/* ------------------------------------------------------------------ */

export function SpeedBoard({ report, sites, colorOf }: { report: RunReport; sites: StudySite[]; colorOf: ColorOf }) {
  const rows = sites.map((s) => ({ site: s, ev: report.sites.find((e) => e.domain === s.domain) }));
  const lcp = rows.filter((r) => r.ev?.speed?.lcpMs != null).map((r) => ({ domain: r.site.domain, label: r.site.role === "own" ? `${r.site.domain} (you)` : r.site.domain, seconds: Number((r.ev!.speed!.lcpMs! / 1000).toFixed(1)) }));
  return (
    <div className="space-y-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {rows.map(({ site, ev }) => (
          <div key={site.domain} className={cn("min-w-0 overflow-hidden rounded-lg border p-2.5", site.role === "own" ? "border-[#2563EB] bg-[#F5F8FF] ring-1 ring-[#2563EB]/20" : "border-[#E6EBF4]")}>
            <SiteLabel domain={site.domain} color={colorOf(site.domain)} own={site.role === "own"} />
            {ev?.speed ? (
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9.5px] text-[#6B7A94]">
                {([["Speed", ev.speed.performance], ["SEO", ev.speed.seo], ["Access.", ev.speed.accessibility]] as const).map(([label, v]) => (
                  <div key={label} className="flex flex-col items-center gap-0.5"><ScoreDial value={v} tone={tone(v)} size={42} label={`${label} ${v ?? "n/a"}`} />{label}</div>
                ))}
              </div>
            ) : <p className="mt-2 text-[10.5px] text-[#94A3B8]">{ev?.speedError ?? "Not measured."}</p>}
          </div>
        ))}
      </div>
      {lcp.length ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#6B7A94]">Time until the main content shows on a phone (seconds, lower is better)</p>
          <div className="h-[160px] normal-case">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lcp} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 8 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis type="category" dataKey="label" width={180} {...AXIS_PROPS} tickFormatter={(d: string) => (d.length > 26 ? `${d.slice(0, 25)}…` : d)} />
                <ReferenceLine x={2.5} stroke="#12A06D" strokeDasharray="4 3" label={{ value: "good ≤ 2.5s", position: "top", fontSize: 9.5, fill: "#0B845C" }} />
                <Tooltip content={({ active, payload }) => (active && payload?.[0] ? <ChartTooltip title={String(payload[0].payload.domain)} rows={[{ name: "Largest paint", value: `${payload[0].value}s`, color: colorOf(String(payload[0].payload.domain)) }]} /> : null)} cursor={{ fill: "#F1F4F9" }} />
                <Bar dataKey="seconds" radius={[0, 4, 4, 0]} maxBarSize={16}>{lcp.map((r) => <Cell key={r.domain} fill={colorOf(r.domain)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Check = { label: string; value: (e: SiteEvidence) => boolean | number | string | null; good?: (v: never) => boolean; better?: "high" | "low"; hint?: string };
const CHECKS: { group: string; rows: Check[] }[] = [
  {
    group: "Search basics",
    rows: [
      { label: "Pages in sitemap", value: (e) => e.tech?.sitemapUrls ?? null, better: "high", hint: "How many pages the site lists for Google. More listed pages = more chances to appear in search." },
      { label: "robots.txt", value: (e) => e.tech?.robotsTxt ?? null, hint: "A small file that tells Google what it may read. Every site should have one." },
      { label: "One H1 on home page", value: (e) => (e.tech ? e.tech.h1Count === 1 : null), hint: "The main headline. Exactly one helps Google understand the page." },
      { label: "Title length (30–60)", value: (e) => e.tech?.titleLength ?? null, good: ((v: number) => v >= 30 && v <= 60) as never, hint: "Characters in the blue headline shown in Google. 30–60 fits without being cut." },
      { label: "Meta description (70–160)", value: (e) => e.tech?.descriptionLength ?? null, good: ((v: number) => v >= 70 && v <= 160) as never, hint: "The grey text under the headline in Google. 0 means Google writes its own." },
      { label: "Canonical tag", value: (e) => e.tech?.canonical ?? null, hint: "Tells Google which address is the real one, so copies don’t compete." },
      { label: "Social share tags (Open Graph)", value: (e) => e.tech?.openGraph ?? null, hint: "Controls the picture and title when the link is shared on WhatsApp, Facebook, LinkedIn." },
      { label: "Mobile viewport", value: (e) => e.tech?.viewport ?? null, hint: "Makes the page fit phone screens." },
      { label: "Images with alt text", value: (e) => (e.tech && e.tech.imagesTotal ? Math.round((e.tech.imagesWithAlt / e.tech.imagesTotal) * 100) : null), better: "high", hint: "% of home page images described in words — helps Google Images and blind visitors." },
      { label: "Structured data types", value: (e) => e.metrics.schemaTypes.length, better: "high", hint: "Hidden labels (Event, Organization…) that can earn rich results like dates and logos in Google." },
      { label: "Google knows the brand", value: (e) => (e.brand ? e.brand.status === "matched" : null), hint: "Whether Google’s Knowledge Graph lists this business with this website." },
    ],
  },
  {
    group: "Content",
    rows: [
      { label: "Key pages read", value: (e) => e.metrics.pages, better: "high", hint: "Home plus the main About / Services / Contact-type pages we could open." },
      { label: "Words on those pages", value: (e) => e.metrics.words, better: "high", hint: "Visible text. More useful text usually means more search topics covered." },
      { label: "Blog / news section", value: (e) => e.tech?.hasBlog ?? null, hint: "Regular articles bring new search traffic and show the business is active." },
      { label: "Newest dated content", value: (e) => e.tech?.latestDate ?? null, hint: "Latest publish date found. Empty = no dated content, so freshness is unknown." },
      { label: "Different calls to action", value: (e) => e.metrics.ctas, better: "high", hint: "Buttons like Register, Book, Donate, Contact that ask the visitor to act." },
      { label: "Images", value: (e) => e.metrics.images, better: "high", hint: "Pictures in the main content of the pages read." },
    ],
  },
  {
    group: "Reach & trust",
    rows: [
      { label: "Phone link", value: (e) => e.metrics.contact.phone, hint: "A number visitors can tap to call." },
      { label: "WhatsApp", value: (e) => e.metrics.contact.whatsapp, hint: "A WhatsApp chat link or button." },
      { label: "Email link", value: (e) => e.metrics.contact.email, hint: "A clickable email address." },
      { label: "Contact form", value: (e) => e.metrics.contact.form, hint: "A form to send an enquiry or register." },
      { label: "Social profiles linked", value: (e) => e.metrics.social.length, better: "high", hint: "Facebook, Instagram, LinkedIn, YouTube… linked from the site." },
      { label: "HTTPS", value: (e) => e.https, hint: "The padlock in the browser. Google and visitors expect it." },
    ],
  },
];

export function TechTable({ report, sites, colorOf }: { report: RunReport; sites: StudySite[]; colorOf: ColorOf }) {
  const cols = sites.map((s) => ({ site: s, ev: report.sites.find((e) => e.domain === s.domain && e.reachable) ?? null }));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[11.5px]">
        <thead>
          <tr className="border-b border-[#EEF2F8]">
            <th className="w-[300px] py-2 text-left" />
            {cols.map((c) => <th key={c.site.domain} className={cn("px-2 py-2 text-left text-[11px] font-normal", c.site.role === "own" && "rounded-t-md bg-[#EFF4FC]")}><SiteLabel domain={c.site.domain} color={colorOf(c.site.domain)} own={c.site.role === "own"} /></th>)}
          </tr>
        </thead>
        {CHECKS.map((g) => (
          <tbody key={g.group}>
            <tr><td colSpan={cols.length + 1} className="pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-[#6B7A94]">{g.group}</td></tr>
            {g.rows.map((row) => {
              const values = cols.map((c) => (c.ev ? row.value(c.ev) : null));
              const nums = values.filter((v): v is number => typeof v === "number");
              const best = row.better && nums.length > 1 ? (row.better === "high" ? Math.max(...nums) : Math.min(...nums)) : null;
              return (
                <tr key={row.label} className="border-t border-[#F2F5FA]">
                  <td className="py-1.5 pr-3 align-top text-[#28354C]">
                    <span className="font-medium">{row.label}</span>
                    {row.hint ? <span className="block text-[10.5px] leading-snug text-[#94A3B8]">{row.hint}</span> : null}
                  </td>
                  {values.map((v, i) => {
                    const ok = typeof v === "number" && row.good ? (row.good as (n: number) => boolean)(v) : null;
                    return (
                      <td key={cols[i]!.site.domain} className={cn("px-2 py-1.5", cols[i]!.site.role === "own" && "bg-[#EFF4FC]")}>
                        {typeof v === "boolean" ? (
                          v ? <span className="grid size-5 place-items-center rounded-full bg-[#E7F6EF] text-[#0F9D6E]"><Check className="size-3" aria-label="yes" /></span> : <span className="grid size-5 place-items-center rounded-full bg-[#FEF2F2] text-[#DC3A32]"><X className="size-3" aria-label="no" /></span>
                        ) : v == null ? (
                          <span className="text-[#A3B0C2]">—</span>
                        ) : (
                          <span className={cn("rounded px-1.5 py-0.5 font-semibold tabular-nums", (typeof v === "number" && v === best) || ok === true ? "bg-[#E7F6EF] text-[#0B845C]" : ok === false ? "bg-[#FEF2F2] text-[#B91C1C]" : "text-[#28354C]")}>
                            {typeof v === "number" ? fmt(v) : v}{row.label.startsWith("Images with alt") && typeof v === "number" ? "%" : ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
      <p className="mt-2 text-[10.5px] text-[#94A3B8]">Measured during the check (green = best or within the recommended range). Traffic, rankings and backlinks are not visible on pages, so they are not shown.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action plan                                                         */
/* ------------------------------------------------------------------ */

const COLUMNS = [
  { when: "this week", title: "This week", icon: Zap, accent: "#DC3A32" },
  { when: "this month", title: "This month", icon: CalendarDays, accent: "#E29208" },
  { when: "this quarter", title: "This quarter", icon: CalendarClock, accent: "#2563EB" },
] as const;

export function ActionBoard({ ai, colorOf }: { ai: AnalyzerResult; colorOf: ColorOf }) {
  const actions = ai.actions.map((a, i) => ({ ...a, n: i + 1, when: a.when ?? (a.priority === "high" ? "this week" : a.priority === "medium" ? "this month" : "this quarter") }));
  return (
    <div className="grid gap-1 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = actions.filter((a) => a.when === col.when);
        const Icon = col.icon;
        return (
          <div key={col.when} className="rounded-xl bg-[#F8FAFD] p-2.5 ring-1 ring-inset ring-[#E6EBF4]">
            <p className="mb-2 flex items-center justify-between text-[12px] font-bold text-[#111C3A]">
              <span className="flex items-center gap-1.5"><span className="grid size-6 place-items-center rounded-md text-white" style={{ background: col.accent }}><Icon className="size-3.5" /></span>{col.title}</span>
              <Chip tone="muted">{items.length}</Chip>
            </p>
            <ul className="space-y-2">
              {items.map((a) => {
                const quick = a.effort === "low" && (a.impact ?? a.priority) === "high";
                return (
                  <li key={a.n} className="rounded-lg border border-[#E6EBF4] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <p className="text-[12px] font-semibold leading-snug text-[#111C3A]">{a.action}</p>
                    {a.reason ? <p className="mt-1 text-[10.5px] text-[#6B7A94]">{a.reason}</p> : null}
                    <p className="mt-1.5 flex flex-wrap items-center gap-1">
                      {quick ? <Chip tone="good"><Zap className="mr-0.5 inline size-2.5" />Quick win</Chip> : null}
                      <Chip tone={(a.impact ?? a.priority) === "high" ? "bad" : (a.impact ?? a.priority) === "medium" ? "warn" : "muted"}>{a.impact ?? a.priority} impact</Chip>
                      <Chip>{a.effort} effort</Chip>
                    </p>
                    {a.learnFrom ? <p className="mt-1 text-[10.5px] text-[#4B5872]">Learn from <SiteLabel domain={a.learnFrom} color={colorOf(a.learnFrom)} /></p> : null}
                  </li>
                );
              })}
              {!items.length ? <li className="text-[11px] text-[#94A3B8]">Nothing here.</li> : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export function History({ study, colorOf }: { study: StudyDetail; colorOf: ColorOf }) {
  const points = study.history.filter((h) => h.overall);
  if (points.length < 2) {
    return <p className="flex items-center gap-2 text-[11.5px] text-[#6B7A94]"><Calendar className="size-4" />Every re-check adds a point here, so you see who is improving and who is slipping. Re-check in a week or two.</p>;
  }
  const domains = study.sites.map((s) => s.domain);
  const data = points.map((h) => ({ label: new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), ...h.overall }));
  return (
    <div>
      <div className="h-[220px] normal-case">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={[0, 100]} />
            <Tooltip content={({ active, payload, label }) => (active && payload?.length ? <ChartTooltip title={String(label)} rows={payload.map((p) => ({ name: String(p.name), value: String(p.value), color: String(p.color) }))} /> : null)} />
            {domains.map((d) => <Line key={d} type="monotone" dataKey={d} name={d} stroke={colorOf(d)} strokeWidth={study.sites[0]?.domain === d ? 3 : 2} dot={{ r: 3 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend className="justify-center normal-case" items={domains.map((d) => ({ key: d, label: d === study.sites[0]?.domain ? `${d} (you)` : d, color: colorOf(d) }))} />
    </div>
  );
}

export function Opportunities({ ai }: { ai: AnalyzerResult }) {
  if (!ai.opportunities.length) return null;
  return (
    <ul className="space-y-1.5">
      {ai.opportunities.map((o) => <li key={o} className="flex gap-2 rounded-md bg-[#F5F3FF] p-2 text-[11.5px] text-[#28354C]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#7C3AED]" />{o}</li>)}
    </ul>
  );
}

const AREA_MEANING: Record<string, string> = {
  "Message clarity": "Can a visitor tell within seconds who you are, what you offer and for whom?",
  "Trust & proof": "Testimonials, numbers, awards, partners, certificates — reasons to believe you.",
  "Calls to action": "Clear buttons and next steps: register, book, contact, donate.",
  "Content depth": "How much genuinely useful information the pages give.",
  "Ease of contact": "Phone, WhatsApp, email and forms that are easy to find.",
  "Search basics": "Titles, descriptions, headings and technical tags Google needs.",
  "Speed & mobile": "How fast and comfortable the site is on a phone.",
};

export function AreaGuide({ ai }: { ai: AnalyzerResult }) {
  return (
    <dl className="divide-y divide-[#F2F5FA]">
      {ai.scores.map((s) => (
        <div key={s.area} className="py-2 first:pt-0">
          <dt className="text-[12px] font-semibold text-[#111C3A]">{s.area}</dt>
          <dd className="text-[11px] text-[#6B7A94]">{AREA_MEANING[s.area] ?? ""}</dd>
          {s.note ? <dd className="mt-0.5 text-[11px] text-[#28354C]"><span className="font-medium text-[#2563EB]">Here:</span> {s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
