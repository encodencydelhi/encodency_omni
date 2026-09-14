"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  AlarmClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  Gauge,
  Lightbulb,
  MessageCircle,
  Paperclip,
  Phone,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Target,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  getAd,
  getAdSet,
  getCampaign,
  getForm,
  getLead,
} from "@/features/admin/meta-ads/data";
import {
  date,
  dateTime,
  LEAD_STAGE_TONE,
  relative,
  scoreLabel,
  scoreTone,
  time,
} from "@/features/admin/meta-ads/format";
import {
  Breadcrumb,
  btn,
  btnPrimary,
  card,
  EmptyState,
  Field,
  Meter,
  NotFoundState,
  Panel,
  StatusChip,
  Tag,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
  DetailBar,
} from "@/features/admin/meta-ads/components/workspace";
import type { LeadStage } from "@/features/admin/meta-ads/types";

const PIPELINE: LeadStage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Meeting Scheduled",
  "Converted",
];

const CENTRE_TABS = [
  { id: "timeline", label: "Activity Timeline" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
  { id: "appointments", label: "Appointments" },
  { id: "documents", label: "Documents" },
] as const;

type CentreTab = (typeof CENTRE_TABS)[number]["id"];

const TIMELINE_ICON: Record<string, typeof Phone> = {
  lead: Sparkles,
  call: Phone,
  whatsapp: MessageCircle,
  reply: MessageCircle,
  stage: CheckCircle2,
  meeting: CalendarPlus,
  note: StickyNote,
};

export default function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  const lead = getLead(leadId);
  const [tab, setTab] = useState<CentreTab>("timeline");
  const [draftNote, setDraftNote] = useState("");

  if (!lead) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Lead not found"
          description="This lead may have been deleted or merged into another record. Open the Leads Center to search again."
          backHref={`${ADS_ROOT}/leads`}
          backLabel="Back to Leads Center"
        />
      </AdsWorkspace>
    );
  }

  const campaign = getCampaign(lead.campaignId);
  const adSet = getAdSet(lead.adSetId);
  const ad = getAd(lead.adId);
  const form = getForm(lead.formId);

  const stageIndex = PIPELINE.indexOf(lead.stage);
  const isTerminal = stageIndex === -1;

  /** How long the first response took, against a 30-minute internal target. */
  const slaTarget = 30;
  const slaUsed = lead.responseMinutes;
  const slaBreached = slaUsed === null || slaUsed > slaTarget;

  const nextActions = buildNextActions(lead.stage);

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <button
          type="button"
          onClick={() => toast.success(`Calling ${lead.phone}…`)}
          className={cn(btnPrimary, "h-10")}
        >
          <Phone className="size-3.5" />
          Call Lead
        </button>
      }
    >
      <DetailBar>
        <Breadcrumb
          items={[
            { label: "Meta Ads Manager", href: ADS_ROOT },
            { label: "Leads Center", href: `${ADS_ROOT}/leads` },
            { label: lead.name },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <h1 className="flex flex-wrap items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
              {lead.name}
              <ToneChip tone={LEAD_STAGE_TONE[lead.stage] ?? "slate"}>{lead.stage}</ToneChip>
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {lead.id} · {lead.city}
              {lead.company !== "—" && ` · ${lead.company}`} · submitted{" "}
              {dateTime(lead.submittedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => toast.success(`Calling ${lead.phone}…`)} className={btnPrimary}>
              <Phone className="size-3.5" />
              Call
            </button>
            <button
              type="button"
              onClick={() => toast.success(`Opening WhatsApp for ${lead.name}`)}
              className={btn}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </button>
            <button type="button" onClick={() => toast.success("Assign this lead to a team member")} className={btn}>
              <UserPlus className="size-3.5" />
              Assign
            </button>
            <button type="button" onClick={() => toast.success("Opening the calendar…")} className={btn}>
              <CalendarPlus className="size-3.5" />
              Schedule Meeting
            </button>
            <button
              type="button"
              onClick={() => toast.success(`“${lead.name}” marked as converted`)}
              className={btn}
            >
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Mark Converted
            </button>
          </div>
        </div>

        {/* Pipeline progress */}
        <ol className="mt-4 flex flex-wrap gap-2">
          {PIPELINE.map((stage, i) => {
            const done = !isTerminal && i <= stageIndex;
            return (
              <li key={stage} className="min-w-[110px] flex-1">
                <div
                  className={cn(
                    "rounded-xl border p-2.5 text-center transition-all duration-200 shadow-2xs",
                    done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-slate-50/70 text-slate-400 font-medium",
                  )}
                >
                  <span className="block text-[11px] font-semibold">
                    {stage}
                  </span>
                </div>
              </li>
            );
          })}
          {isTerminal && (
            <li className="min-w-[110px] flex-1">
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-center shadow-2xs">
                <span className="block text-[11px] font-semibold text-rose-800">{lead.stage}</span>
              </div>
            </li>
          )}
        </ol>
      </DetailBar>

      <div className="grid gap-3 xl:grid-cols-[320px_1fr_300px]">
        {/* LEFT — information and attribution */}
        <div className="space-y-3">
          <Panel title="Lead Information" icon={<UsersRound className="size-4 text-[#1877f2]" />}>
            <dl>
              <Field label="Full name" value={lead.name} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Email" value={<span className="break-all">{lead.email}</span>} />
              <Field label="Location" value={lead.city} />
              <Field label="Company" value={lead.company} />
              <Field
                label="Interests"
                value={
                  lead.answers.find((a) => a.question.toLowerCase().includes("hours"))?.answer ??
                  "—"
                }
              />
              <Field label="Preferred contact time" value="Evenings (6 – 9 PM)" />
            </dl>
          </Panel>

          <Panel title="Form Answers" icon={<FileText className="size-4 text-[#1877f2]" />}>
            <dl>
              {lead.answers.map((a) => (
                <Field key={a.question} label={a.question} value={a.answer} />
              ))}
            </dl>
          </Panel>

          <Panel title="Campaign Attribution" icon={<Target className="size-4 text-[#1877f2]" />}>
            <dl>
              <Field
                label="Campaign"
                value={campaign?.name ?? lead.campaignId}
                href={`${ADS_ROOT}/campaigns/${lead.campaignId}`}
              />
              <Field
                label="Ad Set"
                value={adSet?.name ?? lead.adSetId}
                href={`${ADS_ROOT}/adsets/${lead.adSetId}`}
              />
              <Field label="Ad" value={ad?.name ?? lead.adId} href={`${ADS_ROOT}/ads/${lead.adId}`} />
              <Field
                label="Instant Form"
                value={form?.name ?? lead.formId}
                href={`${ADS_ROOT}/forms/${lead.formId}`}
              />
            </dl>
          </Panel>

          <Panel title="Consent & Compliance" icon={<ShieldCheck className="size-4 text-[#10b981]" />}>
            <p className="text-[10px] leading-relaxed text-[#475569]">{lead.consent}</p>
            <dl className="mt-2">
              <Field label="Consent captured" value={date(lead.submittedAt)} />
              <Field
                label="Privacy policy"
                value={form?.privacyUrl ? "Accepted" : "Missing on form"}
              />
              <Field label="Data retention" value="24 months" />
            </dl>
          </Panel>
        </div>

        {/* CENTRE — working area */}
        <div className="space-y-3">
          <section className={cn(card, "overflow-hidden")}>
            <div className="flex gap-1 overflow-x-auto border-b border-[#dde5ee] px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CENTRE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "true" : undefined}
                  className={cn(
                    "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition",
                    tab === t.id
                      ? "border-[#1877f2] text-[#1877f2]"
                      : "border-transparent text-[#475569] hover:text-[#14213d]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {tab === "timeline" && (
                <ol className="space-y-3">
                  {lead.timeline.map((entry, i) => {
                    const Icon = TIMELINE_ICON[entry.type] ?? Sparkles;
                    return (
                      <li key={`${entry.at}-${i}`} className="flex gap-2.5">
                        <span className="flex flex-col items-center">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1877f2]">
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          {i < lead.timeline.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-[#e5eaf1]" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 pb-1">
                          <span className="block text-[11px] font-semibold">{entry.text}</span>
                          <span className="mt-0.5 block text-[10px] text-[#64748b]">
                            {entry.actor} · {dateTime(entry.at)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {tab === "notes" && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draftNote.trim()) return;
                      toast.success("Note added to this lead");
                      setDraftNote("");
                    }}
                    className="mb-3"
                  >
                    <label htmlFor="lead-note" className="sr-only">
                      Add a note
                    </label>
                    <textarea
                      id="lead-note"
                      rows={3}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Add a note about this lead…"
                      className="w-full rounded-md border border-[#d8e0ea] bg-[#fbfcfe] p-2.5 text-[11px] outline-none transition focus:border-[#1877f2] focus:bg-white focus:ring-2 focus:ring-[#1877f2]/10"
                    />
                    <div className="mt-2 flex justify-end">
                      <button type="submit" className={btnPrimary} disabled={!draftNote.trim()}>
                        Add Note
                      </button>
                    </div>
                  </form>
                  {lead.notes.length === 0 ? (
                    <EmptyState
                      icon={StickyNote}
                      title="No notes yet"
                      description="Notes are shared with everyone who works this lead."
                      compact
                    />
                  ) : (
                    <ul className="space-y-2">
                      {lead.notes.map((n, i) => (
                        <li key={i} className="rounded-md border border-[#e8edf4] bg-[#fbfcfe] p-2.5">
                          <p className="text-[11px] leading-relaxed">{n.text}</p>
                          <p className="mt-1 text-[9px] text-[#64748b]">
                            {n.author} · {dateTime(n.at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {tab === "tasks" &&
                (lead.tasks.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No tasks"
                    description="Create a follow-up task so this lead does not go cold."
                    compact
                  />
                ) : (
                  <ul className="space-y-2">
                    {lead.tasks.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={t.done}
                          aria-label={t.title}
                          className="size-3.5 rounded"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold">{t.title}</span>
                          <span className="block text-[9px] text-[#64748b]">
                            Due {date(t.due)} · {t.owner}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}

              {tab === "appointments" &&
                (lead.appointments.length === 0 ? (
                  <EmptyState
                    icon={CalendarPlus}
                    title="No appointments"
                    description="Schedule a call or a site visit to move this lead forward."
                    compact
                  />
                ) : (
                  <ul className="space-y-2">
                    {lead.appointments.map((a, i) => (
                      <li key={i} className="rounded-md border border-[#e8edf4] bg-[#fbfcfe] p-2.5">
                        <p className="text-[11px] font-semibold">{a.title}</p>
                        <p className="mt-0.5 text-[10px] text-[#64748b]">
                          {date(a.at)} at {time(a.at)} · with {a.with}
                        </p>
                      </li>
                    ))}
                  </ul>
                ))}

              {tab === "documents" &&
                (lead.documents.length === 0 ? (
                  <EmptyState
                    icon={Paperclip}
                    title="No attachments"
                    description="Call recordings and documents attached to this lead appear here."
                    compact
                  />
                ) : (
                  <ul className="space-y-2">
                    {lead.documents.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2"
                      >
                        <Paperclip className="size-3.5 shrink-0 text-[#64748b]" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold">{d.name}</span>
                          <span className="block text-[9px] text-[#64748b]">
                            {d.size} · {dateTime(d.at)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </section>

          <Panel title="Quick Actions" icon={<Sparkles className="size-4 text-[#1877f2]" />}>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["Log a call", `Call logged for ${lead.name}`],
                ["Send WhatsApp template", "WhatsApp template sent"],
                ["Send onboarding email", "Email queued"],
                ["Create task", "Task created"],
                ["Move to Qualified", `“${lead.name}” moved to Qualified`],
                ["Mark as spam", `“${lead.name}” marked as spam`],
              ].map(([label, message]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toast.success(message!)}
                  className={btn}
                >
                  {label}
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* RIGHT — scoring and guidance */}
        <div className="space-y-3">
          <Panel title="Lead Score" icon={<Gauge className="size-4 text-[#1877f2]" />}>
            <div className="flex items-end justify-between gap-2">
              <strong className="text-[28px] font-semibold leading-none">{lead.score}</strong>
              <ToneChip tone={scoreTone(lead.score)}>{scoreLabel(lead.score)} quality</ToneChip>
            </div>
            <Meter value={lead.score} tone={scoreTone(lead.score)} className="mt-2" />
            <dl className="mt-3">
              <Field label="Conversion likelihood" value={`${Math.min(lead.score + 6, 99)}%`} />
              <Field label="Source quality" value={form?.type ?? "—"} />
              <Field label="Contactability" value={lead.phone === "—" ? "No phone" : "Phone verified"} />
            </dl>
          </Panel>

          <Panel title="Source Attribution" icon={<Target className="size-4 text-[#1877f2]" />}>
            <div className="space-y-1.5 text-[10px]">
              {[
                { label: "Campaign", value: campaign?.name, href: `${ADS_ROOT}/campaigns/${lead.campaignId}` },
                { label: "Ad Set", value: adSet?.name, href: `${ADS_ROOT}/adsets/${lead.adSetId}` },
                { label: "Ad", value: ad?.name, href: `${ADS_ROOT}/ads/${lead.adId}` },
                { label: "Form", value: form?.name, href: `${ADS_ROOT}/forms/${lead.formId}` },
              ].map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="block rounded-md border border-[#e8edf4] bg-[#fbfcfe] px-2.5 py-2 transition hover:border-[#bcd9ff]"
                >
                  <span className="block text-[9px] text-[#64748b]">{row.label}</span>
                  <span className="block truncate font-semibold text-[#0671e9]">
                    {row.value ?? "—"}
                  </span>
                </Link>
              ))}
            </div>
            {campaign && (
              <div className="mt-2">
                <StatusChip status={campaign.status} />
              </div>
            )}
          </Panel>

          <Panel title="Response SLA" icon={<AlarmClock className="size-4 text-[#f59e0b]" />}>
            {slaUsed === null ? (
              <>
                <p className="text-[11px] font-semibold text-[#b42318]">Not contacted yet</p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#64748b]">
                  Submitted {relative(lead.submittedAt)}. Leads contacted within 30 minutes convert
                  roughly three times more often.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold">
                  First response in {slaUsed} min
                  <span className="ml-1.5 font-normal text-[#64748b]">
                    (target {slaTarget} min)
                  </span>
                </p>
                <Meter
                  value={Math.min((slaUsed / slaTarget) * 100, 100)}
                  tone={slaBreached ? "amber" : "green"}
                  className="mt-2"
                />
              </>
            )}
          </Panel>

          <Panel title="Recommended Next Actions" icon={<Lightbulb className="size-4 text-[#f5b000]" />}>
            <ul className="space-y-1.5">
              {nextActions.map((action) => (
                <li key={action} className="flex items-start gap-2 text-[10px] leading-relaxed">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#1877f2]" aria-hidden="true" />
                  {action}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Attachments & Recordings" icon={<Paperclip className="size-4 text-[#1877f2]" />}>
            {lead.documents.length === 0 ? (
              <p className="text-[10px] text-[#94a3b8]">No recordings attached to this lead.</p>
            ) : (
              <ul className="space-y-1.5">
                {lead.documents.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="min-w-0 truncate">{d.name}</span>
                    <Tag>{d.size}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AdsWorkspace>
  );
}

/** Stage-aware guidance for whoever picks this lead up next. */
function buildNextActions(stage: LeadStage): string[] {
  switch (stage) {
    case "New":
      return [
        "Call within the next 30 minutes while intent is still high.",
        "Send the WhatsApp welcome template if the call is not answered.",
        "Assign an owner so the lead does not sit unclaimed.",
      ];
    case "Contacted":
      return [
        "Confirm which drive location and time slot suits them.",
        "Create a follow-up task for 48 hours from now.",
        "Move to Qualified once they commit to a slot.",
      ];
    case "Qualified":
      return [
        "Schedule the orientation call.",
        "Send the volunteer onboarding kit.",
        "Add them to the chapter WhatsApp group.",
      ];
    case "Meeting Scheduled":
      return [
        "Send a reminder the day before the meeting.",
        "Prepare the site briefing document.",
        "Mark as Converted after they attend.",
      ];
    case "Converted":
      return [
        "Ask for a testimonial or a short video clip.",
        "Add them to the lookalike audience source list.",
        "Invite them to refer a friend.",
      ];
    case "Lost":
      return [
        "Record the reason so targeting can be adjusted.",
        "Add to the waitlist for when a nearby chapter opens.",
      ];
    default:
      return [
        "Confirm this really is spam before excluding it.",
        "Add the pattern to your form qualification rules to cut future spam.",
      ];
  }
}
