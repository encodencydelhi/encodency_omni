"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Copy,
  Edit3,
  Globe2,
  Grid2X2,
  MapPin,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Radio,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  activityLog,
  adsOfAdSet,
  getAdSet,
  getCampaign,
  getCreative,
} from "@/features/admin/meta-ads/data";
import {
  conversionRate,
  cpl,
  ctr,
  dateTime,
  money,
  moneyPrecise,
  num,
  orDash,
  pct,
  relative,
} from "@/features/admin/meta-ads/format";
import { PerformanceTrend } from "@/features/admin/meta-ads/components/charts";
import {
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  Field,
  KpiCard,
  LinkTabs,
  Meter,
  NotFoundState,
  Panel,
  PlatformMark,
  RowMenu,
  SkeletonKpis,
  StatusChip,
  TableShell,
  Tag,
  Td,
  Th,
  ToneChip,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
  DetailBar,
} from "@/features/admin/meta-ads/components/workspace";

const TABS = ["overview", "audience", "placements", "ads", "performance", "activity"] as const;
type Tab = (typeof TABS)[number];

function AdSetDetail({ adSetId }: { adSetId: string }) {
  const params = useSearchParams();
  const requested = params?.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "overview";

  const adSet = getAdSet(adSetId);

  if (!adSet) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Ad set not found"
          description="This ad set may have been deleted or archived. Open the Ad Sets list to find the current version."
          backHref={`${ADS_ROOT}/adsets`}
          backLabel="Back to Ad Sets"
        />
      </AdsWorkspace>
    );
  }

  const campaign = getCampaign(adSet.campaignId);
  const setAds = adsOfAdSet(adSet.id);
  const m = adSet.metrics;
  const base = `${ADS_ROOT}/adsets/${adSet.id}`;
  const paused = adSet.status === "paused";

  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "audience", label: "Audience", href: `${base}?tab=audience` },
    { id: "placements", label: "Placements", href: `${base}?tab=placements`, count: adSet.placements.filter((p) => p.enabled).length },
    { id: "ads", label: "Ads", href: `${base}?tab=ads`, count: setAds.length },
    { id: "performance", label: "Performance", href: `${base}?tab=performance` },
    { id: "activity", label: "Activity", href: `${base}?tab=activity` },
  ];

  return (
    <AdsWorkspace
      actions={
        <Link href={`${ADS_ROOT}/create?adset=${adSet.id}&step=ad`} className={cn(btnPrimary, "h-10")}>
          <Plus className="size-3.5" />
          Add Ad
        </Link>
      }
    >
      <DetailBar>
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[#64748b]">
          <Link href={ADS_ROOT} className="font-medium hover:text-[#1877f2] hover:underline">
            Meta Ads Manager
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`${ADS_ROOT}/campaigns`} className="font-medium hover:text-[#1877f2] hover:underline">
            Campaigns
          </Link>
          {campaign && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                className="font-medium hover:text-[#1877f2] hover:underline"
              >
                {campaign.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#14213d]">{adSet.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[280px] flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-bold leading-tight">
              {adSet.name}
              <StatusChip status={adSet.status} />
            </h1>
            <p className="mt-1 text-[11px] text-[#64748b]">
              Ad set in{" "}
              {campaign ? (
                <Link
                  href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                  className="font-semibold text-[#0671e9] hover:underline"
                >
                  {campaign.name}
                </Link>
              ) : (
                "an unknown campaign"
              )}{" "}
              · {adSet.conversionLocation} · {adSet.schedule}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Link href={`${ADS_ROOT}/create?adset=${adSet.id}&step=adset`} className={btn}>
              <Edit3 className="size-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => toast.success(`Duplicating “${adSet.name}”…`)}
              className={btn}
            >
              <Copy className="size-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => toast.success(`${paused ? "Resumed" : "Paused"} “${adSet.name}”`)}
              className={btn}
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <Link href={`${ADS_ROOT}/create?adset=${adSet.id}&step=ad`} className={btn}>
              <Plus className="size-3.5" />
              Add Ad
            </Link>
            <RowMenu
              label="More ad set actions"
              groups={[
                [
                  { label: "View Leads", href: `${ADS_ROOT}/leads?adset=${adSet.id}` },
                  { label: "View Ads", href: `${ADS_ROOT}/ads?adset=${adSet.id}` },
                  { label: "Targeting help", href: `${ADS_ROOT}/help?category=adsets` },
                ],
                [
                  {
                    label: "Archive",
                    danger: true,
                    onSelect: () => toast.success(`Archived “${adSet.name}”`),
                  },
                ],
              ]}
            />
          </div>
        </div>
      </DetailBar>

      <LinkTabs
        tabs={tabs}
        current={tab}
        className="mb-3 rounded-lg border border-[#dde5ee] bg-white px-2 shadow-[0_1px_4px_rgba(15,23,42,.04)]"
      />

      {tab === "overview" && (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-7">
            <KpiCard label="Spend" value={money(m.spend)} icon={WalletCards} />
            <KpiCard label="Reach" value={num(m.reach)} icon={Radio} />
            <KpiCard label="Impressions" value={num(m.impressions)} icon={BarChart3} />
            <KpiCard label="Clicks" value={num(m.clicks)} icon={MousePointerClick} />
            <KpiCard label="CTR" value={orDash(ctr(m), (v) => pct(v, 2))} icon={Activity} />
            <KpiCard label="Leads" value={num(m.leads)} icon={UsersRound} tone="green" />
            <KpiCard label="CPL" value={orDash(cpl(m), moneyPrecise)} icon={Target} />
          </section>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Configuration" icon={<Grid2X2 className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Conversion Location" value={adSet.conversionLocation} />
                <Field label="Performance Goal" value={adSet.performanceGoal} />
                <Field label="Schedule" value={adSet.schedule} />
                <Field label="Budget source" value={adSet.budgetSource} />
                <Field label="Budget" value={`${money(adSet.budget)} ${adSet.budgetType.toLowerCase()}`} />
                <Field label="Attribution" value={adSet.attribution} />
              </dl>
            </Panel>

            <Panel title="Audience Summary" icon={<UsersRound className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Saved audience" value={adSet.audienceName} />
                <Field label="Locations" value={adSet.locations.join(", ")} />
                <Field label="Age" value={adSet.ageRange} />
                <Field label="Gender" value={adSet.gender} />
                <Field label="Languages" value={adSet.languages.join(", ") || "All"} />
                <Field label="Advantage+ audience" value={adSet.audienceExpansion ? "On" : "Off"} />
              </dl>
              <div className="mt-3 rounded-md border border-[#e8edf4] bg-[#fbfcfe] p-2.5">
                <p className="text-[10px] font-semibold text-[#475569]">Estimated audience size</p>
                <p className="mt-0.5 text-sm font-bold">
                  {num(adSet.audienceSize[0])} – {num(adSet.audienceSize[1])}
                </p>
                {adSet.audienceSize[1] < 150000 && (
                  <p className="mt-1 text-[9px] font-semibold text-[#b45309]">
                    This audience is narrow. Ad sets below 150K often leave the learning phase slowly.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Placement Summary" icon={<BarChart3 className="size-4 text-[#1877f2]" />}>
              <ul className="space-y-2">
                {adSet.placements.map((p) => (
                  <li key={p.placement} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <PlatformMark platform={p.platform} />
                      {p.placement}
                    </span>
                    <ToneChip tone={p.enabled ? "green" : "slate"}>
                      {p.enabled ? "Enabled" : "Off"}
                    </ToneChip>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === "audience" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Locations" icon={<MapPin className="size-4 text-[#1877f2]" />}>
            <ul className="space-y-1.5">
              {adSet.locations.map((location) => (
                <li key={location} className="flex items-center gap-2 rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2 text-[11px]">
                  <MapPin className="size-3.5 text-[#64748b]" aria-hidden="true" />
                  {location}
                </li>
              ))}
            </ul>
            <dl className="mt-3">
              <Field label="Age" value={adSet.ageRange} />
              <Field label="Gender" value={adSet.gender} />
              <Field label="Languages" value={adSet.languages.join(", ") || "All languages"} />
            </dl>
          </Panel>

          <Panel title="Detailed Targeting" icon={<Target className="size-4 text-[#1877f2]" />}>
            <p className="text-[10px] font-semibold text-[#475569]">Interests</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {adSet.interests.length > 0 ? (
                adSet.interests.map((i) => <Tag key={i}>{i}</Tag>)
              ) : (
                <span className="text-[10px] text-[#94a3b8]">No interest targeting</span>
              )}
            </div>

            <p className="mt-3 text-[10px] font-semibold text-[#475569]">Custom audiences</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {adSet.customAudiences.length > 0 ? (
                adSet.customAudiences.map((a) => (
                  <Link key={a} href={`${ADS_ROOT}/audiences?tab=custom`}>
                    <Tag>{a}</Tag>
                  </Link>
                ))
              ) : (
                <span className="text-[10px] text-[#94a3b8]">None</span>
              )}
            </div>

            <p className="mt-3 text-[10px] font-semibold text-[#475569]">Lookalike audiences</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {adSet.lookalikes.length > 0 ? (
                adSet.lookalikes.map((a) => (
                  <Link key={a} href={`${ADS_ROOT}/audiences?tab=lookalike`}>
                    <Tag>{a}</Tag>
                  </Link>
                ))
              ) : (
                <span className="text-[10px] text-[#94a3b8]">None</span>
              )}
            </div>

            <p className="mt-3 text-[10px] font-semibold text-[#b42318]">Exclusions</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {adSet.exclusions.length > 0 ? (
                adSet.exclusions.map((a) => <Tag key={a}>{a}</Tag>)
              ) : (
                <span className="text-[10px] text-[#94a3b8]">No exclusions</span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2">
              <span className="text-[10px] font-semibold">Advantage+ audience expansion</span>
              <ToneChip tone={adSet.audienceExpansion ? "green" : "slate"}>
                {adSet.audienceExpansion ? "On" : "Off"}
              </ToneChip>
            </div>
          </Panel>
        </div>
      )}

      {tab === "placements" && (
        <Panel title="Placement Performance" icon={<Globe2 className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
          <TableShell minWidth={720}>
            <thead>
              <tr>
                <Th>Placement</Th>
                <Th>Platform</Th>
                <Th>Status</Th>
                <Th numeric>Spend</Th>
                <Th numeric>Leads</Th>
                <Th numeric>CPL</Th>
                <Th>Share of spend</Th>
              </tr>
            </thead>
            <tbody>
              {adSet.placements.map((p) => {
                const total = adSet.placements.reduce((t, x) => t + x.spend, 0) || 1;
                return (
                  <Tr key={p.placement}>
                    <Td>{p.placement}</Td>
                    <Td>
                      <PlatformMark platform={p.platform} />
                    </Td>
                    <Td>
                      <ToneChip tone={p.enabled ? "green" : "slate"}>
                        {p.enabled ? "Enabled" : "Disabled"}
                      </ToneChip>
                    </Td>
                    <Td numeric>{p.spend > 0 ? money(p.spend) : "—"}</Td>
                    <Td numeric>{p.leads > 0 ? num(p.leads) : "—"}</Td>
                    <Td numeric>
                      {p.leads > 0 ? moneyPrecise(p.spend / p.leads) : "—"}
                    </Td>
                    <Td className="w-[160px]">
                      <Meter value={(p.spend / total) * 100} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>
        </Panel>
      )}

      {tab === "ads" && (
        <section className={cn(card, "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
            <h2 className="text-sm font-bold">Ads in this ad set ({setAds.length})</h2>
            <div className="flex gap-1.5">
              <Link href={`${ADS_ROOT}/ads?adset=${adSet.id}`} className={btn}>
                Open in Ads
              </Link>
              <Link href={`${ADS_ROOT}/create?adset=${adSet.id}&step=ad`} className={btnPrimary}>
                <Plus className="size-3.5" />
                Create Ad
              </Link>
            </div>
          </div>
          {setAds.length === 0 ? (
            <EmptyState
              icon={Grid2X2}
              title="Create your first ad"
              description="An ad set can hold several ads. Meta will shift budget toward whichever creative performs best."
              action={{ label: "Create Ad", href: `${ADS_ROOT}/create?adset=${adSet.id}&step=ad` }}
            />
          ) : (
            <TableShell minWidth={1000}>
              <thead>
                <tr>
                  <Th className="w-14">Creative</Th>
                  <Th>Ad Name</Th>
                  <Th>Format</Th>
                  <Th>Destination</Th>
                  <Th>Delivery</Th>
                  <Th numeric>Spend</Th>
                  <Th numeric>CTR</Th>
                  <Th numeric>Leads</Th>
                  <Th numeric>CPL</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {setAds.map((a) => {
                  const creative = getCreative(a.creativeId);
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <span className="block size-9 overflow-hidden rounded border border-[#e5eaf1] bg-[#f7f9fc]">
                          {creative && (
                            <Image src={creative.src} alt="" width={36} height={36} className="size-full object-cover" />
                          )}
                        </span>
                      </Td>
                      <Td>
                        <EntityLink href={`${ADS_ROOT}/ads/${a.id}`} name={a.name} sub={a.headline} />
                      </Td>
                      <Td>{a.format}</Td>
                      <Td>
                        {a.formId ? (
                          <Link href={`${ADS_ROOT}/forms/${a.formId}`} className="text-[#0671e9] hover:underline">
                            {a.destination}
                          </Link>
                        ) : (
                          <span className="block max-w-[200px] truncate">{a.destination}</span>
                        )}
                      </Td>
                      <Td>
                        <DeliveryCell status={a.status} />
                      </Td>
                      <Td numeric>{money(a.metrics.spend)}</Td>
                      <Td numeric>{orDash(ctr(a.metrics), (v) => pct(v, 2))}</Td>
                      <Td numeric>{num(a.metrics.leads)}</Td>
                      <Td numeric>{orDash(cpl(a.metrics), moneyPrecise)}</Td>
                      <Td>
                        <RowMenu
                          label={`Actions for ${a.name}`}
                          groups={[
                            [
                              { label: "View Ad", href: `${ADS_ROOT}/ads/${a.id}` },
                              { label: "View Leads", href: `${ADS_ROOT}/leads?ad=${a.id}` },
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
      )}

      {tab === "performance" && (
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Spend, Leads and CPL" icon={<Activity className="size-4 text-[#1877f2]" />}>
            {m.impressions > 0 ? (
              <PerformanceTrend height={260} />
            ) : (
              <EmptyState
                icon={Activity}
                title="No delivery data yet"
                description="This ad set has not started spending. Charts appear once Meta begins delivery."
                compact
              />
            )}
          </Panel>
          <Panel title="Efficiency" icon={<Target className="size-4 text-[#1877f2]" />}>
            <dl>
              <Field label="CPM" value={orDash(m.impressions ? (m.spend / m.impressions) * 1000 : 0, moneyPrecise)} />
              <Field label="CPC" value={orDash(m.clicks ? m.spend / m.clicks : 0, moneyPrecise)} />
              <Field label="CPL" value={orDash(cpl(m), moneyPrecise)} />
              <Field label="CTR" value={orDash(ctr(m), (v) => pct(v, 2))} />
              <Field label="Lead conversion rate" value={orDash(conversionRate(m), (v) => pct(v, 1))} />
              <Field label="Ads running" value={setAds.filter((a) => a.status === "active").length} />
            </dl>
          </Panel>
        </div>
      )}

      {tab === "activity" && (
        <section className={cn(card, "overflow-hidden")}>
          <div className="border-b border-[#dde5ee] px-3 py-2.5">
            <h2 className="text-sm font-bold">Activity</h2>
          </div>
          {(() => {
            const rows = activityLog.filter((a) => a.entityLabel === adSet.name);
            if (rows.length === 0)
              return (
                <EmptyState
                  icon={Activity}
                  title="No changes recorded"
                  description="Budget, targeting and placement changes on this ad set will appear here."
                  compact
                />
              );
            return (
              <ol className="divide-y divide-[#eef2f7]">
                {rows.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5">
                    <span className="w-[150px] shrink-0 text-[10px] text-[#64748b]">{dateTime(a.at)}</span>
                    <span className="min-w-[200px] flex-1 text-[11px] font-semibold">
                      {a.action}
                      <span className="mt-0.5 block text-[10px] font-normal text-[#64748b]">
                        {a.user} · {a.source}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {a.oldValue && <Tag>{a.oldValue}</Tag>}
                      <span aria-hidden="true">→</span>
                      {a.newValue && <Tag>{a.newValue}</Tag>}
                    </span>
                  </li>
                ))}
              </ol>
            );
          })()}
          <div className="border-t border-[#dde5ee] px-3 py-2.5">
            <Link href={`${ADS_ROOT}/activity`} className="text-[10px] font-semibold text-[#1877f2] hover:underline">
              Open full audit log →
            </Link>
          </div>
        </section>
      )}

      <p className="mt-3 text-[10px] text-[#94a3b8]">
        Last edited {relative(adSet.lastEdited)}.
      </p>
    </AdsWorkspace>
  );
}

export default function Page({ params }: { params: Promise<{ adSetId: string }> }) {
  const { adSetId } = use(params);
  return (
    <Suspense fallback={<SkeletonKpis count={7} />}>
      <AdSetDetail adSetId={adSetId} />
    </Suspense>
  );
}
