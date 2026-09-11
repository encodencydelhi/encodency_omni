"use client";

import Image from "next/image";
import Link from "next/link";
import heroArt from "@/assets/add-client-hero.png";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Save, X } from "lucide-react";
import { STEPS, initialDraft, type ClientDraft } from "./draft";
import { Card } from "./ui";
import { BasicRail, BasicStep } from "./steps/step-basic";
import { BusinessRail, BusinessStep } from "./steps/step-business";
import { WebsiteRail, WebsiteStep } from "./steps/step-website";
import { ChannelsRail, ChannelsStep } from "./steps/step-channels";
import { MarketingRail, MarketingStep } from "./steps/step-marketing";
import { TeamRail, TeamStep } from "./steps/step-team";
import { ReviewRail, ReviewStep } from "./steps/step-review";
import { cn } from "@/lib/utils/cn";

export function AddClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ClientDraft>(initialDraft);

  const set = useCallback(
    <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 1), 7));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="space-y-2.5 pb-10">
      <Header />
      <Stepper step={step} onSelect={goTo} />

      <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          {step === 1 && <BasicStep draft={draft} set={set} />}
          {step === 2 && <BusinessStep draft={draft} set={set} />}
          {step === 3 && <WebsiteStep draft={draft} set={set} />}
          {step === 4 && <ChannelsStep draft={draft} set={set} />}
          {step === 5 && <MarketingStep draft={draft} set={set} />}
          {step === 6 && <TeamStep draft={draft} set={set} />}
          {step === 7 && <ReviewStep draft={draft} set={set} goTo={goTo} />}

          <Footer
            step={step}
            draft={draft}
            onBack={() => goTo(step - 1)}
            onNext={() => goTo(step + 1)}
            onDiscard={() => router.push("/admin/projects")}
            onCreate={() => router.push("/admin/projects")}
          />
        </Card>

        <aside className="space-y-2">
          {step === 1 && <BasicRail />}
          {step === 2 && <BusinessRail />}
          {step === 3 && <WebsiteRail />}
          {step === 4 && <ChannelsRail step={step} />}
          {step === 5 && <MarketingRail draft={draft} />}
          {step === 6 && <TeamRail />}
          {step === 7 && <ReviewRail draft={draft} />}
        </aside>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="relative">
      <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
        <Link href="/admin/projects" className="transition-colors hover:text-[#111827]">
          Clients
        </Link>
        <ChevronRight className="size-3" />
        <strong className="font-semibold text-[#374151]">Add New Client</strong>
      </div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-9 tracking-[-0.025em] text-[#111827]">
            Add New Client
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
            Set up a new client and start managing their digital presence in one place.
          </p>
        </div>
        {/* Artwork already carries the "From Vision to Visibility" wordmark and
            the strapline, so no text is rendered alongside it. */}
        <Image
          src={heroArt}
          alt="From Vision to Visibility — let's build their digital success together."
          priority
          sizes="(min-width: 1280px) 390px, (min-width: 768px) 320px, 0px"
          className="-mt-5 hidden h-[106px] w-auto shrink-0 select-none object-contain md:block xl:-mt-7 xl:h-[130px]"
        />
      </div>
    </header>
  );
}

function Stepper({ step, onSelect }: { step: number; onSelect: (next: number) => void }) {
  return (
    <nav className="scrollbar-thin overflow-x-auto pb-1" aria-label="Client setup progress">
      <ol className="flex min-w-[900px] items-start">
        {STEPS.map((item, index) => {
          const done = item.id < step;
          const active = item.id === step;
          return (
            <li key={item.id} className="relative flex min-w-0 flex-1 flex-col">
              {index > 0 && (
                <span
                  className={cn(
                    "absolute right-1/2 top-[17px] h-[2px] w-full",
                    done || active ? "bg-[#4F46E5]" : "bg-[#E2E8F0]",
                  )}
                />
              )}
              <button
                onClick={() => onSelect(item.id)}
                aria-current={active ? "step" : undefined}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full border-2 text-[13px] font-bold transition-colors",
                    done && "border-[#4F46E5] bg-[#4F46E5] text-white",
                    active && "border-[#4F46E5] bg-[#4F46E5] text-white ring-4 ring-[#4F46E5]/15",
                    !done && !active && "border-[#E2E8F0] bg-white text-[#9CA3AF]",
                  )}
                >
                  {done ? <Check className="size-4" /> : item.id}
                </span>
                <span
                  className={cn(
                    "mt-2 block px-1 text-[11.5px] font-bold leading-4",
                    done || active ? "text-[#4F46E5]" : "text-[#6B7280]",
                  )}
                >
                  {item.title}
                </span>
                <span className="block px-1 text-[10px] leading-3 text-[#9CA3AF]">{item.caption}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Footer({
  step,
  draft,
  onBack,
  onNext,
  onDiscard,
  onCreate,
}: {
  step: number;
  draft: ClientDraft;
  onBack: () => void;
  onNext: () => void;
  onDiscard: () => void;
  onCreate: () => void;
}) {
  const isLast = step === 7;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] px-5 py-4">
      {step === 1 ? (
        <button
          onClick={onDiscard}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EE] px-3 text-[12px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
        >
          <X className="size-3.5" />
          Discard
        </button>
      ) : (
        <button
          onClick={onBack}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EE] px-3 text-[12px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {step > 1 && (
          <button className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EE] px-3 text-[12px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]">
            <Save className="size-3.5" />
            {isLast ? "Save as Draft" : "Save Draft"}
          </button>
        )}
        {step === 4 && (
          <button
            onClick={onNext}
            className="flex h-9 items-center rounded-lg border border-[#E2E5EE] px-3 text-[12px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
          >
            Skip for Now
          </button>
        )}
        <button
          onClick={isLast ? onCreate : onNext}
          disabled={isLast && !draft.confirmed}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold text-white transition-colors",
            isLast && !draft.confirmed
              ? "cursor-not-allowed bg-[#C7D2FE]"
              : "bg-[#4F46E5] hover:bg-[#4338CA]",
          )}
        >
          {isLast ? "Create Client" : "Save & Next"}
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
