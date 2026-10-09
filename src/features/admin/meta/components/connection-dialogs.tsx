"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/utils/cn";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { integrationsApi, type BackendResourceType, type DiscoveredResource } from "@/features/admin/integrations/live/integrations-api";
import { btn, btnPrimary } from "@/features/admin/meta-ads/components/ui";
import { usePagination } from "@/features/admin/meta-ads/use-filters";
import { PagedFooter } from "@/features/admin/meta-ads/components/ui";
import { useMeta } from "../connection-context";
import { META_KEY, messageOf } from "../live/meta-hooks";
import { DetailDialog, META_ROOT, Pill } from "../ui";

/* ------------------------------------------------------------------ */
/* Disconnect                                                           */
/* ------------------------------------------------------------------ */

export function DisconnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const meta = useMeta();
  const mapped = (meta.meta?.mappedResourceCount ?? 0) + (meta.instagram?.mappedResourceCount ?? 0);
  const busy = meta.busy === "disconnect";
  return (
    <AlertDialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-rose-600" />
            Disconnect Meta?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-xs leading-relaxed text-slate-600">
              <p>OmniPlatform will forget the Meta login{meta.connection?.accountName ? ` (${meta.connection.accountName})` : ""} for this Company.</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Meta Ads, Facebook and Instagram stop loading until you connect again.</li>
                <li>
                  Facebook Pages and Instagram accounts mapped to Clients are unlinked
                  {mapped > 0 ? ` (${mapped} mapped for this Client)` : ""}, so posts scheduled to them will not publish.
                </li>
                <li>Nothing is deleted or changed inside Meta: your ads, Pages and posts stay as they are.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep connected</AlertDialogCancel>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (await meta.disconnect()) onOpenChange(false);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Disconnect Meta
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Map a Page / Instagram account to the selected Client                 */
/* ------------------------------------------------------------------ */

const KIND_COPY: Record<"FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT", { noun: string; icon: typeof FaFacebookF }> = {
  FACEBOOK_PAGE: { noun: "Facebook Page", icon: FaFacebookF },
  INSTAGRAM_ACCOUNT: { noun: "Instagram account", icon: FaInstagram },
};

export function MapResourceDialog({ open, onOpenChange, kind }: { open: boolean; onOpenChange: (open: boolean) => void; kind: Extract<BackendResourceType, "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT"> }) {
  const meta = useMeta();
  const queryClient = useQueryClient();
  const integrationId = meta.connection?.integrationId ?? null;
  const copy = KIND_COPY[kind];
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const discovery = useQuery({
    queryKey: [META_KEY, meta.companyId, "discover", integrationId],
    enabled: open && Boolean(meta.companyId && integrationId),
    queryFn: ({ signal }) => integrationsApi.discoverResources(meta.companyId, integrationId!, signal),
    staleTime: 30_000,
    retry: false,
  });

  const alreadyMapped = useMemo(() => new Set([...(meta.meta?.resources ?? []), ...(meta.instagram?.resources ?? [])].map((resource) => `${resource.resourceType}:${resource.externalResourceId}`)), [meta.meta, meta.instagram]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (discovery.data ?? []).filter((item) => item.resourceType === kind && (!q || item.name.toLowerCase().includes(q) || item.externalResourceId.includes(q)));
  }, [discovery.data, kind, search]);
  const paged = usePagination(rows, 6);
  const total = (discovery.data ?? []).filter((item) => item.resourceType === kind).length;

  const map = useMutation({
    mutationFn: (resource: DiscoveredResource) => integrationsApi.mapResource(meta.companyId, integrationId!, { clientId: meta.clientId, externalResourceId: resource.externalResourceId, resourceType: resource.resourceType }),
    onSuccess: async (_data, resource) => {
      toast.success(`${resource.name} is now linked to this Client.`);
      meta.refresh();
      await queryClient.invalidateQueries({ queryKey: [META_KEY] });
      setPicked(null);
      onOpenChange(false);
    },
    onError: (error) => toast.error(messageOf(error, "Unable to link that account.")),
  });

  const chosen = rows.find((item) => item.externalResourceId === picked) ?? null;

  return (
    <DetailDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("");
          setPicked(null);
        }
        onOpenChange(next);
      }}
      title={`Link a ${copy.noun} to this Client`}
      description="Only accounts this Meta login manages are listed. Linking lets this Client publish and report on it."
      footer={
        <>
          <button type="button" className={btn} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} disabled={!chosen || map.isPending} onClick={() => chosen && map.mutate(chosen)}>
            {map.isPending && <Loader2 className="size-4 animate-spin" />}
            Link {chosen ? chosen.name : copy.noun}
          </button>
        </>
      }
    >
      {discovery.isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading accounts">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : discovery.isError ? (
        <p className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{messageOf(discovery.error, "Unable to load accounts from Meta.")}</p>
      ) : total === 0 ? (
        <div className="space-y-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-semibold">This Meta login does not manage any {copy.noun}.</p>
          <p className="leading-relaxed">
            Meta only lists {kind === "FACEBOOK_PAGE" ? "Pages" : "Instagram accounts linked to a Page"} the logged-in person has a role on. Give this login access to the Page in Meta Business Settings, then reconnect and tick the Page in Meta&apos;s permission dialog.
          </p>
          <Link href={`${META_ROOT}/settings`} className="inline-block font-semibold underline">
            Open Meta settings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${copy.noun}s…`}
              aria-label={`Search ${copy.noun}s`}
              className="h-9 w-full rounded-sm border border-slate-300 bg-white pl-10 pr-3 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-xs font-medium text-slate-500">No {copy.noun} matches “{search}”.</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-sm border border-slate-200">
              {paged.visible.map((item) => {
                const isMapped = alreadyMapped.has(`${item.resourceType}:${item.externalResourceId}`);
                const selected = picked === item.externalResourceId;
                return (
                  <li key={`${item.resourceType}:${item.externalResourceId}`}>
                    <button
                      type="button"
                      disabled={isMapped}
                      onClick={() => setPicked(item.externalResourceId)}
                      className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition", selected ? "bg-blue-50" : "hover:bg-slate-50", isMapped && "cursor-not-allowed opacity-60")}
                    >
                      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>{selected && <Check className="size-3" />}</span>
                      <copy.icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{item.name}</span>
                        <span className="block text-[10.5px] font-medium text-slate-500">ID {item.externalResourceId}</span>
                      </span>
                      {isMapped && <Pill tone="green">Linked</Pill>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <PagedFooter paged={paged} noun={`${copy.noun}s`} />
        </div>
      )}
    </DetailDialog>
  );
}
