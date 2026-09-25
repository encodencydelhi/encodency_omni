import type { ScheduledPostStatus } from "./scheduling-api";

export interface StatusMeta {
  label: string;
  className: string;
  /** Copy shown on hover / in the detail drawer. */
  hint: string;
}

/**
 * Publishing status display (TASK-11B). `OUTCOME_UNKNOWN` is terminal and is
 * resolved manually — the backend never auto-retries it (owner decision B11).
 */
export const SCHEDULED_POST_STATUS_META: Record<ScheduledPostStatus, StatusMeta> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-blue-50 text-[#1769DF] ring-blue-200",
    hint: "Waiting for its publish time.",
  },
  PUBLISHING: {
    label: "Publishing",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    hint: "Claimed by a worker and sending to the network.",
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    hint: "Accepted by the network.",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-50 text-red-600 ring-red-200",
    hint: "Definitively rejected — see the failure code.",
  },
  OUTCOME_UNKNOWN: {
    label: "Outcome unknown",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    hint: "The network gave an ambiguous answer, so we cannot prove it was sent. Resolve manually.",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    hint: "Cancelled before publishing started.",
  },
};

/** Human copy for the `failureCode` / `lastErrorCode` catalogue. */
export function describeScheduleErrorCode(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "integration_reconnect_required":
      return "The connection must be reconnected before this can publish.";
    case "missed_window":
      return "The publish window passed before the worker could send it.";
    case "stale_claim":
      return "A worker held this too long without finishing; the outcome is unknown.";
    case "channel_not_supported_yet":
      return "This channel has no publishing adapter yet.";
    case "duplicate_content":
      return "The network rejected it as a duplicate post.";
    case "rate_limited":
      return "The network rate-limited us; it will be retried.";
    case "token_expires_before_publish":
      return "The connection token expires before the scheduled time.";
    default:
      return code.replace(/_/g, " ");
  }
}
