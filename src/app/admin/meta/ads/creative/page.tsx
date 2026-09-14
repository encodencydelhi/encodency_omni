"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Images,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  campaigns,
  creatives,
  getAd,
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
} from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  Field,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  Panel,
  RowMenu,
  SearchInput,
  SkeletonTable,
  StatusChip,
  Tag,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Creative } from "@/features/admin/meta-ads/types";
import type { StatusTone as Tone } from "@/features/admin/meta-ads/format";

const DEFAULTS = {
  q: "",
  tab: "all",
  type: "All Types",
  ratio: "All Ratios",
  campaign: "All Campaigns",
  performance: "All Performance",
  creative: "",
};

const TABS = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "carousel", label: "Carousel" },
  { id: "used", label: "Used Creatives" },
];

const PERFORMANCE_TONE: Record<Creative["performance"], Tone> = {
  "Top performer": "green",
  Healthy: "blue",
  Underperforming: "amber",
  "Not used": "slate",
};

function CreativeView() {
  const router = useRouter();
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return creatives.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (values.tab === "images" && c.type !== "Image") return false;
      if (values.tab === "videos" && c.type !== "Video") return false;
      if (values.tab === "carousel" && c.type !== "Carousel") return false;
      if (values.tab === "used" && c.usedInAds.length === 0) return false;
      if (values.type !== DEFAULTS.type && c.type !== values.type) return false;
      if (values.ratio !== DEFAULTS.ratio && c.ratio !== values.ratio) return false;
      if (values.performance !== DEFAULTS.performance && c.performance !== values.performance)
        return false;
      if (values.campaign !== DEFAULTS.campaign) {
        const inCampaign = c.usedInAds.some((adId) => {
          const ad = getAd(adId);
          if (!ad) return false;
          return (
            ad.campaignId === values.campaign ||
            campaigns.find((x) => x.id === ad.campaignId)?.name === values.campaign
          );
        });
        if (!inCampaign) return false;
      }
      return true;
    });
  }, [values]);

  const selected = values.creative ? getCreative(values.creative) : undefined;

  const kpis = useMemo(
    () => ({
      total: creatives.length,
      used: creatives.filter((c) => c.usedInAds.length > 0).length,
      top: creatives.filter((c) => c.performance === "Top performer").length,
      unused: creatives.filter((c) => c.usedInAds.length === 0).length,
    }),
    [],
  );

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <button
          type="button"
          onClick={() => toast.success("Opening the media uploader…")}
          className={cn(btnPrimary, "h-10")}
        >
          <Upload className="size-3.5" />
          Upload Creative
        </button>
      }
    >
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Total Creatives" value={kpis.total} icon={Images} />
        <KpiCard label="In Use" value={kpis.used} icon={Images} tone="blue" />
        <KpiCard label="Top Performers" value={kpis.top} icon={Images} tone="green" />
        <KpiCard label="Unused" value={kpis.unused} icon={Images} tone="slate" />
      </section>

      <div className={cn(selected ? "grid gap-3 xl:grid-cols-[1fr_340px]" : "")}>
        <section className={cn(card, "overflow-hidden")}>
          <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-1">
            <LinkTabs
              tabs={TABS.map((t) => ({
                ...t,
                href:
                  t.id === "all" ? `${ADS_ROOT}/creative` : `${ADS_ROOT}/creative?tab=${t.id}`,
              }))}
              current={values.tab}
              className="border-b-0"
            />
          </div>

          <FilterBar>
            <FilterSelect
              label="Type"
              value={values.type}
              onChange={(v) => setFilter("type", v)}
              options={["All Types", "Image", "Video", "Carousel"]}
            />
            <FilterSelect
              label="Aspect ratio"
              value={values.ratio}
              onChange={(v) => setFilter("ratio", v)}
              options={["All Ratios", "1:1", "4:5", "9:16", "1.91:1"]}
            />
            <FilterSelect
              label="Campaign"
              value={values.campaign}
              onChange={(v) => setFilter("campaign", v)}
              options={[DEFAULTS.campaign, ...campaigns.map((c) => c.name)]}
              minWidth={200}
            />
            <FilterSelect
              label="Performance"
              value={values.performance}
              onChange={(v) => setFilter("performance", v)}
              options={[
                "All Performance",
                "Top performer",
                "Healthy",
                "Underperforming",
                "Not used",
              ]}
              minWidth={170}
            />
            <SearchInput
              placeholder="Search creatives…"
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
            <EmptyState
              icon={Images}
              title={isFiltered ? "No creatives match these filters" : "Upload your first creative"}
              description={
                isFiltered
                  ? "Try another type, ratio or campaign, or clear the filters."
                  : "Reusable images and videos live here. Upload once, then use the same asset across several ads."
              }
              action={
                isFiltered
                  ? undefined
                  : {
                    label: "Upload Creative",
                    onClick: () => toast.success("Opening the media uploader…"),
                  }
              }
              secondary={{ label: "Creative specs", href: `${ADS_ROOT}/help/aspect-ratios` }}
              compact={isFiltered}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {rows.map((c) => (
                <li key={c.id}>
                  <article
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-lg border bg-white transition",
                      values.creative === c.id
                        ? "border-[#1877f2] shadow-[0_0_0_2px_rgba(24,119,242,.12)]"
                        : "border-[#e5eaf1] hover:border-[#bcd9ff]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setFilter("creative", c.id)}
                      className="relative block aspect-square w-full bg-[#f1f5f9]"
                      aria-label={`Preview ${c.name}`}
                    >
                      <Image
                        src={c.src}
                        alt={c.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 220px"
                        className="object-cover"
                      />
                      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                        {c.type}
                      </span>
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                        {c.ratio}
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                      <p className="truncate text-[11px] font-semibold" title={c.name}>
                        {c.name}
                      </p>
                      <p className="text-[9px] text-[#64748b]">
                        {c.dimensions} · {c.fileSize}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <ToneChip tone={PERFORMANCE_TONE[c.performance]}>
                          {c.performance}
                        </ToneChip>
                        <span className="text-[9px] text-[#64748b]">
                          {c.usedInAds.length} ad{c.usedInAds.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setFilter("creative", c.id)}
                          className="text-[10px] font-semibold text-[#0671e9] hover:underline"
                        >
                          Preview
                        </button>
                        <RowMenu
                          label={`Actions for ${c.name}`}
                          groups={[
                            [
                              { label: "Preview", onSelect: () => setFilter("creative", c.id) },
                              { label: "Use in Ad", href: `${ADS_ROOT}/create?creative=${c.id}&step=ad` },
                              {
                                label: "Edit metadata",
                                onSelect: () => toast.success(`Editing “${c.name}”`),
                              },
                              {
                                label: "Duplicate",
                                onSelect: () => toast.success(`Duplicating “${c.name}”…`),
                              },
                            ],
                            [
                              {
                                label: "Download",
                                onSelect: () => toast.success(`Downloading “${c.name}”…`),
                              },
                              {
                                label: "Archive",
                                danger: true,
                                onSelect: () => toast.success(`Archived “${c.name}”`),
                              },
                            ],
                          ]}
                        />
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected && (
          <aside className="space-y-3">
            <Panel
              title={selected.name}
              icon={<Images className="size-4 text-[#1877f2]" />}
              action={
                <button
                  type="button"
                  onClick={() => setFilter("creative", "")}
                  aria-label="Close creative details"
                  className="flex size-6 items-center justify-center rounded-sm border border-[#d8e0ea] text-[#64748b] hover:bg-[#f8fafc]"
                >
                  <X className="size-3.5" />
                </button>
              }
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-[#e5eaf1] bg-[#f7f9fc]">
                <Image src={selected.src} alt={selected.name} fill sizes="320px" className="object-cover" />
              </div>
              <dl className="mt-3">
                <Field label="Type" value={selected.type} />
                <Field label="Aspect ratio" value={selected.ratio} />
                <Field label="Dimensions" value={selected.dimensions} />
                <Field label="File size" value={selected.fileSize} />
                <Field label="Uploaded" value={selected.uploaded} />
                <Field
                  label="Performance"
                  value={<ToneChip tone={PERFORMANCE_TONE[selected.performance]}>{selected.performance}</ToneChip>}
                />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link href={`${ADS_ROOT}/create?creative=${selected.id}&step=ad`} className={btnPrimary}>
                  Use in Ad
                </Link>
                <button
                  type="button"
                  onClick={() => toast.success(`Downloading “${selected.name}”…`)}
                  className={btn}
                >
                  <Download className="size-3.5" />
                  Download
                </button>
              </div>
            </Panel>

            <Panel title="Placement Previews" icon={<Images className="size-4 text-[#1877f2]" />}>
              <ul className="grid grid-cols-3 gap-2">
                {[
                  { label: "Feed 1:1", className: "aspect-square" },
                  { label: "Feed 4:5", className: "aspect-[4/5]" },
                  { label: "Story 9:16", className: "aspect-[9/16]" },
                ].map((variant) => (
                  <li key={variant.label}>
                    <span
                      className={cn(
                        "relative block w-full overflow-hidden rounded border border-[#e5eaf1] bg-[#f1f5f9]",
                        variant.className,
                      )}
                    >
                      <Image src={selected.src} alt="" fill sizes="90px" className="object-cover" />
                    </span>
                    <span className="mt-1 block text-center text-[8px] text-[#64748b]">
                      {variant.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Used in Ads" icon={<Images className="size-4 text-[#1877f2]" />}>
              {selected.usedInAds.length === 0 ? (
                <p className="text-[10px] text-[#94a3b8]">
                  This creative is not attached to any ad yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.usedInAds.map((adId) => {
                    const ad = getAd(adId);
                    if (!ad) return null;
                    return (
                      <li
                        key={adId}
                        className="flex items-center justify-between gap-2 rounded-sm border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2"
                      >
                        <Link
                          href={`${ADS_ROOT}/ads/${ad.id}`}
                          className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
                        >
                          {ad.name}
                        </Link>
                        <StatusChip status={ad.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Performance" icon={<Images className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Spend" value={money(selected.metrics.spend)} />
                <Field label="Impressions" value={num(selected.metrics.impressions)} />
                <Field label="CTR" value={orDash(ctr(selected.metrics), (v) => pct(v, 2))} />
                <Field label="Leads" value={num(selected.metrics.leads)} />
                <Field label="CPL" value={orDash(cpl(selected.metrics), moneyPrecise)} />
              </dl>
              {selected.usedInAds[0] && (
                <button
                  type="button"
                  onClick={() => router.push(`${ADS_ROOT}/ads/${selected.usedInAds[0]}?tab=performance`)}
                  className="mt-2 text-[10px] font-semibold text-[#0671e9] hover:underline"
                >
                  Open full ad performance →
                </button>
              )}
            </Panel>

            <Panel title="Recommended Ratios" icon={<Images className="size-4 text-[#1877f2]" />}>
              <div className="flex flex-wrap gap-1.5">
                {["1:1", "4:5", "9:16", "1.91:1"].map((ratio) => (
                  <Tag key={ratio}>{ratio}</Tag>
                ))}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-[#94a3b8]">
                4:5 for feeds, 9:16 for Stories and Reels, 1.91:1 for right column and in-article.
              </p>
            </Panel>
          </aside>
        )}
      </div>
    </AdsWorkspace>
  );
}

export default function CreativePage() {
  return (
    <Suspense fallback={<SkeletonTable rows={4} columns={5} />}>
      <CreativeView />
    </Suspense>
  );
}
