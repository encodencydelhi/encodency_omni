"use client";

/**
 * Connect an integration in six steps:
 *   Integration → Client → Authorize → Accounts → Permissions → Confirm
 *
 * Driven by the URL (`?connect=1`, optional `&provider=` and `&for=`), so the
 * header, the Available page, empty states and "connect again" all open the
 * same flow already pointed at the right place.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  FREQUENCY_LABEL,
  MODULE_META,
  RESOURCE_LABEL,
  intRoutes,
} from "../integrations-data/config";
import { existingConnection, previousConnection } from "../integrations-data/selectors";
import type { DiscoveredResource } from "../integrations-data/repository";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationProvider, ProviderCategory, ProviderId, SyncFrequency } from "../integrations-data/types";
import { Button, ModuleChips, PermissionChip, ProviderLogo, SelectMenu, x } from "./ui";

const STEPS = ["Integration", "Client", "Authorize", "Accounts", "Permissions", "Confirm"] as const;
const ORG_WIDE = "__organization__";

export function ConnectFlow() {
  const params = useSearchParams();
  const { ready } = useIntegrations();
  if (params?.get("connect") !== "1" || !ready) return null;
  // Remount per entry point so a fresh open always starts clean.
  return <ConnectFlowBody key={`${params.get("provider") ?? ""}-${params.get("for") ?? ""}`} />;
}

function ConnectFlowBody() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, can, authorize, discoverResources, connect } = useIntegrations();

  const initialProvider = data.providers.find((provider) => provider.id === params?.get("provider") && provider.availability === "available") ?? null;
  const initialClient = params?.get("for") ?? (params?.get("client") && params.get("client") !== "all" ? params.get("client") : null);

  const [step, setStep] = useState(initialProvider ? 1 : 0);
  const [providerId, setProviderId] = useState<ProviderId | null>(initialProvider?.id ?? null);
  const [clientChoice, setClientChoice] = useState<string | null>(initialProvider?.scope === "organization" ? ORG_WIDE : initialClient);
  const [authState, setAuthState] = useState<"idle" | "authorizing" | "authorized">("idle");
  const [discovered, setDiscovered] = useState<DiscoveredResource[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [primary, setPrimary] = useState<number | null>(null);
  // Optional permissions default to on — the admin opts out, not in.
  const optionalKeys = (provider: IntegrationProvider | null) => provider?.permissions.filter((permission) => permission.optional).map((permission) => permission.key) ?? [];
  const [optional, setOptional] = useState<string[]>(() => optionalKeys(initialProvider));
  const [frequency, setFrequency] = useState<SyncFrequency>(data.settings.sync.defaultFrequency);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IntegrationConnection | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const provider = data.providers.find((item) => item.id === providerId) ?? null;
  const clientId = clientChoice === ORG_WIDE ? null : clientChoice;
  const clientLabel = clientChoice === ORG_WIDE ? "Organization-wide" : (data.clients.find((client) => client.id === clientChoice)?.name ?? "");
  const reuse = provider && clientChoice ? previousConnection(data.connections, provider.id, clientId) : null;

  const close = () => {
    const next = new URLSearchParams(params?.toString());
    ["connect", "provider", "for"].forEach((key) => next.delete(key));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const inProgress = step > 0 && !result;
  const requestClose = () => (inProgress && !busy ? setConfirmClose(true) : close());

  const startAuthorization = async () => {
    if (!provider) return;
    setAuthState("authorizing");
    const ok = await authorize(provider.id);
    if (!ok) {
      setAuthState("idle");
      return;
    }
    setAuthState("authorized");
    const resources = await discoverResources(provider.id, clientLabel === "Organization-wide" ? "Namo Gange" : clientLabel);
    setDiscovered(resources ?? []);
    const first = resources?.length ? [0] : [];
    setSelected(first);
    setPrimary(first[0] ?? null);
    setStep(3);
  };

  const canAdvance = (() => {
    if (step === 0) return Boolean(provider);
    if (step === 1) return Boolean(clientChoice) && !blockedClient(clientChoice);
    if (step === 2) return authState === "authorized";
    if (step === 3) return selected.length > 0 && primary !== null && selected.includes(primary);
    return true;
  })();

  function blockedClient(choice: string | null): string | null {
    if (!provider || !choice) return null;
    const target = choice === ORG_WIDE ? null : choice;
    if (data.settings.clientMapping.oneAccountPerClient && existingConnection(data.connections, provider.id, target)) {
      return `${provider.name} is already connected for ${choice === ORG_WIDE ? "the organization" : data.clients.find((client) => client.id === choice)?.name}. Your settings allow one account per client — manage the existing connection instead.`;
    }
    return null;
  }

  const finish = async () => {
    if (!provider || !discovered || primary === null) return;
    setBusy(true);
    const ordered = selected.map((index) => discovered[index]!).filter(Boolean);
    const connection = await connect({
      providerId: provider.id,
      clientId,
      resources: ordered,
      primaryIndex: Math.max(0, selected.indexOf(primary)),
      optionalPermissions: optional,
      syncFrequency: frequency,
      reuseConnectionId: reuse?.id,
    });
    setBusy(false);
    if (connection) setResult(connection);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        showClose={false}
        onInteractOutside={(event) => inProgress && event.preventDefault()}
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-[min(760px,calc(100dvh-40px))] sm:max-w-[860px] sm:rounded-[12px] sm:border"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF1F5] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {provider ? <ProviderLogo providerId={provider.id} className="size-10" /> : <span className="grid size-10 place-items-center rounded-[8px] bg-[#EFF4FF] text-[#1D4ED8]"><ShieldCheck className="size-5" /></span>}
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-semibold text-[#0F1B3D]">{result ? `${provider?.name} connected` : provider ? `Connect ${provider.name}` : "Connect an integration"}</DialogTitle>
              <DialogDescription className="text-[12.5px] text-[#6B7890]">
                {result ? "Everything's set up. The first sync has run." : "Link an external account to your organization or one of your clients."}
              </DialogDescription>
            </div>
          </div>
          <Button size="iconSm" variant="ghost" aria-label="Close" onClick={requestClose} disabled={busy || authState === "authorizing"}>
            <span aria-hidden="true" className="text-[16px] leading-none">×</span>
          </Button>
        </div>

        {/* Steps */}
        {!result && (
          <ol className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto border-b border-[#EEF1F5] px-5 py-2.5" aria-label="Setup progress">
            {STEPS.map((label, index) => (
              <li key={label} className="flex shrink-0 items-center gap-1.5">
                <span
                  aria-current={index === step ? "step" : undefined}
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10.5px] font-bold",
                    index < step ? "bg-[#12B76A] text-white" : index === step ? "bg-[#2563EB] text-white" : "bg-[#F1F4F8] text-[#98A2B3]",
                  )}
                >
                  {index < step ? "✓" : index + 1}
                </span>
                <span className={cn("text-[11.5px] font-medium", index === step ? "text-[#0F1B3D]" : "text-[#98A2B3]", index !== step && "max-md:hidden")}>{label}</span>
                {index < STEPS.length - 1 && <span className="h-px w-3 bg-[#E4E9F0] md:w-5" />}
              </li>
            ))}
          </ol>
        )}

        {/* Body */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {result ? (
            <SuccessStep connection={result} provider={provider!} clientLabel={clientLabel} />
          ) : step === 0 ? (
            <ProviderStep providers={data.providers} selected={providerId} onSelect={(id) => {
              const next = data.providers.find((item) => item.id === id) ?? null;
              setProviderId(id);
              setOptional(optionalKeys(next));
              if (next?.scope === "organization") setClientChoice(ORG_WIDE);
              else if (clientChoice === ORG_WIDE) setClientChoice(initialClient);
            }} />
          ) : step === 1 && provider ? (
            <ClientStep provider={provider} value={clientChoice} onChange={setClientChoice} blockedReason={blockedClient} reuse={reuse} />
          ) : step === 2 && provider ? (
            <AuthorizeStep provider={provider} clientLabel={clientLabel} state={authState} onStart={() => void startAuthorization()} />
          ) : step === 3 && provider ? (
            <AccountsStep
              provider={provider}
              resources={discovered ?? []}
              selected={selected}
              primary={primary}
              allowMultiple={data.settings.clientMapping.allowMultipleResources}
              onToggle={(index, multiple) => {
                setSelected((current) => {
                  const next = multiple ? (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]) : [...current.filter((item) => discovered?.[item]?.type !== discovered?.[index]?.type), index];
                  if (primary === null || !next.includes(primary)) setPrimary(next[0] ?? null);
                  return next;
                });
              }}
              onPrimary={setPrimary}
            />
          ) : step === 4 && provider ? (
            <PermissionsStep provider={provider} optional={optional} onOptional={setOptional} />
          ) : step === 5 && provider ? (
            <ConfirmStep
              provider={provider}
              clientLabel={clientLabel}
              resources={selected.map((index) => ({ ...discovered![index]!, primary: index === primary }))}
              optional={optional}
              frequency={frequency}
              onFrequency={setFrequency}
              reuse={reuse}
            />
          ) : null}
        </div>

        {/* Leave confirmation */}
        {confirmClose && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#FBE3B6] bg-[#FFFAF0] px-5 py-2.5" role="alertdialog" aria-label="Discard setup">
            <p className="min-w-[200px] flex-1 text-[12.5px] text-[#3C4A66]">
              <b className="font-semibold text-[#0F1B3D]">Leave setup?</b> Nothing has been connected yet — your choices will be lost.
            </p>
            <Button size="sm" variant="ghost" onClick={() => setConfirmClose(false)}>
              Stay
            </Button>
            <Button size="sm" variant="danger" onClick={close}>
              Discard
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
          {result ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  const next = new URLSearchParams(params?.toString());
                  ["provider", "for"].forEach((key) => next.delete(key));
                  next.set("connect", "1");
                  router.replace(`${pathname}?${next.toString()}`, { scroll: false });
                }}
              >
                Connect another
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    close();
                    router.push(intRoutes.detail(result.id));
                  }}
                >
                  View integration
                </Button>
                <Button variant="primary" onClick={close}>
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" icon={ArrowLeft} disabled={step === 0 || busy || authState === "authorizing"} onClick={() => setStep((current) => (current === 3 ? 1 : current - 1))}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-[11.5px] text-[#98A2B3] sm:inline">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step === 5 ? (
                  <Button variant="primary" loading={busy} gate={can.canConnect} onClick={() => void finish()}>
                    Connect integration
                  </Button>
                ) : step === 2 ? (
                  authState === "authorized" ? (
                    <Button variant="primary" iconRight={ArrowRight} onClick={() => setStep(3)}>
                      Continue
                    </Button>
                  ) : (
                    <Button variant="primary" iconRight={ExternalLink} loading={authState === "authorizing"} gate={can.canConnect} onClick={() => void startAuthorization()}>
                      Continue to {provider?.name}
                    </Button>
                  )
                ) : (
                  <Button
                    variant="primary"
                    iconRight={ArrowRight}
                    disabled={!canAdvance}
                    disabledReason={
                      step === 0 ? "Choose an integration first." : step === 1 ? (clientChoice ? (blockedClient(clientChoice) ?? "") : "Choose who this connection is for.") : "Select at least one account and a primary."
                    }
                    onClick={() => setStep((current) => current + 1)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </>
          )}
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

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return providers
      .filter((provider) => category === "all" || provider.category === category)
      .filter((provider) => !needle || `${provider.name} ${provider.description}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(a.availability !== "available") - Number(b.availability !== "available"));
  }, [providers, query, category]);

  return (
    <div className="grid min-h-full md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" aria-label="Search integrations" className={cn(x.input, "h-8 pl-8 text-[12.5px]")} autoFocus />
        </div>
        <div className="scrollbar-thin mt-2 flex gap-1 overflow-x-auto" role="radiogroup" aria-label="Category">
          {(["all", ...CATEGORY_ORDER] as const).map((item) => (
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
                    <span className="block truncate text-[11px] text-[#6B7890]">
                      {available ? CATEGORY_LABEL[provider.category] : provider.availability === "coming_soon" ? "Coming soon" : provider.availability === "plan_restricted" ? "Not on your plan" : "Unavailable"}
                    </span>
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
                <p className="text-[11.5px] text-[#6B7890]">{current.scope === "organization" ? "Organization-wide" : "Per client"}</p>
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
            <p className="mt-0.5 text-[11.5px] text-[#98A2B3]">Only integrations enabled for your organization are listed.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — Choose client                                                   */
/* ------------------------------------------------------------------ */

function ClientStep({
  provider,
  value,
  onChange,
  blockedReason,
  reuse,
}: {
  provider: IntegrationProvider;
  value: string | null;
  onChange: (value: string) => void;
  blockedReason: (choice: string) => string | null;
  reuse: IntegrationConnection | null;
}) {
  const { data } = useIntegrations();
  const organizationWide = provider.scope === "organization";
  const options = organizationWide ? [{ id: ORG_WIDE, name: "Organization-wide", color: "#6D28D9" }] : data.clients;

  return (
    <div className="mx-auto max-w-[560px] p-5">
      <p className="text-[13px] font-semibold text-[#0F1B3D]">Who is this connection for?</p>
      <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">
        {organizationWide
          ? `${provider.name} is shared across your whole organization, so every client's automations can use it.`
          : "Data from this account will only appear under the client you choose. You can remap individual accounts later."}
      </p>
      <ul className="mt-3 space-y-1" role="radiogroup" aria-label="Client">
        {options.map((option) => {
          const reason = blockedReason(option.id);
          const checked = value === option.id;
          return (
            <li key={option.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition",
                  checked ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#E4E9F0] bg-white hover:border-[#C9D1DC]",
                  reason && "cursor-not-allowed opacity-70",
                )}
              >
                <input type="radio" name="connect-client" className="peer sr-only" checked={checked} disabled={Boolean(reason)} onChange={() => onChange(option.id)} />
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#2563EB]/25", checked ? "border-[#2563EB]" : "border-[#C9D1DC]")}>
                  {checked && <span className="size-1.5 rounded-full bg-[#2563EB]" />}
                </span>
                {option.id === ORG_WIDE ? <Building2 className="mt-px size-4 shrink-0 text-[#6D28D9]" /> : <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: option.color }} />}
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#0F1B3D]">{option.name}</span>
                  {reason && <span className="mt-0.5 block text-[11.5px] leading-4 text-[#B54708]">{reason}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {reuse && (
        <p className="mt-3 rounded-sm border border-[#D5E1FD] bg-[#F5F8FF] px-3 py-2 text-[12px] leading-4 text-[#3C4A66]">
          <b className="font-semibold text-[#0F1B3D]">Previously connected.</b> {provider.name} was connected for this client before. Its history and dependencies will be restored.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — Authorize                                                       */
/* ------------------------------------------------------------------ */

function AuthorizeStep({ provider, clientLabel, state, onStart }: { provider: IntegrationProvider; clientLabel: string; state: "idle" | "authorizing" | "authorized"; onStart: () => void }) {
  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center p-6 text-center">
      <ProviderLogo providerId={provider.id} className="size-14" />
      {state === "authorizing" ? (
        <>
          <Loader2 className="mt-4 size-6 animate-spin text-[#2563EB]" />
          <p className="mt-2 text-[14px] font-semibold text-[#0F1B3D]">Waiting for {provider.name}…</p>
          <p className="mt-1 text-[12.5px] leading-5 text-[#6B7890]">Approve access in the {provider.name} window. This screen continues on its own.</p>
        </>
      ) : state === "authorized" ? (
        <>
          <CheckCircle2 className="mt-4 size-6 text-[#12B76A]" />
          <p className="mt-2 text-[14px] font-semibold text-[#0F1B3D]">{provider.name} approved access</p>
          <p className="mt-1 text-[12.5px] text-[#6B7890]">Continue to choose which accounts to connect.</p>
        </>
      ) : (
        <>
          <p className="mt-4 text-[14px] font-semibold text-[#0F1B3D]">Authorize with {provider.name}</p>
          <p className="mt-1 text-[12.5px] leading-5 text-[#6B7890]">
            You will be redirected to {provider.name} to authorize access for <b className="font-semibold text-[#24324F]">{clientLabel}</b>. Sign in with an account that manages it. OmniPlatform never sees your password.
          </p>
          <Button variant="primary" iconRight={ExternalLink} className="mt-4" onClick={onStart}>
            Continue to {provider.name}
          </Button>
          <p className="mt-3 text-[11.5px] text-[#98A2B3]">You can review exactly what OmniPlatform asks for in the next steps.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4 — Accounts / properties                                           */
/* ------------------------------------------------------------------ */

function AccountsStep({
  provider,
  resources,
  selected,
  primary,
  allowMultiple,
  onToggle,
  onPrimary,
}: {
  provider: IntegrationProvider;
  resources: DiscoveredResource[];
  selected: number[];
  primary: number | null;
  allowMultiple: boolean;
  onToggle: (index: number, multiple: boolean) => void;
  onPrimary: (index: number) => void;
}) {
  if (resources.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13.5px] font-semibold text-[#0F1B3D]">No accounts found</p>
        <p className="mt-1 text-[12.5px] text-[#6B7890]">The {provider.name} login you used doesn&apos;t manage any {provider.resourceTypes.map((type) => type.label.toLowerCase()).join(" or ")}. Go back and sign in with a different account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[620px] p-5">
      <p className="text-[13px] font-semibold text-[#0F1B3D]">Choose what to connect</p>
      <p className="mt-0.5 text-[12.5px] text-[#6B7890]">We found {resources.length} {resources.length === 1 ? "item" : "items"} this login can access. Pick the ones this client uses, and mark one as primary.</p>

      {provider.resourceTypes.map((group) => {
        const items = resources.map((resource, index) => ({ resource, index })).filter((item) => item.resource.type === group.type);
        if (!items.length) return null;
        const multiple = group.multiple && allowMultiple;
        return (
          <fieldset key={group.type} className="mt-4">
            <legend className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
              {group.label}
              <span className="font-normal normal-case tracking-normal text-[#98A2B3]">{multiple ? "select any" : "select one"}</span>
            </legend>
            <ul className="space-y-1">
              {items.map(({ resource, index }) => {
                const checked = selected.includes(index);
                return (
                  <li key={`${resource.handle}-${index}`} className={cn("flex items-center gap-3 rounded-sm border px-3 py-2 transition", checked ? "border-[#2563EB] bg-[#F5F8FF]" : "border-[#E4E9F0] bg-white")}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type={multiple ? "checkbox" : "radio"}
                        name={`resource-${group.type}`}
                        checked={checked}
                        onChange={() => onToggle(index, multiple)}
                        className="size-4 shrink-0 accent-[#2563EB]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{resource.name}</span>
                        <span className="block truncate text-[11.5px] text-[#6B7890]">{resource.handle}</span>
                      </span>
                    </label>
                    {checked && (
                      <button
                        type="button"
                        onClick={() => onPrimary(index)}
                        aria-pressed={primary === index}
                        className={cn("h-6 shrink-0 rounded-sm px-2 text-[11px] font-semibold transition", primary === index ? "bg-[#2563EB] text-white" : "border border-[#DCE2EA] bg-white text-[#3C4A66] hover:border-[#C9D1DC]", x.focus)}
                      >
                        {primary === index ? "Primary" : "Make primary"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
      {!allowMultiple && <p className="mt-3 text-[11.5px] text-[#98A2B3]">Your settings allow one account per type. Change this in Settings → Client mapping.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5 — Permissions                                                     */
/* ------------------------------------------------------------------ */

function PermissionsStep({ provider, optional, onOptional }: { provider: IntegrationProvider; optional: string[]; onOptional: (keys: string[]) => void }) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="mx-auto max-w-[620px] p-5">
      <p className="text-[13px] font-semibold text-[#0F1B3D]">Review permissions</p>
      <p className="mt-0.5 text-[12.5px] text-[#6B7890]">What OmniPlatform will be able to do with this {provider.name} account, and why.</p>
      <ul className="mt-3 divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
        {provider.permissions.map((definition) => {
          const included = !definition.optional || optional.includes(definition.key);
          return (
            <li key={definition.key} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{definition.label}</p>
                <p className="text-[11.5px] leading-4 text-[#6B7890]">{definition.description}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">Used by {definition.requiredFor.map((module) => MODULE_META[module].label).join(", ")}</p>
                {advanced && <code className="mt-1 block font-mono text-[10.5px] text-[#98A2B3]">{definition.technicalScope}</code>}
              </div>
              {definition.optional ? (
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11.5px] text-[#3C4A66]">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={(event) => onOptional(event.target.checked ? [...optional, definition.key] : optional.filter((key) => key !== definition.key))}
                    className="size-3.5 accent-[#2563EB]"
                  />
                  {included ? "Requested" : "Optional"}
                </label>
              ) : (
                <span className="inline-flex h-[22px] shrink-0 items-center rounded-sm bg-[#EFF4FF] px-1.5 text-[11px] font-semibold text-[#1D4ED8] ring-1 ring-inset ring-[#D5E1FD]">Requested</span>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced} className={cn("mt-2 inline-flex items-center gap-1 rounded text-[11.5px] font-semibold text-[#6B7890] hover:text-[#0F1B3D]", x.focus)}>
        <ChevronDown className={cn("size-3.5 transition", advanced && "rotate-180")} />
        {advanced ? "Hide" : "Show"} technical scope names
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6 — Confirm                                                         */
/* ------------------------------------------------------------------ */

function ConfirmStep({
  provider,
  clientLabel,
  resources,
  optional,
  frequency,
  onFrequency,
  reuse,
}: {
  provider: IntegrationProvider;
  clientLabel: string;
  resources: (DiscoveredResource & { primary: boolean })[];
  optional: string[];
  frequency: SyncFrequency;
  onFrequency: (value: SyncFrequency) => void;
  reuse: IntegrationConnection | null;
}) {
  const granted = provider.permissions.filter((definition) => !definition.optional || optional.includes(definition.key));
  const declined = provider.permissions.filter((definition) => definition.optional && !optional.includes(definition.key));
  return (
    <div className="mx-auto max-w-[620px] p-5">
      <p className="text-[13px] font-semibold text-[#0F1B3D]">Confirm and connect</p>
      <dl className="mt-3 divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
        <Row label="Integration">
          <span className="inline-flex items-center gap-2">
            <ProviderLogo providerId={provider.id} className="size-6 p-[3px]" />
            {provider.name}
          </span>
        </Row>
        <Row label="Client">{clientLabel}</Row>
        <Row label="Accounts">
          <span className="flex flex-col items-end gap-0.5">
            {resources.map((resource) => (
              <span key={resource.handle} className="flex items-center gap-1.5">
                {resource.name}
                <span className="text-[11px] text-[#98A2B3]">{RESOURCE_LABEL[resource.type]}</span>
                {resource.primary && <span className="rounded-sm bg-[#EFF4FF] px-1 text-[10px] font-semibold text-[#1D4ED8]">Primary</span>}
              </span>
            ))}
          </span>
        </Row>
        <Row label="Permissions">
          <span className="flex flex-wrap justify-end gap-1">
            {granted.map((definition) => (
              <span key={definition.key} className="rounded-sm bg-[#F1F4F8] px-1.5 py-0.5 text-[11px] text-[#24324F]">
                {definition.label}
              </span>
            ))}
            {declined.length > 0 && <span className="text-[11px] text-[#98A2B3]">{declined.length} optional declined</span>}
          </span>
        </Row>
        <Row label="Sync">
          <SelectMenu<SyncFrequency>
            label="Sync frequency"
            value={frequency}
            onChange={onFrequency}
            align="end"
            options={(Object.keys(FREQUENCY_LABEL) as SyncFrequency[]).map((value) => ({ value, label: FREQUENCY_LABEL[value] }))}
          />
        </Row>
      </dl>
      <div className="mt-3 flex items-center gap-2">
        <PermissionChip status="granted" />
        <p className="text-[11.5px] leading-4 text-[#6B7890]">
          A first sync runs immediately after connecting.{reuse ? " Previous history and dependencies are restored." : ""}
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <dt className="shrink-0 text-[12px] text-[#6B7890]">{label}</dt>
      <dd className="min-w-0 text-right text-[12.5px] font-medium text-[#0F1B3D]">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success                                                             */
/* ------------------------------------------------------------------ */

function SuccessStep({ connection, provider, clientLabel }: { connection: IntegrationConnection; provider: IntegrationProvider; clientLabel: string }) {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center p-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[#ECFAF3]">
        <CheckCircle2 className="size-7 text-[#12B76A]" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#0F1B3D]">{provider.name} is connected</p>
      <p className="mt-1 text-[12.5px] leading-5 text-[#6B7890]">
        {connection.resources.length} {connection.resources.length === 1 ? "account" : "accounts"} linked to <b className="font-semibold text-[#24324F]">{clientLabel}</b>. It now appears in Connected, and {provider.modules.length} modules can use it.
      </p>
      <ModuleChips modules={provider.modules} max={6} className="mt-3 justify-center" />
    </div>
  );
}
