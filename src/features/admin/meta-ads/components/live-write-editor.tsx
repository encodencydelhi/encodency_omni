"use client";

import Link from "next/link";
import { accountDisplayName } from "@/features/admin/meta-ads/account-name";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useMetaConnection } from "@/features/admin/meta/live/meta-hooks";
import { ApiError } from "@/types/api";
import { useAdsData } from "../data-source";
import { metaAdsApi } from "../live/meta-ads-api";
import { budgetInput, budgetMinor } from "../live/budget";
import { moneyPrecise } from "../format";
import { ADS_ROOT, AdsWorkspace } from "./workspace";
import { btn, btnPrimary } from "./ui";

type Mode = "campaign" | "adset" | "ad";
const input = "h-9 w-full rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function messageOf(error: unknown): string {
  return ApiError.isApiError(error) ? error.message : "Meta did not confirm the write.";
}

export function LiveMetaAdsWriteEditor() {
  const data = useAdsData();
  if (data.status === "loading") {
    return <div className="flex min-h-64 items-center justify-center text-xs text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Loading Meta Ads…</div>;
  }
  return <LiveMetaAdsWriteEditorReady />;
}

function LiveMetaAdsWriteEditorReady() {
  const router = useRouter();
  const params = useSearchParams();
  const data = useAdsData();
  const connection = useMetaConnection();
  const editingCampaign = data.getCampaign(params?.get("campaign") ?? "");
  const editingAdSet = data.getAdSet(params?.get("adset") ?? "");
  const editingAd = data.getAd(params?.get("ad") ?? "");
  const requested = params?.get("step");
  const mode: Mode = editingAd || requested === "ad" ? "ad" : editingAdSet || requested === "adset" ? "adset" : "campaign";
  const editing = editingCampaign && mode === "campaign" ? editingCampaign : editingAdSet && mode === "adset" ? editingAdSet : editingAd && mode === "ad" ? editingAd : null;
  const budgetEditable = mode !== "ad" && (!editing || ("budgetType" in editing && editing.budgetType === "Daily" && (mode === "campaign" ? editingCampaign?.budgetSource !== "Ad set budgets" : editingAdSet?.budgetSource === "Ad set budget")));
  const editingBudget = editing && "budget" in editing ? editing.budget : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [budget, setBudget] = useState(editingBudget ? budgetInput(editingBudget) : "50.00");
  const [objective, setObjective] = useState("OUTCOME_LEADS");
  const [campaignId, setCampaignId] = useState(params?.get("campaign") ?? "");
  const [adSetId, setAdSetId] = useState(params?.get("adset") ?? "");
  const [creativeId, setCreativeId] = useState(params?.get("creative") ?? "");
  const [country, setCountry] = useState("IN");
  const [optimizationGoal, setOptimizationGoal] = useState("LEAD_GENERATION");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey] = useState(() => `meta-${crypto.randomUUID()}`);

  const hasWritePermission = connection.grantedScopes.includes("ads_management");
  const account = data.accounts.find((item) => item.id === data.accountId) ?? null;
  const accountUsable = account?.status === "ACTIVE";
  const parents = useMemo(() => mode === "adset" ? data.campaigns : mode === "ad" ? data.adSets : [], [data.adSets, data.campaigns, mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data.accountId || !name.trim()) return;
    const dailyBudgetMinor = budgetMinor(budget);
    if (budgetEditable && dailyBudgetMinor === null) {
      toast.error("Enter a valid daily budget.");
      return;
    }
    if (editing && budgetEditable && dailyBudgetMinor !== editingBudget && !window.confirm(`Change the daily budget for “${name.trim()}” from ${moneyPrecise(editingBudget ?? 0)} to ${moneyPrecise(dailyBudgetMinor!)}? This changes the budget in Meta.`)) return;
    setSaving(true);
    try {
      if (editingCampaign && mode === "campaign") {
        await metaAdsApi.updateNamedBudget(connection.companyId, "campaign", editingCampaign.id, { adAccountId: data.accountId, name: name.trim(), ...(budgetEditable ? { dailyBudgetMinor: dailyBudgetMinor! } : {}) });
      } else if (editingAdSet && mode === "adset") {
        await metaAdsApi.updateNamedBudget(connection.companyId, "adset", editingAdSet.id, { adAccountId: data.accountId, name: name.trim(), ...(budgetEditable ? { dailyBudgetMinor: dailyBudgetMinor! } : {}) });
      } else if (editingAd && mode === "ad") {
        await metaAdsApi.updateAd(connection.companyId, editingAd.id, { adAccountId: data.accountId, name: name.trim() });
      } else if (mode === "campaign") {
        await metaAdsApi.createCampaign(connection.companyId, idempotencyKey, { adAccountId: data.accountId, name: name.trim(), objective, dailyBudgetMinor: dailyBudgetMinor!, specialAdCategories: [] });
      } else if (mode === "adset") {
        if (!campaignId) throw new Error("Select a campaign.");
        await metaAdsApi.createAdSet(connection.companyId, idempotencyKey, { adAccountId: data.accountId, campaignId, name: name.trim(), dailyBudgetMinor: dailyBudgetMinor!, billingEvent: "IMPRESSIONS", optimizationGoal, targeting: { geo_locations: { countries: [country.toUpperCase()] } } });
      } else {
        if (!adSetId || !creativeId) throw new Error("Select an ad set and an existing Meta creative.");
        await metaAdsApi.createAd(connection.companyId, idempotencyKey, { adAccountId: data.accountId, adSetId, creativeId, name: name.trim() });
      }
      toast.success(editing ? `${name.trim()} updated in Meta.` : `${name.trim()} created in Meta as PAUSED.`);
      data.refresh();
      router.push(`${ADS_ROOT}/${mode === "campaign" ? "campaigns" : mode === "adset" ? "adsets" : "ads"}`);
    } catch (error) {
      toast.error(error instanceof Error && !ApiError.isApiError(error) ? error.message : messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdsWorkspace showDateRange={false} actions={<span />}>
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">{editing ? `Edit ${mode === "adset" ? "ad set" : mode}` : `Create ${mode === "adset" ? "ad set" : mode}`}</h1>
            <p className="mt-0.5 text-xs text-slate-600">Creates and edits the selected item directly through Meta Marketing API.</p>
          </div>
          <Link href={`${ADS_ROOT}/${mode === "campaign" ? "campaigns" : mode === "adset" ? "adsets" : "ads"}`} className={btn}><ArrowLeft className="size-3.5" />Back</Link>
        </div>

        {!hasWritePermission && (
          <div className="flex gap-2 rounded-sm border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>The connected token lacks <code>ads_management</code>. Reconnect Meta and grant <code>ads_management</code>; production users require Meta App Review for this permission.</p>
          </div>
        )}
        {account && !accountUsable && (
          <div className="flex gap-2 rounded-sm border border-red-300 bg-red-50 p-3 text-xs text-red-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Ad account {accountDisplayName(account)} is not ACTIVE and cannot accept writes. Resolve its status in Meta Ads Manager.</p></div>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs text-slate-600"><ShieldCheck className="size-4 text-blue-600" />New items are always created PAUSED. Activation requires a separate budget confirmation.</div>
          <Field label="Ad account"><input className={input} value={account ? `${accountDisplayName(account)} (${account.id})` : "No usable ad account"} disabled /></Field>
          <Field label="Name"><input className={input} value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required /></Field>

          {mode === "campaign" && !editing && <Field label="Objective"><select className={input} value={objective} onChange={(event) => setObjective(event.target.value)}><option value="OUTCOME_LEADS">Leads</option><option value="OUTCOME_TRAFFIC">Traffic</option><option value="OUTCOME_ENGAGEMENT">Engagement</option><option value="OUTCOME_AWARENESS">Awareness</option><option value="OUTCOME_SALES">Sales</option></select></Field>}
          {mode === "adset" && !editing && <><Field label="Campaign"><select className={input} value={campaignId} onChange={(event) => setCampaignId(event.target.value)} required><option value="">Select campaign</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Optimization"><select className={input} value={optimizationGoal} onChange={(event) => setOptimizationGoal(event.target.value)}><option value="LEAD_GENERATION">Lead generation</option><option value="LINK_CLICKS">Link clicks</option><option value="LANDING_PAGE_VIEWS">Landing-page views</option><option value="REACH">Reach</option></select></Field><Field label="Country code"><input className={input} value={country} onChange={(event) => setCountry(event.target.value.slice(0, 2))} minLength={2} maxLength={2} required /></Field></div></>}
          {mode === "ad" && !editing && <><Field label="Ad set"><select className={input} value={adSetId} onChange={(event) => setAdSetId(event.target.value)} required><option value="">Select ad set</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Existing Meta creative"><select className={input} value={creativeId} onChange={(event) => setCreativeId(event.target.value)} required><option value="">Select creative</option>{data.creatives.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">Creative creation is not simulated here; select a real creative already returned by Meta.</span></Field></>}
          {budgetEditable && <Field label="Daily budget (account currency)"><input className={input} type="number" min="0.01" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} required /></Field>}

          {editing && mode !== "ad" && !budgetEditable && <p className="rounded-md bg-blue-50 p-2 text-[11px] text-blue-800">This Budget Is Inherited Or Uses A Lifetime Schedule. Rename Here; Manage Its Budget On The Owning Entity In Meta Ads Manager.</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><Link href={`${ADS_ROOT}/${mode === "campaign" ? "campaigns" : mode === "adset" ? "adsets" : "ads"}`} className={btn}>Cancel</Link><button className={btnPrimary} disabled={saving || !hasWritePermission || !accountUsable || !name.trim()}>{saving && <Loader2 className="size-3.5 animate-spin" />}{editing ? "Save changes" : "Create paused"}</button></div>
        </form>
      </div>
    </AdsWorkspace>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[11px] font-semibold text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>;
}
