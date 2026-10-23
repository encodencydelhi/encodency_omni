"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { clientsApi } from "@/features/clients/data/clients-api";
import { analyzerApi } from "./api";

const keys = {
  all: (companyId: string) => ["competitor-analyzer", companyId] as const,
  list: (companyId: string) => ["competitor-analyzer", companyId, "list"] as const,
  study: (companyId: string, id: string) => ["competitor-analyzer", companyId, "study", id] as const,
  siteName: (companyId: string, domain: string) => ["competitor-analyzer", companyId, "site-name", domain] as const,
};

/** "https://www.Example.com/about" → "example.com"; null when it does not look like a website address. */
export function domainOf(value: string) {
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host) ? host : null;
}

/** The name of the site typed in `value`, looked up 600 ms after typing stops. */
export function useSiteName(value: string) {
  const { companyId, ready } = useAnalyzerCompany();
  const [domain, setDomain] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDomain(domainOf(value)), 600);
    return () => clearTimeout(timer);
  }, [value]);
  const typed = domainOf(value);
  const query = useQuery({
    queryKey: keys.siteName(companyId, domain ?? ""),
    queryFn: () => analyzerApi.siteName(companyId, domain!),
    enabled: ready && Boolean(domain),
    staleTime: Infinity,
    retry: false,
  });
  // While the typed address and the looked-up one differ, the answer is not for this address yet.
  const current = typed !== null && typed === domain;
  return { domain: typed, loading: Boolean(typed) && (!current || query.isFetching), data: current ? query.data : undefined, error: current ? query.error : null };
}

/** Names already looked up for these domains, for saving with the study. */
export function useKnownSiteNames() {
  const { companyId } = useAnalyzerCompany();
  const qc = useQueryClient();
  return (domains: string[]) =>
    Object.fromEntries(
      domains
        .map((d) => [d, qc.getQueryData<{ name: string | null }>(keys.siteName(companyId, d))?.name] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    );
}

export function useAnalyzerCompany() {
  const { companyId, isReady } = useTenancyContext();
  return { companyId, ready: isReady && Boolean(companyId) };
}

export function useStudies() {
  const { companyId, ready } = useAnalyzerCompany();
  return useQuery({ queryKey: keys.list(companyId), queryFn: () => analyzerApi.list(companyId), enabled: ready, staleTime: 30_000, retry: false });
}

/** Polls every 4 seconds while a run is in progress. */
export function useStudy(id: string) {
  const { companyId, ready } = useAnalyzerCompany();
  return useQuery({
    queryKey: keys.study(companyId, id),
    queryFn: () => analyzerApi.get(companyId, id),
    enabled: ready && Boolean(id),
    retry: false,
    refetchInterval: (query) => (query.state.data?.latestRun?.status === "running" ? 4_000 : false),
  });
}

export function useCompanyClients() {
  const { companyId, ready } = useAnalyzerCompany();
  return useQuery({ queryKey: ["competitor-analyzer", companyId, "clients"], queryFn: () => clientsApi.list(companyId), enabled: ready, staleTime: 5 * 60_000, retry: false });
}

export function useStudyMutations() {
  const { companyId } = useAnalyzerCompany();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.all(companyId) });
  return {
    create: useMutation({ mutationFn: (body: Parameters<typeof analyzerApi.create>[1]) => analyzerApi.create(companyId, body), onSuccess: refresh }),
    update: useMutation({ mutationFn: (args: { id: string; body: Parameters<typeof analyzerApi.update>[2] }) => analyzerApi.update(companyId, args.id, args.body), onSuccess: refresh }),
    archive: useMutation({ mutationFn: (id: string) => analyzerApi.archive(companyId, id), onSuccess: refresh }),
    run: useMutation({ mutationFn: (id: string) => analyzerApi.run(companyId, id), onSuccess: refresh }),
    lookup: useMutation({ mutationFn: (q: string) => analyzerApi.lookup(companyId, q) }),
    download: useMutation({ mutationFn: (args: { id: string; lang?: "en" | "hi" }) => analyzerApi.downloadReport(companyId, args.id, args.lang) }),
    settings: useMutation({ mutationFn: (args: { id: string; body: Parameters<typeof analyzerApi.updateSettings>[2] }) => analyzerApi.updateSettings(companyId, args.id, args.body), onSuccess: refresh }),
    actionStatus: useMutation({ mutationFn: (args: { id: string; body: Parameters<typeof analyzerApi.setActionStatus>[2] }) => analyzerApi.setActionStatus(companyId, args.id, args.body), onSuccess: refresh }),
    actionTask: useMutation({ mutationFn: (args: { id: string; body: Parameters<typeof analyzerApi.createActionTask>[2] }) => analyzerApi.createActionTask(companyId, args.id, args.body), onSuccess: refresh }),
    emailReport: useMutation({ mutationFn: (args: { id: string; to: string[] }) => analyzerApi.emailReport(companyId, args.id, args.to) }),
  };
}
