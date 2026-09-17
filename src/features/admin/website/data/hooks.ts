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
import type {
  IntegrationKey,
  IssueStatus,
  ScanProgress,
  ScanType,
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

export function useWebsiteMonitoring(clientId: string, enabled = true) {
  return useQuery({
    queryKey: websiteKeys.monitoring(clientId),
    queryFn: () => websiteRepository.getMonitoring(clientId),
    enabled: enabled && Boolean(clientId),
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
  error: Error | null;
  start: (type: ScanType, pageId?: string) => Promise<void>;
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(onComplete);

  // Keep the latest callback without making `start` depend on its identity.
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const start = useCallback(
    async (type: ScanType, pageId?: string) => {
      stopPolling();
      setError(null);
      try {
        const started = await websiteRepository.startScan(clientId, type, pageId);
        setProgress(started);
        timerRef.current = setInterval(() => {
          void websiteRepository
            .getScanProgress(clientId, started.scanId)
            .then((next) => {
              setProgress(next);
              if (next.status === "completed" || next.status === "failed") {
                stopPolling();
                void queryClient.invalidateQueries({ queryKey: websiteKeys.client(clientId) });
                completeRef.current?.(next);
              }
            })
            .catch((pollError: unknown) => {
              stopPolling();
              setError(pollError instanceof Error ? pollError : new Error("Scan failed."));
            });
        }, 400);
      } catch (startError: unknown) {
        setError(startError instanceof Error ? startError : new Error("Scan could not be started."));
      }
    },
    [clientId, queryClient, stopPolling],
  );

  const dismiss = useCallback(() => {
    stopPolling();
    setProgress(null);
    setError(null);
  }, [stopPolling]);

  return useMemo(
    () => ({
      progress,
      isRunning: progress?.status === "running" || progress?.status === "queued",
      error,
      start,
      dismiss,
    }),
    [progress, error, start, dismiss],
  );
}
