"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { setMetaCompanyView } from "@/features/admin/meta/live/meta-scope";
import { accountDisplayName } from "../account-name";
import type { ApiAccountsResponse } from "../live/meta-ads-api";

/** Account ownership setup belongs in Settings, never in every page toolbar. */
export function MetaScopeBar() {
  const { user } = useAuth();
  const { companyId, clientId } = useTenancyContext();
  const { Clients } = useAdminContext();
  const [chosen, setChosen] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ companyId: string; clientId: string; clientName: string; accountId: string; accountName: string; label: string } | null>(null);
  const cache = useQueryClient();
  const role = user?.memberships?.find(m => m.companyId === companyId)?.systemRole;
  const admin = role === "OWNER" || role === "ADMIN";
  const accounts = useQuery({ queryKey: ["meta-account-setup", companyId], enabled: admin && Boolean(companyId), queryFn: ({ signal }) => apiClient.request<ApiAccountsResponse>({ method: "GET", path: "/integrations/meta-ads/accounts", headers: companyScopeHeaders(companyId), signal }), staleTime: 60_000, retry: false });
  const accountId = chosen || accounts.data?.items[0]?.id;
  function requestLink() {
    const account = accounts.data?.items.find(item => item.id === accountId);
    if (!companyId || !clientId || !account) return;
    setConfirmation({ companyId, clientId, clientName: Clients.find(client => client.id === clientId)?.name ?? clientId, accountId: account.id, accountName: accountDisplayName(account), label: label.trim() });
  }
  async function link() {
    if (!confirmation || busy) return;
    const target = confirmation;
    setBusy(true);
    try {
      await apiClient.request({ method: "POST", path: "/integrations/meta-ads/account-assignment", headers: companyScopeHeaders(target.companyId), body: { adAccountId: target.accountId, clientId: target.clientId, ...(target.label ? { label: target.label } : {}) } });
      setMetaCompanyView(false);
      await cache.invalidateQueries({ queryKey: ["meta-ads", target.companyId] });
      await cache.invalidateQueries({ queryKey: ["meta-hub"] });
      toast.success(`Ad account linked to ${target.clientName}`);
      setConfirmation(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Account Could Not Be Linked"); } finally { setBusy(false); }
  }
  if (!admin) return null;
  return <><section className="mb-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 capitalize"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Link2 className="size-4 text-blue-600" />Link An Ad Account</p><p className="mt-1 text-[11px] text-slate-500">Choose The Account That Belongs To The Currently Selected Client. Add A Workspace Label When Meta Returns A Numeric Name. The Original Meta Name Is Preserved.</p></div><div className="flex gap-2"><select aria-label="Ad account to link" className="h-8 max-w-56 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" value={accountId ?? ""} onChange={e => setChosen(e.target.value)}>{accounts.data?.items.map(account => <option key={account.id} value={account.id}>{accountDisplayName(account)} ({account.id})</option>)}</select><input aria-label="Workspace Account Label" placeholder="Account Label (Optional)" maxLength={100} value={label} onChange={e => setLabel(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" /><button onClick={requestLink} disabled={busy || !clientId || !accountId} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Linking..." : "Link To Current Client"}</button></div></div>{accounts.isError && <p className="mt-2 text-[11px] text-amber-800">Accounts Could Not Be Loaded. Reconnect Meta Or Try Again.</p>}</section>
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
        <AlertDialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Link2 className="size-5" aria-hidden="true" /></span>
          <AlertDialogTitle>Link ad account to client?</AlertDialogTitle>
          <AlertDialogDescription>Confirm the account and client below before linking.</AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div><dt className="text-xs text-slate-500">Ad account</dt><dd className="mt-1 break-words font-semibold text-slate-900">{confirmation?.accountName}</dd><dd className="mt-0.5 break-all text-xs text-slate-500">{confirmation?.accountId}</dd></div>
          <div><dt className="text-xs text-slate-500">Client</dt><dd className="mt-1 break-words font-semibold text-slate-900">{confirmation?.clientName}</dd></div>
          {confirmation?.label && <div><dt className="text-xs text-slate-500">Workspace label</dt><dd className="mt-1 break-words font-medium text-slate-900">{confirmation.label}</dd></div>}
        </dl>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button onClick={() => void link()} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Linking..." : "Confirm link"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
