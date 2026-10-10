"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpenCheck, CheckCircle2, Play, XCircle } from "lucide-react";
import { btn, btnDanger, btnPrimary, EmptyState, Notice, Section, Spinner } from "@/features/support/ui";
import { cn } from "@/lib/utils/cn";
import { assistantDeskApi, type KnowledgeCandidate, type KnowledgeFaq } from "./api";
import { ASSISTANT_DESK_KEY } from "./hooks";

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function metaText(candidate: KnowledgeCandidate) {
  const evidence = candidate.evidence ?? {};
  return [candidate.kind, candidate.riskLevel, evidence.ticketNumber ? `Ticket ${evidence.ticketNumber}` : null, evidence.evidenceQuality ? `Score ${Math.round(Number(evidence.evidenceQuality) * 100)}%` : null].filter(Boolean).join(" · ");
}

export function AssistantKnowledgePage() {
  const queryClient = useQueryClient();
  const candidates = useQuery({ queryKey: [ASSISTANT_DESK_KEY, "knowledge", "candidates"], queryFn: ({ signal }) => assistantDeskApi.knowledgeCandidates(signal), staleTime: 15_000 });
  const base = useQuery({ queryKey: [ASSISTANT_DESK_KEY, "knowledge", "base"], queryFn: ({ signal }) => assistantDeskApi.knowledgeBase(signal), staleTime: 15_000 });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [ASSISTANT_DESK_KEY, "knowledge"] });
  const run = useMutation({ mutationFn: assistantDeskApi.runLearning, onSuccess: invalidate });
  const approve = useMutation({ mutationFn: (id: string) => assistantDeskApi.approveCandidate(id, { scope: "COMPANY" }), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id: string) => assistantDeskApi.rejectCandidate(id, { note: "Rejected from knowledge review." }), onSuccess: invalidate });
  const archive = useMutation({ mutationFn: (id: string) => assistantDeskApi.archiveFaq(id, { note: "Archived from knowledge review." }), onSuccess: invalidate });

  const pending = (candidates.data?.items ?? []).filter((item) => item.status === "PENDING_REVIEW");
  const reviewed = (candidates.data?.items ?? []).filter((item) => item.status !== "PENDING_REVIEW").slice(0, 10);
  const faqs = base.data?.faqs ?? [];
  const jobs = base.data?.jobs ?? [];
  const loading = candidates.isLoading || base.isLoading;

  return (
    <div className="space-y-4">
      <Notice
        tone="amber"
        title="Human Review Is Required"
        action={
          <button type="button" className={btnPrimary} onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? <Spinner /> : <Play className="size-3.5" />}
            Learn From Resolved Tickets
          </button>
        }
      >
        Resolved support answers become draft candidates only. Nothing is published until Super Admin approval.
      </Notice>

      <Section title="Pending Candidates" description={`${pending.length} drafts waiting for review`} action={loading ? <Spinner /> : null} flush>
        {pending.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="No Pending Candidates" description="Run learning to extract safe drafts from resolved support tickets." />
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} onApprove={() => approve.mutate(candidate.id)} onReject={() => reject.mutate(candidate.id)} busy={approve.isPending || reject.isPending} />
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <Section title="Approved Knowledge" description={`${faqs.length} approved FAQs`} flush>
          {faqs.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title="No Approved Knowledge Yet" description="Approved candidates will appear here and become available to the assistant." />
          ) : (
            <div className="divide-y divide-slate-100">
              {faqs.map((faq) => (
                <FaqRow key={faq.id} faq={faq} onArchive={() => archive.mutate(faq.id)} busy={archive.isPending} />
              ))}
            </div>
          )}
        </Section>

        <div className="space-y-4">
          <Section title="Learning Runs" description="Latest extraction jobs" flush>
            {jobs.length === 0 ? (
              <EmptyState title="No Runs Yet" description="Start a learning run to create review candidates." />
            ) : (
              <div className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <div key={job.id} className="px-4 py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{job.kind}</span>
                      <StatusPill status={job.status} />
                    </div>
                    <p className="mt-1 text-slate-500">
                      Processed {job.processed} · Created {job.candidatesCreated} · Skipped {job.duplicatesSkipped}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">{formatDate(job.finishedAt ?? job.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Recent Reviews" description="Last reviewed drafts" flush>
            {reviewed.length === 0 ? (
              <EmptyState title="No Reviews Yet" description="Approved and rejected candidates will be listed here." />
            ) : (
              <div className="divide-y divide-slate-100">
                {reviewed.map((candidate) => (
                  <div key={candidate.id} className="px-4 py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">{candidate.question}</p>
                      <StatusPill status={candidate.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-slate-500">{candidate.reviewNote || candidate.proposedAnswer}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ candidate, onApprove, onReject, busy }: { candidate: KnowledgeCandidate; onApprove: () => void; onReject: () => void; busy: boolean }) {
  return (
    <article className="grid gap-3 px-4 py-3 text-xs lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-[13px] font-semibold text-slate-900">{candidate.question}</h3>
          <StatusPill status={candidate.status} />
        </div>
        <p className="mt-1 text-[11px] font-medium text-slate-500">{metaText(candidate)}</p>
        <p className="mt-2 line-clamp-3 leading-relaxed text-slate-600">{candidate.proposedAnswer}</p>
      </div>
      <div className="flex items-start gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={onApprove}>
          <CheckCircle2 className="size-3.5" />
          Approve
        </button>
        <button type="button" className={btnDanger} disabled={busy} onClick={onReject}>
          <XCircle className="size-3.5" />
          Reject
        </button>
      </div>
    </article>
  );
}

function FaqRow({ faq, onArchive, busy }: { faq: KnowledgeFaq; onArchive: () => void; busy: boolean }) {
  return (
    <article className="grid gap-3 px-4 py-3 text-xs lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-[13px] font-semibold text-slate-900">{faq.question}</h3>
          <StatusPill status={faq.status} />
          <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{faq.scope}</span>
        </div>
        <p className="mt-2 line-clamp-2 leading-relaxed text-slate-600">{faq.answer}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">Updated {formatDate(faq.updatedAt)}</p>
      </div>
      <button type="button" className={btn} disabled={busy || faq.status === "ARCHIVED"} onClick={onArchive}>
        <Archive className="size-3.5" />
        Archive
      </button>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "APPROVED" || status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "REJECTED" || status === "FAILED" || status === "ARCHIVED" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-semibold", tone)}>{status.replaceAll("_", " ")}</span>;
}
