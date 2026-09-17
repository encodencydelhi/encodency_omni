"use client";

/**
 * Issue detail, opened from anywhere an issue is listed.
 *
 * "Mark resolved" records *our* view of the issue — it never claims we changed
 * the website. The next scan is what actually confirms a fix.
 */

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, FileSearch, RefreshCw, ShieldCheck, Undo2, Wrench } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSetIssueStatus, useWebsiteIssues, useWebsitePages } from "../../data/hooks";
import {
  categoryLabel,
  formatDateTime,
  formatRelative,
  severityLabel,
  severityTone,
} from "../../data/selectors";
import { Chip, KeyValue, WButton } from "../ui/kit";
import { QueryErrorState, SkeletonBlock } from "../ui/states";

export function IssueDrawer({
  clientId,
  issueId,
  onClose,
  onOpenFixGuide,
  onRescan,
}: {
  clientId: string;
  issueId: string | null;
  onClose: () => void;
  onOpenFixGuide: (guideId: string) => void;
  onRescan: () => void;
}) {
  const router = useRouter();
  const { data: issues, isLoading, error, refetch } = useWebsiteIssues(clientId, Boolean(issueId));
  const { data: pages } = useWebsitePages(clientId, Boolean(issueId));
  const setStatus = useSetIssueStatus(clientId);

  const issue = issues?.find((entry) => entry.id === issueId) ?? null;
  const affectedPages = (pages ?? []).filter((page) => issue?.affectedPageIds.includes(page.id));

  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full max-w-lg border-[#E6EBF4] bg-white p-0 sm:max-w-lg">
        <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
          <span className="flex flex-wrap items-center gap-1.5">
            {issue ? (
              <>
                <Chip tone={severityTone[issue.severity]} dot>
                  {severityLabel[issue.severity]}
                </Chip>
                <Chip tone="muted">{categoryLabel[issue.category]}</Chip>
                {issue.status === "resolved" ? <Chip tone="good">Resolved</Chip> : null}
                {issue.status === "ignored" ? <Chip tone="muted">Ignored</Chip> : null}
              </>
            ) : null}
          </span>
          <SheetTitle className="text-[15px] font-semibold leading-snug text-[#111C3A]">
            {issue?.title ?? (isLoading ? "Loading issue…" : "Issue")}
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="px-5 py-4">
          {isLoading ? <SkeletonBlock lines={7} /> : null}
          {error ? <QueryErrorState error={error} onRetry={() => void refetch()} compact /> : null}
          {!isLoading && !error && !issue ? (
            <p className="py-8 text-center text-[12px] text-[#6B7A94]">
              This issue is no longer in the current scan results.
            </p>
          ) : null}

          {issue ? (
            <div className="space-y-4">
              <p className="text-[12px] leading-relaxed text-[#334155]">{issue.description}</p>

              <dl className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4] px-3">
                <KeyValue label="Detected">{formatDateTime(issue.detectedAt)}</KeyValue>
                <KeyValue label="Age">{formatRelative(issue.detectedAt)}</KeyValue>
                <KeyValue label="Affected">
                  {issue.affectedPageIds.length > 0
                    ? `${issue.affectedCount} page${issue.affectedCount === 1 ? "" : "s"}`
                    : "Site-wide"}
                </KeyValue>
                {issue.evidence ? <KeyValue label="Evidence">{issue.evidence}</KeyValue> : null}
                {issue.resolvedAt ? <KeyValue label="Resolved">{formatDateTime(issue.resolvedAt)}</KeyValue> : null}
              </dl>

              <div className="rounded-lg bg-[#F7F9FC] p-3">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Recommendation
                </h3>
                <p className="text-[12px] leading-relaxed text-[#334155]">{issue.recommendation}</p>
              </div>

              {affectedPages.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                    Affected pages
                  </h3>
                  <ul className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4]">
                    {affectedPages.map((page) => (
                      <li key={page.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-semibold text-[#28354C]">
                            {page.title}
                          </span>
                          <span className="block truncate font-mono text-[10.5px] text-[#6B7A94]">{page.path}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <WButton
                            size="sm"
                            icon={FileSearch}
                            onClick={() => {
                              onClose();
                              router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`);
                            }}
                          >
                            Audit
                          </WButton>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={`Open ${page.path} in a new tab`}
                            className="grid size-7 place-items-center rounded-md border border-[#DAE1EC] text-[#4A5A73] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="flex-wrap gap-2 border-t border-[#EEF2F8] px-5 py-3">
          {issue ? (
            <>
              <WButton icon={Wrench} onClick={() => onOpenFixGuide(issue.fixGuideId)}>
                Fix guide
              </WButton>
              <WButton
                icon={RefreshCw}
                onClick={() => {
                  onRescan();
                  onClose();
                }}
              >
                Re-scan
              </WButton>
              <WButton
                tone={issue.status === "resolved" ? "secondary" : "primary"}
                icon={issue.status === "resolved" ? Undo2 : ShieldCheck}
                disabled={setStatus.isPending}
                disabledReason="Saving…"
                onClick={() => {
                  const next = issue.status === "resolved" ? "open" : "resolved";
                  setStatus.mutate(
                    { issueId: issue.id, status: next },
                    {
                      onSuccess: () =>
                        toast.success(
                          next === "resolved" ? "Issue marked resolved" : "Issue reopened",
                          {
                            description:
                              next === "resolved"
                                ? "This records your view of the issue. The next scan confirms whether it is actually fixed on the website."
                                : "It will appear in the open issue lists again.",
                          },
                        ),
                      onError: () => toast.error("Could not update this issue."),
                    },
                  );
                }}
              >
                {issue.status === "resolved" ? "Reopen" : "Mark resolved"}
              </WButton>
            </>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
