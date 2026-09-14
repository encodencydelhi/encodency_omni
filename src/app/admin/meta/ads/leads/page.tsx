"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Percent,
  Target,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  adSets,
  ads,
  campaigns,
  getAd,
  getAdSet,
  getCampaign,
  getForm,
  instantForms,
  leads,
} from "@/features/admin/meta-ads/data";
import {
  dateTime,
  LEAD_STAGE_TONE,
  moneyPrecise,
  num,
  pct,
  relative,
  scoreTone,
  TONE_CLASS,
} from "@/features/admin/meta-ads/format";
import { useFilters, usePagination } from "@/features/admin/meta-ads/use-filters";
import {
  Avatar,
  btn,
  btnPrimary,
  card,
  EmptyState,
  EntityLink,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  Meter,
  Pagination,
  RowMenu,
  SearchInput,
  SkeletonTable,
  TableShell,
  Td,
  Th,
  ToneChip,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { LeadStage } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  tab: "all",
  campaign: "All Campaigns",
  adset: "All Ad Sets",
  ad: "All Ads",
  form: "All Forms",
  owner: "All Owners",
  stage: "All Stages",
  score: "All Scores",
  range: "Last 30 days",
};

const PIPELINE: LeadStage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Meeting Scheduled",
  "Converted",
];

const TERMINAL: LeadStage[] = ["Lost", "Spam"];

const TABS = [
  { id: "all", label: "All Leads" },
  { id: "mine", label: "My Leads" },
  { id: "qualified", label: "Qualified" },
  { id: "converted", label: "Converted" },
  { id: "lost", label: "Lost" },
];

/** The signed-in user, used by the "My Leads" tab. */
const CURRENT_USER = "Amit Sharma";

function LeadsView() {
  const { values, setFilter, setFilters, reset, isFiltered } = useFilters(DEFAULTS, {
    // "View Leads" links from campaigns, ad sets, ads and forms carry ids.
    campaign: (v) => getCampaign(v)?.name ?? v,
    adset: (v) => getAdSet(v)?.name ?? v,
    ad: (v) => getAd(v)?.name ?? v,
    form: (v) => getForm(v)?.name ?? v,
  });
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return leads.filter((l) => {
      if (
        q &&
        ![l.name, l.email, l.phone, l.id].some((field) =>
          field.toLowerCase().includes(q),
        )
      )
        return false;

      if (values.tab === "mine" && l.owner !== CURRENT_USER) return false;
      if (values.tab === "qualified" && l.stage !== "Qualified") return false;
      if (values.tab === "converted" && l.stage !== "Converted") return false;
      if (values.tab === "lost" && l.stage !== "Lost") return false;

      if (
        values.campaign !== DEFAULTS.campaign &&
        l.campaignId !== values.campaign &&
        getCampaign(l.campaignId)?.name !== values.campaign
      )
        return false;
      if (
        values.adset !== DEFAULTS.adset &&
        l.adSetId !== values.adset &&
        getAdSet(l.adSetId)?.name !== values.adset
      )
        return false;
      if (
        values.ad !== DEFAULTS.ad &&
        l.adId !== values.ad &&
        getAd(l.adId)?.name !== values.ad
      )
        return false;
      if (
        values.form !== DEFAULTS.form &&
        l.formId !== values.form &&
        getForm(l.formId)?.name !== values.form
      )
        return false;
      if (values.owner !== DEFAULTS.owner && l.owner !== values.owner) return false;
      if (values.stage !== DEFAULTS.stage && l.stage !== values.stage) return false;
      if (values.score === "High (80+)" && l.score < 80) return false;
      if (values.score === "Medium (50-79)" && (l.score < 50 || l.score >= 80)) return false;
      if (values.score === "Low (below 50)" && l.score >= 50) return false;
      return true;
    });
  }, [values]);

  const kpis = useMemo(() => {
    const qualified = leads.filter((l) =>
      ["Qualified", "Meeting Scheduled", "Converted"].includes(l.stage),
    ).length;
    const converted = leads.filter((l) => l.stage === "Converted").length;
    const newToday = leads.filter((l) => l.submittedAt.startsWith("2026-09-14")).length;
    const responded = leads.filter((l) => l.responseMinutes !== null);
    const avgResponse = responded.length
      ? responded.reduce((t, l) => t + (l.responseMinutes ?? 0), 0) / responded.length
      : 0;
    const spend = campaigns.reduce((t, c) => t + c.metrics.spend, 0);
    const totalLeads = campaigns.reduce((t, c) => t + c.metrics.leads, 0);
    return {
      total: leads.length,
      newToday,
      qualified,
      conversion: leads.length ? (converted / leads.length) * 100 : 0,
      avgCpl: totalLeads ? spend / totalLeads : 0,
      avgResponse,
    };
  }, []);

  const pipelineCounts = useMemo(
    () =>
      [...PIPELINE, ...TERMINAL].map((stage) => ({
        stage,
        count: leads.filter((l) => l.stage === stage).length,
      })),
    [],
  );

  const owners = useMemo(
    () => Array.from(new Set(leads.map((l) => l.owner))).sort(),
    [],
  );

  const adSetOptions = useMemo(() => {
    const scoped =
      values.campaign === DEFAULTS.campaign
        ? adSets
        : adSets.filter(
            (s) =>
              s.campaignId === values.campaign ||
              getCampaign(s.campaignId)?.name === values.campaign,
          );
    return [DEFAULTS.adset, ...scoped.map((s) => s.name)];
  }, [values.campaign]);

  const adOptions = useMemo(() => {
    const scoped =
      values.adset === DEFAULTS.adset
        ? ads
        : ads.filter(
            (a) => a.adSetId === values.adset || getAdSet(a.adSetId)?.name === values.adset,
          );
    return [DEFAULTS.ad, ...scoped.map((a) => a.name)];
  }, [values.adset]);

  const paged = usePagination(rows, 10);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <AdsWorkspace
      actions={
        <button
          type="button"
          onClick={() => toast.success("Lead export queued — we will email the CSV.")}
          className={cn(btnPrimary, "h-10")}
        >
          <Download className="size-3.5" />
          Export Leads
        </button>
      }
    >
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Leads" value={num(kpis.total)} icon={UsersRound} />
        <KpiCard label="New Today" value={num(kpis.newToday)} icon={UserPlus} tone="blue" />
        <KpiCard label="Qualified Leads" value={num(kpis.qualified)} icon={CheckCircle2} tone="green" />
        <KpiCard
          label="Conversion Rate"
          value={pct(kpis.conversion, 1)}
          icon={Percent}
          hint="Converted leads divided by all leads."
        />
        <KpiCard label="Avg. CPL" value={moneyPrecise(kpis.avgCpl)} icon={Target} />
        <KpiCard
          label="Avg. Response Time"
          value={`${Math.round(kpis.avgResponse)} min`}
          icon={Clock}
          tone={kpis.avgResponse > 60 ? "amber" : "green"}
          hint="Time between submission and first outbound contact."
        />
      </section>

      <section className={cn(card, "mb-3.5 p-4")}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Conversion Pipeline</h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {leads.length} Active Leads
          </span>
        </div>
        <ol className="flex flex-wrap items-stretch gap-2">
          {pipelineCounts.map(({ stage, count }, i) => {
            const terminal = TERMINAL.includes(stage);
            const active = values.stage === stage;
            return (
              <li key={stage} className={cn("min-w-[130px] flex-1", terminal && "max-w-[160px]")}>
                <button
                  type="button"
                  onClick={() => setFilter("stage", active ? DEFAULTS.stage : stage)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-full w-full flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xs",
                    active
                      ? "border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/20"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {!terminal && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-slate-700">
                        {i + 1}
                      </span>
                    )}
                    <span className="text-[10.5px] font-bold text-slate-700">{stage}</span>
                  </span>
                  <strong className="mt-2 text-lg font-black text-slate-900 leading-none">{count}</strong>
                  <Meter
                    value={leads.length ? (count / leads.length) * 100 : 0}
                    tone={LEAD_STAGE_TONE[stage] ?? "slate"}
                    className="mt-2"
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4">
          <LinkTabs
            tabs={TABS.map((t) => ({
              ...t,
              href: t.id === "all" ? `${ADS_ROOT}/leads` : `${ADS_ROOT}/leads?tab=${t.id}`,
            }))}
            current={values.tab}
            className="border-b-0"
          />
          {selected.length > 0 && (
            <div className="my-2 flex flex-wrap gap-1.5">
              <span className="self-center text-[11px] font-semibold text-[#1877f2]">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Assigned ${selected.length} leads`);
                  setSelected([]);
                }}
                className={btn}
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Stage updated for ${selected.length} leads`);
                  setSelected([]);
                }}
                className={btn}
              >
                Change Stage
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(`${selected.length} leads marked as spam`);
                  setSelected([]);
                }}
                className={btn}
              >
                Mark Spam
              </button>
              <button
                type="button"
                onClick={() => toast.success("Export queued.")}
                className={btn}
              >
                Export
              </button>
            </div>
          )}
        </div>

        <FilterBar>
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) =>
              setFilters({ campaign: v, adset: DEFAULTS.adset, ad: DEFAULTS.ad })
            }
            options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
            minWidth={200}
          />
          <FilterSelect
            label="Ad set"
            value={values.adset}
            onChange={(v) => setFilters({ adset: v, ad: DEFAULTS.ad })}
            options={adSetOptions}
            minWidth={180}
          />
          <FilterSelect
            label="Ad"
            value={values.ad}
            onChange={(v) => setFilter("ad", v)}
            options={adOptions}
            minWidth={180}
          />
          <FilterSelect
            label="Form"
            value={values.form}
            onChange={(v) => setFilter("form", v)}
            options={[DEFAULTS.form, ...instantForms.map((f) => f.name)]}
            minWidth={180}
          />
          <FilterSelect
            label="Owner"
            value={values.owner}
            onChange={(v) => setFilter("owner", v)}
            options={[DEFAULTS.owner, ...owners]}
          />
          <FilterSelect
            label="Stage"
            value={values.stage}
            onChange={(v) => setFilter("stage", v)}
            options={[DEFAULTS.stage, ...PIPELINE, ...TERMINAL]}
            minWidth={160}
          />
          <FilterSelect
            label="Score"
            value={values.score}
            onChange={(v) => setFilter("score", v)}
            options={["All Scores", "High (80+)", "Medium (50-79)", "Low (below 50)"]}
            minWidth={160}
          />
          <SearchInput
            placeholder="Search name, email or phone…"
            value={values.q}
            onChange={(v) => setFilter("q", v)}
          />
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>

        {rows.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={UsersRound}
              title="No leads match these filters"
              description="Try a wider date range or different campaign, or clear the filters to see every lead."
              compact
            />
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No leads yet"
              description="Leads will appear here once your instant forms receive submissions."
              action={{ label: "Create a lead campaign", href: `${ADS_ROOT}/create` }}
              secondary={{ label: "Lead guide", href: `${ADS_ROOT}/help?category=leads` }}
            />
          )
        ) : (
          <TableShell minWidth={1520}>
            <thead>
              <tr>
                <Th className="w-9">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))}
                    aria-label="Select all leads"
                    className="size-3.5 rounded"
                  />
                </Th>
                {[
                  "Lead Name",
                  "Contact",
                  "Campaign",
                  "Ad Set",
                  "Ad",
                  "Form",
                  "Stage",
                  "Score",
                  "Owner",
                  "Submitted At",
                  "Last Activity",
                ].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.visible.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.includes(l.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(l.id)
                            ? prev.filter((x) => x !== l.id)
                            : [...prev, l.id],
                        )
                      }
                      aria-label={`Select ${l.name}`}
                      className="size-3.5 rounded"
                    />
                  </Td>
                  <Td>
                    <EntityLink href={`${ADS_ROOT}/leads/${l.id}`} name={l.name} sub={`${l.id} · ${l.city}`} maxWidth={180} />
                  </Td>
                  <Td>
                    {l.phone}
                    <span className="block max-w-[170px] truncate text-[9px] text-[#64748b]">
                      {l.email}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`${ADS_ROOT}/campaigns/${l.campaignId}`}
                      className="block max-w-[160px] truncate text-[#0671e9] hover:underline"
                    >
                      {getCampaign(l.campaignId)?.name ?? l.campaignId}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`${ADS_ROOT}/adsets/${l.adSetId}`}
                      className="block max-w-[150px] truncate text-[#0671e9] hover:underline"
                    >
                      {getAdSet(l.adSetId)?.name ?? l.adSetId}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`${ADS_ROOT}/ads/${l.adId}`}
                      className="block max-w-[150px] truncate text-[#0671e9] hover:underline"
                    >
                      {getAd(l.adId)?.name ?? l.adId}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`${ADS_ROOT}/forms/${l.formId}`}
                      className="block max-w-[150px] truncate text-[#0671e9] hover:underline"
                    >
                      {getForm(l.formId)?.name ?? l.formId}
                    </Link>
                  </Td>
                  <Td>
                    <ToneChip tone={LEAD_STAGE_TONE[l.stage] ?? "slate"}>{l.stage}</ToneChip>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <strong className={cn("tabular-nums", TONE_CLASS[scoreTone(l.score)].text)}>
                        {l.score}
                      </strong>
                      <Meter value={l.score} tone={scoreTone(l.score)} className="w-14" />
                    </span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      <Avatar name={l.owner} />
                      {l.owner}
                    </span>
                  </Td>
                  <Td>{dateTime(l.submittedAt)}</Td>
                  <Td>{relative(l.lastActivity)}</Td>
                  <Td>
                    <RowMenu
                      label={`Actions for ${l.name}`}
                      groups={[
                        [
                          { label: "View Lead", href: `${ADS_ROOT}/leads/${l.id}` },
                          {
                            label: "Assign",
                            onSelect: () => toast.success(`Assign “${l.name}” to a team member`),
                          },
                          {
                            label: "Call",
                            onSelect: () => toast.success(`Calling ${l.phone}…`),
                          },
                          {
                            label: "WhatsApp",
                            onSelect: () => toast.success(`Opening WhatsApp for ${l.name}`),
                          },
                        ],
                        [
                          {
                            label: "Change Stage",
                            onSelect: () => toast.success(`Change stage for “${l.name}”`),
                          },
                          {
                            label: "Mark Spam",
                            onSelect: () => toast.success(`“${l.name}” marked as spam`),
                          },
                          {
                            label: "Export",
                            onSelect: () => toast.success("Lead export queued."),
                          },
                        ],
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}

        {rows.length > 0 && (
          <Pagination
            noun="leads"
            page={paged.page}
            pageCount={paged.pageCount}
            from={paged.from}
            to={paged.to}
            total={paged.total}
            canPrevious={paged.canPrevious}
            canNext={paged.canNext}
            onPrevious={paged.previous}
            onNext={paged.next}
          />
        )}
      </section>
    </AdsWorkspace>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} columns={10} />}>
      <LeadsView />
    </Suspense>
  );
}
