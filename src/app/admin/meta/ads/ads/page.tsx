"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { Download, FileImage, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  adSets,
  ads,
  campaigns,
  getAdSet,
  getCampaign,
  getCreative,
} from "@/features/admin/meta-ads/data";
import {
  cpl,
  ctr,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
  relative,
} from "@/features/admin/meta-ads/format";
import { useFilters, usePagination } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  FilterBar,
  FilterSelect,
  Pagination,
  PlatformIcons,
  RowMenu,
  SearchInput,
  SkeletonTable,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Platform } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  campaign: "All Campaigns",
  adset: "All Ad Sets",
  delivery: "All Delivery",
  format: "All Formats",
  platform: "All Platforms",
  range: "Last 30 days",
};

/** An ad inherits the platforms its ad set actually delivers on. */
function platformsOfAd(adSetId: string): Platform[] {
  const set = getAdSet(adSetId);
  if (!set) return [];
  return Array.from(
    new Set(set.placements.filter((p) => p.enabled).map((p) => p.platform)),
  );
}

function AdsView() {
  const { values, setFilter, setFilters, reset, isFiltered } = useFilters(DEFAULTS, {
    // Cross-page links carry ids; the selects list names.
    campaign: (v) => getCampaign(v)?.name ?? v,
    adset: (v) => getAdSet(v)?.name ?? v,
  });

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return ads.filter((a) => {
      const campaign = getCampaign(a.campaignId);
      const set = getAdSet(a.adSetId);
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (
        values.campaign !== DEFAULTS.campaign &&
        a.campaignId !== values.campaign &&
        campaign?.name !== values.campaign
      )
        return false;
      if (
        values.adset !== DEFAULTS.adset &&
        a.adSetId !== values.adset &&
        set?.name !== values.adset
      )
        return false;
      if (values.format !== DEFAULTS.format && a.format !== values.format) return false;
      if (values.delivery === "Delivering" && a.status !== "active") return false;
      if (values.delivery === "Not delivering" && a.status === "active") return false;
      if (
        values.platform !== DEFAULTS.platform &&
        !platformsOfAd(a.adSetId).includes(values.platform.toLowerCase() as Platform)
      )
        return false;
      return true;
    });
  }, [values]);

  /** The ad set filter narrows to the selected campaign when one is chosen. */
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

  const paged = usePagination(rows, 10);

  return (
    <AdsWorkspace>
      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileImage className="size-4 text-[#1877f2]" aria-hidden="true" />
            <h2 className="text-sm font-bold">Ads</h2>
            <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
              {rows.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => toast.success("Ad export queued.")} className={btn}>
              <Download className="size-3.5" />
              Export
            </button>
            <Link href={`${ADS_ROOT}/create?step=ad`} className={btnPrimary}>
              <Plus className="size-3.5" />
              Create Ad
            </Link>
          </div>
        </div>

        <FilterBar>
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilters({ campaign: v, adset: DEFAULTS.adset })}
            options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
            minWidth={210}
          />
          <FilterSelect
            label="Ad set"
            value={values.adset}
            onChange={(v) => setFilter("adset", v)}
            options={adSetOptions}
            minWidth={190}
          />
          <FilterSelect
            label="Delivery"
            value={values.delivery}
            onChange={(v) => setFilter("delivery", v)}
            options={["All Delivery", "Delivering", "Not delivering"]}
          />
          <FilterSelect
            label="Format"
            value={values.format}
            onChange={(v) => setFilter("format", v)}
            options={["All Formats", "Single Image", "Video", "Carousel", "Existing Post"]}
            minWidth={150}
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
            placeholder="Search ads…"
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
              icon={FileImage}
              title="No ads match these filters"
              description="Try another campaign, ad set or format, or clear the filters."
              compact
            />
          ) : (
            <EmptyState
              icon={FileImage}
              title="Create your first ad"
              description="Ads carry the image or video, the copy and the destination people land on."
              action={{ label: "Create Ad", href: `${ADS_ROOT}/create?step=ad` }}
              secondary={{ label: "Creative specs", href: `${ADS_ROOT}/help?category=ads` }}
            />
          )
        ) : (
          <TableShell minWidth={1560}>
            <thead>
              <tr>
                <Th className="w-14">Creative</Th>
                {["Ad Name", "Campaign", "Ad Set", "Format", "Platforms", "Delivery"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
                {["Spend", "Impressions", "Reach", "Clicks", "CTR", "Leads", "CPL"].map((h) => (
                  <Th key={h} numeric>
                    {h}
                  </Th>
                ))}
                <Th>Last Edited</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paged.visible.map((a) => {
                const creative = getCreative(a.creativeId);
                const campaign = getCampaign(a.campaignId);
                const set = getAdSet(a.adSetId);
                return (
                  <Tr key={a.id}>
                    <Td>
                      <span className="block size-9 overflow-hidden rounded border border-[#e5eaf1] bg-[#f7f9fc]">
                        {creative && (
                          <Image
                            src={creative.src}
                            alt={creative.name}
                            width={36}
                            height={36}
                            className="size-full object-cover"
                          />
                        )}
                      </span>
                    </Td>
                    <Td>
                      <EntityLink href={`${ADS_ROOT}/ads/${a.id}`} name={a.name} sub={a.headline} />
                    </Td>
                    <Td>
                      {campaign && (
                        <Link
                          href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                          className="block max-w-[170px] truncate text-[#0671e9] hover:underline"
                          title={campaign.name}
                        >
                          {campaign.name}
                        </Link>
                      )}
                    </Td>
                    <Td>
                      {set && (
                        <Link
                          href={`${ADS_ROOT}/adsets/${set.id}`}
                          className="block max-w-[160px] truncate text-[#0671e9] hover:underline"
                          title={set.name}
                        >
                          {set.name}
                        </Link>
                      )}
                    </Td>
                    <Td>{a.format}</Td>
                    <Td>
                      <PlatformIcons platforms={platformsOfAd(a.adSetId)} />
                    </Td>
                    <Td>
                      <DeliveryCell status={a.status} />
                    </Td>
                    <Td numeric>{money(a.metrics.spend)}</Td>
                    <Td numeric>{num(a.metrics.impressions)}</Td>
                    <Td numeric>{num(a.metrics.reach)}</Td>
                    <Td numeric>{num(a.metrics.clicks)}</Td>
                    <Td numeric>{orDash(ctr(a.metrics), (v) => pct(v, 2))}</Td>
                    <Td numeric>{num(a.metrics.leads)}</Td>
                    <Td numeric>{orDash(cpl(a.metrics), moneyPrecise)}</Td>
                    <Td>{relative(a.lastEdited)}</Td>
                    <Td>
                      <RowMenu
                        label={`Actions for ${a.name}`}
                        groups={[
                          [
                            { label: "Preview", href: `${ADS_ROOT}/ads/${a.id}` },
                            { label: "Edit", href: `${ADS_ROOT}/create?ad=${a.id}&step=ad` },
                            {
                              label: "Duplicate",
                              onSelect: () => toast.success(`Duplicating “${a.name}”…`),
                            },
                            {
                              label: a.status === "paused" ? "Resume" : "Pause",
                              onSelect: () =>
                                toast.success(
                                  `${a.status === "paused" ? "Resumed" : "Paused"} “${a.name}”`,
                                ),
                            },
                          ],
                          [
                            ...(a.formId
                              ? [{ label: "View Form", href: `${ADS_ROOT}/forms/${a.formId}` }]
                              : []),
                            { label: "View Leads", href: `${ADS_ROOT}/leads?ad=${a.id}` },
                            {
                              label: "View Analytics",
                              href: `${ADS_ROOT}/analytics?campaign=${a.campaignId}`,
                            },
                          ],
                          [
                            {
                              label: "Archive",
                              danger: true,
                              onSelect: () => toast.success(`Archived “${a.name}”`),
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
            noun="ads"
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

export default function AdsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} columns={10} />}>
      <AdsView />
    </Suspense>
  );
}
