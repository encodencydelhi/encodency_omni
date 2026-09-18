"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Info, Lock, Plug, Search } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL, CATEGORY_ORDER, DATA_TYPE_LABEL, MODULE_META, intRoutes } from "../integrations-data/config";
import { useClientScope, useQueryState } from "../integrations-data/hooks";
import { connectionClientIds, isActive, providerState, type AvailabilityState } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationProvider } from "../integrations-data/types";
import { PageSkeleton } from "../components/blocks";
import { Button, Card, EmptyState, ModuleChips, ProviderLogo, SearchField, Segmented, UnderlineTabs } from "../components/ui";

const DEFAULTS = { q: "", category: "all", show: "all" };

const STATE_META: Record<AvailabilityState, { label: string; chip: string }> = {
  connected: { label: "Connected", chip: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]" },
  attention: { label: "Needs attention", chip: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]" },
  disconnected: { label: "Previously connected", chip: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]" },
  not_connected: { label: "Not connected", chip: "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]" },
  unavailable: { label: "Unavailable", chip: "bg-[#F1F4F8] text-[#6B7890] ring-[#E4E9F0]" },
};

export function AvailablePage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="cards" />;
  return <Available />;
}

function Available() {
  const { data } = useIntegrations();
  const { clientId, label } = useClientScope();
  const { values, set } = useQueryState(useMemo(() => DEFAULTS, []));
  const [about, setAbout] = useState<IntegrationProvider | null>(null);

  const rows = useMemo(() => {
    const needle = values.q.trim().toLowerCase();
    return data.providers
      .map((provider) => ({ provider, ...providerState(provider, data.connections, clientId) }))
      .filter(({ provider }) => values.category === "all" || provider.category === values.category)
      .filter(({ provider }) => !needle || `${provider.name} ${provider.description} ${CATEGORY_LABEL[provider.category]}`.toLowerCase().includes(needle))
      .filter(({ state }) =>
        values.show === "all" ? true : values.show === "not_connected" ? state === "not_connected" || state === "disconnected" : values.show === "connected" ? state === "connected" || state === "attention" : state === "unavailable",
      );
  }, [data, clientId, values]);

  const categoryCounts = CATEGORY_ORDER.map((category) => ({ category, count: data.providers.filter((provider) => provider.category === category).length })).filter((row) => row.count > 0);

  return (
    <div className="space-y-1">
      <Card className="overflow-hidden">
        <div className="border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Category"
            value={values.category}
            onChange={(value) => set({ category: value })}
            items={[{ value: "all", label: "All", count: data.providers.length }, ...categoryCounts.map(({ category, count }) => ({ value: category, label: CATEGORY_LABEL[category], count }))]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
          <SearchField value={values.q} onChange={(value) => set({ q: value })} placeholder="Search integrations" className="min-w-[180px] flex-1 sm:max-w-[280px]" />
          <Segmented
            label="Show"
            value={values.show}
            onChange={(value) => set({ show: value })}
            items={[
              { value: "all", label: "All" },
              { value: "not_connected", label: "Not connected" },
              { value: "connected", label: "Connected" },
              { value: "unavailable", label: "Unavailable" },
            ]}
          />
          <p className="ml-auto flex items-center gap-1.5 text-[11.5px] text-[#6B7890]">
            <Info className="size-3.5" />
            Showing integrations enabled for your organization · state for {label}
          </p>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No available integrations match"
            description="Try another search or category. Integrations your platform administrator hasn't enabled won't appear here."
            action={<Button variant="primary" onClick={() => set({ q: "", category: "all", show: "all" })}>Show everything</Button>}
          />
        </Card>
      ) : (
        CATEGORY_ORDER.filter((category) => rows.some((row) => row.provider.category === category)).map((category) => (
          <section key={category} aria-labelledby={`cat-${category}`} className="pt-2">
            <h2 id={`cat-${category}`} className="mb-1.5 px-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6B7890]">
              {CATEGORY_LABEL[category]}
            </h2>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {rows
                .filter((row) => row.provider.category === category)
                .map((row) => (
                  <ProviderCard key={row.provider.id} provider={row.provider} state={row.state} connectionCount={row.connections.filter(isActive).length} clientsCount={new Set(row.connections.filter(isActive).flatMap(connectionClientIds)).size} onAbout={() => setAbout(row.provider)} />
                ))}
            </div>
          </section>
        ))
      )}

      <AboutSheet provider={about} onOpenChange={(open) => !open && setAbout(null)} />
    </div>
  );
}

function ProviderCard({
  provider,
  state,
  connectionCount,
  clientsCount,
  onAbout,
}: {
  provider: IntegrationProvider;
  state: AvailabilityState;
  connectionCount: number;
  clientsCount: number;
  onAbout: () => void;
}) {
  const { can } = useIntegrations();
  const { clientId, withScope } = useClientScope();
  const unavailable = state === "unavailable";
  const meta = STATE_META[state];
  const connectHref = withScope(`${intRoutes.available}?connect=1&provider=${provider.id}${clientId !== "all" ? `&for=${clientId}` : ""}`);

  return (
    <article className={cn("flex min-w-0 flex-col rounded-[10px] border border-[#E4E9F0] bg-white shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition", unavailable ? "bg-[#FBFCFD]" : "hover:border-[#C9D1DC]")}>
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <ProviderLogo providerId={provider.id} muted={unavailable} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-[#0F1B3D]">
            {provider.name}
            {unavailable && <Lock className="size-3 shrink-0 text-[#98A2B3]" aria-label="Unavailable" />}
          </p>
          <p className="text-[11px] text-[#6B7890]">{provider.scope === "organization" ? "Organization-wide" : "Per client"}</p>
        </div>
        <span className={cn("inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", meta.chip)}>
          {unavailable ? (provider.availability === "coming_soon" ? "Coming soon" : provider.availability === "plan_restricted" ? "Not on plan" : "Unavailable") : meta.label}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 px-3 text-[12px] leading-4 text-[#3C4A66]">{provider.description}</p>

      {unavailable ? (
        <p className="mx-3 mt-2 flex items-start gap-1.5 rounded-sm bg-[#F3F5F9] px-2 py-1.5 text-[11.5px] leading-4 text-[#475467]">
          <Info className="mt-px size-3.5 shrink-0" />
          {provider.availabilityNote}
        </p>
      ) : (
        <div className="mt-2 px-3">
          <ModuleChips modules={provider.modules} max={3} />
          {connectionCount > 0 && (
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[#067647]">
              <CheckCircle2 className="size-3.5" />
              {connectionCount} connection{connectionCount === 1 ? "" : "s"}
              {clientId === "all" && ` across ${clientsCount} client${clientsCount === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-1 border-t border-[#EEF1F5] px-3 py-2 pt-2">
        {unavailable ? (
          <Button size="xs" variant="secondary" disabled disabledReason={provider.availabilityNote}>
            Connect
          </Button>
        ) : state === "connected" || state === "attention" ? (
          <>
            <Button size="xs" variant="secondary" href={withScope(`${intRoutes.connected}?provider=${provider.id}`)}>
              Manage
            </Button>
            {provider.scope === "client" && (
              <Button size="xs" variant="ghost" gate={can.canConnect} href={connectHref}>
                Connect another
              </Button>
            )}
          </>
        ) : (
          <Button size="xs" variant="primary" icon={Plug} gate={can.canConnect} href={connectHref}>
            {state === "disconnected" ? "Connect again" : "Connect"}
          </Button>
        )}
        <Button size="xs" variant="ghost" className="ml-auto" onClick={onAbout}>
          Learn more
        </Button>
      </div>
    </article>
  );
}

function AboutSheet({ provider, onOpenChange }: { provider: IntegrationProvider | null; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { can } = useIntegrations();
  const { clientId, withScope } = useClientScope();
  return (
    <Sheet open={provider !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[460px] border-[#E4E9F0] bg-white">
        {provider && (
          <>
            <SheetHeader className="border-[#EEF1F5]">
              <div className="flex items-center gap-3">
                <ProviderLogo providerId={provider.id} className="size-10" />
                <div>
                  <SheetTitle className="text-[15px] text-[#0F1B3D]">{provider.name}</SheetTitle>
                  <SheetDescription className="text-[12px] text-[#6B7890]">{CATEGORY_LABEL[provider.category]} · {provider.scope === "organization" ? "Organization-wide" : "Per client"}</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <p className="text-[12.5px] leading-5 text-[#3C4A66]">{provider.description}</p>
              {provider.availability !== "available" && (
                <p className="rounded-sm bg-[#F3F5F9] px-3 py-2 text-[12px] leading-4 text-[#475467]">{provider.availabilityNote}</p>
              )}
              <div>
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Powers</p>
                <ul className="space-y-0.5">
                  {provider.modules.map((module) => (
                    <li key={module} className="text-[12.5px] text-[#24324F]">{MODULE_META[module].label}</li>
                  ))}
                </ul>
              </div>
              {provider.permissions.length > 0 && (
                <div>
                  <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">What OmniPlatform will ask for</p>
                  <ul className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
                    {provider.permissions.map((permission) => (
                      <li key={permission.key} className="px-3 py-2">
                        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F1B3D]">
                          {permission.label}
                          {permission.optional && <span className="rounded-sm bg-[#F1F4F8] px-1 text-[10px] font-semibold text-[#6B7890]">Optional</span>}
                        </p>
                        <p className="text-[11.5px] leading-4 text-[#6B7890]">{permission.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {provider.dataTypes.length > 0 && (
                <div>
                  <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Data synced</p>
                  <p className="text-[12.5px] text-[#24324F]">{provider.dataTypes.map((type) => DATA_TYPE_LABEL[type]).join(", ")}</p>
                </div>
              )}
              {provider.requirements.length > 0 && (
                <div>
                  <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Requirements</p>
                  <ul className="space-y-1">
                    {provider.requirements.map((requirement) => (
                      <li key={requirement} className="flex items-start gap-1.5 text-[12.5px] text-[#24324F]">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#12B76A]" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SheetBody>
            <div className="flex items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
              <Button variant="ghost" icon={ExternalLink} href={provider.learnMoreUrl} external={provider.learnMoreUrl.startsWith("http")}>
                Provider help
              </Button>
              {provider.availability === "available" ? (
                <Button
                  variant="primary"
                  icon={Plug}
                  gate={can.canConnect}
                  onClick={() => {
                    onOpenChange(false);
                    router.replace(withScope(`${intRoutes.available}?connect=1&provider=${provider.id}${clientId !== "all" ? `&for=${clientId}` : ""}`), { scroll: false });
                  }}
                >
                  Connect
                </Button>
              ) : (
                <Button variant="primary" disabled disabledReason={provider.availabilityNote}>
                  Connect
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
