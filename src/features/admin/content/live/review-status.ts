"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { Tone } from "@/types/common";
import { draftsApi, type DraftReviewStatus } from "./drafts-api";

export const REVIEW_STATUSES: DraftReviewStatus[] = ["PENDING_REVIEW", "APPROVED", "REJECTED", "DRAFT"];
export const REVIEW_LABEL: Record<DraftReviewStatus, string> = { PENDING_REVIEW: "Pending review", APPROVED: "Approved", REJECTED: "Changes requested", DRAFT: "Drafts" };
/** Label for one post's status badge (the counters above a list say "Drafts" because they count several). */
export const REVIEW_BADGE: Record<DraftReviewStatus, string> = { ...REVIEW_LABEL, DRAFT: "Draft" };
export const REVIEW_TONE: Record<DraftReviewStatus, Tone> = { PENDING_REVIEW: "warning", APPROVED: "success", REJECTED: "danger", DRAFT: "neutral" };

/**
 * Posts per review status for the selected client. The key is the one the approval queue has always used,
 * so the invalidations in the composer, the AI panel and the review actions keep refreshing it.
 */
export function useReviewCounts() {
  const { companyId, clientId } = useTenancyContext();
  return useQuery({
    queryKey: ["content-approval-counts", companyId, clientId],
    enabled: Boolean(companyId && clientId),
    queryFn: async ({ signal }) => Object.fromEntries(await Promise.all(REVIEW_STATUSES.map(async (reviewStatus) => [reviewStatus, (await draftsApi.list(companyId, clientId, { limit: 1, reviewStatus }, signal)).total]))) as Record<DraftReviewStatus, number>,
  });
}
