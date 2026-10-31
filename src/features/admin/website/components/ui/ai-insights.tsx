"use client";

/**
 * AI intelligence blocks (Milestone 5).
 *
 * Every AI statement here is a *proposal* produced from stored measurements and validated against them by the
 * server. The UI says so: findings carry their evidence references, provider/model and timestamp, show model
 * confidence as an opinion rather than a measurement, and nothing is applied to a website — a person approves
 * or dismisses each recommendation.
 */

import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, Bot, CalendarCheck, Check, ChevronDown, ChevronUp, ClipboardCopy, FileText, Info, ListChecks, RefreshCw, RotateCcw, Search, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAiSummary, usePageAi, useSetAiRecommendationStatus, useWebsitePages } from "../../data/hooks";
import { formatDateTime, formatRelative } from "../../data/selectors";
import type { AiAnalysisView, AiEvidenceRef, AiMode, AiRecommendation, AiSiteListItem } from "../../data/types";
import { Card, Chip, SegmentedControl, WButton } from "./kit";
import { EmptyState, QueryErrorState, SkeletonBlock } from "./states";
import { UnavailableNotice } from "./measurements";
import { useWebsiteWorkspace } from "../website-workspace";

const TASK_LABEL: Record<string, string> = { technical_seo: "Technical & on-page SEO", content_quality: "Content & search intent", executive_summary: "Executive summary" };
/** Customers choose depth, never a vendor. */
const MODE_LABEL: Record<AiMode, string> = { auto: "Standard", openai: "Standard", gemini: "Standard", dual_review: "Deep review", disabled: "Off" };
const MODE_OPTIONS: AiMode[] = ["auto", "dual_review"];
const SEVERITY_TONE = { critical: "bad", high: "bad", medium: "warn", low: "info", info: "muted" } as const;
const REC_STATUS_TONE = { proposed: "warn", approved: "good", dismissed: "muted" } as const;

const STATUS_COPY: Record<string, { title: string; tone: "muted" | "warn" }> = {
  provider_unavailable: { title: "AI provider unavailable", tone: "warn" },
  budget_exhausted: { title: "Daily AI budget reached", tone: "warn" },
  token_limit: { title: "Token limit reached", tone: "warn" },
  rejected: { title: "Output rejected by validation", tone: "warn" },
  failed: { title: "Analysis failed", tone: "warn" },
  disabled: { title: "AI analysis is off", tone: "muted" },
};

/* ------------------------------------------------------------------ */
/* Small parts                                                          */
/* ------------------------------------------------------------------ */

/** Neutral provenance: that it is AI-generated and when. Vendors, models and costs are staff-only diagnostics. */
export function AiAttribution({ at, className }: { at?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#6B7A94]", className)}>
      <Chip tone="violet" icon={Bot}>AI-generated</Chip>
      {at ? <span title={formatDateTime(at)}>generated {formatRelative(at)}</span> : null}
    </span>
  );
}

function AvailabilityBadge({ available, budgetExhausted }: { available: boolean; budgetExhausted: boolean }) {
  const label = !available ? "AI analysis unavailable" : budgetExhausted ? "Daily AI allowance reached" : "AI analysis available";
  return <Chip tone={available && !budgetExhausted ? "good" : "muted"} dot>{label}</Chip>;
}

function EvidenceChips({ ids, evidence }: { ids: string[]; evidence: Map<string, AiEvidenceRef> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#2563EB] hover:underline" aria-expanded={open}>
        {open ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
        Evidence ({ids.length})
      </button>
      {open ? (
        <ul className="mt-1.5 space-y-1">
          {ids.map((id) => {
            const ref = evidence.get(id);
            return (
              <li key={id} className="rounded-md border border-[#E6EBF4] bg-[#F8FAFC] px-2 py-1 text-[10.5px] text-[#4A5A73]">
                <span className="font-mono text-[10px] text-[#64748B]">{id}</span>
                {ref ? (
                  <>
                    <span className="mx-1">·</span>
                    <span className="font-semibold text-[#28354C]">{ref.label}</span>
                    <span className="mx-1">=</span>
                    <span className="break-words">{typeof ref.value === "object" ? JSON.stringify(ref.value) : String(ref.value)}</span>
                    <span className="ml-1 text-[#94A3B8]">({ref.source})</span>
                  </>
                ) : (
                  <span className="ml-1 text-[#94A3B8]">— from an earlier analysis; the measurement may have changed since</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recommendation card                                                  */
/* ------------------------------------------------------------------ */

export function AiRecommendationCard({
  rec,
  evidence,
  canEdit = true,
  onStatus,
  busy,
}: {
  rec: AiRecommendation;
  evidence: Map<string, AiEvidenceRef>;
  canEdit?: boolean;
  onStatus?: (status: "proposed" | "approved" | "dismissed") => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(rec.priority <= 2);
  const dismissed = rec.status === "dismissed";
  return (
    <li className={cn("rounded-xl border bg-white p-3 shadow-sm", dismissed ? "border-[#E6EBF4] opacity-70" : "border-[#DEE5EF]")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={SEVERITY_TONE[rec.severity]}>{rec.severity}</Chip>
            <Chip tone="muted">Priority {rec.priority}</Chip>
            <Chip tone="info">{rec.category.replace(/_/g, " ")}</Chip>
            <Chip tone={REC_STATUS_TONE[rec.status]}>{rec.status === "proposed" ? "Awaiting review" : rec.status === "approved" ? "Approved by a person" : "Dismissed"}</Chip>
          </div>
          <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-[#28354C]">{rec.finding}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 text-[#64748B] hover:text-[#28354C]" aria-label={open ? "Collapse details" : "Expand details"} aria-expanded={open}>
          {open ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-[#4A5A73]">
          <p><span className="font-semibold text-[#28354C]">Why: </span>{rec.explanation}</p>
          <p><span className="font-semibold text-[#28354C]">Suggested change: </span>{rec.suggestedFix}</p>
          <p><span className="font-semibold text-[#28354C]">How to verify: </span>{rec.verification}</p>
          <EvidenceChips ids={rec.evidenceIds} evidence={evidence} />
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F8] pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <AiAttribution at={rec.generatedAt} />
          <span className="text-[10.5px] text-[#6B7A94]" title="How strongly the model says the evidence supports this. It is the model's own opinion, not a measurement.">
            Model confidence {Math.round(rec.confidence * 100)}%
          </span>
        </div>
        {canEdit && onStatus ? (
          <div className="flex items-center gap-1.5">
            {rec.status !== "approved" ? (
              <WButton size="sm" icon={Check} disabled={busy} onClick={() => onStatus("approved")} title="Records that a person accepted this proposal. Nothing is changed on your website.">
                Approve
              </WButton>
            ) : null}
            {rec.status !== "dismissed" ? (
              <WButton size="sm" tone="ghost" icon={X} disabled={busy} onClick={() => onStatus("dismissed")}>
                Dismiss
              </WButton>
            ) : null}
            {rec.status !== "proposed" ? (
              <WButton size="sm" tone="ghost" icon={RotateCcw} disabled={busy} onClick={() => onStatus("proposed")}>
                Reopen
              </WButton>
            ) : null}
          </div>
        ) : null}
      </div>
      {open && rec.status === "approved" ? (
        <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[#0B7A55]">
          <ShieldCheck className="size-3.5" aria-hidden />
          Approved as a proposal. Media360 does not change your website — apply the change yourself, then re-scan to verify.
        </p>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Page-level panel                                                     */
/* ------------------------------------------------------------------ */

function MetadataProposals({ recs }: { recs: AiRecommendation[] }) {
  // Validated title/description rewrites, shown for copy-and-review. Nothing is applied to the website.
  const candidates = recs.filter((r) => r.proposal && r.status !== "dismissed");
  if (!candidates.length) return null;
  return (
    <Card title="Metadata proposals" icon={Sparkles} subtitle="Review and apply manually — nothing is changed automatically" bodyClassName="space-y-2 p-3">
      {candidates.map((r) => (
        <div key={r.id} className="rounded-lg border border-[#E6EBF4] bg-[#F8FAFC] p-2.5 text-[11.5px] text-[#4A5A73]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Proposed {r.proposal!.field}</p>
          <p className="mt-1 font-semibold text-[#28354C]">{r.proposal!.text}</p>
          <p className="mt-1 text-[10.5px] text-[#6B7A94]">{r.proposal!.text.length} characters · based on: {r.finding}</p>
          <WButton
            size="sm"
            tone="ghost"
            icon={ClipboardCopy}
            className="mt-1.5"
            onClick={() => {
              void navigator.clipboard?.writeText(r.proposal!.text).then(() => toast.success("Copied to clipboard"), () => toast.error("Could not copy"));
            }}
          >
            Copy {r.proposal!.field}
          </WButton>
        </div>
      ))}
    </Card>
  );
}

export function PageAiPanel({ pageId }: { pageId: string }) {
  const { clientId, runScan, scan } = useWebsiteWorkspace();
  const insights = usePageAi(clientId, pageId);
  const setStatus = useSetAiRecommendationStatus(clientId);
  const [mode, setMode] = useState<AiMode>("auto");
  const [showDismissed, setShowDismissed] = useState(false);

  const d = insights.data;
  const evidence = useMemo(() => new Map((d?.evidence ?? []).map((e) => [e.id, e])), [d?.evidence]);
  const running = scan.isRunning && scan.progress?.type === "ai";

  const start = (force: boolean) => runScan("ai", pageId, { aiMode: mode, force });

  const recs = (d?.recommendations ?? []).filter((r) => showDismissed || r.status !== "dismissed");
  const dismissedCount = (d?.recommendations ?? []).filter((r) => r.status === "dismissed").length;
  const anyCurrent = (d?.analyses ?? []).some((a) => a.current);
  const stale = (d?.analyses ?? []).some((a) => a.current?.stale);
  const failures = (d?.analyses ?? []).filter((a) => a.latestAttempt && a.latestAttempt.status !== "completed" && (!a.current || a.latestAttempt.generatedAt > a.current.generatedAt));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11.5px] text-[#5B6B85]">
            AI proposals written from this page&apos;s stored measurements and checked against them. They are not verified facts and are never applied automatically.
          </p>
          {d ? <AvailabilityBadge available={d.available} budgetExhausted={d.budgetExhausted} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<AiMode>
            ariaLabel="AI mode"
            size="sm"
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />
          <WButton
            size="sm"
            tone="primary"
            icon={Sparkles}
            disabled={running || scan.isRunning || d?.available === false}
            disabledReason={d?.available === false ? "AI analysis is not available right now" : "A scan is already running"}
            onClick={() => start(anyCurrent)}
          >
            {anyCurrent ? "Regenerate" : "Analyse with AI"}
          </WButton>
        </div>
      </div>

      {running ? (
        <div className="rounded-xl border border-[#DCE6FB] bg-[#F3F7FE] px-3 py-2 text-[11.5px] text-[#28354C]" role="status">
          {scan.progress?.stage ?? "Analysing with AI…"} {scan.progress ? `· ${Math.round(scan.progress.progress)}%` : null}
        </div>
      ) : null}

      {insights.isLoading ? (
        <SkeletonBlock lines={6} />
      ) : insights.error ? (
        <Card title="AI insights"><QueryErrorState error={insights.error} onRetry={() => void insights.refetch()} /></Card>
      ) : d ? (
        <>
          {!d.available ? (
            <UnavailableNotice tone="warn" title="AI analysis is not available" body="The AI service is not set up for this platform right now, so no AI analysis can be produced. Measured data on the other tabs is unaffected." />
          ) : null}

          {failures.map((f) => {
            const a = f.latestAttempt as AiAnalysisView;
            const copy = STATUS_COPY[a.status] ?? STATUS_COPY.failed!;
            return (
              <div key={f.task} className="space-y-1">
                <UnavailableNotice
                  tone={copy.tone}
                  title={`${TASK_LABEL[f.task]}: ${copy.title}`}
                  body={`${a.errorMessage ?? "The analysis did not complete."}${f.current ? " The last successful analysis is shown below." : ""}`}
                />
                {!running && a.status !== "budget_exhausted" ? (
                  <WButton size="sm" icon={RefreshCw} onClick={() => start(true)} disabled={scan.isRunning}>
                    Retry
                  </WButton>
                ) : null}
              </div>
            );
          })}

          {stale ? (
            <div className="flex items-start gap-2 rounded-lg border border-[#F5DDA8] bg-[#FEF6E3] px-3 py-2 text-[11.5px] text-[#7A4B06]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>The page&apos;s measurements changed after this analysis was produced. Regenerate to analyse the current data.</span>
            </div>
          ) : null}

          {!anyCurrent && failures.length === 0 && d.available ? (
            <Card title="AI insights" icon={Bot}>
              <EmptyState compact title="No AI analysis yet" body="Run an analysis to get evidence-referenced technical SEO and content recommendations for this page." />
            </Card>
          ) : null}

          {(d.analyses ?? []).map((a) =>
            a.current ? (
              <Card
                key={a.task}
                title={TASK_LABEL[a.task] ?? a.task}
                icon={Bot}
                subtitle={a.current.summary ?? undefined}
                action={<AiAttribution at={a.current.generatedAt} />}
                bodyClassName="space-y-2 p-3"
              >
                {a.current.reviewed > 0 ? (
                  <p className="text-[10.5px] text-[#6B7A94]">
                    {a.current.reviewed} high-impact finding{a.current.reviewed === 1 ? " was" : "s were"} independently re-checked against the measurements.
                  </p>
                ) : null}
                {a.current.limitations.length ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-[10.5px] text-[#6B7A94]">
                    {a.current.limitations.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                ) : null}
                {a.current.rejectedCount > 0 ? (
                  <p className="text-[10.5px] text-[#6B7A94]">
                    {a.current.rejectedCount} model statement{a.current.rejectedCount === 1 ? " was" : "s were"} discarded because the supplied measurements did not support {a.current.rejectedCount === 1 ? "it" : "them"}.
                  </p>
                ) : null}
              </Card>
            ) : null,
          )}

          {anyCurrent ? (
            <Card
              title={`Recommendations (${recs.length})`}
              icon={Sparkles}
              subtitle="Sorted by priority · each cites the measurements it is based on"
              action={
                dismissedCount ? (
                  <WButton size="sm" tone="ghost" onClick={() => setShowDismissed((v) => !v)}>
                    {showDismissed ? "Hide" : "Show"} dismissed ({dismissedCount})
                  </WButton>
                ) : undefined
              }
              bodyClassName="p-2.5"
            >
              {recs.length === 0 ? (
                <EmptyState compact title="No recommendations" body="The analysis found nothing it could support with the available evidence." />
              ) : (
                <ul className="space-y-2">
                  {recs.map((r) => (
                    <AiRecommendationCard
                      key={r.id}
                      rec={r}
                      evidence={evidence}
                      busy={setStatus.isPending}
                      onStatus={(status) =>
                        setStatus.mutate({ id: r.id, status }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the recommendation") })
                      }
                    />
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <MetadataProposals recs={d.recommendations} />

          {d.evidenceMissing.length ? (
            <p className="px-1 text-[10.5px] text-[#6B7A94]">
              Not available to the AI for this page: {d.evidenceMissing.map((m) => m.replace(/_/g, " ")).join(", ")}. It was told not to guess these.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Website-level executive summary                                      */
/* ------------------------------------------------------------------ */

type PageLookup = Map<string, { path: string; title: string }>;

/** Small muted note that a statement is backed by N stored measurements (ids are not shown to customers). */
function Sources({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="shrink-0 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[9.5px] font-medium text-[#64748B]" title={`Backed by ${count} stored measurement${count === 1 ? "" : "s"}`}>
      {count} source{count === 1 ? "" : "s"}
    </span>
  );
}

function Panel({ title, icon: Icon, children, className }: { title: string; icon: ElementType; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]", className)}>
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#4A5A73]">
        <span className="grid size-6 place-items-center rounded-md bg-[#EEF3FD] text-[#2563EB]"><Icon className="size-3.5" aria-hidden /></span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function PointList({ items }: { items: AiSiteListItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold leading-snug text-[#1F2A44]">{it.title ?? it.action}</p>
            {it.explanation || it.reason ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5B6B85]">{it.explanation ?? it.reason}</p> : null}
          </div>
          <Sources count={it.evidenceIds.length} />
        </li>
      ))}
    </ul>
  );
}

function StepList({ items }: { items: AiSiteListItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold leading-snug text-[#1F2A44]">{it.action ?? it.title}</p>
            {it.reason || it.explanation ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5B6B85]">{it.reason ?? it.explanation}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AiExecutiveSummaryCard() {
  const { clientId, runScan, scan, navigate } = useWebsiteWorkspace();
  const summary = useAiSummary(clientId);
  const pagesQuery = useWebsitePages(clientId);
  const [mode, setMode] = useState<AiMode>("auto");

  const d = summary.data;
  const pages: PageLookup = useMemo(() => new Map((pagesQuery.data ?? []).map((p) => [p.id, { path: p.path, title: p.title }])), [pagesQuery.data]);
  const running = scan.isRunning && scan.progress?.type === "ai";
  const cur = d?.current;
  const attempt = d?.latestAttempt;
  const failedLatest = attempt && attempt.status !== "completed" && (!cur || attempt.generatedAt > cur.generatedAt);
  const r = cur?.result;

  return (
    <Card
      title="AI executive summary"
      icon={Bot}
      subtitle="Written from validated page findings and site facts — a proposal for human review, not a measurement"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<AiMode>
            ariaLabel="AI depth"
            size="sm"
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />
          <WButton
            size="sm"
            tone="primary"
            icon={Sparkles}
            disabled={scan.isRunning || d?.available === false}
            disabledReason={d?.available === false ? "AI analysis is not available right now" : "A scan is already running"}
            onClick={() => runScan("ai", undefined, { aiMode: mode, force: Boolean(cur) })}
          >
            {cur ? "Regenerate" : "Analyse top pages"}
          </WButton>
        </div>
      }
      bodyClassName="space-y-4 p-4"
    >
      {summary.isLoading ? (
        <SkeletonBlock lines={4} />
      ) : summary.error ? (
        <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : d ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AvailabilityBadge available={d.available} budgetExhausted={d.budgetExhausted} />
            {running ? <span className="text-[11px] font-medium text-[#2563EB]" role="status">{scan.progress?.stage ?? "Analysing with AI…"} · {Math.round(scan.progress?.progress ?? 0)}%</span> : null}
          </div>

          {!d.available ? (
            <UnavailableNotice tone="warn" title="AI analysis is not available" body="The AI service is not set up for this platform right now. Crawl, performance and search data are unaffected." />
          ) : null}
          {failedLatest ? (
            <UnavailableNotice
              tone="warn"
              title={(STATUS_COPY[attempt!.status] ?? STATUS_COPY.failed!).title}
              body={`${attempt!.errorMessage ?? "The summary could not be produced."}${cur ? " The previous summary is shown below." : ""}`}
            />
          ) : null}

          {r && cur ? (
            <>
              <div className="rounded-xl border border-[#DCE6FB] bg-gradient-to-br from-[#F3F7FE] to-white p-4">
                <p className="text-[13.5px] leading-relaxed text-[#1F2A44]">{r.summary}</p>
                <div className="mt-2.5"><AiAttribution at={cur.generatedAt} /></div>
              </div>

              {r.urgentIssues.length ? (
                <Panel title="Most urgent issues" icon={AlertTriangle} className="border-l-[3px] border-l-[#DC3A32]">
                  <PointList items={r.urgentIssues} />
                </Panel>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                {r.highImpactPages.length ? (
                  <Panel title="High-impact pages" icon={FileText}>
                    <ul className="space-y-2.5">
                      {r.highImpactPages.map((it, i) => {
                        const page = it.pageId ? pages.get(it.pageId) : undefined;
                        return (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="min-w-0 flex-1">
                              {it.pageId ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/admin/website/pages/${encodeURIComponent(it.pageId!)}?tab=ai`)}
                                  className="group inline-flex max-w-full items-center gap-1 text-left text-[12.5px] font-semibold leading-snug text-[#1F2A44] hover:text-[#2563EB]"
                                >
                                  <span className="truncate">{page ? (page.title || page.path) : "Page no longer in the latest crawl"}</span>
                                  <ArrowUpRight className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden />
                                </button>
                              ) : null}
                              {page ? <p className="font-mono text-[10.5px] text-[#94A3B8]">{page.path}</p> : null}
                              {it.reason ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5B6B85]">{it.reason}</p> : null}
                            </div>
                            <Sources count={it.evidenceIds.length} />
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                ) : null}
                {r.technicalPriorities.length ? (
                  <Panel title="Technical SEO priorities" icon={Wrench}><PointList items={r.technicalPriorities} /></Panel>
                ) : null}
                {r.contentOpportunities.length ? (
                  <Panel title="Content opportunities" icon={FileText}><PointList items={r.contentOpportunities} /></Panel>
                ) : null}
                {r.searchStrategy.length ? (
                  <Panel title="Search improvement strategy" icon={Search}><PointList items={r.searchStrategy} /></Panel>
                ) : null}
              </div>

              {r.plan7Days.length || r.plan30Days.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {r.plan7Days.length ? (
                    <Panel title="Next 7 days" icon={CalendarCheck}><StepList items={r.plan7Days} /></Panel>
                  ) : null}
                  {r.plan30Days.length ? (
                    <Panel title="Next 30 days" icon={ListChecks}><StepList items={r.plan30Days} /></Panel>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[11px] leading-relaxed text-[#5B6B85]">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                <div>
                  {r.limitations?.length ? <p>{r.limitations.join(" · ")}</p> : null}
                  <p>
                    Based on {d.pagesAnalysed} analysed page{d.pagesAnalysed === 1 ? "" : "s"} · {d.proposedRecommendations} recommendation{d.proposedRecommendations === 1 ? "" : "s"} awaiting your review. No traffic or ranking forecasts are made, and nothing is changed on your website automatically.
                  </p>
                </div>
              </div>
            </>
          ) : !failedLatest && d.available ? (
            <EmptyState
              compact
              title="No AI summary yet"
              body={d.pagesAnalysed > 0 ? "Page analyses exist — generate the website summary from them." : "Analyse the website's top pages first; the summary is built from their validated findings."}
            />
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
