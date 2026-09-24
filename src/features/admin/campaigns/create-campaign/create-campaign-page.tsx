"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Eye, Rocket, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminContext } from "../../shell/admin-context";
import { CAMPAIGN_STEPS, STEP_NAV, initialCampaign, type CampaignDraft } from "./draft";
import { CampaignRail } from "./rail";
import { StepBasics } from "./steps/step-1-basics";
import { StepGoals } from "./steps/step-2-goals";
import { StepChannels } from "./steps/step-3-channels";
import { StepAudience } from "./steps/step-4-audience";
import { StepContent } from "./steps/step-5-content";
import { StepTracking } from "./steps/step-6-tracking";
import { StepAutomation } from "./steps/step-7-automation";
import { StepReview } from "./steps/step-8-review";
import { cn } from "@/lib/utils/cn";
import { campaignsApi } from "../live/campaigns-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";

export function CreateCampaignPage() {
  const router = useRouter();
  const { companyId, clientId } = useTenancyContext();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CampaignDraft>(initialCampaign);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = useCallback(
    <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 1), 8));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(async (isDraft: boolean) => {
    if (!companyId || !clientId) {
      toast.error("Verified Company and Client context are required.");
      return;
    }

    const name = draft.name?.trim() || (isDraft ? "Untitled Draft Campaign" : "New Campaign");

    let budget: { amount: string; currency: string } | undefined = undefined;
    const rawBudget = draft.totalBudget || draft.dailyBudget || draft.monthlyBudget;
    if (rawBudget) {
      const parsed = parseFloat(rawBudget.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(parsed) && parsed > 0) {
        budget = {
          amount: parsed.toFixed(2),
          currency: "INR",
        };
      }
    }

    let startDate: string | undefined = undefined;
    if (draft.startDate) {
      try {
        startDate = new Date(draft.startDate).toISOString();
      } catch {}
    }
    let endDate: string | undefined = undefined;
    if (draft.endDate) {
      try {
        endDate = new Date(draft.endDate).toISOString();
      } catch {}
    }

    setIsSubmitting(true);
    try {
      const created = await campaignsApi.create(companyId, clientId, {
        name,
        budget,
        startDate,
        endDate,
      });
      toast.success(`Campaign "${created.name}" created (Revision ${created.revision})`);
      router.push("/admin/campaigns");
    } catch (err: unknown) {
      if (ApiError.isApiError(err)) {
        toast.error(`Failed to create campaign: ${err.message}`);
      } else {
        toast.error("An unexpected error occurred while creating the campaign.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [companyId, clientId, draft, router]);

  const hideRail = step === 5;

  return (
    <div className="pb-16">
      <div className={cn("grid items-start gap-3", hideRail ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0 space-y-2.5">
          <Header />
          <Stepper current={step} onSelect={goTo} />

          {step === 1 && <StepBasics draft={draft} set={set} />}
          {step === 2 && <StepGoals draft={draft} set={set} />}
          {step === 3 && <StepChannels draft={draft} set={set} />}
          {step === 4 && <StepAudience draft={draft} set={set} />}
          {step === 5 && <StepContent draft={draft} set={set} />}
          {step === 6 && <StepTracking draft={draft} set={set} />}
          {step === 7 && <StepAutomation draft={draft} set={set} />}
          {step === 8 && <StepReview draft={draft} set={set} goTo={goTo} />}
        </div>

        {!hideRail && <CampaignRail draft={draft} step={step} />}
      </div>

      <FooterBar
        step={step}
        isSubmitting={isSubmitting}
        onBack={() => goTo(step - 1)}
        onNext={() => goTo(step + 1)}
        onSaveDraft={() => handleSubmit(true)}
        onLaunch={() => handleSubmit(false)}
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
      <h1 className="mt-1 text-[24px] font-semibold leading-7 tracking-[-0.02em] text-[#111827]">
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
    <nav className="scrollbar-thin overflow-x-auto pb-1.5" aria-label="Campaign setup progress">
      <ol className="flex min-w-max items-center">
        {CAMPAIGN_STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex shrink-0 items-center">
              <button
                onClick={() => onSelect(step.id)}
                aria-current={active ? "step" : undefined}
                className="flex shrink-0 items-center gap-2 text-left transition-opacity hover:opacity-90"
              >
                <span
                  className={cn(
                    "grid size-[26px] shrink-0 place-items-center rounded-sm text-[10.5px] font-semibold transition-all",
                    done && "bg-[#E11D28] text-white",
                    active && "bg-[#E11D28] text-white ring-4 ring-[#E11D28]/15",
                    !done && !active && "border border-[#DFE4EB] bg-white text-[#6B7280]",
                  )}
                >
                  {done ? <Check className="size-3.5 stroke-[2.5]" /> : step.id}
                </span>
                <span className="shrink-0">
                  <b
                    className={cn(
                      "block whitespace-nowrap text-[11px] font-semibold leading-[14px]",
                      done || active ? "text-[#111827]" : "text-[#374151]",
                    )}
                  >
                    {step.title}
                  </b>
                  <small
                    className={cn(
                      "block whitespace-nowrap text-[10px] font-medium leading-[14px]",
                      done || active ? "text-[#4B5563]" : "text-[#526077]",
                    )}
                  >
                    {step.caption}
                  </small>
                </span>
              </button>
              {index < CAMPAIGN_STEPS.length - 1 && (
                <i
                  className={cn(
                    "mx-3 hidden h-[2px] w-6 shrink-0 rounded-sm sm:block",
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
  isSubmitting,
  onBack,
  onNext,
  onSaveDraft,
  onLaunch,
}: {
  step: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
}) {
  const { isSidebarCollapsed } = useAdminContext();
  const nav = STEP_NAV[step]!;
  const isLast = step === 8;
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
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="flex h-8 items-center gap-1.5 rounded-sm border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save as Draft
            </button>
          ) : nav.back ? (
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="flex h-8 items-center gap-1.5 rounded-sm px-2 text-[11px] font-semibold text-[#1975E7] transition-colors hover:bg-[#F4F9FF] disabled:opacity-50"
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
            <button className="flex h-8 items-center gap-1.5 rounded-sm border border-[#DFE4EB] px-3 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC]">
              <Eye className="size-3.5" />
              Preview Campaign
            </button>
          )}
          {nav.back && (
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="flex h-8 items-center gap-1.5 rounded-sm border border-[#DFE4EB] bg-white px-5 text-[11px] font-semibold text-[#29354E] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              <ArrowLeft className="size-3.5" />
              {nav.back}
            </button>
          )}
          <button
            onClick={isLast ? onLaunch : onNext}
            disabled={isSubmitting}
            className="flex h-8 items-center gap-1.5 rounded-sm bg-[#E11D28] px-5 text-[11px] font-semibold text-white transition-colors hover:bg-[#C3161F] disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            {!isSubmitting && isLast && <Rocket className="size-3.5" />}
            {nav.next}
            {!isSubmitting && !isLast && <ArrowRight className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
