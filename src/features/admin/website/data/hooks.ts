"use client";

/**
 * React Query bindings over the repository.
 *
 * Every screen consumes data through these hooks, so loading, error and empty
 * handling is identical everywhere and a provider swap needs no UI changes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { websiteKeys, websiteRepository } from "./repository";
import {
  isActiveScan,
  isTerminalScan,
  MAX_CONSECUTIVE_POLL_FAILURES,
  nextPollDelayMs,
  scanProducedResults,
} from "./scan-state";
import type {
  IntegrationKey,
  IssueStatus,
  ScanProgress,
  ScanType,
  ScanStartOptions,
  GenerateReportInput,
  ReportScheduleInput,
  AiRecommendationStatus,
  WebsiteSettings,
} from "./types";

const SHARED = { staleTime: 60_000, retry: false } as const;

export function useWebsiteTarget(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.target(clientId),
    queryFn: () => websiteRepository.getTarget(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteCapabilities(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.capabilities(clientId),
    queryFn: () => websiteRepository.getCapabilities(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteSummary(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.summary(clientId),
    queryFn: () => websiteRepository.getSummary(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteTrend(clientId: string, days: 7 | 30 | 90, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.trend(clientId, days),
    queryFn: () => websiteRepository.getTrend(clientId, days),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteTechnologies(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.technologies(clientId),
    queryFn: () => websiteRepository.getTechnologies(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteScans(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.scans(clientId),
    queryFn: () => websiteRepository.getScans(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsitePages(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.pages(clientId),
    queryFn: () => websiteRepository.getPages(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsitePageAudit(clientId: string, pageId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.pageAudit(clientId, pageId),
    queryFn: () => websiteRepository.getPageAudit(clientId, pageId),
    enabled: enabled && Boolean(clientId) && Boolean(pageId),
    ...SHARED,
  });
}

export function useWebsiteIssues(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.issues(clientId),
    queryFn: () => websiteRepository.getIssues(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useFixGuide(guideId: string | null) {
  return useQuery({
    queryKey: websiteKeys.fixGuide(guideId ?? "none"),
    queryFn: () => websiteRepository.getFixGuide(guideId as string),
    enabled: Boolean(guideId),
    staleTime: Infinity,
    retry: false,
  });
}

export function useWebsiteSeo(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.seo(clientId),
    queryFn: () => websiteRepository.getSeo(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsitePerformance(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.performance(clientId),
    queryFn: () => websiteRepository.getPerformance(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteAnalytics(clientId: string, period: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.analytics(clientId, period),
    queryFn: () => websiteRepository.getAnalytics(clientId, period),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteForms(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.forms(clientId),
    queryFn: () => websiteRepository.getForms(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useWebsiteMonitoring(clientId: string, enabled = true, refetchInterval?: number) {
  return useQuery({
    queryKey: websiteKeys.monitoring(clientId),
    queryFn: () => websiteRepository.getMonitoring(clientId),
    enabled: enabled && Boolean(clientId),
    refetchInterval,
    ...SHARED,
  });
}

export function useWebsiteSettings(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.settings(clientId),
    queryFn: () => websiteRepository.getSettings(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function useSaveSettings(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: WebsiteSettings) => websiteRepository.saveSettings(clientId, settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(websiteKeys.settings(clientId), settings);
    },
  });
}

export function useSetIssueStatus(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { issueId: string; status: IssueStatus }) =>
      websiteRepository.setIssueStatus(clientId, input.issueId, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: websiteKeys.issues(clientId) });
      void queryClient.invalidateQueries({ queryKey: websiteKeys.pages(clientId) });
      void queryClient.invalidateQueries({ queryKey: websiteKeys.summary(clientId) });
    },
  });
}

export function useIntegrationMutations(clientId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: websiteKeys.client(clientId) });
  };

  const connect = useMutation({
    mutationFn: (input: { key: IntegrationKey; property: string }) =>
      websiteRepository.connectIntegration(clientId, input.key, input.property),
    onSuccess: invalidate,
  });

  const disconnect = useMutation({
    mutationFn: (key: IntegrationKey) => websiteRepository.disconnectIntegration(clientId, key),
    onSuccess: invalidate,
  });

  return { connect, disconnect };
}

export function useArchiveMonitoring(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) => websiteRepository.archiveMonitoring(clientId, archived),
    onSuccess: (settings) => {
      queryClient.setQueryData(websiteKeys.settings(clientId), settings);
      void queryClient.invalidateQueries({ queryKey: websiteKeys.monitoring(clientId) });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Scan runner                                                         */
/* ------------------------------------------------------------------ */

export interface ScanRunner {
  progress: ScanProgress | null;
  isRunning: boolean;
  isCancelling: boolean;
  error: Error | null;
  start: (type: ScanType, pageId?: string, options?: ScanStartOptions) => Promise<void>;
  /** Asks the backend to stop the scan. Polling continues until it reports a terminal state. */
  cancel: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Drives a scan and polls it to completion, then refreshes everything the scan
 * could have changed. Polling lives here rather than in a component so every
 * "Scan now" / "Re-scan" button behaves identically.
 */
export function useScanRunner(clientId: string, onComplete?: (progress: ScanProgress) => void): ScanRunner {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedRef = useRef<string | null>(null);
  const completeRef = useRef(onComplete);

  // Keep the latest callback without making `start` depend on its identity.
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    trackedRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const finish = useCallback(
    (done: ScanProgress) => {
      stopPolling();
      setIsCancelling(false);
      if (scanProducedResults(done.status)) {
        void queryClient.invalidateQueries({ queryKey: websiteKeys.client(clientId) });
      } else {
        // Scan list and summary still change (a failed scan is recorded), the data sections do not.
        void queryClient.invalidateQueries({ queryKey: websiteKeys.scans(clientId) });
      }
      completeRef.current?.(done);
    },
    [clientId, queryClient, stopPolling],
  );

  /** Polls one scan id until it reaches a terminal state. */
  const track = useCallback(
    (scanId: string) => {
      stopPolling();
      trackedRef.current = scanId;
      let attempt = 0;
      let failures = 0;
      const tick = () => {
        timerRef.current = setTimeout(async () => {
          if (trackedRef.current !== scanId) return;
          try {
            const next = await websiteRepository.getScanProgress(clientId, scanId);
            if (trackedRef.current !== scanId) return;
            failures = 0;
            setProgress(next);
            if (isTerminalScan(next.status)) {
              finish(next);
              return;
            }
          } catch (pollError: unknown) {
            failures += 1;
            if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
              // The scan may still be running; say tracking was lost, not that it failed.
              stopPolling();
              setError(
                new Error(
                  pollError instanceof Error
                    ? `Lost contact with the scan: ${pollError.message}`
                    : "Lost contact with the scan. Reload to check its status.",
                ),
              );
              return;
            }
          }
          attempt += 1;
          tick();
        }, nextPollDelayMs(attempt));
      };
      tick();
    },
    [clientId, finish, stopPolling],
  );

  // After a reload the scan keeps running on the server: pick it back up.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void websiteRepository
      .getScans(clientId)
      .then((records) => {
        if (cancelled || trackedRef.current) return;
        const active = records.find((record) => isActiveScan(record.status));
        if (!active) return;
        void websiteRepository
          .getScanProgress(clientId, active.id)
          .then((current) => {
            if (cancelled || trackedRef.current || !isActiveScan(current.status)) return;
            setProgress(current);
            track(current.scanId);
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, track]);

  const start = useCallback(
    async (type: ScanType, pageId?: string, options?: ScanStartOptions) => {
      stopPolling();
      setError(null);
      setIsCancelling(false);
      try {
        const started = await websiteRepository.startScan(clientId, type, pageId, options);
        setProgress(started);
        if (isTerminalScan(started.status)) {
          finish(started);
          return;
        }
        track(started.scanId);
      } catch (startError: unknown) {
        setError(startError instanceof Error ? startError : new Error("Scan could not be started."));
      }
    },
    [clientId, finish, stopPolling, track],
  );

  const cancel = useCallback(async () => {
    const current = progress;
    if (!current || !isActiveScan(current.status)) return;
    setIsCancelling(true);
    try {
      const next = await websiteRepository.cancelScan(clientId, current.scanId);
      setProgress(next);
      if (isTerminalScan(next.status)) finish(next);
      else if (trackedRef.current !== next.scanId) track(next.scanId);
    } catch (cancelError: unknown) {
      setIsCancelling(false);
      setError(cancelError instanceof Error ? cancelError : new Error("The scan could not be cancelled."));
    }
  }, [clientId, finish, progress, track]);

  const dismiss = useCallback(() => {
    stopPolling();
    setProgress(null);
    setError(null);
    setIsCancelling(false);
  }, [stopPolling]);

  return useMemo(
    () => ({
      progress,
      isRunning: progress ? isActiveScan(progress.status) : false,
      isCancelling,
      error,
      start,
      cancel,
      dismiss,
    }),
    [progress, isCancelling, error, start, cancel, dismiss],
  );
}

export function useKeywordResearch(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.keywordResearch(clientId),
    queryFn: () => websiteRepository.getKeywordResearch(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useCompetitorAnalysis(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.competitorAnalysis(clientId),
    queryFn: () => websiteRepository.getCompetitorAnalysis(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useBacklinkAnalysis(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.backlinkAnalysis(clientId),
    queryFn: () => websiteRepository.getBacklinkAnalysis(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useRankTracking(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.rankTracking(clientId),
    queryFn: () => websiteRepository.getRankTracking(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function usePagePerformance(clientId: string, pageId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.pagePerformance(clientId, pageId),
    queryFn: () => websiteRepository.getPagePerformance(clientId, pageId),
    enabled: enabled && Boolean(clientId) && Boolean(pageId),
    ...SHARED,
  });
}

export function usePageSearch(clientId: string, pageId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.pageSearch(clientId, pageId),
    queryFn: () => websiteRepository.getPageSearch(clientId, pageId),
    enabled: enabled && Boolean(clientId) && Boolean(pageId),
    ...SHARED,
  });
}

export function usePageInspection(clientId: string, pageId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.pageInspection(clientId, pageId),
    queryFn: () => websiteRepository.getPageInspection(clientId, pageId),
    enabled: enabled && Boolean(clientId) && Boolean(pageId),
    ...SHARED,
  });
}

export function useInspectPage(clientId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => websiteRepository.inspectPage(clientId, pageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: websiteKeys.pageInspection(clientId, pageId) });
    },
  });
}

export function useCrawlLimits(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.crawlLimits(clientId),
    queryFn: () => websiteRepository.getCrawlLimits(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useSearchConsole(clientId: string, enabled = true) {
  const seoResult = useWebsiteSeo(clientId, enabled);
  return useMemo(() => {
    const pages = seoResult.data?.searchConsole?.pages ?? [];
    const queries = seoResult.data?.searchConsole?.queries ?? [];
    return {
      data: pages,
      queries,
      trend: seoResult.data?.searchConsole?.trend ?? [],
      totals: seoResult.data?.searchConsole?.totals ?? null,
      isLoading: seoResult.isLoading,
      error: seoResult.error,
      refetch: seoResult.refetch,
    };
  }, [seoResult.data, seoResult.isLoading, seoResult.error, seoResult.refetch]);
}


/* ---- Milestone 5: AI intelligence ----------------------------------------------------------------- */

export function useAiStatus(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...websiteKeys.client(clientId), "ai", "status"] as const,
    queryFn: () => websiteRepository.getAiStatus(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useAiSummary(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...websiteKeys.client(clientId), "ai", "summary"] as const,
    queryFn: () => websiteRepository.getAiSummary(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function usePageAi(clientId: string, pageId: string, enabled = true) {
  return useQuery({
    queryKey: [...websiteKeys.client(clientId), "ai", "page", pageId] as const,
    queryFn: () => websiteRepository.getPageAi(clientId, pageId),
    enabled: enabled && Boolean(clientId) && Boolean(pageId),
    ...SHARED,
  });
}

export function useSetAiRecommendationStatus(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: AiRecommendationStatus }) =>
      websiteRepository.setAiRecommendationStatus(clientId, input.id, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...websiteKeys.client(clientId), "ai"] });
    },
  });
}


/* ---- Milestone 6: monitoring incidents and alerts ----------------------------------------------------- */

export function useMonitoringOverview(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...websiteKeys.client(clientId), "monitoring-overview"] as const,
    queryFn: () => websiteRepository.getMonitoringOverview(clientId),
    enabled: enabled && Boolean(clientId),
    refetchInterval: 30_000,
    ...SHARED,
  });
}

export function useSendTestAlert(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => websiteRepository.sendTestAlert(clientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...websiteKeys.client(clientId), "monitoring-overview"] });
    },
  });
}


/* ---- Milestone 7: reports --------------------------------------------------------------------------------- */

const reportKey = (clientId: string) => [...websiteKeys.client(clientId), "reports"] as const;

export function useReportMeta(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...reportKey(clientId), "meta"] as const,
    queryFn: () => websiteRepository.getReportMeta(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useReports(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...reportKey(clientId), "list"] as const,
    queryFn: () => websiteRepository.listReports(clientId),
    enabled: enabled && Boolean(clientId),
    // Poll while something is queued or running so progress stays live without a manual refresh.
    refetchInterval: (query) => ((query.state.data as { status: string }[] | undefined)?.some((r) => r.status === "queued" || r.status === "running") ? 1500 : false),
    ...SHARED,
  });
}

export function useGenerateReport(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateReportInput) => websiteRepository.generateReport(clientId, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportKey(clientId) }),
  });
}

export function useCancelReport(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => websiteRepository.cancelReport(clientId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportKey(clientId) }),
  });
}

export function useDeleteReport(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => websiteRepository.deleteReport(clientId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportKey(clientId) }),
  });
}

export function useReportSchedules(clientId: string, enabled = true) {
  return useQuery({
    queryKey: [...reportKey(clientId), "schedules"] as const,
    queryFn: () => websiteRepository.listReportSchedules(clientId),
    enabled: enabled && Boolean(clientId),
    ...SHARED,
  });
}

export function useSaveReportSchedule(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { schedule: ReportScheduleInput; id?: string }) => websiteRepository.saveReportSchedule(clientId, input.schedule, input.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [...reportKey(clientId), "schedules"] }),
  });
}

export function useDeleteReportSchedule(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => websiteRepository.deleteReportSchedule(clientId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [...reportKey(clientId), "schedules"] }),
  });
}
