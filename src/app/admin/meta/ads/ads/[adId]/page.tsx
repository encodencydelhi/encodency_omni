"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Copy,
  Crop,
  Edit3,
  FileText,
  Gauge,
  Image as ImageIcon,
  Link2,
  MousePointerClick,
  Pause,
  Play,
  Radio,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  activityLog,
  getAd,
  getAdSet,
  getCampaign,
  getCreative,
  getForm,
  leadsOf,
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
import { AdPreview } from "@/features/admin/meta-ads/components/previews";
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
  StateNotice,
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
import type { Ranking } from "@/features/admin/meta-ads/types";

const TABS = ["overview", "creative", "placements", "performance", "leads", "activity"] as const;
type Tab = (typeof TABS)[number];

const RANKING_TONE: Record<Ranking, "green" | "slate" | "red"> = {
  "Above average": "green",
  Average: "slate",
  "Below average": "red",
};

function AdDetail({ adId }: { adId: string }) {
  const params = useSearchParams();
  const requested = params?.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "overview";

  const ad = getAd(adId);

  if (!ad) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Ad not found"
          description="This ad may have been archived or deleted. Open the Ads list to see the ads currently in this account."
          backHref={`${ADS_ROOT}/ads`}
          backLabel="Back to Ads"
        />
      </AdsWorkspace>
    );
  }

  const campaign = getCampaign(ad.campaignId);
  const adSet = getAdSet(ad.adSetId);
  const creative = getCreative(ad.creativeId);
  const form = ad.formId ? getForm(ad.formId) : undefined;
  const adLeads = leadsOf({ adId: ad.id });
  const m = ad.metrics;
  const paused = ad.status === "paused";

  const placements = adSet?.placements.filter((p) => p.enabled) ?? [];
  const base = `${ADS_ROOT}/ads/${ad.id}`;

  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "creative", label: "Creative", href: `${base}?tab=creative` },
    { id: "placements", label: "Placements", href: `${base}?tab=placements`, count: placements.length },
    { id: "performance", label: "Performance", href: `${base}?tab=performance` },
    { id: "leads", label: "Leads", href: `${base}?tab=leads`, count: adLeads.length },
    { id: "activity", label: "Activity", href: `${base}?tab=activity` },
  ];

  return (
    <AdsWorkspace
      actions={
        <Link href={`${ADS_ROOT}/create?ad=${ad.id}&step=ad`} className={cn(btnPrimary, "h-10")}>
          <Edit3 className="size-3.5" />
          Edit Ad
        </Link>
      }
    >
      <DetailBar>
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[#64748b]">
          <Link href={ADS_ROOT} className="font-medium hover:text-[#1877f2] hover:underline">
            Meta Ads Manager
          </Link>
          <span aria-hidden="true">/</span>
          {campaign && (
            <>
              <Link href={`${ADS_ROOT}/campaigns/${campaign.id}`} className="font-medium hover:text-[#1877f2] hover:underline">
                {campaign.name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          {adSet && (
            <>
              <Link href={`${ADS_ROOT}/adsets/${adSet.id}`} className="font-medium hover:text-[#1877f2] hover:underline">
                {adSet.name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="font-semibold text-[#14213d]">{ad.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[280px] flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-bold leading-tight">
              {ad.name}
              <StatusChip status={ad.status} />
            </h1>
            <p className="mt-1 text-[11px] text-[#64748b]">
              {ad.format} · {ad.destination} · edited {relative(ad.lastEdited)}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Link href={`${ADS_ROOT}/create?ad=${ad.id}&step=ad`} className={btn}>
              <Edit3 className="size-3.5" />
              Edit
            </Link>
            <button type="button" onClick={() => toast.success(`Duplicating “${ad.name}”…`)} className={btn}>
              <Copy className="size-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => toast.success(`${paused ? "Resumed" : "Paused"} “${ad.name}”`)}
              className={btn}
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <RowMenu
              label="More ad actions"
              groups={[
                [
                  ...(form ? [{ label: "View Form", href: `${ADS_ROOT}/forms/${form.id}` }] : []),
                  { label: "View Leads", href: `${ADS_ROOT}/leads?ad=${ad.id}` },
                  { label: "View Ad Set", href: `${ADS_ROOT}/adsets/${ad.adSetId}` },
                  { label: "Creative help", href: `${ADS_ROOT}/help?category=ads` },
                ],
                [
                  {
                    label: "Archive",
                    danger: true,
                    onSelect: () => toast.success(`Archived “${ad.name}”`),
                  },
                ],
              ]}
            />
          </div>
        </div>
      </DetailBar>

      {ad.status === "rejected" && ad.reviewNote && (
        <StateNotice
          tone="red"
          icon={AlertTriangle}
          title="This ad was rejected by Meta"
          description={ad.reviewNote}
          action={{ label: "Edit creative", href: `${ADS_ROOT}/create?ad=${ad.id}&step=ad` }}
          secondary={{ label: "Policy help", href: `${ADS_ROOT}/help/creative-rejection` }}
        />
      )}
      {ad.status === "in_review" && ad.reviewNote && (
        <StateNotice
          tone="amber"
          icon={AlertTriangle}
          title="In review"
          description={ad.reviewNote}
          secondary={{ label: "What happens in review?", href: `${ADS_ROOT}/help/creative-rejection` }}
        />
      )}

      <LinkTabs
        tabs={tabs}
        current={tab}
        className="my-3 rounded-lg border border-[#dde5ee] bg-white px-2 shadow-[0_1px_4px_rgba(15,23,42,.04)]"
      />

      {tab === "overview" && (
        <div className="grid gap-3 xl:grid-cols-[1fr_360px_300px]">
          {/* LEFT — creative and copy details */}
          <div className="space-y-3">
            <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <KpiCard label="Spend" value={money(m.spend)} icon={WalletCards} />
              <KpiCard label="Impressions" value={num(m.impressions)} icon={BarChart3} />
              <KpiCard label="Reach" value={num(m.reach)} icon={Radio} />
              <KpiCard label="Clicks" value={num(m.clicks)} icon={MousePointerClick} />
              <KpiCard label="CTR" value={orDash(ctr(m), (v) => pct(v, 2))} icon={Activity} />
              <KpiCard label="Leads" value={num(m.leads)} icon={UsersRound} tone="green" />
              <KpiCard label="CPL" value={orDash(cpl(m), moneyPrecise)} icon={Target} />
              <KpiCard label="Conv. Rate" value={orDash(conversionRate(m), (v) => pct(v, 1))} icon={Gauge} />
            </section>

            <Panel title="Ad Copy" icon={<FileText className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Primary Text" value={<span className="block max-w-[420px] text-right">{ad.primaryText}</span>} />
                <Field label="Headline" value={ad.headline} />
                <Field label="Description" value={ad.description || "—"} />
                <Field label="Call to action" value={ad.cta} />
              </dl>
            </Panel>

            <Panel title="Identity & Destination" icon={<Link2 className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Facebook Page" value={ad.page} href={`${ADS_ROOT}/assets`} />
                <Field label="Instagram Business" value={ad.instagramAccount} href={`${ADS_ROOT}/assets`} />
                <Field label="Format" value={ad.format} />
                <Field
                  label="Destination"
                  value={ad.destination}
                  href={form ? `${ADS_ROOT}/forms/${form.id}` : undefined}
                />
              </dl>
            </Panel>

            <Panel title="Tracking" icon={<Target className="size-4 text-[#1877f2]" />}>
              <dl>
                <Field label="Pixel" value={ad.pixel} href={`${ADS_ROOT}/assets#pixel`} />
                <Field
                  label="Events"
                  value={
                    <span className="flex flex-wrap justify-end gap-1">
                      {ad.pixelEvents.map((e) => (
                        <Tag key={e}>{e}</Tag>
                      ))}
                    </span>
                  }
                />
                <Field
                  label="URL parameters"
                  value={<code className="block max-w-[380px] break-all text-right text-[10px]">{ad.utm}</code>}
                />
              </dl>
            </Panel>
          </div>

          {/* CENTRE — preview */}
          <div className="space-y-3">
            <Panel title="Ad Preview" icon={<ImageIcon className="size-4 text-[#1877f2]" />}>
              <AdPreview ad={ad} creative={creative} surface="facebook" />
              <p className="mt-2 text-center text-[9px] text-[#94a3b8]">Facebook Feed</p>
            </Panel>
            <Panel title="Instagram Preview" icon={<ImageIcon className="size-4 text-[#d946ef]" />}>
              <AdPreview ad={ad} creative={creative} surface="instagram" />
              <p className="mt-2 text-center text-[9px] text-[#94a3b8]">Instagram Feed</p>
            </Panel>
          </div>

          {/* RIGHT — delivery, quality, issues */}
          <div className="space-y-3">
            <Panel title="Delivery" icon={<Activity className="size-4 text-[#10b981]" />}>
              <dl>
                <Field label="Status" value={<StatusChip status={ad.status} />} />
                <Field label="Delivery" value={<DeliveryCell status={ad.status} />} />
                <Field label="Campaign" value={campaign?.name ?? "—"} href={campaign ? `${ADS_ROOT}/campaigns/${campaign.id}` : undefined} />
                <Field label="Ad Set" value={adSet?.name ?? "—"} href={adSet ? `${ADS_ROOT}/adsets/${adSet.id}` : undefined} />
                <Field label="Last edited" value={relative(ad.lastEdited)} />
              </dl>
            </Panel>

            <Panel title="Quality Rankings" icon={<Gauge className="size-4 text-[#1877f2]" />}>
              <ul className="space-y-2">
                {(
                  [
                    ["Quality", ad.qualityRanking],
                    ["Engagement rate", ad.engagementRanking],
                    ["Conversion rate", ad.conversionRanking],
                  ] as [string, Ranking][]
                ).map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#64748b]">{label}</span>
                    <ToneChip tone={RANKING_TONE[value]}>{value}</ToneChip>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[9px] leading-relaxed text-[#94a3b8]">
                Rankings compare this ad with others competing for the same audience. They appear once
                the ad reaches 500 impressions.
              </p>
            </Panel>

            {form && (
              <Panel title="Linked Instant Form" icon={<FileText className="size-4 text-[#1877f2]" />}>
                <Link href={`${ADS_ROOT}/forms/${form.id}`} className="block text-[11px] font-bold text-[#0671e9] hover:underline">
                  {form.name}
                </Link>
                <dl className="mt-2">
                  <Field label="Type" value={form.type} />
                  <Field label="Questions" value={form.questions.length} />
                  <Field label="Submissions" value={num(form.submissions)} />
                  <Field
                    label="Completion rate"
                    value={form.opens ? pct((form.submissions / form.opens) * 100, 1) : "—"}
                  />
                </dl>
                {!form.privacyUrl && (
                  <p className="mt-2 rounded-md border border-[#fbcfcb] bg-[#fef3f2] p-2 text-[9px] font-semibold text-[#b42318]">
                    This form has no privacy policy URL.{" "}
                    <Link href={`${ADS_ROOT}/forms/${form.id}`} className="underline">
                      Fix the form
                    </Link>
                    .
                  </p>
                )}
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === "creative" && creative && (
        <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <Panel title="Media" icon={<ImageIcon className="size-4 text-[#1877f2]" />}>
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-[#e5eaf1] bg-[#f7f9fc]">
              <Image src={creative.src} alt={creative.name} fill sizes="320px" className="object-cover" />
            </div>
            <dl className="mt-3">
              <Field label="Creative" value={creative.name} href={`${ADS_ROOT}/creative?creative=${creative.id}`} />
              <Field label="Type" value={creative.type} />
              <Field label="Aspect ratio" value={creative.ratio} />
              <Field label="Dimensions" value={creative.dimensions} />
              <Field label="File size" value={creative.fileSize} />
              <Field label="Uploaded" value={creative.uploaded} />
            </dl>
          </Panel>

          <Panel title="Platform Overrides" icon={<Crop className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
            <TableShell minWidth={620}>
              <thead>
                <tr>
                  <Th>Surface</Th>
                  <Th>Crop</Th>
                  <Th>Recommended ratio</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Facebook Feed", "1:1", "1:1 or 4:5", "Original creative"],
                  ["Instagram Feed", "4:5", "4:5", "Auto-cropped"],
                  ["Facebook & Instagram Stories", "9:16", "9:16", "Auto-cropped"],
                  ["Instagram Reels", "9:16", "9:16", "Auto-cropped"],
                  ["Right column", "1.91:1", "1.91:1", "Auto-cropped"],
                ].map(([surface, crop, recommended, source]) => (
                  <Tr key={surface}>
                    <Td>{surface}</Td>
                    <Td>{crop}</Td>
                    <Td>{recommended}</Td>
                    <Td>
                      <ToneChip tone={source === "Original creative" ? "green" : "slate"}>{source}</ToneChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
            <p className="border-t border-[#eef2f7] px-3 py-2.5 text-[10px] text-[#64748b]">
              Upload a dedicated 9:16 asset for Stories and Reels to avoid automatic cropping.{" "}
              <Link href={`${ADS_ROOT}/help/aspect-ratios`} className="font-semibold text-[#0671e9] hover:underline">
                Aspect ratio guide
              </Link>
            </p>
          </Panel>
        </div>
      )}

      {tab === "placements" && (
        <Panel title="Performance by Placement" icon={<BarChart3 className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
          {placements.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No placements enabled"
              description="Enable Facebook or Instagram placements on the parent ad set to start delivery."
              action={{ label: "Edit ad set", href: `${ADS_ROOT}/adsets/${ad.adSetId}?tab=placements` }}
              compact
            />
          ) : (
            <TableShell minWidth={680}>
              <thead>
                <tr>
                  <Th>Placement</Th>
                  <Th>Platform</Th>
                  <Th numeric>Spend</Th>
                  <Th numeric>Leads</Th>
                  <Th numeric>CPL</Th>
                  <Th>Share</Th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => {
                  const total = placements.reduce((t, x) => t + x.spend, 0) || 1;
                  return (
                    <Tr key={p.placement}>
                      <Td>{p.placement}</Td>
                      <Td>
                        <PlatformMark platform={p.platform} />
                      </Td>
                      <Td numeric>{p.spend > 0 ? money(p.spend) : "—"}</Td>
                      <Td numeric>{p.leads > 0 ? num(p.leads) : "—"}</Td>
                      <Td numeric>{p.leads > 0 ? moneyPrecise(p.spend / p.leads) : "—"}</Td>
                      <Td className="w-[160px]">
                        <Meter value={(p.spend / total) * 100} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableShell>
          )}
        </Panel>
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
                description="This ad has not started spending, so there is nothing to chart."
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
              <Field label="Leads" value={num(m.leads)} />
              <Field label="Conversion rate" value={orDash(conversionRate(m), (v) => pct(v, 1))} />
            </dl>
          </Panel>
        </div>
      )}

      {tab === "leads" && (
        <section className={cn(card, "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
            <h2 className="text-sm font-bold">Leads from this ad ({adLeads.length})</h2>
            <Link href={`${ADS_ROOT}/leads?ad=${ad.id}`} className={btn}>
              Open in Leads Center
            </Link>
          </div>
          {adLeads.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No leads yet"
              description="Leads will appear here once people submit the instant form linked to this ad."
              compact
            />
          ) : (
            <TableShell minWidth={860}>
              <thead>
                <tr>
                  {["Lead", "Contact", "Form", "Stage", "Score", "Owner", "Submitted"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adLeads.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <EntityLink href={`${ADS_ROOT}/leads/${l.id}`} name={l.name} sub={l.id} />
                    </Td>
                    <Td>
                      {l.phone}
                      <span className="block text-[9px] text-[#64748b]">{l.email}</span>
                    </Td>
                    <Td>
                      <Link href={`${ADS_ROOT}/forms/${l.formId}`} className="text-[#0671e9] hover:underline">
                        {getForm(l.formId)?.name ?? l.formId}
                      </Link>
                    </Td>
                    <Td>{l.stage}</Td>
                    <Td>{l.score}</Td>
                    <Td>{l.owner}</Td>
                    <Td>{dateTime(l.submittedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>
      )}

      {tab === "activity" && (
        <section className={cn(card, "overflow-hidden")}>
          <div className="border-b border-[#dde5ee] px-3 py-2.5">
            <h2 className="text-sm font-bold">Activity</h2>
          </div>
          {(() => {
            const rows = activityLog.filter((a) => a.entityLabel === ad.name);
            if (rows.length === 0)
              return (
                <EmptyState
                  icon={Activity}
                  title="No changes recorded"
                  description="Creative, copy and status changes on this ad will appear here."
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
        </section>
      )}
    </AdsWorkspace>
  );
}

export default function Page({ params }: { params: Promise<{ adId: string }> }) {
  const { adId } = use(params);
  return (
    <Suspense fallback={<SkeletonKpis count={8} />}>
      <AdDetail adId={adId} />
    </Suspense>
  );
}
