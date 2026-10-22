"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { clientsApi } from "@/features/clients/data/clients-api";
import { analyzerApi } from "./api";

const keys = {
  all: (companyId: string) => ["competitor-analyzer", companyId] as const,
  list: (companyId: string) => ["competitor-analyzer", companyId, "list"] as const,
  study: (companyId: string, id: string) => ["competitor-analyzer", companyId, "study", id] as const,
};

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
    download: useMutation({ mutationFn: (id: string) => analyzerApi.downloadReport(companyId, id) }),
  };
}
