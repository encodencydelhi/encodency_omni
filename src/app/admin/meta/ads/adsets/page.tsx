"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { Download, Grid2X2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { adSets, campaigns, getCampaign } from "@/features/admin/meta-ads/data";
import {
  cpl,
  money,
  moneyPrecise,
  num,
  orDash,
  relative,
  STATUS_LABEL,
} from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  FilterBar,
  FilterSelect,
  RowMenu,
  SearchInput,
  SkeletonTable,
  StatusChip,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";

const DEFAULTS = {
  q: "",
  campaign: "All Campaigns",
  status: "All Statuses",
  placement: "All Placements",
  platform: "All Platforms",
  range: "Last 30 days",
};

function AdSetsView() {
  /** Links such as "View Ad Sets" from a campaign arrive as ?campaign=<id>. */
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS, {
    campaign: (v) => getCampaign(v)?.name ?? v,
  });
  const campaignFilter = values.campaign;

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return adSets.filter((s) => {
      const campaign = getCampaign(s.campaignId);
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (
        values.campaign !== DEFAULTS.campaign &&
        s.campaignId !== values.campaign &&
        campaign?.name !== values.campaign
      )
        return false;
      if (values.status !== DEFAULTS.status && STATUS_LABEL[s.status] !== values.status)
        return false;
      if (
        values.placement !== DEFAULTS.placement &&
        !s.placements.some((p) => p.enabled && p.placement === values.placement)
      )
        return false;
      if (
        values.platform !== DEFAULTS.platform &&
        !s.placements.some(
          (p) => p.enabled && p.platform === values.platform.toLowerCase(),
        )
      )
        return false;
      return true;
    });
  }, [values]);

  const placementOptions = useMemo(
    () => [
      DEFAULTS.placement,
      ...Array.from(
        new Set(adSets.flatMap((s) => s.placements.filter((p) => p.enabled).map((p) => p.placement))),
      ).sort(),
    ],
    [],
  );

  return (
    <AdsWorkspace>
      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600 shadow-2xs ring-1 ring-blue-500/20">
              <Grid2X2 className="size-4" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Ad Sets</h2>
            <span className="rounded-sm bg-blue-100/80 px-2.5 py-0.5 text-[10.5px] font-black text-blue-700 ring-1 ring-blue-500/20">
              {rows.length}
            </span>
            {values.campaign !== DEFAULTS.campaign && (
              <span className="text-[11px] font-medium text-slate-600">
                in <strong className="font-semibold text-slate-900">{campaignFilter}</strong>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toast.success("Ad set export queued.")}
              className={btn}
            >
              <Download className="size-3.5" />
              Export
            </button>
            <Link href={`${ADS_ROOT}/create?step=adset`} className={btnPrimary}>
              <Plus className="size-3.5" />
              Create Ad Set
            </Link>
          </div>
        </div>

        <FilterBar>
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilter("campaign", v)}
            options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
            minWidth={220}
          />
          <FilterSelect
            label="Status"
            value={values.status}
            onChange={(v) => setFilter("status", v)}
            options={["All Statuses", "Active", "Learning", "In Review", "Paused", "Completed"]}
          />
          <FilterSelect
            label="Placement"
            value={values.placement}
            onChange={(v) => setFilter("placement", v)}
            options={placementOptions}
            minWidth={170}
          />
          <FilterSelect
            label="Platform"
            value={values.platform}
            onChange={(v) => setFilter("platform", v)}
            options={["All Platforms", "Facebook", "Instagram"]}
          />
          <FilterSelect
            label="Date range"
            value={values.range}
            onChange={(v) => setFilter("range", v)}
            options={["Last 30 days", "Last 7 days", "Last 90 days", "Lifetime"]}
            minWidth={150}
          />
          <SearchInput
            placeholder="Search ad sets…"
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
              icon={Grid2X2}
              title="No ad sets match these filters"
              description="Try another campaign, status or placement, or clear the filters."
              compact
            />
          ) : (
            <EmptyState
              icon={Grid2X2}
              title="Create your first ad set"
              description="Ad sets decide who sees your ads, which Facebook and Instagram placements they run on, and the schedule."
              action={{ label: "Create Ad Set", href: `${ADS_ROOT}/create?step=adset` }}
              secondary={{ label: "Targeting guide", href: `${ADS_ROOT}/help?category=adsets` }}
            />
          )
        ) : (
          <TableShell minWidth={1520}>
            <thead>
              <tr>
                {[
                  "Ad Set Name",
                  "Campaign",
                  "Status",
                  "Conversion Location",
                  "Audience",
                  "Locations",
                  "Placements",
                  "Schedule",
                  "Budget",
                ].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
                {["Spend", "Leads", "CPL"].map((h) => (
                  <Th key={h} numeric>
                    {h}
                  </Th>
                ))}
                <Th>Last Edited</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const campaign = getCampaign(s.campaignId);
                const enabled = s.placements.filter((p) => p.enabled);
                return (
                  <Tr key={s.id}>
                    <Td>
                      <EntityLink
                        href={`${ADS_ROOT}/adsets/${s.id}`}
                        name={s.name}
                        sub={s.performanceGoal}
                      />
                    </Td>
                    <Td>
                      {campaign && (
                        <Link
                          href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                          className="block max-w-[180px] truncate text-[#0671e9] hover:underline"
                          title={campaign.name}
                        >
                          {campaign.name}
                        </Link>
                      )}
                    </Td>
                    <Td>
                      <StatusChip status={s.status} />
                    </Td>
                    <Td>{s.conversionLocation}</Td>
                    <Td>
                      <span className="block max-w-[170px] truncate" title={s.audienceName}>
                        {s.audienceName}
                      </span>
                      <span className="block text-[9px] text-[#64748b]">
                        {num(s.audienceSize[0])}–{num(s.audienceSize[1])}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-[150px] truncate" title={s.locations.join(", ")}>
                        {s.locations.join(", ")}
                      </span>
                    </Td>
                    <Td>
                      {enabled.length}
                      <span className="block text-[9px] text-[#64748b]">
                        {enabled.slice(0, 2).map((p) => p.placement).join(", ")}
                        {enabled.length > 2 && ` +${enabled.length - 2}`}
                      </span>
                    </Td>
                    <Td>{s.schedule}</Td>
                    <Td>
                      {money(s.budget)}
                      <span className="block text-[9px] text-[#64748b]">{s.budgetSource}</span>
                    </Td>
                    <Td numeric>{money(s.metrics.spend)}</Td>
                    <Td numeric>{num(s.metrics.leads)}</Td>
                    <Td numeric>{orDash(cpl(s.metrics), moneyPrecise)}</Td>
                    <Td>
                      {relative(s.lastEdited)}
                      <span className="block text-[9px] text-[#64748b]">
                        <DeliveryCell status={s.status} />
                      </span>
                    </Td>
                    <Td>
                      <RowMenu
                        label={`Actions for ${s.name}`}
                        groups={[
                          [
                            { label: "View Ad Set", href: `${ADS_ROOT}/adsets/${s.id}` },
                            { label: "Edit", href: `${ADS_ROOT}/create?adset=${s.id}&step=adset` },
                            {
                              label: "Duplicate",
                              onSelect: () => toast.success(`Duplicating “${s.name}”…`),
                            },
                            {
                              label: s.status === "paused" ? "Resume" : "Pause",
                              onSelect: () =>
                                toast.success(
                                  `${s.status === "paused" ? "Resumed" : "Paused"} “${s.name}”`,
                                ),
                            },
                          ],
                          [
                            { label: "View Ads", href: `${ADS_ROOT}/ads?adset=${s.id}` },
                            { label: "View Leads", href: `${ADS_ROOT}/leads?adset=${s.id}` },
                            { label: "View Campaign", href: `${ADS_ROOT}/campaigns/${s.campaignId}` },
                          ],
                          [
                            {
                              label: "Archive",
                              danger: true,
                              onSelect: () => toast.success(`Archived “${s.name}”`),
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

        {rows.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-600">
            Showing <strong className="font-semibold text-slate-900">{rows.length}</strong> of <strong className="font-semibold text-slate-900">{adSets.length}</strong> ad sets
          </div>
        )}
      </section>
    </AdsWorkspace>
  );
}

export default function AdSetsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} columns={9} />}>
      <AdSetsView />
    </Suspense>
  );
}
