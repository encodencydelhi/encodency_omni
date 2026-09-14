"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileImage,
  FileText,
  Folder,
  Grid2X2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { adSetsOfCampaign, adsOfCampaign, getCampaign, getForm } from "@/features/admin/meta-ads/data";
import { dateTime, money } from "@/features/admin/meta-ads/format";
import {
  btn,
  btnPrimary,
  card,
  Field,
  Panel,
  SkeletonKpis,
  StatusChip,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { StatusTone } from "@/features/admin/meta-ads/format";

type PublishState = "submitted" | "in_review" | "scheduled" | "active" | "rejected" | "error";

const STATES: Record<
  PublishState,
  {
    tone: StatusTone;
    icon: typeof CheckCircle2;
    title: string;
    body: string;
  }
> = {
  submitted: {
    tone: "green",
    icon: CheckCircle2,
    title: "Campaign Submitted",
    body: "Your campaign has been submitted for Meta review. Most campaigns are reviewed within 24 hours and start delivering automatically once approved.",
  },
  in_review: {
    tone: "amber",
    icon: Clock,
    title: "In Review",
    body: "Meta is reviewing your ads against its advertising policies. Nothing will spend until the review finishes.",
  },
  scheduled: {
    tone: "blue",
    icon: CalendarClock,
    title: "Campaign Scheduled",
    body: "Your campaign passed review and will start delivering on its scheduled start date.",
  },
  active: {
    tone: "green",
    icon: CheckCircle2,
    title: "Campaign Active",
    body: "Your campaign is approved and delivering across Facebook and Instagram.",
  },
  rejected: {
    tone: "red",
    icon: ShieldAlert,
    title: "Campaign Rejected",
    body: "One or more ads did not pass Meta's policy review. Fix the flagged ad and resubmit — the rest of the campaign stays intact.",
  },
  error: {
    tone: "red",
    icon: AlertOctagon,
    title: "Publishing Failed",
    body: "We could not reach Meta while publishing this campaign. Nothing was charged and no ads went live.",
  },
};

function PublishResult() {
  const params = useSearchParams();
  const requested = params?.get("status") as PublishState | null;
  const state: PublishState =
    requested && requested in STATES ? requested : "submitted";
  const campaignId = params?.get("campaign") ?? "cmp-1003";

  const campaign = getCampaign(campaignId);
  const sets = campaign ? adSetsOfCampaign(campaign.id) : [];
  const campaignAds = campaign ? adsOfCampaign(campaign.id) : [];
  const form = campaignAds.find((a) => a.formId)?.formId
    ? getForm(campaignAds.find((a) => a.formId)!.formId!)
    : undefined;

  const meta = STATES[state];
  const Icon = meta.icon;
  const rejectedAd = campaignAds.find((a) => a.status === "rejected");

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <Link href={ADS_ROOT} className={cn(btn, "h-10")}>
          Go to Ads Manager
        </Link>
      }
    >
      <div className="mx-auto max-w-[900px] space-y-3">
        <section className={cn(card, "p-6 text-center")}>
          <span
            className={cn(
              "mx-auto flex size-12 items-center justify-center rounded-full",
              meta.tone === "green"
                ? "bg-[#eefaf3] text-[#087a50]"
                : meta.tone === "amber"
                  ? "bg-[#fffaeb] text-[#b45309]"
                  : meta.tone === "blue"
                    ? "bg-[#eff6ff] text-[#0b5ed7]"
                    : "bg-[#fef3f2] text-[#b42318]",
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-[22px] font-semibold leading-tight">{meta.title}</h1>
          <p className="mx-auto mt-2 max-w-[520px] text-[12px] leading-relaxed text-[#64748b]">
            {meta.body}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {state === "rejected" ? (
              <>
                <Link
                  href={rejectedAd ? `${ADS_ROOT}/ads/${rejectedAd.id}` : `${ADS_ROOT}/issues?tab=policy`}
                  className={btnPrimary}
                >
                  Fix Issue
                </Link>
                <Link href={`${ADS_ROOT}/issues?tab=policy`} className={btn}>
                  View all policy issues
                </Link>
              </>
            ) : state === "error" ? (
              <>
                <button
                  type="button"
                  onClick={() => toast.success("Retrying publish…")}
                  className={btnPrimary}
                >
                  <RefreshCw className="size-3.5" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Error reference PUB-5182", {
                      description:
                        "Meta returned a temporary gateway error while creating the ad set. No spend occurred.",
                    })
                  }
                  className={btn}
                >
                  View Details
                </button>
              </>
            ) : (
              <>
                {campaign && (
                  <Link href={`${ADS_ROOT}/campaigns/${campaign.id}`} className={btnPrimary}>
                    View Campaign
                  </Link>
                )}
                <Link href={ADS_ROOT} className={btn}>
                  Go to Ads Manager
                </Link>
              </>
            )}
          </div>
        </section>

        {state === "rejected" && rejectedAd && (
          <Panel title="Rejection details" icon={<ShieldAlert className="size-4 text-[#b42318]" />}>
            <dl>
              <Field label="Affected ad" value={rejectedAd.name} href={`${ADS_ROOT}/ads/${rejectedAd.id}`} />
              <Field label="Policy category" value="Personal Attributes" />
              <Field
                label="Reason"
                value={
                  <span className="block max-w-[420px] text-right">
                    {rejectedAd.reviewNote ??
                      "The ad copy implies a personal characteristic about the viewer."}
                  </span>
                }
              />
              <Field label="Other ads in this campaign" value={`${campaignAds.length - 1} unaffected`} />
            </dl>
          </Panel>
        )}

        {campaign && (
          <Panel title="What was published" icon={<Folder className="size-4 text-[#1877f2]" />}>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5 rounded-sm border border-[#e8edf4] bg-[#fbfcfe] p-2.5">
                <Folder className="mt-0.5 size-4 shrink-0 text-[#1877f2]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[8px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Campaign
                  </span>
                  <Link
                    href={`${ADS_ROOT}/campaigns/${campaign.id}`}
                    className="block truncate text-[12px] font-semibold text-[#0671e9] hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <span className="block text-[10px] text-[#64748b]">
                    {campaign.objective} · {money(campaign.budget)} {campaign.budgetType.toLowerCase()}
                  </span>
                </span>
                <StatusChip status={campaign.status} />
              </li>

              {sets.map((s) => (
                <li
                  key={s.id}
                  className="ml-4 flex items-start gap-2.5 rounded-sm border border-[#e8edf4] bg-white p-2.5"
                >
                  <Grid2X2 className="mt-0.5 size-4 shrink-0 text-[#1877f2]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Ad Set
                    </span>
                    <Link
                      href={`${ADS_ROOT}/adsets/${s.id}`}
                      className="block truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
                    >
                      {s.name}
                    </Link>
                    <span className="block text-[10px] text-[#64748b]">
                      {s.audienceName} · {s.conversionLocation}
                    </span>
                  </span>
                  <StatusChip status={s.status} />
                </li>
              ))}

              {campaignAds.map((a) => (
                <li
                  key={a.id}
                  className="ml-8 flex items-start gap-2.5 rounded-sm border border-[#e8edf4] bg-white p-2.5"
                >
                  <FileImage className="mt-0.5 size-4 shrink-0 text-[#1877f2]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Ad
                    </span>
                    <Link
                      href={`${ADS_ROOT}/ads/${a.id}`}
                      className="block truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="block text-[10px] text-[#64748b]">{a.format}</span>
                  </span>
                  <StatusChip status={a.status} />
                </li>
              ))}

              {form && (
                <li className="ml-8 flex items-start gap-2.5 rounded-sm border border-[#e8edf4] bg-white p-2.5">
                  <FileText className="mt-0.5 size-4 shrink-0 text-[#1877f2]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Instant Form
                    </span>
                    <Link
                      href={`${ADS_ROOT}/forms/${form.id}`}
                      className="block truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
                    >
                      {form.name}
                    </Link>
                    <span className="block text-[10px] text-[#64748b]">
                      {form.questions.length} questions · {form.type}
                    </span>
                  </span>
                  <StatusChip status={form.status} />
                </li>
              )}
            </ul>

            <dl className="mt-3">
              <Field label="Submitted" value={dateTime(campaign.lastEdited)} />
              <Field label="Submitted by" value={campaign.lastEditedBy} />
              <Field
                label="Review status"
                value={<ToneChip tone={meta.tone}>{meta.title}</ToneChip>}
              />
            </dl>
          </Panel>
        )}

        <Panel title="What happens next" icon={<Clock className="size-4 text-[#1877f2]" />}>
          <ol className="space-y-2">
            {[
              "Meta reviews every ad, creative and instant form against its advertising policies.",
              "Approved ads start delivering on the campaign start date, or immediately if that date has passed.",
              "The learning phase lasts roughly 50 conversions per ad set — avoid editing budgets during it.",
              "Leads flow into the Leads Center as soon as people submit your instant form.",
            ].map((step, i) => (
              <li key={step} className="flex gap-2.5 text-[11px] leading-relaxed">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[9px] font-semibold text-[#475569]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href={`${ADS_ROOT}/leads`} className={btn}>
              Open Leads Center
            </Link>
            <Link href={`${ADS_ROOT}/issues`} className={btn}>
              Check for issues
            </Link>
            <Link href={`${ADS_ROOT}/help?category=campaigns`} className={btn}>
              Campaign help
            </Link>
          </div>
        </Panel>

        <p className="pb-2 text-center text-[10px] text-[#94a3b8]">
          Preview other publish states:{" "}
          {(Object.keys(STATES) as PublishState[]).map((s) => (
            <Link
              key={s}
              href={`${ADS_ROOT}/publish?status=${s}&campaign=${campaignId}`}
              className={cn(
                "mx-1 hover:underline",
                s === state ? "font-semibold text-[#1877f2]" : "text-[#64748b]",
              )}
            >
              {STATES[s].title}
            </Link>
          ))}
        </p>
      </div>
    </AdsWorkspace>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<SkeletonKpis count={4} />}>
      <PublishResult />
    </Suspense>
  );
}
