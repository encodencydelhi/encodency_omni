"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { crmApi } from "@/features/admin/crm/data/crm-api";
import { campaignsApi, type CampaignRecord } from "./live/campaigns-api";

/**
 * Campaign detail. Everything here is read from the campaign record and the CRM; nothing is estimated.
 * Delivery results (spend, reach, clicks, conversions) are not tracked per campaign yet, so they are not shown.
 */

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

function label(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBudget(campaign: CampaignRecord): string {
  if (!campaign.budget) return "No budget set";
  const amount = Number(campaign.budget.amount);
  return `${campaign.budget.currency} ${Number.isFinite(amount) ? amount.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : campaign.budget.amount}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-[#E2E8F0] bg-white shadow-xs">
      <h2 className="border-b border-[#EDF1F5] px-3.5 py-2.5 text-[13px] font-semibold text-[#172044]">{title}</h2>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Field({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-[#7A87A0]">{name}</dt>
      <dd className="mt-0.5 text-[12.5px] font-medium text-[#172044]">{value}</dd>
    </div>
  );
}

function Chips({ items }: { items: string[] | undefined | null }) {
  if (!items || items.length === 0) return <span className="text-[#7A87A0]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className="rounded bg-[#F0F4F9] px-1.5 py-0.5 text-[11px] font-medium text-[#33445F]">{item}</span>
      ))}
    </span>
  );
}

interface CampaignLead {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  payload?: { campaignId?: string; stage?: string; email?: string; phone?: string };
}

function CampaignLeads({ campaignId }: { campaignId: string }) {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [leads, setLeads] = useState<CampaignLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !companyId || !clientId) return;
    let cancelled = false;
    crmApi
      .list<CampaignLead>("lead", { companyId, clientId })
      .then((rows) => {
        if (!cancelled) setLeads(rows.filter((row) => row.payload?.campaignId === campaignId));
      })
      .catch((err) => {
        if (!cancelled) setError(ApiError.isApiError(err) ? err.message : "Leads could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, companyId, clientId, campaignId]);

  return (
    <Section title={`Leads from this campaign${leads ? ` (${leads.length})` : ""}`}>
      {error ? (
        <p className="text-[12px] text-[#B42318]">{error}</p>
      ) : !leads ? (
        <p className="flex items-center gap-2 text-[12px] text-[#7A87A0]"><Loader2 className="size-3.5 animate-spin" /> Loading leads...</p>
      ) : leads.length === 0 ? (
        <p className="text-[12px] text-[#7A87A0]">No leads are linked to this campaign yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="text-[11px] uppercase text-[#7A87A0]">
              <tr>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3">Stage</th>
                <th className="py-1.5 pr-3">Contact</th>
                <th className="py-1.5">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="py-1.5 pr-3 font-medium text-[#172044]">{lead.name || "Unnamed lead"}</td>
                  <td className="py-1.5 pr-3">{label(lead.payload?.stage ?? lead.status)}</td>
                  <td className="py-1.5 pr-3">{lead.payload?.email || lead.payload?.phone || "—"}</td>
                  <td className="py-1.5">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function CampaignPage({ id }: { id?: string }) {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!isReady || !id || !companyId || !clientId) return;
    let cancelled = false;
    campaignsApi
      .get(companyId, clientId, id)
      .then((data) => {
        if (!cancelled) setCampaign(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setCampaign(null);
        setErrorMessage(ApiError.isApiError(err) ? err.message || `Failed to fetch campaign (HTTP ${err.status})` : "Unable to reach the campaigns service.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, id, companyId, clientId, reloadKey]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-16 text-center text-[12px] text-[#78859d]">
        <Loader2 className="size-6 animate-spin text-[#e62c36]" />
        <span>Loading campaign...</span>
      </div>
    );
  }

  if (errorMessage || !campaign) {
    return (
      <div className="mx-auto my-8 max-w-lg rounded-[8px] border border-red-200 bg-red-50 p-6 text-center text-[12px]">
        <AlertCircle className="mx-auto mb-2 size-6 text-red-600" />
        <h2 className="mb-1 text-sm font-semibold text-red-900">Failed to load campaign</h2>
        <p className="mb-4 text-[#64748b]">{errorMessage ?? "Campaign not found."}</p>
        <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-sm bg-[#e62c36] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c91d26]">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const audience = campaign.audience;
  const kpis = campaign.kpis;
  const targets: Array<[string, number | undefined]> = [
    ["Reach", kpis?.targetReach],
    ["Impressions", kpis?.targetImpressions],
    ["Clicks", kpis?.targetClicks],
    ["Engagements", kpis?.targetEngagements],
    ["Leads", kpis?.targetLeads],
    ["Conversions", kpis?.targetConversions],
  ];
  const setTargets = targets.filter(([, value]) => value !== undefined);

  return (
    <div className="space-y-3 text-[#24365d]">
      <div>
        <Link href="/admin/campaigns" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#687797] hover:text-[#172044]">
          <ArrowLeft className="size-3.5" /> All campaigns
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111B43]">{campaign.name}</h1>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[campaign.status] ?? STATUS_STYLE.DRAFT}`}>{label(campaign.status)}</span>
        </div>
        {campaign.description ? <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-[#5E6D89]">{campaign.description}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Plan">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field name="Objective" value={label(campaign.objective)} />
            <Field name="Mode" value={label(campaign.campaignMode)} />
            <Field name="Category" value={campaign.category || "—"} />
            <Field name="Type" value={campaign.campaignType || "—"} />
            <Field name="Starts" value={formatDate(campaign.startDate)} />
            <Field name="Ends" value={formatDate(campaign.endDate)} />
            <Field name="Bidding" value={label(campaign.biddingStrategy)} />
            <Field name="Budget" value={formatBudget(campaign)} />
          </dl>
        </Section>

        <Section title="Channels and tags">
          <dl className="space-y-3">
            <Field name="Channels" value={<Chips items={campaign.channels} />} />
            <Field name="Tags" value={<Chips items={campaign.tags} />} />
          </dl>
        </Section>

        <Section title="Audience">
          {audience ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field name="Age" value={audience.ageMin || audience.ageMax ? `${audience.ageMin ?? "—"} to ${audience.ageMax ?? "—"}` : "—"} />
              <Field name="Genders" value={<Chips items={audience.genders} />} />
              <Field name="Locations" value={<Chips items={audience.locations} />} />
              <Field name="Languages" value={<Chips items={audience.languages} />} />
              <div className="col-span-2"><Field name="Interests" value={<Chips items={audience.interests} />} /></div>
            </dl>
          ) : (
            <p className="text-[12px] text-[#7A87A0]">No audience has been set for this campaign.</p>
          )}
        </Section>

        <Section title="Targets">
          {setTargets.length === 0 && !kpis?.targetRoas && !kpis?.targetRevenue ? (
            <p className="text-[12px] text-[#7A87A0]">No targets have been set for this campaign.</p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
                {setTargets.map(([name, value]) => (
                  <Field key={name} name={name} value={(value as number).toLocaleString("en-IN")} />
                ))}
                {kpis?.targetRevenue ? <Field name="Revenue" value={`${kpis.targetRevenue.currency} ${kpis.targetRevenue.amount}`} /> : null}
                {kpis?.targetRoas ? <Field name="ROAS" value={kpis.targetRoas} /> : null}
              </dl>
              <p className="mt-3 text-[11px] text-[#7A87A0]">These are goals you set. Results per campaign are not tracked yet.</p>
            </>
          )}
        </Section>
      </div>

      {campaign.internalNotes ? (
        <Section title="Internal notes">
          <p className="whitespace-pre-line text-[12.5px] leading-5 text-[#33445F]">{campaign.internalNotes}</p>
        </Section>
      ) : null}

      <CampaignLeads campaignId={campaign.id} />

      <p className="text-[11px] text-[#7A87A0]">
        Revision {campaign.revision} · Created {formatDate(campaign.createdAt)} · Updated {formatDate(campaign.updatedAt)}
      </p>
    </div>
  );
}

export default CampaignPage;
