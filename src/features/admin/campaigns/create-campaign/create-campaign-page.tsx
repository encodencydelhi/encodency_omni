"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Eye, Rocket, Save } from "lucide-react";
import { useAdminContext } from "../../shell/admin-context";
import { CAMPAIGN_STEPS, STEP_NAV, initialCampaign, type CampaignDraft } from "./draft";
import { CampaignRail } from "./rail";
import { StepBasics } from "./steps/step-1-basics";
import { StepGoals } from "./steps/step-2-goals";
import { StepChannels } from "./steps/step-3-channels";
import { StepAudience } from "./steps/step-4-audience";
import { StepContent } from "./steps/step-5-content";
import { StepReview } from "./steps/step-6-review";
import { cn } from "@/lib/utils/cn";

export function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
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

  return (
    <div className="pb-16">
      <div className={cn("grid items-start gap-3", step === 5 ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0 space-y-2.5">
          <Header />
          <Stepper current={step} onSelect={goTo} />

          {step === 1 && <StepBasics draft={draft} set={set} />}
          {step === 2 && <StepGoals draft={draft} set={set} />}
          {step === 3 && <StepChannels draft={draft} set={set} />}
          {step === 4 && <StepAudience draft={draft} set={set} />}
          {step === 5 && <StepContent draft={draft} set={set} />}
          {step === 6 && <StepReview draft={draft} set={set} goTo={goTo} />}
        </div>

        {step !== 5 && <CampaignRail draft={draft} step={step} />}
      </div>

      <FooterBar
        step={step}
        onBack={() => goTo(step - 1)}
        onNext={() => goTo(step + 1)}
        onExit={() => router.push("/admin/campaigns")}
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
      <h1 className="mt-1 text-[24px] font-bold leading-7 tracking-[-0.02em] text-[#111827]">
        Create New Campaign
      </h1>
      <p className="text-[11.5px] text-[#8791A4]">
        Plan, configure and launch a multi-channel campaign for your workspace.
      </p>
    </header>
  );
}

function Stepper({ current, onSelect }: { current: number; onSelect: (next: number) => void }) {
  return (
    <nav className="scrollbar-thin overflow-x-auto pb-0.5" aria-label="Campaign setup progress">
      <ol className="flex min-w-[820px] items-center gap-1.5">
        {CAMPAIGN_STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start gap-1.5">
              <button
                onClick={() => onSelect(step.id)}
                aria-current={active ? "step" : undefined}
                className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "grid size-[26px] shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                    done && "bg-[#E11D28] text-white",
                    active && "bg-[#E11D28] text-white ring-4 ring-[#E11D28]/12",
                    !done && !active && "border border-[#DFE4EB] bg-white text-[#9CA3AF]",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : step.id}
                </span>
                <span className="min-w-0">
                  <b
                    className={cn(
                      "block text-[10px] font-bold leading-[12px]",
                      done || active ? "text-[#27334E]" : "text-[#9CA3AF]",
                    )}
                  >
                    {step.title}
                  </b>
                  <small className="block truncate text-[8.5px] leading-3 text-[#A3ADBF]">{step.caption}</small>
                </span>
              </button>
              {index < CAMPAIGN_STEPS.length - 1 && (
                <i
                  className={cn(
                    "ml-0.5 mt-[12px] hidden h-[2px] w-5 shrink-0 rounded-full sm:block",
                    step.id < current - 1 && "bg-[#22C55E]",
                    (step.id === current - 1 || (current === 1 && step.id === 1)) && "bg-[#E11D28]",
                    step.id >= current && !(current === 1 && step.id === 1) && "bg-[#E2E8F0]",
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

function FooterBar({
  step,
  onBack,
  onNext,
  onExit,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const { isSidebarCollapsed } = useAdminContext();
  const nav = STEP_NAV[step]!;
  const isLast = step === 6;
  const showDraft = true;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6E8F0] bg-white/95 backdrop-blur transition-[left] duration-200",
        isSidebarCollapsed ? "lg:left-[64px]" : "lg:left-[220px]",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5 xl:px-6">
        <div className="flex items-center gap-2">
          {showDraft ? (
            <button
              onClick={onExit}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]"
            >
              <Save className="size-3.5" />
              Save as Draft
            </button>
          ) : nav.back ? (
            <button
              onClick={onBack}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-[#1975E7] transition-colors hover:bg-[#F4F9FF]"
            >
              <ArrowLeft className="size-3.5" />
              {nav.back}
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLast && (
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]">
              <Eye className="size-3.5" />
              Preview Campaign
            </button>
          )}
          {nav.back && (
            <button
              onClick={onBack}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#DFE4EB] bg-white px-5 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="size-3.5" />
              {nav.back}
            </button>
          )}
          <button
            onClick={isLast ? onExit : onNext}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#E11D28] px-5 text-[11px] font-semibold text-white transition-colors hover:bg-[#C3161F]"
          >
            {isLast && <Rocket className="size-3.5" />}
            {nav.next}
            {!isLast && <ArrowRight className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
