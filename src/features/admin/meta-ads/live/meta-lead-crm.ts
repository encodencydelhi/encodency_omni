"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { useAdsData } from "../data-source";
import type { Lead } from "../types";

export function useMetaLeadCrm() {
  const router = useRouter();
  const { accountId } = useAdsData();
  const [busy, setBusy] = useState(false);
  async function open(leads: Lead[]) {
    const clientId = getStoredClientId();
    if (busy || !leads.length) return;
    if (!clientId || !accountId) { toast.error("Select A Client And A Linked Ad Account First."); return; }
    if (!window.confirm(`Open ${leads.length === 1 ? leads[0]!.name : `${leads.length} Leads`} In CRM? Missing CRM Records Will Be Imported For The Selected Client. Existing Records Will Be Reused.`)) return;
    setBusy(true);
    try {
      for (const lead of leads) await apiClient.request({ method: "POST", path: `/integrations/meta-ads/leads/${encodeURIComponent(lead.id)}/crm`, headers: companyScopeHeaders(getStoredCompanyId(), { "x-client-id": clientId }), body: { adAccountId: accountId } });
      toast.success("Leads Available In CRM", { description: "Assign Owners, Update Stages And Save Notes In CRM." });
      router.push("/admin/crm/leads");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Lead Could Not Be Imported. Check Client Account Linking In Meta Settings."); } finally { setBusy(false); }
  }
  return { open, busy };
}
