"use client";

import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Stat } from "@/features/admin/dashboard/components/dashboard-parts";
import type { DraftReviewStatus } from "../live/drafts-api";
import { REVIEW_LABEL, REVIEW_STATUSES, useReviewCounts } from "../live/review-status";

const COLOR: Record<DraftReviewStatus, string> = { PENDING_REVIEW: "amber", APPROVED: "green", REJECTED: "danger", DRAFT: "grey" };
const ICON = { PENDING_REVIEW: Clock, APPROVED: CheckCircle2, REJECTED: AlertTriangle, DRAFT: FileText };
const NOTE: Record<DraftReviewStatus, string> = { PENDING_REVIEW: "Waiting for a decision", APPROVED: "Reviewed, not published", REJECTED: "Sent back with comments", DRAFT: "Not submitted yet" };

/** The four review statuses as coloured counters; selecting one filters the list underneath. */
export function ReviewStatRow({ active, onSelect }: { active: DraftReviewStatus | "ALL"; onSelect: (status: DraftReviewStatus) => void }) {
  const counts = useReviewCounts();
  const figure = (status: DraftReviewStatus) => counts.data ? counts.data[status].toLocaleString("en-IN") : counts.isError ? "-" : "...";
  return (
    <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
      {REVIEW_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={active === status}
          onClick={() => onSelect(status)}
          className={cn("block min-w-0 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40", active === status && "ring-2 ring-primary/40")}
        >
          <Stat label={REVIEW_LABEL[status]} value={figure(status)} trend="" note={NOTE[status]} icon={ICON[status]} color={COLOR[status]} />
        </button>
      ))}
    </div>
  );
}
