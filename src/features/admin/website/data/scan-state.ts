/**
 * Mapping from backend scan lifecycle states to what the UI shows and does.
 * Pure functions, so the rules the progress banner, toasts and polling loop
 * depend on can be tested without rendering anything.
 */

import type { ScanProgress } from "./types";

export type ScanLifecycle = ScanProgress["status"];

const TERMINAL: readonly ScanLifecycle[] = ["completed", "partially_completed", "failed", "cancelled"];

export function isTerminalScan(status: string): boolean {
  return (TERMINAL as readonly string[]).includes(status);
}

export function isActiveScan(status: string): boolean {
  return status === "queued" || status === "running";
}

/** Whether the scan produced results the rest of the module should refetch. */
export function scanProducedResults(status: string): boolean {
  return status === "completed" || status === "partially_completed";
}

export function scanStatusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "partially_completed":
    case "partial":
      return "Completed with errors";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export type ScanTone = "good" | "warn" | "bad" | "info" | "muted";

export function scanStatusTone(status: string): ScanTone {
  switch (status) {
    case "completed":
      return "good";
    case "partially_completed":
    case "partial":
      return "warn";
    case "failed":
      return "bad";
    case "cancelled":
      return "muted";
    default:
      return "info";
  }
}

/** Progress is the backend's unit-based value; clamped, and never 100 while active. */
export function scanProgressPercent(progress: Pick<ScanProgress, "status" | "progress">): number {
  const raw = Number.isFinite(progress.progress) ? progress.progress : 0;
  const clamped = Math.max(0, Math.min(100, Math.round(raw)));
  if (isActiveScan(progress.status)) return Math.min(clamped, 99);
  return progress.status === "queued" ? 0 : clamped;
}

/** Poll quickly at first, then back off so a long scan does not hammer the API. */
export function nextPollDelayMs(attempt: number): number {
  if (attempt < 10) return 1000;
  if (attempt < 30) return 2000;
  return 5000;
}

/** Polls that may fail in a row (network blips) before the UI says tracking was lost. */
export const MAX_CONSECUTIVE_POLL_FAILURES = 3;

export interface ScanOutcomeMessage {
  kind: "success" | "warning" | "error" | "info";
  title: string;
  description?: string;
}

/** Toast copy for a scan that just reached a terminal state. */
export function describeScanOutcome(progress: ScanProgress, typeLabel: string): ScanOutcomeMessage {
  const pages = `${progress.pagesScanned} page${progress.pagesScanned === 1 ? "" : "s"}`;
  switch (progress.status) {
    case "completed":
      return progress.type === "page"
        ? { kind: "success", title: `${typeLabel} complete`, description: "This page's audit has been refreshed." }
        : { kind: "success", title: `${typeLabel} complete`, description: `${pages} scanned. Results updated.` };
    case "partially_completed":
      return {
        kind: "warning",
        title: `${typeLabel} finished with errors`,
        description: `${pages} scanned. ${progress.error?.message ?? "Some pages could not be fetched."}`,
      };
    case "cancelled":
      return { kind: "info", title: `${typeLabel} cancelled`, description: "Previous results were left unchanged." };
    case "failed":
      return {
        kind: "error",
        title: `${typeLabel} failed`,
        description: progress.error?.message ?? "The scan could not be completed.",
      };
    default:
      return { kind: "info", title: typeLabel };
  }
}
