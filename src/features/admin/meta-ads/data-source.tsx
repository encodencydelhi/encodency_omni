"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { env } from "@/config/env";
import { getStoredCompanyId, TENANCY_CHANGE_EVENT } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import * as demo from "./data";
import { setAdsCurrency, setAdsLiveClock } from "./format";
import { metaAdsApi, type ApiAdAccount, type ApiPeriod, type ApiSnapshot, type DatasetState } from "./live/meta-ads-api";
import { mapSnapshot, type AdsData } from "./live/meta-ads-mappers";
import type { Ad, AdSet, Campaign, Creative, InstantForm, Lead, Metrics } from "./types";

/**
 * One place that decides where the Ads pages get their rows.
 *
 * - `NEXT_PUBLIC_DATA_SOURCE=api`  -> the read-only Meta Marketing API routes, mapped to the same view models.
 * - anything else                  -> the demo dataset in `data.ts` (frontend-only development).
 *
 * Live mode never falls back to demo rows: a failure is a state (`not_connected`, `reconnect`, `error`), not made-up data.
 */

export type AdsStatus = "loading" | "ready" | "no_company" | "not_connected" | "reconnect" | "permission" | "no_accounts" | "error";

export interface AdsDataContextValue extends AdsData {
  mode: "live" | "demo";
  status: AdsStatus;
  errorMessage: string | null;
  accounts: ApiAdAccount[];
  accountId: string | null;
  setAccountId: (id: string) => void;
  period: ApiPeriod;
  syncedAt: string | null;
  refetching: boolean;
  refresh: () => void;
  /** Per-dataset state from the backend (live only); `null` in demo mode. */
  datasets: Partial<Record<"campaigns" | "adSets" | "ads" | "creatives" | "audiences" | "forms" | "activity" | "trend", DatasetState>> | null;
  leadsState: "loading" | "ready" | "error" | "idle";
  getCampaign: (id: string) => Campaign | undefined;
  getAdSet: (id: string) => AdSet | undefined;
  getAd: (id: string) => Ad | undefined;
  getForm: (id: string) => InstantForm | undefined;
  getLead: (id: string) => Lead | undefined;
  getCreative: (id: string) => Creative | undefined;
  adSetsOfCampaign: (campaignId: string) => AdSet[];
  adsOfCampaign: (campaignId: string) => Ad[];
  adsOfAdSet: (adSetId: string) => Ad[];
  adsOfForm: (formId: string) => Ad[];
  campaignsOfForm: (formId: string) => Campaign[];
  leadsOf: (filter: Partial<Pick<Lead, "campaignId" | "adSetId" | "adId" | "formId">>) => Lead[];
  totals: Metrics;
}

const Context = createContext<AdsDataContextValue | null>(null);

export const LIVE = env.dataSource === "api";

const RANGE_TO_PERIOD: Record<string, ApiPeriod> = { "Last 7 days": "7d", "Last 30 days": "30d", "Last 90 days": "90d" };

const EMPTY: AdsData = { campaigns: [], adSets: [], ads: [], instantForms: [], leads: [], audiences: [], creatives: [], issues: [], activityLog: [], connectedAssets: [], trendSeries: [] };

const ACCOUNT_KEY = (companyId: string) => `omni.meta-ads.account.${companyId}`;

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the choice then lasts for this visit only */
  }
}

function reasonOf(error: unknown): string | null {
  return ApiError.isApiError(error) ? (error.reason ?? error.code) : null;
}

function statusOfError(error: unknown): AdsStatus {
  const reason = reasonOf(error);
  if (reason === "provider_not_connected") return "not_connected";
  if (reason === "provider_permission_required") return "permission";
  return "error";
}

function messageOf(error: unknown): string {
  if (ApiError.isApiError(error) && error.message) return error.message;
  return "Meta Ads could not be loaded. Try again in a moment.";
}

function helpers(data: AdsData) {
  const getCampaign = (id: string) => data.campaigns.find((c) => c.id === id);
  const adsOfForm = (formId: string) => data.ads.filter((a) => a.formId === formId);
  return {
    getCampaign,
    getAdSet: (id: string) => data.adSets.find((a) => a.id === id),
    getAd: (id: string) => data.ads.find((a) => a.id === id),
    getForm: (id: string) => data.instantForms.find((f) => f.id === id),
    getLead: (id: string) => data.leads.find((l) => l.id === id),
    getCreative: (id: string) => data.creatives.find((c) => c.id === id),
    adSetsOfCampaign: (campaignId: string) => data.adSets.filter((a) => a.campaignId === campaignId),
    adsOfCampaign: (campaignId: string) => data.ads.filter((a) => a.campaignId === campaignId),
    adsOfAdSet: (adSetId: string) => data.ads.filter((a) => a.adSetId === adSetId),
    adsOfForm,
    campaignsOfForm: (formId: string) =>
      Array.from(new Set(adsOfForm(formId).map((a) => a.campaignId)))
        .map(getCampaign)
        .filter((c): c is Campaign => Boolean(c)),
    leadsOf: (filter: Partial<Pick<Lead, "campaignId" | "adSetId" | "adId" | "formId">>) =>
      data.leads.filter((l) => Object.entries(filter).every(([key, value]) => !value || l[key as keyof Lead] === value)),
  };
}

const DEMO_ACCOUNTS: ApiAdAccount[] = [];

export function AdsDataProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [chosenAccount, setChosenAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!LIVE) return;
    const sync = () => setCompanyId(getStoredCompanyId() || null);
    sync();
    window.addEventListener(TENANCY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TENANCY_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    setAdsLiveClock(LIVE);
    return () => setAdsLiveClock(false);
  }, []);

  const period: ApiPeriod = RANGE_TO_PERIOD[params?.get("range") ?? "Last 30 days"] ?? "30d";

  const accountsQuery = useQuery({
    queryKey: ["meta-ads", companyId, "accounts"],
    enabled: LIVE && Boolean(companyId),
    queryFn: ({ signal }) => metaAdsApi.accounts(companyId!, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const accounts = accountsQuery.data?.items ?? DEMO_ACCOUNTS;
  const stored = companyId ? readStored(ACCOUNT_KEY(companyId)) : null;
  const accountId = useMemo(() => {
    const wanted = chosenAccount ?? stored;
    if (wanted && accounts.some((a) => a.id === wanted)) return wanted;
    return accounts[0]?.id ?? null;
  }, [accounts, chosenAccount, stored]);

  const snapshotQuery = useQuery<ApiSnapshot>({
    queryKey: ["meta-ads", companyId, "snapshot", accountId, period],
    enabled: LIVE && Boolean(companyId) && Boolean(accountId),
    queryFn: ({ signal }) => metaAdsApi.snapshot(companyId!, accountId!, period, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const hasForms = (snapshotQuery.data?.forms.data.length ?? 0) > 0;
  const leadsQuery = useQuery({
    queryKey: ["meta-ads", companyId, "leads", accountId],
    enabled: LIVE && Boolean(companyId) && hasForms,
    queryFn: ({ signal }) => metaAdsApi.leads(companyId!, signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const snapshot = snapshotQuery.data;
  const leadRows = leadsQuery.data?.items;
  const liveData = useMemo(() => (snapshot ? mapSnapshot(snapshot, leadRows ?? []) : EMPTY), [snapshot, leadRows]);

  // Module-level formatter state: it has to be right before any child renders money, so not in an effect.
  if (LIVE) setAdsCurrency(snapshot?.account.currency);

  const setAccountId = useCallback(
    (id: string) => {
      setChosenAccount(id);
      if (companyId) writeStored(ACCOUNT_KEY(companyId), id);
    },
    [companyId],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["meta-ads", companyId] });
  }, [queryClient, companyId]);

  const value = useMemo<AdsDataContextValue>(() => {
    if (!LIVE) {
      const demoData: AdsData = {
        campaigns: demo.campaigns,
        adSets: demo.adSets,
        ads: demo.ads,
        instantForms: demo.instantForms,
        leads: demo.leads,
        audiences: demo.audiences,
        creatives: demo.creatives,
        issues: demo.issues,
        activityLog: demo.activityLog,
        connectedAssets: demo.connectedAssets,
        trendSeries: demo.trendSeries,
      };
      return {
        ...demoData,
        ...helpers(demoData),
        totals: demo.sumMetrics(demo.campaigns),
        mode: "demo",
        status: "ready",
        errorMessage: null,
        accounts: DEMO_ACCOUNTS,
        accountId: null,
        setAccountId: () => undefined,
        period: "30d",
        syncedAt: null,
        refetching: false,
        refresh: () => undefined,
        datasets: null,
        leadsState: "ready",
      };
    }

    let status: AdsStatus = "loading";
    let errorMessage: string | null = null;
    if (!companyId) status = "no_company";
    else if (accountsQuery.isError) {
      status = statusOfError(accountsQuery.error);
      errorMessage = messageOf(accountsQuery.error);
    } else if (accountsQuery.isSuccess && accounts.length === 0) status = "no_accounts";
    else if (snapshotQuery.isError) {
      status = statusOfError(snapshotQuery.error);
      errorMessage = messageOf(snapshotQuery.error);
    } else if (snapshot) status = "ready";
    // A revoked/expired token surfaces as 409 provider_not_connected once the connection exists; tell the two apart by message.
    if (status === "not_connected" && /reconnected/i.test(errorMessage ?? "")) status = "reconnect";

    const totals = snapshot ? { spend: Math.round(snapshot.totals.spend * 100), impressions: snapshot.totals.impressions, reach: snapshot.totals.reach, clicks: snapshot.totals.clicks, leads: snapshot.totals.leads } : { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 };

    return {
      ...liveData,
      ...helpers(liveData),
      totals,
      mode: "live",
      status,
      errorMessage,
      accounts,
      accountId,
      setAccountId,
      period,
      syncedAt: snapshot?.syncedAt ?? null,
      refetching: snapshotQuery.isFetching && Boolean(snapshot),
      refresh,
      datasets: snapshot
        ? {
            campaigns: snapshot.campaigns.state,
            adSets: snapshot.adSets.state,
            ads: snapshot.ads.state,
            creatives: snapshot.creatives.state,
            audiences: snapshot.audiences.state,
            forms: snapshot.forms.state,
            activity: snapshot.activity.state,
            trend: snapshot.trend.state,
          }
        : null,
      leadsState: !hasForms ? "idle" : leadsQuery.isError ? "error" : leadsQuery.isSuccess ? "ready" : "loading",
    };
  }, [companyId, accountsQuery.isError, accountsQuery.isSuccess, accountsQuery.error, accounts, snapshotQuery.isError, snapshotQuery.isFetching, snapshotQuery.error, snapshot, liveData, accountId, setAccountId, period, refresh, hasForms, leadsQuery.isError, leadsQuery.isSuccess]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdsData(): AdsDataContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAdsData must be used inside <AdsDataProvider>.");
  return value;
}
