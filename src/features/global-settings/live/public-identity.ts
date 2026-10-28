"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AssetValue, SettingValues } from "../data/types";

export function usePublicIdentity() {
  return useQuery({ queryKey: ["global-settings", "public-identity"], queryFn: () => apiClient.request<SettingValues>({ method: "GET", path: "/platform/identity" }), staleTime: 15_000, retry: false });
}
/** The maintenance announcement meant for companies or the public (empty when there is none). */
export function usePublicAnnouncement() {
  return useQuery({ queryKey: ["global-settings", "public-announcement"], queryFn: () => apiClient.request<SettingValues>({ method: "GET", path: "/platform/announcement" }), staleTime: 30_000, refetchInterval: 60_000, retry: false });
}
export function publicAsset(values: SettingValues | undefined, kind: string): AssetValue | undefined {
  return values?.[`identity.branding.${kind}`] as AssetValue | undefined;
}
