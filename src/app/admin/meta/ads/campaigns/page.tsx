"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Download,
  Edit3,
  Megaphone,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { campaigns } from "@/features/admin/meta-ads/data";
import {
  conversionRate,
  cpl,
  ctr,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
  relative,
  STATUS_LABEL,
} from "@/features/admin/meta-ads/format";
import { usePagination, useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  FilterBar,
  FilterSelect,
  PlatformIcons,
  Pagination,
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
import type { EntityStatus } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  status: "All Statuses",
  objective: "All Objectives",
  delivery: "All Delivery",
  platform: "All Platforms",
  range: "Last 30 days",
  account: "All Ad Accounts",
  page: "All Facebook Pages",
  instagram: "All Instagram Accounts",
};

const COLUMNS = [
  "Status",
  "Campaign Name",
  "Objective",
  "Platforms",
  "Delivery",
  "Budget",
  "Amount Spent",
  "Impressions",
  "Reach",
  "Clicks",
  "CTR",
  "Leads",
  "CPL",
  "Conv. Rate",
  "Last Edited",
];

const PAUSABLE: EntityStatus[] = ["active", "learning", "scheduled"];

function CampaignsView() {
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);
  const [selected, setSelected] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (values.status !== DEFAULTS.status && STATUS_LABEL[c.status] !== values.status)
        return false;
      if (values.objective !== DEFAULTS.objective && c.objective !== values.objective)
        return false;
      if (values.delivery === "Delivering" && c.status !== "active") return false;
      if (values.delivery === "Not delivering" && c.status === "active") return false;
      if (values.platform === "Facebook" && !c.platforms.includes("facebook"))
        return false;
      if (values.platform === "Instagram" && !c.platforms.includes("instagram"))
        return false;
      if (values.page !== DEFAULTS.page && !c.platforms.includes("facebook")) return false;
      if (values.instagram !== DEFAULTS.instagram && !c.platforms.includes("instagram"))
        return false;
      return true;
    });
  }, [values]);

  const paged = usePagination(rows, 10);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleAll = () =>
    setSelected(allSelected ? [] : rows.map((r) => r.id));

  const toggleOne = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const bulk = (action: string) => {
    toast.success(`${action} applied to ${selected.length} campaign${selected.length === 1 ? "" : "s"}`);
    setSelected([]);
  };

  return (
    <AdsWorkspace>
      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-2xs ring-1 ring-blue-500/20">
              <Megaphone className="size-4" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Campaigns</h2>
            <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10.5px] font-black text-blue-700 ring-1 ring-blue-500/20">
              {rows.length}
            </span>
            {selected.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 border border-blue-200">
                {selected.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 ? (
              <>
                <button type="button" onClick={() => bulk("Edit")} className={btn}>
                  <Edit3 className="size-3.5" />
                  Edit
                </button>
                <button type="button" onClick={() => bulk("Duplicate")} className={btn}>
                  <Copy className="size-3.5" />
                  Duplicate
                </button>
                <button type="button" onClick={() => bulk("Pause")} className={btn}>
                  <Pause className="size-3.5" />
                  Pause
                </button>
                <button type="button" onClick={() => bulk("Resume")} className={btn}>
                  <Play className="size-3.5" />
                  Resume
                </button>
                <button type="button" onClick={() => bulk("Archive")} className={btn}>
                  <Archive className="size-3.5" />
                  Archive
                </button>
                <button type="button" onClick={() => bulk("Export")} className={btn}>
                  <Download className="size-3.5" />
                  Export
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toast.success("Campaign export queued — we will email the CSV.")}
                  className={btn}
                >
                  <Download className="size-3.5" />
                  Export
                </button>
                <Link href={`${ADS_ROOT}/create`} className={btnPrimary}>
                  <Plus className="size-3.5" />
                  Create Campaign
                </Link>
              </>
            )}
          </div>
        </div>

        <FilterBar>
          <FilterSelect
            label="Date range"
            value={values.range}
            onChange={(v) => setFilter("range", v)}
            options={["Last 30 days", "Last 7 days", "Last 90 days", "This month", "Lifetime"]}
            minWidth={150}
          />
          <FilterSelect
            label="Status"
            value={values.status}
            onChange={(v) => setFilter("status", v)}
            options={[
              "All Statuses",
              "Active",
              "Learning",
              "In Review",
              "Paused",
              "Completed",
              "Draft",
              "Archived",
            ]}
          />
          <FilterSelect
            label="Objective"
            value={values.objective}
            onChange={(v) => setFilter("objective", v)}
            options={[
              "All Objectives",
              "Awareness",
              "Engagement",
              "Lead Generation",
              "Conversions",
            ]}
            minWidth={160}
          />
          <FilterSelect
            label="Delivery"
            value={values.delivery}
            onChange={(v) => setFilter("delivery", v)}
            options={["All Delivery", "Delivering", "Not delivering"]}
          />
          <FilterSelect
            label="Platform"
            value={values.platform}
            onChange={(v) => setFilter("platform", v)}
            options={["All Platforms", "Facebook", "Instagram"]}
          />
          <SearchInput
            placeholder="Search campaigns…"
            value={values.q}
            onChange={(v) => setFilter("q", v)}
          />
          <button
            type="button"
            onClick={() => setShowMoreFilters((open) => !open)}
            aria-expanded={showMoreFilters}
            aria-controls="campaign-more-filters"
            className={cn(btn, showMoreFilters && "border-[#1877f2] bg-[#eff6ff] text-[#1877f2]")}
          >
            <SlidersHorizontal className="size-3.5" />
            More Filters
          </button>
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>

        {showMoreFilters && (
          <div
            id="campaign-more-filters"
            className="flex flex-wrap items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/50 p-3.5"
          >
            <FilterSelect
              label="Ad account"
              value={values.account}
              onChange={(v) => setFilter("account", v)}
              options={["All Ad Accounts", "Namo Gange Official"]}
              minWidth={200}
            />
            <FilterSelect
              label="Facebook Page"
              value={values.page}
              onChange={(v) => setFilter("page", v)}
              options={["All Facebook Pages", "Namo Gange"]}
              minWidth={200}
            />
            <FilterSelect
              label="Instagram account"
              value={values.instagram}
              onChange={(v) => setFilter("instagram", v)}
              options={["All Instagram Accounts", "@namogangetrust"]}
              minWidth={210}
            />
          </div>
        )}

        {rows.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns match these filters"
              description="Try a different status, objective or date range, or clear the filters to see all campaigns."
              compact
            />
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Create your first Meta campaign"
              description="Campaigns hold your objective and budget. Add ad sets for targeting, then ads for creative."
              action={{ label: "Create Campaign", href: `${ADS_ROOT}/create` }}
              secondary={{ label: "Read the guide", href: `${ADS_ROOT}/help/campaign-structure` }}
            />
          )
        ) : (
          <TableShell minWidth={1420}>
            <thead>
              <tr>
                <Th className="w-9">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all campaigns"
                    className="size-3.5 rounded"
                  />
                </Th>
                {COLUMNS.map((label) => (
                  <Th
                    key={label}
                    numeric={[
                      "Amount Spent",
                      "Impressions",
                      "Reach",
                      "Clicks",
                      "CTR",
                      "Leads",
                      "CPL",
                      "Conv. Rate",
                    ].includes(label)}
                  >
                    {label}
                  </Th>
                ))}
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.visible.map((c) => {
                const m = c.metrics;
                const href = `${ADS_ROOT}/campaigns/${c.id}`;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="size-3.5 rounded"
                      />
                    </Td>
                    <Td>
                      <StatusChip status={c.status} />
                    </Td>
                    <Td>
                      <EntityLink href={href} name={c.name} sub={`Owner · ${c.owner}`} />
                    </Td>
                    <Td>{c.objective}</Td>
                    <Td>
                      <PlatformIcons platforms={c.platforms} />
                    </Td>
                    <Td>
                      <DeliveryCell status={c.status} />
                    </Td>
                    <Td>
                      {money(c.budget)}
                      <span className="block text-[9px] text-[#64748b]">
                        {c.budgetType}
                      </span>
                    </Td>
                    <Td numeric>{money(m.spend)}</Td>
                    <Td numeric>{num(m.impressions)}</Td>
                    <Td numeric>{num(m.reach)}</Td>
                    <Td numeric>{num(m.clicks)}</Td>
                    <Td numeric>{orDash(ctr(m), (v) => pct(v))}</Td>
                    <Td numeric>{num(m.leads)}</Td>
                    <Td numeric>{orDash(cpl(m), moneyPrecise)}</Td>
                    <Td numeric>{orDash(conversionRate(m), (v) => pct(v))}</Td>
                    <Td>
                      {relative(c.lastEdited)}
                      <span className="block text-[9px] text-[#64748b]">
                        by {c.lastEditedBy}
                      </span>
                    </Td>
                    <Td>
                      <RowMenu
                        label={`Actions for ${c.name}`}
                        groups={[
                          [
                            { label: "View Campaign", href },
                            { label: "Edit", href: `${ADS_ROOT}/create?campaign=${c.id}` },
                            {
                              label: "Duplicate",
                              onSelect: () => toast.success(`Duplicating “${c.name}”…`),
                            },
                            {
                              label: PAUSABLE.includes(c.status) ? "Pause" : "Resume",
                              onSelect: () =>
                                toast.success(
                                  `${PAUSABLE.includes(c.status) ? "Paused" : "Resumed"} “${c.name}”`,
                                ),
                            },
                          ],
                          [
                            { label: "View Ad Sets", href: `${ADS_ROOT}/adsets?campaign=${c.id}` },
                            { label: "View Ads", href: `${ADS_ROOT}/ads?campaign=${c.id}` },
                            { label: "View Leads", href: `${ADS_ROOT}/leads?campaign=${c.id}` },
                            { label: "View Analytics", href: `${ADS_ROOT}/analytics?campaign=${c.id}` },
                          ],
                          [
                            {
                              label: "Archive",
                              danger: true,
                              onSelect: () => toast.success(`Archived “${c.name}”`),
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
          <Pagination
            noun="campaigns"
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

export default function CampaignsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} columns={9} />}>
      <CampaignsView />
    </Suspense>
  );
}
