"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, Navigation, Phone, Printer, Search, Sparkles, TrendingDown, TrendingUp, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BarList, ChartLegend, KpiCard, TrendChart } from "../components/charts";
import { downloadCsv } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InternalBadge,
  PageTitle,
  Segmented,
  SelectMenu,
  SortHeader,
  Stars,
  UnderlineTabs,
  buttonClass,
  tdClass,
  thClass,
  type SortDir,
} from "../components/ui";
import { useKeywords, useLocationScope, useMetrics, usePeriod, useQueryState } from "../data/hooks";
import { ALL_LOCATIONS, buildMetricSeries, periodDays, sumMetric } from "../data/selectors";
import { METRICS, METRIC_ORDER, gbRoutes, type MetricKey } from "../lib/constants";
import { changePct, compact, percent, rating as fmtRating } from "../lib/format";
import { useGbp } from "../store/gbp-store";

type PerformanceTab = "overview" | "search" | "actions" | "locations" | "trends";

const DEFAULTS = { tab: "overview", metric: "searchImpressions", compare: "1", granularity: "daily" };

const ACTION_METRICS: MetricKey[] = ["callClicks", "websiteClicks", "directionRequests"];

export function PerformancePage() {
  const { can } = useGbp();
  if (!can.canViewPerformance.allowed) {
    return (
      <div className="space-y-1">
        <PageTitle title="Performance" description="How customers find and act on your Business Profile." />
        <Card>
          <CapabilityState capability={can.canViewPerformance} title="Performance data unavailable" />
        </Card>
      </div>
    );
  }
  return <PerformanceWorkspace />;
}

export function PerformanceWorkspace({ lockedLocationId }: { lockedLocationId?: string }) {
  const { locations, reviews } = useGbp();
  const { scopedIds, selected } = useLocationScope();
  const { period, days, label } = usePeriod();
  const { values, set } = useQueryState(DEFAULTS);
  const ids = lockedLocationId ? [lockedLocationId] : scopedIds;
  const metrics = useMetrics(ids, period);
  const keywords = useKeywords(ids);
  const tab = values.tab as PerformanceTab;
  const metric = (METRIC_ORDER.includes(values.metric as MetricKey) ? values.metric : "searchImpressions") as MetricKey;
  const compare = values.compare === "1";
  const granularity = (values.granularity === "monthly" && days < 90 ? "weekly" : values.granularity) as "daily" | "weekly" | "monthly";

  const hasBookings = metrics.total("bookings") > 0;
  const visibleMetrics = METRIC_ORDER.filter((key) => key !== "bookings" || hasBookings);

  const exportCsv = () => {
    downloadCsv(
      [
        ["Date", ...visibleMetrics.map((key) => METRICS[key].label)],
        ...metrics.current.map((point) => [format(parseISO(point.date), "yyyy-MM-dd"), ...visibleMetrics.map((key) => point.values[key])]),
      ],
      `google-business-performance-${period}.csv`,
    );
  };

  return (
    <div className="space-y-1">
      <PageTitle
        title="Performance"
        description={`${label} compared with the previous ${days} days${lockedLocationId ? "" : selected === ALL_LOCATIONS ? " · all locations" : ""}`}
        actions={
          <ActionMenu
            label="Export performance"
            trigger={
              <button type="button" className={buttonClass("secondary", "md")}>
                <Download className="size-4" />
                Export
              </button>
            }
            items={[
              { label: "Download CSV", icon: Download, onSelect: exportCsv },
              { label: "Print / save as PDF", icon: Printer, onSelect: () => window.print() },
            ]}
          />
        }
      />

      <Card>
        <div className="border-b border-[#F1F3F4] px-3 pt-1">
          <UnderlineTabs<PerformanceTab>
            label="Performance sections"
            value={tab}
            onChange={(value) => set({ tab: value })}
            items={[
              { value: "overview", label: "Overview" },
              { value: "search", label: "Search" },
              { value: "actions", label: "Customer actions" },
              ...(lockedLocationId ? [] : [{ value: "locations" as const, label: "Locations" }]),
              { value: "trends", label: "Trends" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-[#DADCE0] bg-white px-2.5 text-[12px] font-medium text-[#3C4043]">
            <input type="checkbox" checked={compare} onChange={(event) => set({ compare: event.target.checked ? "1" : "0" })} className="size-3.5 accent-[#1A73E8]" />
            Compare to previous period
          </label>
          <SelectMenu
            label="Granularity"
            prefix="View:"
            value={granularity}
            onChange={(value) => set({ granularity: value })}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly", disabled: days < 90, description: days < 90 ? "Needs 90 days" : undefined },
            ]}
          />
          <span className="text-[11.5px] text-[#80868B]">Google reports performance with a 2-3 day delay.</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {visibleMetrics.map((key) => (
          <KpiCard
            key={key}
            label={METRICS[key].label}
            value={metrics.total(key)}
            previous={compare ? metrics.previousTotal(key) : undefined}
            spark={metrics.spark(key)}
            color={METRICS[key].color}
            active={metric === key}
            onClick={() => set({ metric: key })}
            hint={compare ? undefined : METRICS[key].help}
          />
        ))}
      </div>

      {tab === "overview" && (
        <>
          <Card>
            <CardHeader
              title="Performance trend"
              description={METRICS[metric].help}
              actions={
                <Segmented<MetricKey>
                  label="Trend metric"
                  value={metric}
                  onChange={(value) => set({ metric: value })}
                  className="max-w-full overflow-x-auto"
                  items={visibleMetrics.map((key) => ({ value: key, label: METRICS[key].short }))}
                />
              }
            />
            <div className="px-4 pb-4">
              <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, ...(compare ? [{ label: "Previous period", color: "#DADCE0", dashed: true }] : [])]} />
              <div className="mt-2">
                <TrendChart current={metrics.current} previous={metrics.previous} metrics={[metric]} granularity={granularity} compare={compare} height={280} />
              </div>
            </div>
          </Card>
          <div className="grid gap-1 xl:grid-cols-12">
            <SearchCard className="xl:col-span-6" keywords={keywords} />
            <ActionsCard className="xl:col-span-6" metrics={metrics} compare={compare} />
          </div>
        </>
      )}

      {tab === "search" && (
        <>
          <Card>
            <CardHeader title="Search and Maps impressions" description="Where your profile was shown" />
            <div className="px-4 pb-4">
              <ChartLegend items={[{ label: "Search", color: METRICS.searchImpressions.color }, { label: "Maps", color: METRICS.mapsImpressions.color }]} />
              <div className="mt-2">
                <TrendChart current={metrics.current} previous={metrics.previous} metrics={["searchImpressions", "mapsImpressions"]} granularity={granularity} compare={false} height={260} />
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Search queries"
              description="What people searched before your profile appeared. Google reports these monthly."
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Download}
                  onClick={() =>
                    downloadCsv(
                      [["Query", "Location", "Impressions", "Previous", "Threshold"], ...keywords.map((keyword) => [keyword.query, locations.find((l) => l.locationId === keyword.locationId)?.profile.title ?? "", keyword.impressions, keyword.previousImpressions ?? "", keyword.isThreshold ? "Yes" : "No"])],
                      "google-business-search-queries.csv",
                    )
                  }
                >
                  Export
                </Button>
              }
            />
            {keywords.length === 0 ? (
              <EmptyState compact icon={Search} title="No search data yet" description="Google needs enough impressions in a month before it reports search keywords." />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr>
                      <th className={cn(thClass, "static pl-4")}>Query</th>
                      <th className={cn(thClass, "static")}>Location</th>
                      <th className={cn(thClass, "static text-right")}>Impressions</th>
                      <th className={cn(thClass, "static pr-4 text-right")}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((keyword) => {
                      const change = changePct(keyword.impressions, keyword.previousImpressions);
                      return (
                        <tr key={`${keyword.query}-${keyword.locationId}`} className="hover:bg-[#F8F9FA]">
                          <td className={cn(tdClass, "pl-4 font-medium text-[#202124]")}>
                            {keyword.query}
                            {keyword.isThreshold && (
                              <Badge tone="neutral" className="ml-2">
                                Below Google threshold
                              </Badge>
                            )}
                          </td>
                          <td className={cn(tdClass, "max-w-[220px] truncate")}>{locations.find((location) => location.locationId === keyword.locationId)?.profile.title}</td>
                          <td className={cn(tdClass, "text-right font-medium tabular-nums text-[#202124]")}>{keyword.isThreshold ? "20 or fewer" : compact(keyword.impressions)}</td>
                          <td className={cn(tdClass, "pr-4 text-right")}>
                            {change === null ? (
                              <span className="text-[#80868B]">-</span>
                            ) : (
                              <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium tabular-nums", change >= 0 ? "text-[#137333]" : "text-[#C5221F]")}>
                                {change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                {Math.abs(change).toFixed(0)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "actions" && (
        <>
          <Card>
            <CardHeader title="Customer actions" description="Calls, website clicks and direction requests over time" />
            <div className="px-4 pb-4">
              <ChartLegend items={ACTION_METRICS.map((key) => ({ label: METRICS[key].label, color: METRICS[key].color }))} />
              <div className="mt-2">
                <TrendChart current={metrics.current} previous={metrics.previous} metrics={ACTION_METRICS} granularity={granularity} compare={false} height={280} />
              </div>
            </div>
          </Card>
          <ActionsCard metrics={metrics} compare={compare} />
        </>
      )}

      {tab === "locations" && !lockedLocationId && <LocationComparison period={period} />}

      {tab === "trends" && <TrendInsights metrics={metrics} reviewsCount={reviews.length} label={label} />}
    </div>
  );
}

function SearchCard({ className, keywords }: { className?: string; keywords: ReturnType<typeof useKeywords> }) {
  return (
    <Card className={className}>
      <CardHeader title="Top search queries" description="Monthly impressions reported by Google" actions={<Link href={`${gbRoutes.performance}?tab=search`} className="text-[12px] font-medium text-[#1A73E8] hover:underline">All queries</Link>} />
      <div className="px-4 pb-4">
        {keywords.length === 0 ? (
          <EmptyState compact icon={Search} title="No search data yet" description="Google reports keywords once a profile has enough impressions." />
        ) : (
          <BarList data={keywords.slice(0, 7).map((keyword) => ({ label: keyword.query, value: keyword.impressions }))} />
        )}
      </div>
    </Card>
  );
}

function ActionsCard({ className, metrics, compare }: { className?: string; metrics: ReturnType<typeof useMetrics>; compare: boolean }) {
  const icons = { callClicks: Phone, websiteClicks: LinkIcon, directionRequests: Navigation };
  const total = ACTION_METRICS.reduce((sum, key) => sum + metrics.total(key), 0);
  return (
    <Card className={className}>
      <CardHeader title="Customer actions" description={`${compact(total)} actions in this period`} />
      <div className="space-y-2 px-4 pb-4">
        {ACTION_METRICS.map((key) => {
          const value = metrics.total(key);
          const previous = metrics.previousTotal(key);
          const change = changePct(value, previous);
          const Icon = icons[key as keyof typeof icons];
          return (
            <div key={key} className="flex items-center gap-1 rounded-lg border border-[#F1F3F4] px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${METRICS[key].color}14`, color: METRICS[key].color }}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-[#5F6368]">{METRICS[key].label}</span>
                <span className="block text-[17px] font-medium leading-6 tabular-nums text-[#202124]">{compact(value)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[11.5px] text-[#80868B]">{percent(total ? (value / total) * 100 : 0, 0)} of actions</span>
                {compare && change !== null && (
                  <span className={cn("text-[11.5px] font-medium tabular-nums", change >= 0 ? "text-[#137333]" : "text-[#C5221F]")}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <p className="text-[11.5px] leading-4 text-[#80868B]">Bookings appear only for businesses with a Google booking provider. Messages are not available through the API.</p>
      </div>
    </Card>
  );
}

function LocationComparison({ period }: { period: ReturnType<typeof usePeriod>["period"] }) {
  const { locations, performance, reviews } = useGbp();
  const [sort, setSort] = useState<string>("searchImpressions");
  const [dir, setDir] = useState<SortDir>("desc");
  const days = periodDays(period);

  const rows = useMemo(
    () =>
      locations.map((location) => {
        const series = buildMetricSeries(performance, [location.locationId], days);
        const locationReviews = reviews.filter((review) => review.locationId === location.locationId);
        return {
          location,
          searchImpressions: sumMetric(series, "searchImpressions"),
          mapsImpressions: sumMetric(series, "mapsImpressions"),
          callClicks: sumMetric(series, "callClicks"),
          websiteClicks: sumMetric(series, "websiteClicks"),
          directionRequests: sumMetric(series, "directionRequests"),
          reviews: locationReviews.length,
          rating: location.rating,
        };
      }),
    [locations, performance, days, reviews],
  );

  const sorted = useMemo(() => {
    const value = (row: (typeof rows)[number]) => (sort === "rating" ? row.rating ?? -1 : sort === "reviews" ? row.reviews : (row[sort as keyof typeof row] as number));
    return [...rows].sort((a, b) => (dir === "desc" ? value(b) - value(a) : value(a) - value(b)));
  }, [rows, sort, dir]);

  const toggle = (key: string) => {
    if (sort === key) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setDir("desc");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Location comparison"
        description="Same period, every location side by side"
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() =>
              downloadCsv(
                [
                  ["Location", "Rating", "Reviews", "Search impressions", "Maps impressions", "Calls", "Website clicks", "Directions"],
                  ...sorted.map((row) => [row.location.profile.title, row.rating ?? "", row.reviews, row.searchImpressions, row.mapsImpressions, row.callClicks, row.websiteClicks, row.directionRequests]),
                ],
                "google-business-location-comparison.csv",
              )
            }
          >
            Export
          </Button>
        }
      />
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className={cn(thClass, "pl-4")}>Location</th>
              <SortHeader label="Rating" align="right" active={sort === "rating"} dir={dir} onClick={() => toggle("rating")} />
              <SortHeader label="Reviews" align="right" active={sort === "reviews"} dir={dir} onClick={() => toggle("reviews")} />
              <SortHeader label="Search" align="right" active={sort === "searchImpressions"} dir={dir} onClick={() => toggle("searchImpressions")} />
              <SortHeader label="Maps" align="right" active={sort === "mapsImpressions"} dir={dir} onClick={() => toggle("mapsImpressions")} />
              <SortHeader label="Calls" align="right" active={sort === "callClicks"} dir={dir} onClick={() => toggle("callClicks")} />
              <SortHeader label="Website" align="right" active={sort === "websiteClicks"} dir={dir} onClick={() => toggle("websiteClicks")} />
              <SortHeader className="pr-4" label="Directions" align="right" active={sort === "directionRequests"} dir={dir} onClick={() => toggle("directionRequests")} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.location.locationId} className="group hover:bg-[#F8F9FA]">
                <td className={cn(tdClass, "max-w-[280px] pl-4")}>
                  <Link href={gbRoutes.location(row.location.locationId)} className="block truncate font-medium text-[#202124] group-hover:text-[#1A73E8]">
                    {row.location.profile.title}
                  </Link>
                  <span className="block truncate text-[11.5px] text-[#5F6368]">{row.location.profile.address.locality}</span>
                </td>
                <td className={cn(tdClass, "text-right")}>
                  {row.rating === null ? <span className="text-[#80868B]">-</span> : <span className="inline-flex items-center gap-1 font-medium tabular-nums">{fmtRating(row.rating)}<Stars rating={row.rating} size={11} /></span>}
                </td>
                <td className={cn(tdClass, "text-right tabular-nums")}>{row.reviews}</td>
                <td className={cn(tdClass, "text-right font-medium tabular-nums text-[#202124]")}>{compact(row.searchImpressions)}</td>
                <td className={cn(tdClass, "text-right tabular-nums")}>{compact(row.mapsImpressions)}</td>
                <td className={cn(tdClass, "text-right tabular-nums")}>{compact(row.callClicks)}</td>
                <td className={cn(tdClass, "text-right tabular-nums")}>{compact(row.websiteClicks)}</td>
                <td className={cn(tdClass, "pr-4 text-right tabular-nums")}>{compact(row.directionRequests)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TrendInsights({ metrics, reviewsCount, label }: { metrics: ReturnType<typeof useMetrics>; reviewsCount: number; label: string }) {
  const insights = METRIC_ORDER.filter((key) => key !== "bookings").map((key) => {
    const value = metrics.total(key);
    const previous = metrics.previousTotal(key);
    const change = changePct(value, previous);
    return { key, value, previous, change };
  });
  const movers = [...insights].filter((item) => item.change !== null).sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!));

  return (
    <div className="grid gap-1 xl:grid-cols-12">
      <Card className="xl:col-span-7">
        <CardHeader
          title="What changed"
          badge={<InternalBadge label="OmniPlatform Insight" hint="Written by OmniPlatform from the Google metrics above. Not a Google feature." />}
          description={`${label} vs the previous period`}
        />
        <ul className="space-y-2 px-4 pb-4">
          {movers.map((item) => (
            <li key={item.key} className="flex items-start gap-1 rounded-lg border border-[#F1F3F4] px-3 py-2.5">
              <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", (item.change ?? 0) >= 0 ? "bg-[#E6F4EA] text-[#137333]" : "bg-[#FCE8E6] text-[#C5221F]")}>
                {(item.change ?? 0) >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              </span>
              <p className="text-[12.5px] leading-5 text-[#3C4043]">
                <b className="font-medium text-[#202124]">
                  {METRICS[item.key].label} {(item.change ?? 0) >= 0 ? "increased" : "decreased"} {Math.abs(item.change ?? 0).toFixed(1)}%
                </b>{" "}
                to {compact(item.value)} from {compact(item.previous)} in the previous period.
                {item.key === "callClicks" && (item.change ?? 0) < 0 && " Check that phone numbers and opening hours are correct on every location."}
                {item.key === "searchImpressions" && (item.change ?? 0) > 0 && " More impressions usually follow new posts, photos and fresh reviews."}
              </p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="xl:col-span-5">
        <CardHeader title="Conversion snapshot" description="How impressions turned into actions" />
        <div className="space-y-1 px-4 pb-4">
          {ACTION_METRICS.map((key) => {
            const impressions = metrics.total("searchImpressions") + metrics.total("mapsImpressions");
            const value = metrics.total(key);
            const rate = impressions ? (value / impressions) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[#3C4043]">{METRICS[key].label} per impression</span>
                  <b className="font-medium tabular-nums text-[#202124]">{rate.toFixed(2)}%</b>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F1F3F4]">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, rate * 12)}%`, background: METRICS[key].color }} />
                </div>
              </div>
            );
          })}
          <p className="flex items-start gap-1.5 border-t border-[#F1F3F4] pt-3 text-[11.5px] leading-4 text-[#5F6368]">
            <Sparkles className="mt-px size-3 shrink-0 text-[#8430CE]" />
            <span>
              OmniPlatform insight: profiles with more than 10 photos and a reply rate above 80% usually convert impressions into directions at a higher rate. You have {reviewsCount} reviews synced.
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}
