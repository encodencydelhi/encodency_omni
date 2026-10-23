"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArrowRight, CalendarClock, CheckCircle2, Clock, Info, ListChecks, Loader2, Plus, RefreshCw, Search, SearchX, Sparkles, Swords, Trash2, Trophy } from "lucide-react";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, WButton } from "@/features/admin/website/components/ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock } from "@/features/admin/website/components/ui/states";
import { formatRelative } from "@/features/admin/website/data/selectors";
import type { LookupResult, StudyListItem } from "./api";
import { domainOf, useCompanyClients, useKnownSiteNames, useSiteName, useStudies, useStudyMutations } from "./hooks";
import { SITE_COLORS, SiteFavicon } from "./ui";

const MAX_COMPETITORS = 4;
const errorText = (err: unknown, fallback: string) => (ApiError.isApiError(err) ? err.message : fallback);
const looksLikeDomain = (v: string) => /\.[a-z]{2,}(\/|$)/i.test(v.trim());

/** Under an address input: the name the website gives itself, fetched as soon as the address looks complete. */
function SiteNameHint({ value }: { value: string }) {
  const { domain, loading, data, error } = useSiteName(value);
  if (!domain) return null;
  return (
    <p className="ml-[18px] mt-1 flex min-h-4 items-center gap-1.5 text-[11px]">
      {loading ? (
        <>
          <Loader2 className="size-3 animate-spin text-[#94A3B8]" />
          <span className="text-[#94A3B8]">Finding the website’s name…</span>
        </>
      ) : data?.name ? (
        <>
          <SiteFavicon domain={domain} size={14} />
          <span className="font-semibold normal-case text-[#111C3A]">{data.name}</span>
          <CheckCircle2 className="size-3 text-[#15803D]" aria-label="Name found" />
        </>
      ) : (
        <span className="text-[#94A3B8]">{data && !data.reachable ? "This website did not answer. Check the address." : error ? "The name could not be read; the address will be shown." : "No name found; the address will be shown."}</span>
      )}
    </p>
  );
}

function CompetitorRow({ value, onChange, onRemove, index }: { value: string; onChange: (v: string) => void; onRemove?: () => void; index: number }) {
  const { lookup } = useStudyMutations();
  const [results, setResults] = useState<LookupResult[] | null>(null);
  const find = () => {
    lookup.mutate(value.trim(), {
      onSuccess: (res) => {
        setResults(res.results);
        if (!res.results.length) toast.info(res.message ?? "Google does not list a website for that name. Type the website address instead.");
      },
      onError: (e) => toast.error(errorText(e, "Search failed")),
    });
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: SITE_COLORS[index + 1] }} aria-hidden />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setResults(null);
          }}
          placeholder={index === 0 ? "competitor.com or a business name" : "another competitor (optional)"}
          className="h-9 min-w-0 flex-1 rounded-md border border-[#DAE1EC] px-3 text-[12.5px] normal-case outline-none focus:border-[#2563EB]"
        />
        {value.trim().length >= 2 && !looksLikeDomain(value) ? (
          <WButton size="sm" icon={lookup.isPending ? Loader2 : Search} onClick={find} disabled={lookup.isPending}>
            Find website
          </WButton>
        ) : null}
        {onRemove ? (
          <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-md text-[#94A3B8] hover:bg-[#FDF4F3] hover:text-[#C0261F]" aria-label="Remove competitor">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      {looksLikeDomain(value) ? <SiteNameHint value={value} /> : null}
      {results?.length ? (
        <ul className="ml-[18px] mt-1.5 divide-y divide-[#EEF2F8] overflow-hidden rounded-md border border-[#E6EBF4] bg-white">
          {results.map((r) => (
            <li key={r.url}>
              <button
                type="button"
                onClick={() => {
                  onChange(r.domain ?? r.url);
                  setResults(null);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F8FAFD]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Google Knowledge Graph image */}
                {r.imageUrl ? <img src={r.imageUrl} alt="" className="size-7 rounded object-contain" /> : <SiteFavicon domain={r.domain ?? ""} size={28} />}
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-[#111C3A]">{r.name}</span>
                  <span className="block truncate text-[11px] normal-case text-[#6B7A94]">{r.domain}{r.description ? ` · ${r.description}` : ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NewStudyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const clients = useCompanyClients();
  const { create, run } = useStudyMutations();
  const knownNames = useKnownSiteNames();
  const [own, setOwn] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [name, setName] = useState("");
  const [competitors, setCompetitors] = useState<string[]>(["", ""]);
  const withWebsites = (clients.data ?? []).filter((c) => c.website);
  const filled = competitors.map((c) => c.trim()).filter(Boolean);
  const ready = looksLikeDomain(own) && filled.length > 0 && filled.every(looksLikeDomain);
  const busy = create.isPending || run.isPending;

  const submit = () => {
    create.mutate(
      {
        own: own.trim(),
        competitors: filled,
        name: name.trim() || undefined,
        clientId: clientId || undefined,
        names: knownNames([own, ...filled].map(domainOf).filter((d): d is string => Boolean(d))),
      },
      {
        onSuccess: (study) => {
          run.mutate(study.id, {
            onSettled: () => {
              onOpenChange(false);
              router.push(`/admin/competitor-analyzer/${study.id}`);
            },
            onError: (e) => toast.error(errorText(e, "The analysis could not start")),
          });
        },
        onError: (e) => toast.error(errorText(e, "Could not create the analysis"), { duration: 8000 }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto rounded-lg border-[#E6EBF4] bg-white p-0 capitalize">
        <DialogHeader className="border-b border-[#EEF2F8] px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#111C3A]">
            <Swords className="size-4 text-[#7C3AED]" /> New competitor analysis
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#6B7A94]">
            Your website plus up to 4 competitors. Each site&apos;s key pages, speed and Google presence are compared, then AI explains who is better at what.
          </DialogDescription>
        </DialogHeader>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7A94]">Your website</p>
          {withWebsites.length ? (
            <select
              value={clientId}
              onChange={(e) => {
                const client = withWebsites.find((c) => c.id === e.target.value);
                setClientId(e.target.value);
                if (client?.website) setOwn(client.website);
              }}
              className="h-9 w-full rounded-md border border-[#DAE1EC] bg-white px-2.5 text-[12.5px] normal-case outline-none focus:border-[#2563EB]"
            >
              <option value="">Pick one of your clients…</option>
              {withWebsites.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.name} · {c.website}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: SITE_COLORS[0] }} aria-hidden />
            <input
              value={own}
              onChange={(e) => {
                setOwn(e.target.value);
                setClientId("");
              }}
              placeholder="yourwebsite.com"
              className="h-9 min-w-0 flex-1 rounded-md border border-[#DAE1EC] px-3 text-[12.5px] normal-case outline-none focus:border-[#2563EB]"
            />
          </div>
          {looksLikeDomain(own) ? <SiteNameHint value={own} /> : null}
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7A94]">Name (optional)</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic expos 2026" className="h-9 w-full rounded-md border border-[#DAE1EC] px-3 text-[12.5px] normal-case outline-none focus:border-[#2563EB]" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7A94]">Competitors ({filled.length}/{MAX_COMPETITORS})</p>
          {competitors.map((value, i) => (
            <CompetitorRow
              key={i}
              index={i}
              value={value}
              onChange={(v) => setCompetitors((list) => list.map((x, j) => (j === i ? v : x)))}
              onRemove={competitors.length > 1 ? () => setCompetitors((list) => list.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          {competitors.length < MAX_COMPETITORS ? (
            <button type="button" onClick={() => setCompetitors((l) => [...l, ""])} className="flex items-center gap-1 text-[12px] font-medium text-[#2563EB] hover:underline">
              <Plus className="size-3.5" /> Add competitor
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F8] bg-[#FAFBFD] px-5 py-3">
        <p className="text-[11px] text-[#6B7A94]">Takes about 1–2 minutes. Only public pages are read; traffic and rankings are not guessed.</p>
        <div className="flex items-center gap-2">
          <WButton size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</WButton>
          <WButton tone="primary" icon={busy ? Loader2 : Swords} disabled={!ready || busy} disabledReason="Enter your website and at least one competitor website" onClick={submit}>
            {busy ? "Starting…" : "Compare now"}
          </WButton>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}

const THREAT_ORDER = { high: 0, medium: 1, low: 2 } as const;
const THREAT_STYLE = {
  high: { label: "High", cls: "bg-[#FEF2F2] text-[#B91C1C] ring-[#FECACA]", dot: "bg-[#DC2626]" },
  medium: { label: "Medium", cls: "bg-[#FFFBEB] text-[#92400E] ring-[#FDE68A]", dot: "bg-[#F59E0B]" },
  low: { label: "Low", cls: "bg-[#F1F5F9] text-[#475569] ring-[#E2E8F0]", dot: "bg-[#94A3B8]" },
} as const;

/** Section title; the explanation sits behind the info icon so the card stays short. */
function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <p className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#6B7A94]">
      {title}
      <span title={hint} aria-label={hint} className="cursor-help text-[#B4BFD0] hover:text-[#2563EB]"><Info className="size-3" /></span>
    </p>
  );
}

/** Sites in score order (unscored studies keep their own order), plus where your site stands. */
function rankStudy(study: StudyListItem) {
  const overall = study.latestRun?.overall ?? null;
  const ranked = overall ? study.sites.map((s, i) => ({ ...s, i, score: overall[s.domain] ?? null })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : [];
  const status = study.latestRun?.status;
  return {
    ranked,
    ownRank: ranked.findIndex((s) => s.role === "own") + 1,
    ownScore: ranked.find((s) => s.role === "own")?.score ?? null,
    status,
    running: status === "running",
    checkedAt: study.latestRun?.checkedAt ?? (status === "completed" ? study.latestRun?.finishedAt : null),
  };
}

/** Auto-made names ("a.com vs b.com, c.com") repeat the sites, so the list shows your site's name instead. */
function studyTitle(study: StudyListItem) {
  const ownSite = study.sites.find((s) => s.role === "own");
  const own = ownSite?.domain ?? "";
  const ownLabel = ownSite?.name || own;
  const rivals = study.sites.length - 1;
  const vs = `vs ${rivals} competitor${rivals === 1 ? "" : "s"}`;
  const auto = !!own && study.name.toLowerCase().startsWith(`${own.toLowerCase()} vs`);
  return { own, title: auto ? ownLabel : study.name, sub: auto ? (ownLabel !== own ? `${own} · ${vs}` : vs) : `${ownLabel} ${vs}` };
}

const labelOf = (study: StudyListItem, domain: string) => study.sites.find((s) => s.domain === domain)?.name || domain;

function StudyListEntry({ study, active, onSelect }: { study: StudyListItem; active: boolean; onSelect: () => void }) {
  const { ranked, ownRank, ownScore, status, running, checkedAt } = rankStudy(study);
  const { own, title, sub } = studyTitle(study);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn("w-full rounded-lg px-2.5 py-2 text-left transition-colors", active ? "bg-[#EFF4FC] ring-1 ring-inset ring-[#BFD3F7]" : "hover:bg-[#F8FAFD]")}
    >
      <div className="flex items-start gap-2.5">
        <SiteFavicon domain={own} size={26} />
        <div className="min-w-0 flex-1">
          <p className={cn("break-words text-[12.5px] font-semibold leading-snug normal-case", active ? "text-[#1D4ED8]" : "text-[#111C3A]")}>{title}</p>
          <p className="break-words text-[11px] normal-case text-[#6B7A94]">{sub}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold leading-tight tabular-nums text-[#111C3A]">{ownScore ?? "—"}</p>
          {ownRank ? <p className={cn("whitespace-nowrap text-[10.5px] font-semibold", ownRank === 1 ? "text-[#15803D]" : "text-[#B45309]")}>#{ownRank} of {ranked.length}</p> : null}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 pl-[36px]">
        <span className="flex items-center gap-1">
          {study.sites.filter((s) => s.role !== "own").map((s) => <span key={s.domain} title={s.name || s.domain}><SiteFavicon domain={s.domain} size={14} /></span>)}
        </span>
        <span className="whitespace-nowrap text-[10.5px] text-[#94A3B8]">
          {running ? <span className="font-semibold text-[#2563EB]">Checking…</span> : status === "failed" ? <span className="font-semibold text-[#C0261F]">Check failed</span> : checkedAt ? formatRelative(checkedAt) : "Not checked"}
        </span>
      </div>
    </button>
  );
}

function StudyCard({ study }: { study: StudyListItem }) {
  const { archive, run } = useStudyMutations();
  const { ranked, ownRank, ownScore, status, running, checkedAt } = rankStudy(study);
  const { own, title, sub } = studyTitle(study);
  const summary = study.summary ?? null;
  const threats = [...(summary?.threats ?? [])].sort((a, b) => THREAT_ORDER[a.threat ?? "medium"] - THREAT_ORDER[b.threat ?? "medium"]);
  const actions = summary?.actions;
  const rows = ranked.length ? ranked : study.sites.map((s, i) => ({ ...s, i, score: null as number | null }));
  const donePct = actions?.total ? Math.round((actions.done / actions.total) * 100) : 0;
  const recheck = () =>
    run.mutate(study.id, {
      onSuccess: () => toast.success("Re-check started. It takes about 1–2 minutes."),
      onError: (e) => toast.error(errorText(e, "The re-check could not start")),
    });

  return (
    <div className="overflow-hidden rounded-xl border border-[#E6EBF4] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#EEF2F8] px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <SiteFavicon domain={own} size={28} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <Link href={`/admin/competitor-analyzer/${study.id}`} title={study.name} className="break-words text-[14px] font-semibold leading-snug normal-case text-[#111C3A] hover:text-[#2563EB]">{title}</Link>
              <span className="text-[11.5px] normal-case text-[#6B7A94]">{sub}</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#94A3B8]">
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />{running ? "Re-check running…" : status === "failed" ? "Last check failed" : checkedAt ? `Checked ${formatRelative(checkedAt)}` : "Not checked yet"}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" />
                {study.schedule && study.schedule !== "off" ? `Auto ${study.schedule}${study.nextCheckAt ? ` · next ${formatRelative(study.nextCheckAt)}` : ""}` : "Auto re-check off"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ownRank ? (
            <Chip tone={ownRank === 1 ? "good" : "warn"} icon={Trophy} className="mr-1 whitespace-nowrap px-2 py-1 text-[11px]">
              You rank #{ownRank} of {ranked.length}
            </Chip>
          ) : null}
          <button
            type="button"
            title="Archive: hides it from this list, history is kept"
            aria-label="Archive analysis"
            onClick={() => {
              if (window.confirm(`Archive “${study.name}”? Its history is kept but it leaves this list.`)) archive.mutate(study.id, { onSuccess: () => toast.success("Analysis archived") });
            }}
            className="grid size-8 place-items-center rounded-md border border-[#E6EBF4] text-[#94A3B8] hover:border-[#F5C2BE] hover:bg-[#FDF4F3] hover:text-[#C0261F]"
          >
            <Archive className="size-3.5" />
          </button>
          <WButton size="sm" icon={run.isPending || running ? Loader2 : RefreshCw} onClick={recheck} disabled={run.isPending || running} disabledReason="A check is already running">
            {running ? "Checking…" : "Re-check"}
          </WButton>
          <Link href={`/admin/competitor-analyzer/${study.id}`} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md bg-[#2563EB] px-3 text-[12px] font-semibold text-white hover:bg-[#1D4ED8]">
            Open report <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 xl:divide-x xl:divide-[#EEF2F8]">
        <section className="px-4 py-2.5">
          <div className="mb-1 grid grid-cols-[minmax(0,13rem)_minmax(3rem,1fr)_2.25rem_3.5rem] items-center gap-x-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            <SectionLabel title="Overall score" hint="Average of every area the AI compared, out of 100. “Vs you”: how far each site is ahead (+) or behind (−) you." />
            <span />
            <span className="text-right">Score</span>
            <span className="text-right">Vs you</span>
          </div>
          <ul className="space-y-0.5">
            {rows.map((s) => {
              const diff = s.score != null && ownScore != null && s.role !== "own" ? s.score - ownScore : null;
              return (
                <li key={s.domain} className={cn("grid grid-cols-[minmax(0,13rem)_minmax(3rem,1fr)_2.25rem_3.5rem] items-center gap-x-3 rounded-md px-2 py-1 text-[12px]", s.role === "own" && "bg-[#EFF4FC] ring-1 ring-inset ring-[#BFD3F7]")}>
                  <span className="flex min-w-0 items-center gap-2">
                    <SiteFavicon domain={s.domain} size={16} />
                    <span title={s.domain} className={cn("min-w-0 normal-case [overflow-wrap:anywhere]", s.role === "own" ? "font-semibold text-[#111C3A]" : "text-[#4B5872]")}>{s.name || s.domain}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#F1F4F9]">
                    {s.score != null ? <span className="block h-full rounded-full" style={{ width: `${s.score}%`, background: SITE_COLORS[s.i] }} /> : null}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-[#28354C]">{s.score ?? "—"}</span>
                  <span className={cn("text-right text-[11.5px] font-semibold tabular-nums", diff == null ? "text-[#94A3B8]" : diff > 0 ? "text-[#C0261F]" : diff < 0 ? "text-[#15803D]" : "text-[#6B7A94]")}>
                    {s.role === "own" ? <span className="rounded bg-[#2563EB] px-1.5 py-0.5 text-[9.5px] uppercase text-white">You</span> : diff == null ? "—" : diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : "Tie"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2.5 border-t border-[#EEF2F8] px-4 py-2.5 xl:border-t-0">
          <div>
            <SectionLabel title="AI summary" hint="Where you stand, in short. The full reasoning and the pages it is based on are in the report." />
            <p className="mt-1 text-[12px] leading-relaxed text-[#28354C]">
              <Sparkles className="mr-1.5 inline size-3.5 align-[-2px] text-[#7C3AED]" />
              {summary?.overview || (running ? "The summary appears when the running check finishes." : "The summary appears after the first check finishes.")}
            </p>
          </div>
          {threats.length ? (
            <div>
              <SectionLabel title="Who to watch" hint="How likely each competitor is to win your visitors, judged from their pages." />
              <div className="mt-1 flex flex-wrap gap-1">
                {threats.map((t) => {
                  const style = THREAT_STYLE[t.threat ?? "medium"];
                  return (
                    <span key={t.domain} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] ring-1 ring-inset", style.cls)}>
                      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
                      <span className="normal-case" title={t.domain}>{labelOf(study, t.domain)}</span>
                      <span className="font-semibold">{style.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {summary ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[#EEF2F8] bg-[#FAFBFD] px-4 py-2 text-[11.5px] text-[#4B5872]">
          <span className="inline-flex items-center gap-1.5" title="Topics competitors cover and you don’t">
            <SearchX className="size-3.5 text-[#94A3B8]" /><b className="font-semibold text-[#111C3A]">{summary.gaps}</b> content gaps
          </span>
          <span className="inline-flex items-center gap-1.5" title="Steps the AI suggests, most important first">
            <ListChecks className="size-3.5 text-[#94A3B8]" /><b className="font-semibold text-[#111C3A]">{actions?.total ?? 0}</b> actions
            {actions?.high ? <span className="text-[#B45309]">({actions.high} high priority)</span> : null}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Mark actions done in the report’s action plan">
            <CheckCircle2 className="size-3.5 text-[#94A3B8]" /><b className="font-semibold text-[#111C3A]">{actions?.done ?? 0}/{actions?.total ?? 0}</b> done
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E9EEF5]"><span className="block h-full rounded-full bg-[#16A34A]" style={{ width: `${donePct}%` }} /></span>
            {actions?.doing ? <span className="text-[#94A3B8]">{actions.doing} in progress</span> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function CompetitorAnalyzerPage() {
  const studies = useStudies();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const list = studies.data ?? [];
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((s) => s.name.toLowerCase().includes(q) || s.sites.some((x) => x.domain.includes(q))) : list;
  const selected = list.find((s) => s.id === selectedId) ?? shown[0] ?? list[0];
  return (
    <div className="w-full min-w-0 space-y-3 capitalize">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-[#111C3A]">
            <Swords className="size-5 text-[#7C3AED]" /> Competitor Analyzer
          </h1>
          <p className="mt-0.5 text-[12px] text-[#6B7A94]">Put your website next to your competitors: who is better at what, what they do that you don’t, and what to do next. Re-check any time to see what changed.</p>
        </div>
        <WButton tone="primary" icon={Plus} onClick={() => setShowForm(true)}>New analysis</WButton>
      </div>
      <NewStudyDialog open={showForm} onOpenChange={setShowForm} />
      {studies.isLoading ? <SkeletonBlock lines={6} /> : studies.error ? <QueryErrorState error={studies.error} onRetry={() => void studies.refetch()} /> : list.length ? (
        <div className="grid items-start gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-[#E6EBF4] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="border-b border-[#EEF2F8] px-3 py-2.5">
              <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#6B7A94]">
                Your analyses <span className="rounded-full bg-[#EFF4FC] px-1.5 text-[10.5px] text-[#2563EB]">{list.length}</span>
              </p>
              <p className="text-[10.5px] text-[#94A3B8]">Pick one to see its scores. The number is your score; #1 means you lead.</p>
              {list.length > 5 ? (
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or website" className="h-8 w-full rounded-md border border-[#DAE1EC] pl-8 pr-2.5 text-[12px] normal-case outline-none focus:border-[#2563EB]" />
                </div>
              ) : null}
            </div>
            <div className="max-h-[calc(100vh-260px)] space-y-0.5 overflow-y-auto p-1.5">
              {shown.length ? shown.map((s) => <StudyListEntry key={s.id} study={s} active={s.id === selected?.id} onSelect={() => setSelectedId(s.id)} />) : <p className="px-2 py-3 text-[11.5px] text-[#6B7A94]">No analysis matches “{query}”.</p>}
            </div>
          </aside>
          {selected ? <StudyCard key={selected.id} study={selected} /> : null}
        </div>
      ) : (
        <EmptyState icon={Swords} title="No analyses yet" body="Compare your website with up to 4 competitors to see who is better at what." actions={<WButton tone="primary" icon={Plus} onClick={() => setShowForm(true)}>New analysis</WButton>} />
      )}
    </div>
  );
}
