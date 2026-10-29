"use client";

/**
 * Connect an integration in three steps:
 *   Integration → Permissions → Authorize
 *
 * Authorizing sends the browser to the provider and brings it back; the accounts the login can reach are then chosen and
 * mapped to clients in "Add accounts" (opened automatically on return). Driven by the URL (`?connect=1`, optional
 * `&provider=`), so the header, the Available page, empty states and "connect again" all open the same flow.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Lock, Search, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL, CATEGORY_ORDER, MODULE_META } from "../integrations-data/config";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationProvider, ProviderCategory, ProviderId } from "../integrations-data/types";
import { Button, ModuleChips, ProviderLogo, x } from "./ui";

const STEPS = ["Integration", "Permissions", "Authorize"] as const;

export function ConnectFlow() {
  const params = useSearchParams();
  const { ready } = useIntegrations();
  if (params?.get("connect") !== "1" || !ready) return null;
  // Remount per entry point so a fresh open always starts clean.
  return <ConnectFlowBody key={params.get("provider") ?? ""} />;
}

function ConnectFlowBody() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, can, startConnect } = useIntegrations();

  const initialProvider = data.providers.find((provider) => provider.id === params?.get("provider") && provider.availability === "available") ?? null;
  const [step, setStep] = useState(initialProvider ? 1 : 0);
  const [providerId, setProviderId] = useState<ProviderId | null>(initialProvider?.id ?? null);
  const [busy, setBusy] = useState(false);
  const provider = data.providers.find((item) => item.id === providerId) ?? null;

  const close = () => {
    const next = new URLSearchParams(params?.toString());
    ["connect", "provider", "for"].forEach((key) => next.delete(key));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const authorize = async () => {
    if (!provider) return;
    setBusy(true);
    const ok = await startConnect(provider.id);
    // On success the browser is already on its way to the provider.
    if (!ok) setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && close()}>
      <DialogContent
        showClose={false}
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-[min(700px,calc(100dvh-40px))] sm:max-w-[860px] sm:rounded-[12px] sm:border"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF1F5] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {provider ? <ProviderLogo providerId={provider.id} className="size-10" /> : <span className="grid size-10 place-items-center rounded-[8px] bg-[#EFF4FF] text-[#1D4ED8]"><ShieldCheck className="size-5" /></span>}
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-semibold text-[#0F1B3D]">{provider ? `Connect ${provider.name}` : "Connect an integration"}</DialogTitle>
              <DialogDescription className="text-[12.5px] text-[#6B7890]">Sign in with the provider, then choose which accounts belong to which client.</DialogDescription>
            </div>
          </div>
          <Button size="iconSm" variant="ghost" aria-label="Close" onClick={close} disabled={busy}>
            <span aria-hidden="true" className="text-[16px] leading-none">×</span>
          </Button>
        </div>

        <ol className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto border-b border-[#EEF1F5] px-5 py-2.5" aria-label="Setup progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex shrink-0 items-center gap-1.5">
              <span
                aria-current={index === step ? "step" : undefined}
                className={cn("grid size-5 place-items-center rounded-full text-[10.5px] font-bold", index < step ? "bg-[#12B76A] text-white" : index === step ? "bg-[#2563EB] text-white" : "bg-[#F1F4F8] text-[#98A2B3]")}
              >
                {index < step ? "✓" : index + 1}
              </span>
              <span className={cn("text-[11.5px] font-medium", index === step ? "text-[#0F1B3D]" : "text-[#98A2B3]", index !== step && "max-md:hidden")}>{label}</span>
              {index < STEPS.length - 1 && <span className="h-px w-3 bg-[#E4E9F0] md:w-5" />}
            </li>
          ))}
        </ol>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {step === 0 ? (
            <ProviderStep providers={data.providers} selected={providerId} onSelect={setProviderId} />
          ) : step === 1 && provider ? (
            <PermissionsStep provider={provider} />
          ) : step === 2 && provider ? (
            <AuthorizeStep provider={provider} busy={busy} />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="ghost" icon={ArrowLeft} disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11.5px] text-[#98A2B3] sm:inline">
              Step {step + 1} of {STEPS.length}
            </span>
            {step === 2 ? (
              <Button variant="primary" iconRight={ExternalLink} loading={busy} gate={can.canConnect} onClick={() => void authorize()}>
                Continue to {provider?.name}
              </Button>
            ) : (
              <Button variant="primary" iconRight={ArrowRight} disabled={step === 0 && !provider} disabledReason="Choose an integration first." onClick={() => setStep((current) => current + 1)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* 1 — Choose integration                                              */
/* ------------------------------------------------------------------ */

function ProviderStep({ providers, selected, onSelect }: { providers: IntegrationProvider[]; selected: ProviderId | null; onSelect: (id: ProviderId) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProviderCategory | "all">("all");
  const current = providers.find((provider) => provider.id === selected) ?? null;
  const categories = CATEGORY_ORDER.filter((item) => providers.some((provider) => provider.category === item));

  const needle = query.trim().toLowerCase();
  const list = providers
    .filter((provider) => category === "all" || provider.category === category)
    .filter((provider) => !needle || `${provider.name} ${provider.description}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(a.availability !== "available") - Number(b.availability !== "available"));

  return (
    <div className="grid min-h-full md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" aria-label="Search integrations" className={cn(x.input, "h-8 pl-8 text-[12.5px]")} autoFocus />
        </div>
        {categories.length > 1 && (
          <div className="scrollbar-thin mt-2 flex gap-1 overflow-x-auto" role="radiogroup" aria-label="Category">
            {(["all", ...categories] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={category === item}
                onClick={() => setCategory(item)}
                className={cn("h-7 shrink-0 rounded-sm px-2.5 text-[12px] font-semibold transition", category === item ? "bg-[#0F1B3D] text-white" : "bg-[#F1F4F8] text-[#3C4A66] hover:bg-[#E9EDF3]", x.focus)}
              >
                {item === "all" ? "All" : CATEGORY_LABEL[item]}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-3 grid gap-1 sm:grid-cols-2" role="listbox" aria-label="Integrations">
          {list.length === 0 && <li className="col-span-full py-8 text-center text-[12.5px] text-[#6B7890]">No integrations match “{query}”.</li>}
          {list.map((provider) => {
            const available = provider.availability === "available";
            const active = provider.id === selected;
            return (
              <li key={provider.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={!available}
                  disabled={!available}
                  onClick={() => onSelect(provider.id)}
                  title={!available ? provider.availabilityNote : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-2 text-left transition",
                    active ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#E4E9F0] bg-white hover:border-[#C9D1DC]",
                    !available && "cursor-not-allowed opacity-60 hover:border-[#E4E9F0]",
                    x.focus,
                  )}
                >
                  <ProviderLogo providerId={provider.id} className="size-8" muted={!available} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
                      <span className="truncate">{provider.name}</span>
                      {!available && <Lock className="size-3 shrink-0 text-[#98A2B3]" />}
                    </span>
                    <span className="block truncate text-[11px] text-[#6B7890]">{available ? CATEGORY_LABEL[provider.category] : (provider.availabilityNote ?? "Unavailable")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="border-t border-[#EEF1F5] bg-[#F8FAFC] p-4 md:border-l md:border-t-0">
        {current ? (
          <div>
            <div className="flex items-center gap-2.5">
              <ProviderLogo providerId={current.id} className="size-10" />
              <div>
                <p className="text-[13.5px] font-semibold text-[#0F1B3D]">{current.name}</p>
                <p className="text-[11.5px] text-[#6B7890]">Per client</p>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] leading-5 text-[#3C4A66]">{current.description}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Powers</p>
            <ModuleChips modules={current.modules} max={6} className="mt-1" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">You&apos;ll need</p>
            <ul className="mt-1 space-y-1">
              {current.requirements.map((requirement) => (
                <li key={requirement} className="flex items-start gap-1.5 text-[12px] leading-4 text-[#3C4A66]">
                  <CheckCircle2 className="mt-px size-3.5 shrink-0 text-[#12B76A]" />
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
            <ShieldCheck className="size-6 text-[#98A2B3]" />
            <p className="mt-2 text-[12.5px] font-medium text-[#3C4A66]">Choose an integration</p>
            <p className="mt-0.5 text-[11.5px] text-[#98A2B3]">Integrations your platform has not enabled show why.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — Permissions                                                     */
/* ------------------------------------------------------------------ */

function PermissionsStep({ provider }: { provider: IntegrationProvider }) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="mx-auto max-w-[620px] p-5">
      <p className="text-[13px] font-semibold text-[#0F1B3D]">Review permissions</p>
      <p className="mt-0.5 text-[12.5px] text-[#6B7890]">What OmniPlatform will ask {provider.name} for, and why. You can decline optional ones on the provider&apos;s own screen.</p>
      <ul className="mt-3 divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
        {provider.permissions.map((definition) => (
          <li key={definition.key} className="flex items-start gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{definition.label}</p>
              <p className="text-[11.5px] leading-4 text-[#6B7890]">{definition.description}</p>
              {definition.requiredFor.length > 0 && <p className="mt-1 text-[11px] text-[#98A2B3]">Used by {definition.requiredFor.map((module) => MODULE_META[module].label).join(", ")}</p>}
              {advanced && <code className="mt-1 block break-all font-mono text-[10.5px] text-[#98A2B3]">{definition.technicalScope}</code>}
            </div>
            <span
              className={cn(
                "inline-flex h-[22px] shrink-0 items-center rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset",
                definition.optional ? "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]" : "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]",
              )}
            >
              {definition.optional ? "Optional" : "Required"}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced} className={cn("mt-2 inline-flex items-center gap-1 rounded text-[11.5px] font-semibold text-[#6B7890] hover:text-[#0F1B3D]", x.focus)}>
        <ChevronDown className={cn("size-3.5 transition", advanced && "rotate-180")} />
        {advanced ? "Hide" : "Show"} technical scope names
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — Authorize                                                       */
/* ------------------------------------------------------------------ */

function AuthorizeStep({ provider, busy }: { provider: IntegrationProvider; busy: boolean }) {
  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center p-6 text-center">
      <ProviderLogo providerId={provider.id} className="size-14" />
      <p className="mt-4 text-[14px] font-semibold text-[#0F1B3D]">{busy ? `Opening ${provider.name}…` : `Authorize with ${provider.name}`}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-[#6B7890]">
        You will be sent to {provider.name} to sign in and approve access, then brought back here to choose which accounts to use and which client each belongs to. Sign in with a login that manages them. OmniPlatform never sees your password.
      </p>
    </div>
  );
}
