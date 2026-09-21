/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Shared environment / time-range context. Lives in the module layout so it survives tab navigation.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { RANGE_OPTIONS } from "../data/config";
import { useWebhooksSnapshot } from "../data/hooks";
import { resolveWindow, type TimeWindow } from "../data/selectors";
import type { WebhookEnvironment, WebhookTimeRange, WebhooksSnapshot } from "../data/types";

interface WebhooksContextValue {
  environment: WebhookEnvironment;
  range: WebhookTimeRange;
  customHours: number;
  window: TimeWindow | null;
  snapshot: WebhooksSnapshot | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
  setEnvironment: (environment: WebhookEnvironment) => void;
  setRange: (range: WebhookTimeRange) => void;
  setCustomHours: (hours: number) => void;
}

const WebhooksContext = createContext<WebhooksContextValue | null>(null);

const ENVIRONMENTS: WebhookEnvironment[] = ["development", "staging", "production"];

export function WebhooksProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const search = useSearchParams();

  const [environment, setEnvironmentState] = useState<WebhookEnvironment>(() => {
    const value = search.get("env");
    return ENVIRONMENTS.includes(value as WebhookEnvironment) ? (value as WebhookEnvironment) : "production";
  });
  const [range, setRangeState] = useState<WebhookTimeRange>(() => {
    const value = search.get("range");
    return RANGE_OPTIONS.some((option) => option.value === value) ? (value as WebhookTimeRange) : "24h";
  });
  const [customHours, setCustomHoursState] = useState<number>(() => Math.min(720, Math.max(1, Number(search.get("hours")) || 48)));

  const query = useWebhooksSnapshot(environment);
  const { refetch: refetchQuery } = query;

  const writeParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, value]) => (value === null ? params.delete(key) : params.set(key, value)));
      const qs = params.toString();
      router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  const setEnvironment = useCallback((next: WebhookEnvironment) => { setEnvironmentState(next); writeParams({ env: next }); }, [writeParams]);
  const setRange = useCallback((next: WebhookTimeRange) => { setRangeState(next); writeParams({ range: next, hours: next === "custom" ? String(customHours) : null }); }, [writeParams, customHours]);
  const setCustomHours = useCallback((hours: number) => { const clamped = Math.min(720, Math.max(1, Math.round(hours) || 1)); setCustomHoursState(clamped); writeParams({ hours: String(clamped) }); }, [writeParams]);
  const refetch = useCallback(() => void refetchQuery(), [refetchQuery]);

  const windowValue = useMemo(() => (query.data ? resolveWindow(query.data, range, customHours) : null), [query.data, range, customHours]);

  const value = useMemo<WebhooksContextValue>(
    () => ({
      environment, range, customHours, window: windowValue, snapshot: query.data,
      isLoading: query.isLoading, isFetching: query.isFetching, error: query.error,
      refetch, setEnvironment, setRange, setCustomHours,
    }),
    [environment, range, customHours, windowValue, query.data, query.isLoading, query.isFetching, query.error, refetch, setEnvironment, setRange, setCustomHours],
  );

  return <WebhooksContext.Provider value={value}>{children}</WebhooksContext.Provider>;
}

export function useWebhooks(): WebhooksContextValue {
  const context = useContext(WebhooksContext);
  if (!context) throw new Error("useWebhooks must be used inside WebhooksProvider");
  return context;
}

/** For pages rendered behind the shell's loading gate: snapshot and window are guaranteed. */
export function useWebhookData(): { snapshot: WebhooksSnapshot; window: TimeWindow; environment: WebhookEnvironment } {
  const { snapshot, window, environment } = useWebhooks();
  if (!snapshot || !window) throw new Error("useWebhookData was called before the snapshot loaded");
  return { snapshot, window, environment };
}
