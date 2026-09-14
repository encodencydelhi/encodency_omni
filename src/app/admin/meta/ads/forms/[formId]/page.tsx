"use client";

import Link from "next/link";
import { use } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleHelp,
  Copy,
  Edit3,
  FileText,
  Percent,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  adsOfForm,
  campaignsOfForm,
  getForm,
  leadsOf,
} from "@/features/admin/meta-ads/data";
import { dateTime, num, pct, relative } from "@/features/admin/meta-ads/format";
import { InstantFormPreview } from "@/features/admin/meta-ads/components/previews";
import {
  Breadcrumb,
  btn,
  btnPrimary,
  card,
  DeliveryCell,
  EmptyState,
  EntityLink,
  Field,
  KpiCard,
  Meter,
  NotFoundState,
  Panel,
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

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const form = getForm(formId);

  if (!form) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Form has been deleted"
          description="This instant form is no longer available. Any ads that used it will need a new form before they can run."
          backHref={`${ADS_ROOT}/forms`}
          backLabel="Back to Instant Forms"
          secondary={{ label: "Create a form", href: `${ADS_ROOT}/create?step=form` }}
        />
      </AdsWorkspace>
    );
  }

  const linkedCampaigns = campaignsOfForm(form.id);
  const linkedAds = adsOfForm(form.id);
  const formLeads = leadsOf({ formId: form.id });

  const completion = form.opens ? (form.submissions / form.opens) * 100 : 0;
  const qualified = form.submissions ? (form.qualified / form.submissions) * 100 : 0;
  const dropOff = 100 - completion;

  /** Where people abandon the form, question by question. */
  const questionDropOff = form.questions.map((q, i) => {
    const previous = i === 0 ? form.opens : form.questions[i - 1]!.completions;
    const lost = Math.max(previous - q.completions, 0);
    return {
      ...q,
      lost,
      lostPct: previous > 0 ? (lost / previous) * 100 : 0,
    };
  });
  const worst = [...questionDropOff].sort((a, b) => b.lostPct - a.lostPct)[0];

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <Link href={`${ADS_ROOT}/create?form=${form.id}&step=ad`} className={cn(btnPrimary, "h-10")}>
          Use in Ad
        </Link>
      }
    >
      <DetailBar>
        <Breadcrumb
          items={[
            { label: "Meta Ads Manager", href: ADS_ROOT },
            { label: "Instant Forms", href: `${ADS_ROOT}/forms` },
            { label: form.name },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[280px] flex-1">
            <h1 className="flex flex-wrap items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
              {form.name}
              <StatusChip status={form.status} />
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {form.type} · {form.language} · {form.questions.length} questions · updated{" "}
              {relative(form.lastUpdated)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`${ADS_ROOT}/create?form=${form.id}&step=form`} className={btn}>
              <Edit3 className="size-3.5" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => toast.success(`Duplicating “${form.name}”…`)}
              className={btn}
            >
              <Copy className="size-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => toast.success(`Archived “${form.name}”`)}
              className={btn}
            >
              <Archive className="size-3.5" />
              Archive
            </button>
            <Link href={`${ADS_ROOT}/leads?form=${form.id}`} className={btn}>
              View Leads
            </Link>
            <Link href={`${ADS_ROOT}/help?category=forms`} className={btn}>
              <CircleHelp className="size-3.5" />
              Help
            </Link>
          </div>
        </div>
      </DetailBar>

      {!form.privacyUrl && (
        <StateNotice
          tone="red"
          icon={AlertTriangle}
          title="Privacy policy URL missing"
          description="Meta requires a privacy policy URL on every lead form. This form cannot go live until one is added."
          action={{ label: "Fix Form", href: `${ADS_ROOT}/create?form=${form.id}&step=form` }}
          secondary={{ label: "Privacy help", href: `${ADS_ROOT}/help/form-privacy` }}
        />
      )}

      <section className="my-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Submissions" value={num(form.submissions)} icon={UsersRound} tone="green" />
        <KpiCard
          label="Completion Rate"
          value={form.opens ? pct(completion, 1) : "—"}
          icon={Percent}
          sub={form.opens ? `${num(form.opens)} form opens` : "No opens yet"}
        />
        <KpiCard
          label="Qualified Rate"
          value={form.submissions ? pct(qualified, 1) : "—"}
          icon={CheckCircle2}
          sub={`${num(form.qualified)} qualified leads`}
        />
        <KpiCard
          label="Drop-off Rate"
          value={form.opens ? pct(dropOff, 1) : "—"}
          icon={TrendingDown}
          tone={dropOff > 45 ? "red" : dropOff > 30 ? "amber" : "green"}
        />
      </section>

      <div className="grid gap-3 xl:grid-cols-[1fr_340px_1fr]">
        {/* LEFT — setup summary */}
        <div className="space-y-3">
          <Panel title="Form Setup" icon={<FileText className="size-4 text-[#1877f2]" />}>
            <dl>
              <Field label="Form Type" value={form.type} />
              <Field label="Language" value={form.language} />
              <Field label="Intro headline" value={form.introHeadline} />
              <Field
                label="Intro body"
                value={<span className="block max-w-[300px] text-right">{form.introBody}</span>}
              />
            </dl>
          </Panel>

          <Panel title={`Questions (${form.questions.length})`} icon={<FileText className="size-4 text-[#1877f2]" />}>
            <ol className="space-y-1.5">
              {form.questions.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-center gap-2.5 rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[9px] font-semibold text-[#475569]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">{q.label}</span>
                    <span className="block text-[9px] text-[#64748b]">{q.type}</span>
                  </span>
                  {q.required && <ToneChip tone="blue">Required</ToneChip>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Qualification & Privacy" icon={<ShieldCheck className="size-4 text-[#1877f2]" />}>
            <p className="text-[10px] font-semibold text-[#475569]">Qualification rules</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {form.qualification.length > 0 ? (
                form.qualification.map((rule) => <Tag key={rule}>{rule}</Tag>)
              ) : (
                <span className="text-[10px] text-[#94a3b8]">
                  No rules — every submission counts as qualified.
                </span>
              )}
            </div>
            <dl className="mt-3">
              <Field
                label="Privacy policy"
                value={
                  form.privacyUrl ? (
                    <span className="break-all">{form.privacyUrl}</span>
                  ) : (
                    <span className="font-semibold text-[#b42318]">Not set</span>
                  )
                }
              />
              <Field label="Thank you headline" value={form.thankYouHeadline} />
              <Field label="Thank you button" value={form.thankYouCta} />
            </dl>
          </Panel>
        </div>

        {/* CENTRE — mobile preview */}
        <div>
          <Panel title="Mobile Preview" icon={<Smartphone className="size-4 text-[#1877f2]" />}>
            <InstantFormPreview form={form} />
            <p className="mt-2 text-center text-[9px] text-[#94a3b8]">
              How the form appears on Facebook and Instagram
            </p>
          </Panel>
        </div>

        {/* RIGHT — analytics and links */}
        <div className="space-y-3">
          <Panel title="Question Drop-off" icon={<TrendingDown className="size-4 text-[#f59e0b]" />}>
            {form.opens === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title="No submissions yet"
                description="Drop-off analysis appears once people start opening this form."
                compact
              />
            ) : (
              <>
                <ol className="space-y-2.5">
                  {questionDropOff.map((q, i) => (
                    <li key={q.id}>
                      <div className="flex items-baseline justify-between gap-2 text-[10px]">
                        <span className="min-w-0 truncate font-semibold" title={q.label}>
                          Q{i + 1}. {q.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#64748b]">
                          {num(q.completions)}
                        </span>
                      </div>
                      <Meter
                        value={form.opens ? (q.completions / form.opens) * 100 : 0}
                        tone={q.lostPct > 15 ? "amber" : "blue"}
                        className="mt-1"
                      />
                      <p className="mt-0.5 text-[9px] text-[#94a3b8]">
                        {num(q.lost)} people dropped off here ({pct(q.lostPct, 1)})
                      </p>
                    </li>
                  ))}
                </ol>
                {worst && worst.lostPct > 10 && (
                  <p className="mt-3 rounded-md border border-[#fae0a6] bg-[#fffaeb] p-2 text-[10px] leading-relaxed text-[#b45309]">
                    <strong>{worst.label}</strong> loses the most people ({pct(worst.lostPct, 1)}).
                    Making it optional, or moving it after the contact details, usually lifts
                    completion.{" "}
                    <Link href={`${ADS_ROOT}/help/form-completion`} className="font-semibold underline">
                      Improve completion rate
                    </Link>
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel title={`Linked Campaigns (${linkedCampaigns.length})`} icon={<FileText className="size-4 text-[#1877f2]" />}>
            {linkedCampaigns.length === 0 ? (
              <p className="text-[10px] text-[#94a3b8]">
                This form is not attached to any campaign yet.{" "}
                <Link href={`${ADS_ROOT}/create?form=${form.id}&step=ad`} className="font-semibold text-[#0671e9] hover:underline">
                  Use it in an ad
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-1.5">
                {linkedCampaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2">
                    <Link
                      href={`${ADS_ROOT}/campaigns/${c.id}`}
                      className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#0671e9] hover:underline"
                    >
                      {c.name}
                    </Link>
                    <StatusChip status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Linked Ads (${linkedAds.length})`} icon={<FileText className="size-4 text-[#1877f2]" />} bodyClassName="p-0">
            {linkedAds.length === 0 ? (
              <p className="p-3 text-[10px] text-[#94a3b8]">No ads use this form yet.</p>
            ) : (
              <TableShell minWidth={420}>
                <thead>
                  <tr>
                    <Th>Ad</Th>
                    <Th>Delivery</Th>
                    <Th numeric>Leads</Th>
                  </tr>
                </thead>
                <tbody>
                  {linkedAds.map((a) => (
                    <Tr key={a.id}>
                      <Td>
                        <EntityLink href={`${ADS_ROOT}/ads/${a.id}`} name={a.name} maxWidth={160} />
                      </Td>
                      <Td>
                        <DeliveryCell status={a.status} />
                      </Td>
                      <Td numeric>{num(a.metrics.leads)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Panel>
        </div>
      </div>

      <section className={cn(card, "mt-3 overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dde5ee] px-3 py-2.5">
          <h2 className="text-sm font-semibold">Recent leads from this form ({formLeads.length})</h2>
          <Link href={`${ADS_ROOT}/leads?form=${form.id}`} className={btn}>
            View all in Leads Center
          </Link>
        </div>
        {formLeads.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No leads yet"
            description="Leads will appear here once your forms receive submissions."
            compact
          />
        ) : (
          <TableShell minWidth={820}>
            <thead>
              <tr>
                {["Lead", "Contact", "Campaign", "Ad", "Stage", "Score", "Submitted"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formLeads.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <EntityLink href={`${ADS_ROOT}/leads/${l.id}`} name={l.name} sub={l.id} />
                  </Td>
                  <Td>
                    {l.phone}
                    <span className="block text-[9px] text-[#64748b]">{l.email}</span>
                  </Td>
                  <Td>
                    <Link href={`${ADS_ROOT}/campaigns/${l.campaignId}`} className="text-[#0671e9] hover:underline">
                      {l.campaignId}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`${ADS_ROOT}/ads/${l.adId}`} className="text-[#0671e9] hover:underline">
                      {l.adId}
                    </Link>
                  </Td>
                  <Td>{l.stage}</Td>
                  <Td>{l.score}</Td>
                  <Td>{dateTime(l.submittedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>
    </AdsWorkspace>
  );
}
