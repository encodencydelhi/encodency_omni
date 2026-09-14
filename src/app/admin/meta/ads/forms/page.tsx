"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import {
  CheckCircle2,
  FileText,
  Percent,
  Plus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  adsOfForm,
  campaigns,
  campaignsOfForm,
  getCampaign,
  instantForms,
  leadsOf,
} from "@/features/admin/meta-ads/data";
import { num, pct, relative } from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  EntityLink,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  RowMenu,
  SearchInput,
  SkeletonTable,
  StatusChip,
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

const DEFAULTS = {
  q: "",
  tab: "all",
  campaign: "All Campaigns",
  type: "All Types",
  range: "Last 30 days",
};

const TABS = [
  { id: "all", label: "All Forms" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

function FormsView() {
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS, {
    campaign: (v) => getCampaign(v)?.name ?? v,
  });

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return instantForms.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (values.tab === "active" && f.status !== "active") return false;
      if (values.tab === "draft" && f.status !== "draft") return false;
      if (values.tab === "archived" && f.status !== "archived") return false;
      if (values.type !== DEFAULTS.type && f.type !== values.type) return false;
      if (values.campaign !== DEFAULTS.campaign) {
        const linked = campaignsOfForm(f.id);
        if (!linked.some((c) => c.id === values.campaign || c.name === values.campaign))
          return false;
      }
      return true;
    });
  }, [values]);

  const totals = useMemo(() => {
    const submissions = instantForms.reduce((t, f) => t + f.submissions, 0);
    const opens = instantForms.reduce((t, f) => t + f.opens, 0);
    const qualified = instantForms.reduce((t, f) => t + f.qualified, 0);
    return {
      total: instantForms.length,
      active: instantForms.filter((f) => f.status === "active").length,
      submissions,
      completion: opens ? (submissions / opens) * 100 : 0,
      qualification: submissions ? (qualified / submissions) * 100 : 0,
    };
  }, []);

  return (
    <AdsWorkspace
      actions={
        <Link href={`${ADS_ROOT}/create?step=form`} className={cn(btnPrimary, "h-10")}>
          <Plus className="size-3.5" />
          Create Form
        </Link>
      }
    >
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Forms" value={totals.total} icon={FileText} />
        <KpiCard label="Active Forms" value={totals.active} icon={CheckCircle2} tone="green" />
        <KpiCard label="Total Submissions" value={num(totals.submissions)} icon={UsersRound} />
        <KpiCard
          label="Completion Rate"
          value={pct(totals.completion, 1)}
          icon={Percent}
          hint="Submissions divided by form opens."
        />
        <KpiCard
          label="Qualification Rate"
          value={pct(totals.qualification, 1)}
          icon={Percent}
          hint="Leads meeting your qualification rules, divided by all submissions."
        />
      </section>

      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-1">
          <LinkTabs
            tabs={TABS.map((t) => ({
              ...t,
              href: t.id === "all" ? `${ADS_ROOT}/forms` : `${ADS_ROOT}/forms?tab=${t.id}`,
              count: instantForms.filter((f) =>
                t.id === "all" ? true : f.status === t.id,
              ).length,
            }))}
            current={values.tab}
            className="border-b-0"
          />
          <button
            type="button"
            onClick={() => toast.success("Instant form export queued.")}
            className={cn(btn, "my-2")}
          >
            Export
          </button>
        </div>

        <FilterBar>
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilter("campaign", v)}
            options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
            minWidth={210}
          />
          <FilterSelect
            label="Type"
            value={values.type}
            onChange={(v) => setFilter("type", v)}
            options={["All Types", "More volume", "Higher intent", "Rich creative"]}
            minWidth={160}
          />
          <FilterSelect
            label="Date range"
            value={values.range}
            onChange={(v) => setFilter("range", v)}
            options={["Last 30 days", "Last 7 days", "Last 90 days", "Lifetime"]}
            minWidth={150}
          />
          <SearchInput
            placeholder="Search forms…"
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
              icon={FileText}
              title="No forms match these filters"
              description="Try a different status tab, campaign or type, or clear the filters."
              compact
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="Create your first instant form"
              description="Instant forms collect leads inside Facebook and Instagram, so people never leave the app."
              action={{ label: "Create Instant Form", href: `${ADS_ROOT}/create?step=form` }}
              secondary={{ label: "Form types explained", href: `${ADS_ROOT}/help?category=forms` }}
            />
          )
        ) : (
          <TableShell minWidth={1300}>
            <thead>
              <tr>
                {["Form Name", "Type", "Linked Campaigns", "Linked Ads", "Questions"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
                {["Submissions", "Completion Rate", "Qualified %"].map((h) => (
                  <Th key={h} numeric>
                    {h}
                  </Th>
                ))}
                <Th>Status</Th>
                <Th>Last Updated</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const linkedCampaigns = campaignsOfForm(f.id);
                const linkedAds = adsOfForm(f.id);
                const completion = f.opens ? (f.submissions / f.opens) * 100 : 0;
                const qualified = f.submissions ? (f.qualified / f.submissions) * 100 : 0;
                return (
                  <Tr key={f.id}>
                    <Td>
                      <EntityLink
                        href={`${ADS_ROOT}/forms/${f.id}`}
                        name={f.name}
                        sub={`${f.language} · ${leadsOf({ formId: f.id }).length} leads in CRM`}
                      />
                    </Td>
                    <Td>{f.type}</Td>
                    <Td>
                      {linkedCampaigns.length === 0 ? (
                        <span className="text-[#94a3b8]">Not in use</span>
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          {linkedCampaigns.slice(0, 2).map((c) => (
                            <Link
                              key={c.id}
                              href={`${ADS_ROOT}/campaigns/${c.id}`}
                              className="block max-w-[190px] truncate text-[#0671e9] hover:underline"
                              title={c.name}
                            >
                              {c.name}
                            </Link>
                          ))}
                          {linkedCampaigns.length > 2 && (
                            <span className="text-[9px] text-[#64748b]">
                              +{linkedCampaigns.length - 2} more
                            </span>
                          )}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {linkedAds.length === 0 ? (
                        <span className="text-[#94a3b8]">—</span>
                      ) : (
                        <Link
                          href={`${ADS_ROOT}/ads?q=${encodeURIComponent(linkedAds[0]!.name)}`}
                          className="text-[#0671e9] hover:underline"
                        >
                          {linkedAds.length} ad{linkedAds.length === 1 ? "" : "s"}
                        </Link>
                      )}
                    </Td>
                    <Td>{f.questions.length}</Td>
                    <Td numeric>{num(f.submissions)}</Td>
                    <Td numeric>{f.opens ? pct(completion, 1) : "—"}</Td>
                    <Td numeric>
                      {f.submissions ? (
                        <ToneChip tone={qualified >= 60 ? "green" : qualified >= 40 ? "amber" : "red"}>
                          {pct(qualified, 0)}
                        </ToneChip>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <StatusChip status={f.status} />
                    </Td>
                    <Td>{relative(f.lastUpdated)}</Td>
                    <Td>
                      <RowMenu
                        label={`Actions for ${f.name}`}
                        groups={[
                          [
                            { label: "Preview", href: `${ADS_ROOT}/forms/${f.id}` },
                            { label: "Edit", href: `${ADS_ROOT}/create?form=${f.id}&step=form` },
                            {
                              label: "Duplicate",
                              onSelect: () => toast.success(`Duplicating “${f.name}”…`),
                            },
                            { label: "Use in Ad", href: `${ADS_ROOT}/create?form=${f.id}&step=ad` },
                          ],
                          [{ label: "View Leads", href: `${ADS_ROOT}/leads?form=${f.id}` }],
                          [
                            {
                              label: "Archive",
                              danger: true,
                              onSelect: () => toast.success(`Archived “${f.name}”`),
                            },
                          ],
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </section>
    </AdsWorkspace>
  );
}

export default function FormsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} columns={9} />}>
      <FormsView />
    </Suspense>
  );
}
