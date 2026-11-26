"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { btnPrimary, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import { InlineNotice, Pill, Section } from "../ui";

/**
 * Lead auto-import: which of the selected Client's Facebook Pages send new Lead Ads leads straight into the CRM
 * (Meta's leadgen webhook), with a button to switch a Page on. A polling backstop also picks up leads a webhook missed.
 */
interface LeadPage { mappingId: string; pageId: string; name: string | null; subscribed: boolean | null; problem: string | null }
interface LeadPages { ingestionEnabled: boolean; pollingEnabled: boolean; items: LeadPage[] }

const base = "/integrations/meta-ads/lead-deliveries/pages";
const headers = () => {
  const client = getStoredClientId();
  return companyScopeHeaders(getStoredCompanyId(), client ? { "x-client-id": client } : {});
};
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : "Something went wrong. Please try again.");
const PROBLEM: Record<string, string> = {
  reconnect_required: "Reconnect Meta",
  page_access_required: "The Meta login has no role on this Page",
  permission_denied: "Permission missing (pages_manage_metadata)",
  rate_limited: "Meta is limiting requests; try later",
};

export function LeadAutoImportSection() {
  const queryClient = useQueryClient();
  const pages = useQuery({ queryKey: ["meta-lead-pages", getStoredCompanyId(), getStoredClientId()], queryFn: () => apiClient.request<LeadPages>({ method: "GET", path: base, headers: headers() }), retry: false });
  const subscribe = useMutation({
    mutationFn: (mappingId: string) => apiClient.request<{ subscribed: true }>({ method: "POST", path: `${base}/${mappingId}/subscribe`, headers: headers() }),
    onSuccess: () => { toast.success("This Page now sends new leads to Media360."); void queryClient.invalidateQueries({ queryKey: ["meta-lead-pages"] }); },
    onError: (error) => toast.error(message(error)),
  });
  return (
    <Section title="Lead auto-import" description="New Lead Ads leads from these Pages go straight into this Client's CRM leads.">
      {pages.isError && <InlineNotice tone="amber" title="Lead auto-import is not available here">{message(pages.error)}</InlineNotice>}
      {pages.data && !pages.data.ingestionEnabled && (
        <InlineNotice tone="amber" title="Automatic lead import is switched off on the server">Pages can be prepared here; leads start arriving once the platform team turns automatic import on.</InlineNotice>
      )}
      {pages.data && pages.data.items.length === 0 && <p className="text-xs text-slate-500">No Facebook Page is linked to this Client yet.</p>}
      {pages.data && pages.data.items.length > 0 && (
        <TableShell>
          <thead><tr><Th>Page</Th><Th>Lead auto-import</Th><Th /></tr></thead>
          <tbody>
            {pages.data.items.map((page) => (
              <Tr key={page.mappingId}>
                <Td><p className="font-semibold text-slate-900">{page.name ?? page.pageId}</p><p className="text-[11px] text-slate-500">{page.pageId}</p></Td>
                <Td>{page.problem ? <Pill tone="amber">{PROBLEM[page.problem] ?? page.problem.replace(/_/g, " ")}</Pill> : page.subscribed ? <Pill tone="green">On</Pill> : <Pill tone="slate">Off</Pill>}</Td>
                <Td>{!page.subscribed && !page.problem?.startsWith("reconnect") && <button type="button" className={btnPrimary} disabled={subscribe.isPending} onClick={() => subscribe.mutate(page.mappingId)}>Turn on</button>}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {pages.data?.pollingEnabled && pages.data.ingestionEnabled && <p className="mt-2 text-[11px] text-slate-500">Every 15 minutes Media360 also checks these Pages for leads a webhook may have missed.</p>}
    </Section>
  );
}
