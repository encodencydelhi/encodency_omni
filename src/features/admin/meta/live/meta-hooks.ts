"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { integrationsApi, type OverviewConnection, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { metaAdsApi, type ApiAdAccount, type ApiPeriod, type ApiSnapshot } from "@/features/admin/meta-ads/live/meta-ads-api";
import { schedulingApi, type ScheduledPost } from "@/features/admin/content/live/scheduling-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { parseScopes, scopeStatuses, type ScopeStatus } from "../permissions";
import { metaSocialApi, type Feed, type InstagramMedia, type SocialPost } from "./meta-social-api";

/** One cache namespace for the whole hub so Disconnect / Refresh can reset every Meta query at once. */
export const META_KEY = "meta-hub";

export type ConnectionState = "loading" | "no_company" | "no_client" | "not_connected" | "reconnect" | "connected" | "error";

export function reasonOf(error: unknown): string | null {
  return ApiError.isApiError(error) ? (error.reason ?? error.code) : null;
}

export function messageOf(error: unknown, fallback: string): string {
  return ApiError.isApiError(error) && error.message ? error.message : fallback;
}

/** An error the user can fix by (re)connecting Meta, as opposed to a transient failure. */
export function needsMetaLogin(error: unknown): boolean {
  return reasonOf(error) === "provider_not_connected";
}

export interface MetaConnection {
  state: ConnectionState;
  companyId: string;
  clientId: string;
  isReady: boolean;
  /** META provider row (Facebook Pages + the login itself). */
  meta: ProviderOverview | null;
  /** INSTAGRAM provider row (Instagram accounts mapped to this Client). */
  instagram: ProviderOverview | null;
  connection: OverviewConnection | null;
  scopes: ScopeStatus[];
  grantedScopes: string[];
  loadError: string | null;
  isFetching: boolean;
  busy: "connect" | "disconnect" | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<boolean>;
  refresh: () => void;
}

/** The single source of truth for "is Meta connected, as whom, with which permissions", plus connect / disconnect. */
export function useMetaConnection(): MetaConnection {
  const { companyId, clientId, isReady } = useTenancyContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<MetaConnection["busy"]>(null);

  const overview = useQuery({
    queryKey: [META_KEY, companyId, clientId, "overview"],
    enabled: isReady && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => integrationsApi.getOverview(companyId, clientId, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const meta = overview.data?.providers.find((row) => row.provider === "META") ?? null;
  const instagram = overview.data?.providers.find((row) => row.provider === "INSTAGRAM") ?? null;
  const connection = meta?.connections[0] ?? null;
  const profile = connection?.accountProfile ?? null;
  const grantedScopes = useMemo(() => parseScopes(profile?.grantedScopes), [profile]);
  const scopes = useMemo(() => scopeStatuses(grantedScopes, parseScopes(profile?.declinedScopes)), [grantedScopes, profile]);

  let state: ConnectionState;
  if (!isReady) state = "loading";
  else if (!companyId) state = "no_company";
  else if (!clientId) state = "no_client";
  else if (overview.isLoading) state = "loading";
  else if (overview.isError) state = "error";
  else if (meta?.reconnectRequired) state = "reconnect";
  else if (!meta || meta.status === "NOT_CONNECTED" || !connection) state = "not_connected";
  else state = "connected";

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [META_KEY] });
    void queryClient.invalidateQueries({ queryKey: ["meta-ads", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["meta-channel"] });
  }, [queryClient, companyId]);

  const connect = useCallback(async () => {
    if (!companyId) {
      toast.error("Select a Company before connecting Meta.");
      return;
    }
    setBusy("connect");
    try {
      const { authUrl } = await integrationsApi.initOAuth(companyId, "META");
      window.location.assign(authUrl);
    } catch (error) {
      toast.error(messageOf(error, "Unable to start the Meta connection."));
      setBusy(null);
    }
  }, [companyId]);

  const disconnect = useCallback(async () => {
    if (!companyId) return false;
    setBusy("disconnect");
    try {
      await integrationsApi.disconnectProvider(companyId, "META");
      // Drop everything read through the old login so no stale ad or Page data lingers on screen.
      queryClient.removeQueries({ queryKey: [META_KEY] });
      queryClient.removeQueries({ queryKey: ["meta-ads", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["meta-channel"] });
      await overview.refetch();
      toast.success("Meta disconnected. Nothing was deleted from Meta.");
      return true;
    } catch (error) {
      toast.error(messageOf(error, "Unable to disconnect Meta."));
      return false;
    } finally {
      setBusy(null);
    }
  }, [companyId, queryClient, overview]);

  return {
    state,
    companyId,
    clientId,
    isReady,
    meta,
    instagram,
    connection,
    scopes,
    grantedScopes,
    loadError: overview.isError ? messageOf(overview.error, "Unable to load the Meta connection.") : null,
    isFetching: overview.isFetching,
    busy,
    connect,
    disconnect,
    refresh,
  };
}

/** The connected personal Facebook profile, its permissions and token facts (live from Meta). */
export function useMetaProfile(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: [META_KEY, companyId, "profile"],
    enabled: enabled && Boolean(companyId),
    queryFn: ({ signal }) => metaSocialApi.profile(companyId, signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Facebook Pages + linked Instagram accounts this login manages (live from Meta). */
export function useSocialOverview(companyId: string, enabled: boolean) {
  const force = useRef(0);
  const query = useQuery({
    queryKey: [META_KEY, companyId, "social"],
    enabled: enabled && Boolean(companyId),
    queryFn: ({ signal }) => metaSocialApi.overview(companyId, signal, Date.now() < force.current),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const refetch = useCallback(() => {
    force.current = Date.now() + 3000;
    return query.refetch();
  }, [query]);
  return { ...query, refetch };
}

function useCursorFeed<T>(key: unknown[], enabled: boolean, load: (after: string | undefined, signal: AbortSignal, refresh: boolean) => Promise<Feed<T>>) {
  const force = useRef(0);
  const query = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => load(pageParam, signal, Date.now() < force.current),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const reload = useCallback(() => {
    force.current = Date.now() + 3000;
    return query.refetch();
  }, [query]);
  return { ...query, items, reload };
}

export function usePagePosts(companyId: string, pageId: string | null) {
  return useCursorFeed<SocialPost>([META_KEY, companyId, "posts", pageId], Boolean(companyId && pageId), (after, signal, refresh) => metaSocialApi.posts(companyId, pageId!, after, signal, refresh));
}

export function useInstagramProfile(companyId: string, instagramId: string | null) {
  return useQuery({
    queryKey: [META_KEY, companyId, "instagram", instagramId],
    enabled: Boolean(companyId && instagramId),
    queryFn: ({ signal }) => metaSocialApi.instagramProfile(companyId, instagramId!, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useInstagramMedia(companyId: string, instagramId: string | null) {
  return useCursorFeed<InstagramMedia>([META_KEY, companyId, "media", instagramId], Boolean(companyId && instagramId), (after, signal, refresh) => metaSocialApi.instagramMedia(companyId, instagramId!, after, signal, refresh));
}

const ACCOUNT_KEY = (companyId: string) => `omni.meta-ads.account.${companyId}`;

function storedAccount(companyId: string): string | null {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY(companyId));
  } catch {
    return null;
  }
}

/** Remember the ad account the Ads workspace should open on (same key the workspace itself uses). */
export function rememberAdAccount(companyId: string, accountId: string): void {
  try {
    window.localStorage.setItem(ACCOUNT_KEY(companyId), accountId);
  } catch {
    /* storage can be blocked; the Ads workspace then opens on its default account */
  }
}

/** The account the Ads workspace would open on: remembered choice, else the first ACTIVE one. */
export function defaultAdAccount(companyId: string, accounts: ApiAdAccount[]): ApiAdAccount | null {
  const wanted = storedAccount(companyId);
  return accounts.find((account) => account.id === wanted) ?? accounts.find((account) => account.status === "ACTIVE") ?? accounts[0] ?? null;
}

/** Ad accounts (shares its cache with the Ads workspace). */
export function useAdAccounts(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["meta-ads", companyId, "accounts"],
    enabled: enabled && Boolean(companyId),
    queryFn: ({ signal }) => metaAdsApi.accounts(companyId, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Lifetime totals over every ad account: the cheap numbers the hub opens with. */
export function useAdsOverview(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["meta-ads", companyId, "overview"],
    enabled: enabled && Boolean(companyId),
    queryFn: ({ signal }) => metaAdsApi.overview(companyId, signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * One ad account's snapshot (shares its cache with the Ads workspace). `enabled: false` only reads what the Ads
 * workspace already loaded, so a page can use it without spending the ad-account quota.
 */
export function useAdSnapshot(companyId: string, accountId: string | null, period: ApiPeriod = "30d", enabled = true) {
  return useQuery<ApiSnapshot>({
    queryKey: ["meta-ads", companyId, "snapshot", accountId, period],
    enabled: enabled && Boolean(companyId && accountId),
    queryFn: ({ signal }) => metaAdsApi.snapshot(companyId, accountId!, period, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Scheduled / published posts of this Client across Facebook and Instagram (newest 100 by schedule; filtered on the page). */
export function useMetaScheduledPosts(companyId: string, clientId: string, enabled: boolean) {
  const query = useQuery({
    queryKey: [META_KEY, companyId, clientId, "scheduled"],
    enabled: enabled && Boolean(companyId && clientId),
    queryFn: ({ signal }) => schedulingApi.list(companyId, clientId, { limit: 100 }, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const items: ScheduledPost[] = useMemo(() => (query.data?.items ?? []).filter((post) => post.channel === "FACEBOOK_PAGE" || post.channel === "INSTAGRAM_ACCOUNT"), [query.data]);
  return { ...query, items, total: query.data?.total ?? 0 };
}
