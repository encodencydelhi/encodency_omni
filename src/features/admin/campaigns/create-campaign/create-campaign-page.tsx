"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  ExternalLink,
  Eye,
  Flag,
  Globe2,
  HandHeart,
  IndianRupee,
  Info,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Rocket,
  Save,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { useAdminContext } from "../../shell/admin-context";
import mokshaLogo from "@/assets/moksha-sewa-logo.png";
import { CAMPAIGN_STEPS, initialCampaign, type CampaignDraft } from "./draft";
import { AudienceSection, ContentSection, ReviewSection } from "./sections";
import {
  Field,
  OptionCard,
  RailCard,
  Section,
  SelectInput,
  Textarea,
  TextInput,
  tint,
} from "./ui";
import { cn } from "@/lib/utils/cn";

const OBJECTIVES = [
  { id: "awareness", label: "Awareness", caption: "Increase brand awareness and reach more people", icon: Megaphone, tone: "red" },
  { id: "traffic", label: "Website Traffic", caption: "Drive visitors to your website", icon: BarChart3, tone: "blue" },
  { id: "leads", label: "Lead Generation", caption: "Capture potential supporters", icon: Users, tone: "green" },
  { id: "donations", label: "Donations", caption: "Encourage financial contributions", icon: HandHeart, tone: "amber" },
  { id: "events", label: "Event Promotion", caption: "Promote events and drive registrations", icon: CalendarDays, tone: "purple" },
] as const;

const CHANNELS = [
  { name: "Meta & Instagram", channel: "Meta", caption: "Reach people on Facebook and Instagram", connected: true },
  { name: "LinkedIn", channel: "LinkedIn", caption: "Professional audience and B2B reach", connected: true },
  { name: "Google Business", channel: "Google Business", caption: "Local visibility and community reach", connected: true },
  { name: "WhatsApp", channel: "WhatsApp", caption: "Direct engagement and community updates", connected: false },
  { name: "YouTube", channel: "YouTube", caption: "Video content and wider reach", connected: false },
  { name: "Website", channel: "Website", caption: "Your website and landing pages", connected: true },
] as const;

const QUICK_TIPS = [
  "Use a clear and compelling message",
  "Include strong visuals (images/videos)",
  "Target a specific and relevant audience",
  "Set a realistic budget and timeline",
  "Track performance and optimize regularly",
];

export function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(3);
  const [draft, setDraft] = useState<CampaignDraft>(initialCampaign);

  const set = useCallback(
    <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 1), 6));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleChannel = (channel: string) =>
    set(
      "channels",
      draft.channels.includes(channel)
        ? draft.channels.filter((item) => item !== channel)
        : [...draft.channels, channel],
    );

  /** Derived from the form itself rather than a fixed count. */
  const checklist = useMemo(
    () => [
      { label: "Campaign details added", done: Boolean(draft.name.trim() && draft.description.trim()) },
      { label: "Goals and budget set", done: Boolean(draft.objective && draft.totalBudget.trim()) },
      { label: "At least one channel selected", done: draft.channels.length > 0 },
      { label: "Audience targeting configured", done: draft.locations.length > 0 && step >= 4 },
      { label: "Content and schedule added", done: Boolean(draft.headline.trim()) && step >= 5 },
    ],
    [draft, step],
  );
  const doneCount = checklist.filter((item) => item.done).length;

  return (
    <div className="pb-20">
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_292px]">
        <div className="min-w-0 space-y-2.5">
          <Header />
          <Stepper current={step} onSelect={goTo} />

          {/* Sections stay visible as you advance, matching the approved design
              where step 3 shows Basics, Goals and Channels together. Review is
              the exception — it summarises everything instead of stacking. */}
          {step < 6 && (
            <>
              <Section letter="A" title="Campaign Basics" caption="Tell us about your campaign.">
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-4">
                  <Field label="Campaign Name" required>
                    <TextInput value={draft.name} onChange={(v) => set("name", v)} />
                  </Field>
                  <Field label="Campaign Type" required>
                    <SelectInput
                      icon={Megaphone}
                      value={draft.type}
                      onChange={(v) => set("type", v)}
                      options={["Awareness", "Conversion", "Engagement", "Traffic"]}
                    />
                  </Field>
                  <Field label="Project / Client" required>
                    <SelectInput
                      value={draft.client}
                      onChange={(v) => set("client", v)}
                      options={["Moksha Sewa", "Namo Gange Trust", "Ganga Explorer"]}
                    />
                  </Field>
                  <Field label="Campaign Owner" required>
                    <SelectInput
                      icon={UserRound}
                      value={draft.owner}
                      onChange={(v) => set("owner", v)}
                      options={["Manish Sirohi", "Priya Kapoor", "Amit Reddy"]}
                    />
                  </Field>
                  <Field label="Short Description" required className="md:col-span-3">
                    <Textarea value={draft.description} onChange={(v) => set("description", v)} />
                  </Field>
                  <Field label="Priority">
                    <SelectInput
                      icon={Flag}
                      iconClass="text-[#E11D28]"
                      value={draft.priority}
                      onChange={(v) => set("priority", v)}
                      options={["High", "Medium", "Low"]}
                      tone="danger"
                    />
                  </Field>
                </div>
              </Section>

              {step >= 2 && (
                <Section letter="B" title="Goals & Budget" caption="Set your campaign objective and budget.">
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
                    {OBJECTIVES.map(({ id, label, caption, icon, tone }) => (
                      <OptionCard
                        key={id}
                        active={draft.objective === id}
                        onSelect={() => set("objective", id)}
                        icon={icon}
                        tint={tint[tone] ?? ""}
                        title={label}
                        caption={caption}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-4">
                    <Field label="Total Budget (INR)" required>
                      <TextInput value={draft.totalBudget} onChange={(v) => set("totalBudget", v)} prefix="₹" />
                    </Field>
                    <Field label="Daily Budget (INR)">
                      <TextInput value={draft.dailyBudget} onChange={(v) => set("dailyBudget", v)} prefix="₹" />
                    </Field>
                    <Field label="Expected Leads">
                      <TextInput value={draft.expectedLeads} onChange={(v) => set("expectedLeads", v)} />
                    </Field>
                    <Field label="Target CPL (INR)">
                      <TextInput value={draft.targetCpl} onChange={(v) => set("targetCpl", v)} prefix="₹" />
                    </Field>
                    <Field label="Start Date" required>
                      <TextInput icon={CalendarDays} value={draft.startDate} onChange={(v) => set("startDate", v)} />
                    </Field>
                    <Field label="End Date" required>
                      <TextInput icon={CalendarDays} value={draft.endDate} onChange={(v) => set("endDate", v)} />
                    </Field>
                    <div className="flex items-center gap-2 rounded-xl border border-[#D6E6FB] bg-[#F4F9FF] px-3 py-2 md:col-span-2">
                      <Info className="size-4 shrink-0 text-[#1975E7]" />
                      <p className="text-[10px] leading-[14px] text-[#33507A]">
                        <b className="block text-[10.5px] text-[#1B3D6B]">Estimated Reach</b>
                        Based on your budget and target audience, we estimate a reach of{" "}
                        <b>50,000 – 120,000</b> people across selected channels.
                      </p>
                    </div>
                  </div>
                </Section>
              )}

              {step >= 3 && (
                <Section
                  letter="C"
                  title="Connected Channels"
                  caption="Select the channels where you want to run this campaign."
                >
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {CHANNELS.map(({ name, channel, caption, connected }) => {
                      const active = draft.channels.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleChannel(name)}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-col rounded-xl border p-2.5 text-left transition-colors",
                            active
                              ? "border-[#E11D28] bg-[#FFF5F6]"
                              : "border-[#E6E8F0] bg-white hover:border-[#F5B5BA]",
                          )}
                        >
                          <span className="flex items-start justify-between gap-1">
                            <ChannelLogo channel={channel} className="size-6 shrink-0" />
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                active ? "border-[#E11D28] bg-[#E11D28]" : "border-[#CBD5E1] bg-white",
                              )}
                            >
                              {active && <Check className="size-2.5 text-white" />}
                            </span>
                          </span>
                          <b className="mt-1.5 block truncate text-[10.5px] font-bold text-[#111827]">{name}</b>
                          <small className="block text-[9px] leading-[12px] text-[#8791A4]">{caption}</small>
                          <span
                            className={cn(
                              "mt-1.5 flex items-center gap-1 text-[9px] font-semibold",
                              connected ? "text-[#0AA673]" : "text-[#9CA3AF]",
                            )}
                          >
                            <i className={cn("size-1.5 rounded-full", connected ? "bg-[#0AA673]" : "bg-[#CBD5E1]")} />
                            {connected ? "Connected" : "Not connected"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {step >= 4 && <AudienceSection draft={draft} set={set} />}
              {step >= 5 && <ContentSection draft={draft} set={set} />}
            </>
          )}

          {step === 6 && <ReviewSection draft={draft} set={set} goTo={goTo} />}
        </div>

        <aside className="space-y-2.5">
          <SummaryCard draft={draft} />
          <QuickTipsCard />
          <ReadinessCard items={checklist} done={doneCount} />
          <EstimateCard />
        </aside>
      </div>

      <FooterBar
        step={step}
        confirmed={draft.confirmed}
        onBack={() => goTo(step - 1)}
        onNext={() => goTo(step + 1)}
        onCancel={() => router.push("/admin/campaigns")}
        onLaunch={() => router.push("/admin/campaigns")}
      />
    </div>
  );
}

function Header() {
  return (
    <header>
      <div className="flex items-center gap-1 text-[10px] text-[#8791A4]">
        <Link href="/admin" className="transition-colors hover:text-[#27334E]">
          Dashboard
        </Link>
        <ChevronRight className="size-2.5" />
        <Link href="/admin/campaigns" className="transition-colors hover:text-[#27334E]">
          Campaigns
        </Link>
        <ChevronRight className="size-2.5" />
        <strong className="font-semibold text-[#27334E]">Create Campaign</strong>
      </div>
      <h1 className="mt-1 text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#111827]">
        Create New Campaign
      </h1>
      <p className="text-[11px] text-[#8791A4]">
        Plan, configure and launch a multi-channel campaign for your workspace.
      </p>
    </header>
  );
}

function Stepper({ current, onSelect }: { current: number; onSelect: (next: number) => void }) {
  return (
    <nav className="scrollbar-thin overflow-x-auto" aria-label="Campaign setup progress">
      <ol className="flex min-w-[820px] items-center gap-1.5">
        {CAMPAIGN_STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                onClick={() => onSelect(step.id)}
                aria-current={active ? "step" : undefined}
                className="flex min-w-0 items-center gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "grid size-[22px] shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors",
                    done && "bg-[#E11D28] text-white",
                    active && "bg-[#E11D28] text-white ring-4 ring-[#E11D28]/12",
                    !done && !active && "border border-[#DFE4EB] bg-white text-[#9CA3AF]",
                  )}
                >
                  {done ? <Check className="size-3" /> : step.id}
                </span>
                <span className="min-w-0">
                  <b
                    className={cn(
                      "block truncate text-[10px] font-bold leading-3",
                      done || active ? "text-[#27334E]" : "text-[#9CA3AF]",
                    )}
                  >
                    {step.title}
                  </b>
                  <small className="block truncate text-[8.5px] leading-3 text-[#A3ADBF]">
                    {step.caption}
                  </small>
                </span>
              </button>
              {index < CAMPAIGN_STEPS.length - 1 && (
                <i
                  className={cn(
                    "ml-0.5 hidden h-px min-w-[14px] flex-1 sm:block",
                    done ? "bg-[#E11D28]" : "bg-[#E2E8F0]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SummaryCard({ draft }: { draft: CampaignDraft }) {
  const rows = [
    { icon: Target, label: "Project", value: draft.client },
    { icon: IndianRupee, label: "Budget", value: `₹${draft.totalBudget} (₹${draft.dailyBudget}/day)` },
    { icon: CalendarDays, label: "Duration", value: `${draft.startDate} - ${draft.endDate}` },
    { icon: Globe2, label: "Channels", value: `${draft.channels.length} selected` },
    { icon: UserRound, label: "Owner", value: draft.owner },
  ];
  return (
    <RailCard>
      <div className="mb-2.5 flex items-center justify-between">
        <b className="text-[12px] font-bold text-[#111827]">Campaign Summary</b>
        <button className="text-[10px] font-semibold text-[#1975E7]">Edit</button>
      </div>
      <div className="relative h-[104px] overflow-hidden rounded-lg">
        <Image src="/campaigns/tree-planting.jpg" alt="" fill sizes="280px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#06304F]/55 to-[#06304F]/20" />
        <p className="absolute left-2.5 top-2.5 text-[12px] font-extrabold uppercase leading-[14px] text-white drop-shadow">
          Clean
          <br />
          Rivers
          <br />
          Brighter
          <br />
          Tomorrow
        </p>
        <span className="absolute bottom-2 left-2.5 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5">
          <span className="relative size-3 overflow-hidden">
            <Image
              src={mokshaLogo}
              alt=""
              width={40}
              height={41}
              className="absolute left-1/2 top-[-1px] h-[16px] w-auto max-w-none -translate-x-1/2 object-contain"
            />
          </span>
          <small className="text-[7.5px] font-bold text-[#27334E]">Moksha Sewa</small>
        </span>
      </div>
      <b className="mt-2 block text-[12px] font-bold leading-4 text-[#111827]">{draft.name}</b>
      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#E4F8F0] px-1.5 py-0.5 text-[9px] font-semibold text-[#0AA673]">
        <Megaphone className="size-2.5" />
        {draft.type}
      </span>
      <dl className="mt-2 space-y-1">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="grid grid-cols-[16px_54px_1fr] items-center gap-1.5 text-[9.5px]">
            <Icon className="size-3 text-[#9CA3AF]" />
            <dt className="text-[#8791A4]">{label}</dt>
            <dd className="min-w-0 truncate font-semibold text-[#27334E]">{value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[16px_54px_1fr] items-center gap-1.5 text-[9.5px]">
          <Flag className="size-3 text-[#9CA3AF]" />
          <dt className="text-[#8791A4]">Priority</dt>
          <dd>
            <i className="rounded bg-[#FFEAEC] px-1.5 py-0.5 text-[9px] font-bold not-italic text-[#E11D28]">
              {draft.priority}
            </i>
          </dd>
        </div>
      </dl>
    </RailCard>
  );
}

function QuickTipsCard() {
  return (
    <RailCard>
      <div className="mb-2 flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFF6E5]">
          <Lightbulb className="size-3.5 text-[#E0930B]" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[12px] font-bold text-[#111827]">Quick Tips</b>
          <small className="block text-[9.5px] text-[#8791A4]">Make your campaign more effective.</small>
        </div>
        <button className="flex shrink-0 items-center gap-0.5 text-[9.5px] font-semibold text-[#E11D28]">
          View all
          <ExternalLink className="size-2.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {QUICK_TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-1.5 text-[10px] leading-[14px] text-[#374151]">
            <CircleCheck className="mt-px size-3.5 shrink-0 text-[#0AA673]" />
            {tip}
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

function ReadinessCard({ items, done }: { items: { label: string; done: boolean }[]; done: number }) {
  const percent = (done / items.length) * 100;
  return (
    <RailCard>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFEAEC]">
          <CircleCheck className="size-3.5 text-[#E11D28]" />
        </span>
        <b className="flex-1 text-[12px] font-bold text-[#111827]">Readiness Checklist</b>
        <span className="relative size-9 shrink-0">
          <svg viewBox="0 0 36 36" className="size-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EDF1F7" strokeWidth="3.4" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#0AA673"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray={`${percent}, 100`}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[8.5px] font-bold text-[#27334E]">
            {done}/{items.length}
          </span>
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-[#374151]">
            {item.done ? (
              <CircleCheck className="size-3.5 shrink-0 text-[#0AA673]" />
            ) : (
              <Circle className="size-3.5 shrink-0 text-[#CBD5E1]" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

function EstimateCard() {
  const stats = [
    { icon: Users, value: "50K – 120K", label: "Estimated Reach" },
    { icon: MousePointerClick, value: "2K – 6K", label: "Estimated Clicks" },
    { icon: BarChart3, value: "500", label: "Estimated Leads" },
  ];
  return (
    <RailCard>
      <div className="mb-2.5 flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#E8F2FF]">
          <BarChart3 className="size-3.5 text-[#1975E7]" />
        </span>
        <div>
          <b className="block text-[12px] font-bold text-[#111827]">Performance Estimate</b>
          <small className="block text-[9.5px] text-[#8791A4]">Based on your campaign settings.</small>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="min-w-0">
            <Icon className="mx-auto size-3.5 text-[#8791A4]" />
            <b className="mt-1 block truncate text-[11px] font-bold text-[#111827]">{value}</b>
            <small className="block text-[8.5px] leading-[11px] text-[#8791A4]">{label}</small>
          </div>
        ))}
      </div>
    </RailCard>
  );
}

function FooterBar({
  step,
  confirmed,
  onBack,
  onNext,
  onCancel,
  onLaunch,
}: {
  step: number;
  confirmed: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onLaunch: () => void;
}) {
  const { isSidebarCollapsed } = useAdminContext();
  const isLast = step === 6;
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6E8F0] bg-white/95 backdrop-blur transition-[left] duration-200",
        isSidebarCollapsed ? "lg:left-[64px]" : "lg:left-[220px]",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5 xl:px-6">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={onBack}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]"
          >
            <Save className="size-3.5" />
            Save as Draft
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]">
            <Eye className="size-3.5" />
            Preview Campaign
          </button>
          <button
            onClick={isLast ? onLaunch : onNext}
            disabled={isLast && !confirmed}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-4 text-[11px] font-semibold text-white transition-colors",
              isLast && !confirmed ? "cursor-not-allowed bg-[#F3AEB3]" : "bg-[#E11D28] hover:bg-[#C3161F]",
            )}
          >
            {isLast ? (
              <>
                <Rocket className="size-3.5" />
                Launch Campaign
              </>
            ) : (
              <>
                Create &amp; Continue
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
