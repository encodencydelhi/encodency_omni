"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, ChevronDown, ChevronRight, Database, Eye, Loader2, MousePointerClick, RefreshCcw, Target, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type LinkedInAdPeriod, type LinkedInAdsResponse, type LinkedInCampaignRow, type LinkedInFeedState, type LinkedInLeadsResponse } from "../../integrations/live/integrations-api";

/** Start/pause and daily budget for one campaign. Nothing is sent to LinkedIn until the second (confirm) click. */
function CampaignControls({ row, onDone }: { row: LinkedInCampaignRow; onDone: () => void }) {
  const { companyId, clientId } = useTenancyContext();
  const canSwitch = ["ACTIVE", "PAUSED", "DRAFT"].includes(row.status);
  const [budget, setBudget] = useState(row.dailyBudget ? String(row.dailyBudget) : "");
  const [pending, setPending] = useState<null | { label: string; body: { status?: "ACTIVE" | "PAUSED"; dailyBudget?: number } }>(null);
  const [busy, setBusy] = useState(false);
  const ask = (label: string, body: { status?: "ACTIVE" | "PAUSED"; dailyBudget?: number }) => setPending({ label, body });
  const run = async () => {
    if (!companyId || !clientId || !pending) return;
    setBusy(true);
    try {
      await integrationsApi.updateLinkedInCampaign(companyId, clientId, row.id, { accountId: row.accountId, ...pending.body, confirm: true });
      toast.success(`LinkedIn updated: ${pending.label}.`);
      setPending(null); onDone();
    } catch (cause: unknown) { toast.error(cause instanceof Error ? cause.message : "LinkedIn did not accept the change."); }
    finally { setBusy(false); }
  };
  const amount = Number(budget);
  return <div className="flex flex-wrap items-center gap-3">
    {pending ? <>
      <span className="text-[11px] font-semibold text-amber-800">Confirm on LinkedIn: {pending.label}?</span>
      <button type="button" disabled={busy} onClick={() => void run()} className="inline-flex h-8 items-center bg-[#0A66C2] px-3 text-[10.5px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Yes, apply"}</button>
      <button type="button" disabled={busy} onClick={() => setPending(null)} className="inline-flex h-8 items-center border border-[#DDE4ED] bg-white px-3 text-[10.5px] font-semibold text-[#253352]">Cancel</button>
    </> : <>
      {canSwitch ? (row.status === "ACTIVE"
        ? <button type="button" onClick={() => ask(`pause “${row.name}”`, { status: "PAUSED" })} className="inline-flex h-8 items-center border border-amber-300 bg-white px-3 text-[10.5px] font-semibold text-amber-800">Pause campaign</button>
        : <button type="button" onClick={() => ask(`start “${row.name}” (it will spend budget)`, { status: "ACTIVE" })} className="inline-flex h-8 items-center border border-emerald-300 bg-white px-3 text-[10.5px] font-semibold text-emerald-800">Start campaign</button>)
        : <span className="text-[10.5px] text-[#687797]">A {titleCase(row.status).toLowerCase()} campaign cannot be started or paused.</span>}
      <label className="text-[10.5px] font-semibold text-[#52617D]" htmlFor={`budget-${row.id}`}>Daily budget ({row.currency})</label>
      <input id={`budget-${row.id}`} type="number" min={1} step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="h-8 w-28 border border-[#DDE4ED] px-2 text-[11px]" />
      <button type="button" disabled={!(amount > 0) || amount === row.dailyBudget} onClick={() => ask(`set the daily budget to ${money(amount, row.currency)}`, { dailyBudget: amount })} className="inline-flex h-8 items-center border border-[#DDE4ED] bg-white px-3 text-[10.5px] font-semibold text-[#253352] disabled:opacity-40">Change budget</button>
    </>}
  </div>;
}

const PERIODS: Array<[LinkedInAdPeriod, string]> = [["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"], ["365d", "Last 365 days"]];
const number = (value: number) => value.toLocaleString("en-IN");
const money = (value: number | null, currency: string | null) =>
  value === null ? "—" : currency ? new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value) : number(Math.round(value * 100) / 100);
const percent = (value: number | null) => (value === null ? "—" : `${value.toFixed(2)}%`);
const date = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
/** Local calendar day as YYYY-MM-DD, offset by whole days from today. */
const isoDay = (offset: number) => { const day = new Date(); day.setDate(day.getDate() + offset); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`; };
const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Notice({ state, reason }: { state: LinkedInFeedState; reason: string | null }) {
  if (state === "live") return null;
  const warn = state === "permission_required" || state === "reconnect_required" || state === "rate_limited";
  const heading = state === "permission_required" ? "Additional LinkedIn access required" : state === "reconnect_required" ? "Reconnect LinkedIn" : state === "rate_limited" ? "LinkedIn is limiting requests" : state === "empty" ? "Nothing to show yet" : "Data temporarily unavailable";
  return <div className={`border-l-4 px-5 py-4 ${warn ? "border-amber-500 bg-amber-50" : "border-[#94A3B8] bg-[#F8FAFC]"}`} role="status">
    <div className="flex items-start gap-3"><AlertTriangle className={`mt-0.5 size-4 shrink-0 ${warn ? "text-amber-600" : "text-[#64748B]"}`} /><div><p className="text-[12px] font-semibold text-[#172044]">{heading}</p><p className="mt-1 text-[11px] leading-5 text-[#64748B]">{reason || "LinkedIn returned no records."}</p></div></div>
  </div>;
}

export function Kpis({ items }: { items: Array<{ label: string; value: string; icon: typeof Eye; tone: string }> }) {
  return <div className="grid border-y border-[#DDE4ED] bg-white sm:grid-cols-2 lg:grid-cols-4">{items.map((item, index) => {
    const Icon = item.icon;
    return <div key={item.label} className={`px-5 py-4 ${index % 4 ? "sm:border-l sm:border-[#E8EDF3]" : ""} ${index > 3 ? "border-t border-[#E8EDF3]" : ""}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9.5px] font-semibold uppercase text-[#7B89A4]">{item.label}</p><p className="mt-2 text-[20px] font-bold text-[#172044]">{item.value}</p></div><span className={`grid size-8 place-items-center ${item.tone}`}><Icon className="size-4" /></span></div>
    </div>;
  })}</div>;
}

export function Loading({ text }: { text: string }) {
  return <div className="flex min-h-60 items-center justify-center bg-white"><div className="text-center"><Loader2 className="mx-auto size-5 animate-spin text-[#0A66C2]" /><p className="mt-3 text-[11px] text-[#687797]">{text}</p></div></div>;
}

export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="border-l-4 border-red-500 bg-red-50 px-5 py-4"><p className="text-[12px] font-semibold text-red-800">LinkedIn data could not be loaded</p><p className="mt-1 text-[11px] text-red-700">{message}</p><button type="button" onClick={retry} className="mt-3 inline-flex h-8 items-center gap-2 border border-red-200 bg-white px-3 text-[10.5px] font-semibold text-red-700"><RefreshCcw className="size-3" /> Retry</button></div>;
}

/** LinkedIn Ads: only the ad accounts that advertise for this Client's company page. Read-only reporting. */
export function LinkedInCampaignsPanel() {
  const { companyId, clientId } = useTenancyContext();
  const [period, setPeriod] = useState<LinkedInAdPeriod>("30d");
  /** "custom" shows the date pickers; the range only loads after Apply. */
  const [mode, setMode] = useState<LinkedInAdPeriod | "custom">("30d");
  const [draft, setDraft] = useState({ from: isoDay(-29), to: isoDay(0) });
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [data, setData] = useState<LinkedInAdsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState<string | null>(null);
  const custom = mode === "custom" ? applied ?? undefined : undefined;

  /** Manual refresh (button). The first load and range changes run in the effect below. */
  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true); setError(null);
    try { setData(await integrationsApi.getLinkedInAds(companyId, clientId, period, undefined, custom)); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Could not load LinkedIn campaigns."); }
    finally { setLoading(false); }
  }, [companyId, clientId, period, custom]);
  useEffect(() => {
    if (!companyId || !clientId || (mode === "custom" && !applied)) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInAds(companyId, clientId, period, controller.signal, mode === "custom" ? applied ?? undefined : undefined)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load LinkedIn campaigns."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, period, mode, applied]);

  const choose = (value: string) => {
    if (value === "custom") { setMode("custom"); return; }
    setLoading(true); setMode(value as LinkedInAdPeriod); setPeriod(value as LinkedInAdPeriod); setApplied(null);
  };
  const apply = () => {
    if (!draft.from || !draft.to) { setError("Choose both dates."); return; }
    if (draft.from > draft.to) { setError("The start date must be on or before the end date."); return; }
    setLoading(true); setError(null); setApplied({ ...draft });
  };
  const rangeLabel = mode === "custom" && applied ? `${applied.from} to ${applied.to}` : PERIODS.find(([value]) => value === period)?.[1].toLowerCase();

  const totals = data?.totals;
  const currency = totals?.currency ?? null;
  return <div className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE4ED] px-5 py-3">
      <div className="text-[10.5px] text-[#687797]">{data?.accounts.length ? <>Ad accounts: {data.accounts.map((account) => <span key={account.id} className="mr-2 inline-flex items-center gap-1 border border-[#C8DDF0] bg-[#F1F7FC] px-2 py-0.5 font-semibold text-[#0A66C2]">{account.name} · {account.currency} · {titleCase(account.status)}</span>)}</> : "Ad accounts linked to this company page"}</div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="linkedin-ads-period">Period</label>
        <select id="linkedin-ads-period" value={mode} onChange={(event) => choose(event.target.value)} className="h-8 border border-[#DDE4ED] bg-white px-2 text-[11px] text-[#253352]">{PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="custom">Custom range…</option></select>
        {mode === "custom" && <>
          <label className="sr-only" htmlFor="linkedin-ads-from">From</label>
          <input id="linkedin-ads-from" type="date" value={draft.from} min={isoDay(-730)} max={isoDay(0)} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} className="h-8 border border-[#DDE4ED] px-2 text-[11px] text-[#253352]" />
          <span className="text-[10px] text-[#7B89A4]">to</span>
          <label className="sr-only" htmlFor="linkedin-ads-to">To</label>
          <input id="linkedin-ads-to" type="date" value={draft.to} min={isoDay(-730)} max={isoDay(0)} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} className="h-8 border border-[#DDE4ED] px-2 text-[11px] text-[#253352]" />
          <button type="button" onClick={apply} className="inline-flex h-8 items-center bg-[#0A66C2] px-3 text-[10.5px] font-semibold text-white hover:bg-[#004182]">Apply</button>
        </>}
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#DDE4ED] px-3 text-[10.5px] font-semibold text-[#253352] hover:bg-[#F8FAFC] disabled:opacity-60"><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
    </div>
    {error && data && <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-[11px] text-red-700" role="alert">{error}</p>}
    {mode === "custom" && !applied && !data ? <p className="px-5 py-10 text-center text-[11px] text-[#687797]">Choose a start and end date (up to 366 days, within the last two years) and press Apply.</p> : loading && !data ? <Loading text="Loading LinkedIn campaigns..." /> : error && !data ? <LoadError message={error} retry={() => void load()} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {data.state === "live" && totals && <Kpis items={[
        { label: "Spend", value: totals.spendComparable ? money(totals.spend, currency) : "Mixed currencies", icon: Wallet, tone: "bg-[#EAF3FB] text-[#0A66C2]" },
        { label: "Impressions", value: number(totals.impressions), icon: Eye, tone: "bg-[#F1ECFE] text-[#7C3AED]" },
        { label: "Clicks · CTR", value: `${number(totals.clicks)} · ${percent(totals.ctr)}`, icon: MousePointerClick, tone: "bg-[#FFF4DE] text-[#D97706]" },
        { label: "Leads · CPL", value: `${number(totals.leads)} · ${totals.spendComparable ? money(totals.cpl, currency) : "—"}`, icon: Target, tone: "bg-[#E5F8F1] text-[#059669]" },
      ]} />}
      {data.state === "live" && (data.campaigns.length === 0
        ? <div className="px-5 py-12 text-center"><BarChart3 className="mx-auto size-6 text-[#A8B4C7]" /><p className="mt-3 text-[12px] font-semibold text-[#52617D]">No campaigns in these ad accounts</p><p className="mt-1 text-[10.5px] text-[#8A97AF]">Campaigns created in LinkedIn Campaign Manager appear here with their results.</p></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]">
          <th className="px-5 py-3">Campaign</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Spend</th><th className="px-3 py-3 text-right">Impressions</th><th className="px-3 py-3 text-right">Clicks</th><th className="px-3 py-3 text-right">CTR</th><th className="px-3 py-3 text-right">Leads</th><th className="px-3 py-3 text-right">CPL</th><th className="px-5 py-3 text-right">Actions</th>
        </tr></thead><tbody className="divide-y divide-[#EDF1F5]">{data.campaigns.map((row) => <Fragment key={`${row.accountId}:${row.id}`}><tr>
          <td className="px-5 py-3"><p className="text-[11.5px] font-semibold text-[#253352]">{row.name}</p><p className="mt-0.5 text-[9.5px] text-[#8A97AF]">{row.accountName}{row.objective ? ` · ${titleCase(row.objective)}` : ""}</p></td>
          <td className={`px-3 py-3 text-[10.5px] font-semibold ${row.status === "ACTIVE" ? "text-emerald-700" : "text-[#64748B]"}`}>{titleCase(row.status)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{money(row.spend, row.currency)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{number(row.impressions)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{number(row.clicks)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{percent(row.ctr)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{number(row.leads)}</td>
          <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{money(row.cpl, row.currency)}</td>
          <td className="px-5 py-3 text-right"><button type="button" onClick={() => setManage(manage === row.id ? null : row.id)} className="text-[10.5px] font-semibold text-[#0A66C2] hover:underline">{manage === row.id ? "Close" : "Manage"}</button></td>
        </tr>
        {manage === row.id && <tr><td colSpan={9} className="bg-[#F8FAFC] px-5 py-3"><CampaignControls row={row} onDone={() => { setManage(null); void load(); }} /><p className="mt-2 text-[10px] text-[#8A97AF]">Changes go straight to LinkedIn Campaign Manager and are recorded in the audit log. Current daily budget: {money(row.dailyBudget, row.currency)}.</p></td></tr>}
        </Fragment>)}</tbody></table></div>)}
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">
        Results come from LinkedIn Campaign Manager for {rangeLabel}. Leads are LinkedIn Lead Gen form submissions from ads.
        {data.otherAccounts > 0 && ` ${data.otherAccounts} other ad account(s) on this LinkedIn login belong to other company pages and are hidden.`}
        {data.partial && " Some campaign lists were long; the first 500 per account are shown."}
      </p>
    </>}
  </div>;
}

/** LinkedIn Lead Sync: form responses for this Client's page and its ad accounts, with a repeat-safe copy into the CRM. */
export function LinkedInLeadsPanel() {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<LinkedInLeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true); setError(null);
    try { setData(await integrationsApi.getLinkedInLeads(companyId, clientId)); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Could not load LinkedIn leads."); }
    finally { setLoading(false); }
  }, [companyId, clientId]);
  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    integrationsApi.getLinkedInLeads(companyId, clientId, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load LinkedIn leads."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId]);

  const sync = async () => {
    if (!companyId || !clientId) return;
    setSyncing(true);
    try {
      const result = await integrationsApi.syncLinkedInLeads(companyId, clientId);
      toast.success(result.imported ? `${result.imported} new lead(s) added to the CRM.` : "The CRM already has every LinkedIn lead.");
      await load();
    } catch (cause: unknown) { toast.error(cause instanceof Error ? cause.message : "Could not copy LinkedIn leads into the CRM."); }
    finally { setSyncing(false); }
  };

  return <div className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE4ED] px-5 py-3">
      <p className="text-[10.5px] text-[#687797]">{data ? <>Automatic CRM sync: <span className={`font-semibold ${data.autoSync ? "text-emerald-700" : "text-[#64748B]"}`}>{data.autoSync ? "On (every 15 minutes)" : "Off"}</span></> : "LinkedIn Lead Gen forms for this company page and its ad accounts"}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#DDE4ED] px-3 text-[10.5px] font-semibold text-[#253352] hover:bg-[#F8FAFC] disabled:opacity-60"><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        <button type="button" onClick={() => void sync()} disabled={syncing || !data || data.state !== "live" || data.leads.length === 0} className="inline-flex h-8 items-center gap-1.5 bg-[#0A66C2] px-3 text-[10.5px] font-semibold text-white hover:bg-[#004182] disabled:opacity-50"><Database className="size-3" /> {syncing ? "Syncing…" : "Sync to CRM"}</button>
      </div>
    </div>
    {loading && !data ? <Loading text="Loading LinkedIn leads..." /> : error && !data ? <LoadError message={error} retry={() => void load()} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {data.state === "live" && <Kpis items={[
        { label: "Leads", value: number(data.leads.length), icon: Users, tone: "bg-[#EAF3FB] text-[#0A66C2]" },
        { label: "In CRM", value: number(data.inCrm), icon: Database, tone: "bg-[#E5F8F1] text-[#059669]" },
        { label: "Lead forms", value: number(data.forms.length), icon: Target, tone: "bg-[#F1ECFE] text-[#7C3AED]" },
        { label: "From ads", value: number(data.leads.filter((lead) => lead.leadType === "SPONSORED").length), icon: BarChart3, tone: "bg-[#FFF4DE] text-[#D97706]" },
      ]} />}
      {data.state === "live" && (data.leads.length === 0
        ? <div className="px-5 py-12 text-center"><Users className="mx-auto size-6 text-[#A8B4C7]" /><p className="mt-3 text-[12px] font-semibold text-[#52617D]">No lead form responses yet</p><p className="mt-1 text-[10.5px] text-[#8A97AF]">{data.forms.length ? `${data.forms.length} form(s) found: ${data.forms.map((form) => form.name).join(", ")}.` : "Create a Lead Gen form in LinkedIn Campaign Manager or on the company page."} New responses appear here and in the CRM.</p></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]">
          <th className="w-8 px-3 py-3" aria-label="Details" /><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Company</th><th className="px-5 py-3">Form</th>
        </tr></thead><tbody className="divide-y divide-[#EDF1F5]">{data.leads.map((lead) => {
          const expanded = open === lead.id;
          return <Fragment key={lead.id}>
            <tr className="cursor-pointer hover:bg-[#F8FAFC]" onClick={() => setOpen(expanded ? null : lead.id)}>
              <td className="px-3 py-3 text-[#7B89A4]">{expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</td>
              <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{date(lead.submittedAt)}</td>
              <td className="px-3 py-3 text-[11.5px] font-semibold text-[#253352]">{lead.name || "—"}</td>
              <td className="px-3 py-3 text-[11px] text-[#253352]">{lead.email || "—"}</td>
              <td className="px-3 py-3 text-[11px] text-[#253352]">{lead.phone || "—"}</td>
              <td className="px-3 py-3 text-[11px] text-[#253352]">{lead.company || "—"}</td>
              <td className="px-5 py-3 text-[10.5px] text-[#52617D]">{lead.formName || "—"} · {lead.leadType === "SPONSORED" ? "Ad" : "Page"}</td>
            </tr>
            {expanded && <tr><td colSpan={7} className="bg-[#F8FAFC] px-10 py-3"><dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{lead.answers.map((answer, index) => <div key={index}><dt className="text-[9.5px] font-semibold uppercase text-[#7B89A4]">{answer.question}</dt><dd className="text-[11px] text-[#253352]">{answer.answer}</dd></div>)}</dl></td></tr>}
          </Fragment>;
        })}</tbody></table></div>)}
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">Leads stay in LinkedIn and are copied into this Client&apos;s CRM once (never twice).{data.partial && " Some lists were long; the newest responses are shown first."}</p>
    </>}
  </div>;
}
