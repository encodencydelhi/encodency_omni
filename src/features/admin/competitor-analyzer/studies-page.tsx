"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArrowRight, Loader2, Plus, Search, Swords, Trash2, Trophy } from "lucide-react";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { Card, Chip, WButton } from "@/features/admin/website/components/ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock } from "@/features/admin/website/components/ui/states";
import { formatRelative } from "@/features/admin/website/data/selectors";
import type { LookupResult, StudyListItem } from "./api";
import { useCompanyClients, useStudies, useStudyMutations } from "./hooks";
import { SITE_COLORS, SiteFavicon } from "./ui";

const MAX_COMPETITORS = 4;
const errorText = (err: unknown, fallback: string) => (ApiError.isApiError(err) ? err.message : fallback);
const looksLikeDomain = (v: string) => /\.[a-z]{2,}(\/|$)/i.test(v.trim());

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

function NewStudyForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const clients = useCompanyClients();
  const { create, run } = useStudyMutations();
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
      { own: own.trim(), competitors: filled, name: name.trim() || undefined, clientId: clientId || undefined },
      {
        onSuccess: (study) => {
          run.mutate(study.id, {
            onSettled: () => {
              onDone();
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
    <Card title="New competitor analysis" icon={Plus} subtitle="Your website plus up to 4 competitors. Each site's key pages, speed and Google presence are compared, then AI explains who is better at what.">
      <div className="grid gap-4 lg:grid-cols-2">
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F8] pt-3">
        <p className="text-[11px] text-[#6B7A94]">Takes about 1–2 minutes. Only public pages are read; traffic and rankings are not guessed.</p>
        <WButton tone="primary" icon={busy ? Loader2 : Swords} disabled={!ready || busy} disabledReason="Enter your website and at least one competitor website" onClick={submit}>
          {busy ? "Starting…" : "Compare now"}
        </WButton>
      </div>
    </Card>
  );
}

function StudyCard({ study }: { study: StudyListItem }) {
  const { archive } = useStudyMutations();
  const overall = study.latestRun?.overall ?? null;
  const ranked = useMemo(() => (overall ? study.sites.map((s, i) => ({ ...s, i, score: overall[s.domain] ?? null })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : []), [overall, study.sites]);
  const ownRank = ranked.findIndex((s) => s.role === "own") + 1;
  const status = study.latestRun?.status;
  return (
    <div className="flex flex-col rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/admin/competitor-analyzer/${study.id}`} className="block truncate text-[13px] font-semibold normal-case text-[#111C3A] hover:text-[#2563EB]">{study.name}</Link>
          <p className="mt-0.5 text-[11px] text-[#6B7A94]">{study.latestRun ? `${study.latestRun.status === "running" ? "Started" : "Checked"} ${formatRelative(study.latestRun.finishedAt ?? study.latestRun.startedAt)}` : "Not run yet"}</p>
        </div>
        {status === "running" ? <Chip tone="info" dot>Running</Chip> : status === "failed" ? <Chip tone="bad" dot>Failed</Chip> : ownRank ? <Chip tone={ownRank === 1 ? "good" : "warn"}><Trophy className="mr-1 inline size-3" />You #{ownRank} of {ranked.length}</Chip> : null}
      </div>
      <ul className="mt-3 flex-1 space-y-1.5">
        {(ranked.length ? ranked : study.sites.map((s, i) => ({ ...s, i, score: null as number | null }))).map((s) => (
          <li key={s.domain} className={cn("flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[11.5px]", s.role === "own" && "bg-[#EFF4FC] ring-1 ring-inset ring-[#BFD3F7]")}>
            <SiteFavicon domain={s.domain} size={16} />
            <span className={cn("w-36 shrink-0 truncate normal-case", s.role === "own" ? "font-semibold text-[#111C3A]" : "text-[#4B5872]")}>{s.domain}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F4F9]">
              {s.score != null ? <span className="block h-full rounded-full" style={{ width: `${s.score}%`, background: SITE_COLORS[s.i] }} /> : null}
            </span>
            <span className="w-7 text-right font-semibold tabular-nums text-[#28354C]">{s.score ?? "—"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-[#EEF2F8] pt-2.5">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Archive “${study.name}”? Its history is kept but it leaves this list.`)) archive.mutate(study.id, { onSuccess: () => toast.success("Analysis archived") });
          }}
          className="flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#C0261F]"
        >
          <Archive className="size-3.5" /> Archive
        </button>
        <Link href={`/admin/competitor-analyzer/${study.id}`} className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:underline">
          Open report <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function CompetitorAnalyzerPage() {
  const studies = useStudies();
  const [showForm, setShowForm] = useState(false);
  const list = studies.data ?? [];
  const formOpen = showForm || (!studies.isLoading && list.length === 0);
  return (
    <div className="w-full min-w-0 space-y-3 capitalize">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-[#111C3A]">
            <Swords className="size-5 text-[#7C3AED]" /> Competitor Analyzer
          </h1>
          <p className="mt-0.5 text-[12px] text-[#6B7A94]">Put your website next to your competitors: who is better at what, what they do that you don’t, and what to do next. Re-check any time to see what changed.</p>
        </div>
        {!formOpen ? <WButton tone="primary" icon={Plus} onClick={() => setShowForm(true)}>New analysis</WButton> : null}
      </div>
      {formOpen ? <NewStudyForm onDone={() => setShowForm(false)} /> : null}
      {studies.isLoading ? <SkeletonBlock lines={6} /> : studies.error ? <QueryErrorState error={studies.error} onRetry={() => void studies.refetch()} /> : list.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((s) => <StudyCard key={s.id} study={s} />)}</div>
      ) : (
        <EmptyState icon={Swords} title="No analyses yet" body="Start with your website and one or more competitors above." />
      )}
    </div>
  );
}
