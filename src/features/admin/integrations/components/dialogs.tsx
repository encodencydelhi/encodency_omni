"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, KeyRound, Loader2, PauseCircle, RefreshCw, ShieldAlert, Trash2, Unplug } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { MODULE_META, REASON_LABEL, RESOURCE_LABEL, intRoutes } from "../integrations-data/config";
import { useClientScope, useProvider } from "../integrations-data/hooks";
import type { DiscoveredResource } from "../integrations-data/repository";
import { clientName, dependenciesFor, disconnectImpact } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationResource, ReconnectReason } from "../integrations-data/types";
import { Button, FormField, ProviderLogo, SelectMenu, x } from "./ui";

/** Shared shell: full-screen on phones, a centred panel from `sm` up. */
function FlowDialog({
  open,
  onOpenChange,
  width = 560,
  children,
  locked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  width?: number;
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !locked && onOpenChange(next)}>
      <DialogContent
        showClose={false}
        style={{ ["--flow-width" as string]: `${width}px` }}
        className="flex h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:max-w-[var(--flow-width)] sm:rounded-[12px] sm:border"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function FlowHeader({ connection, title, description, onClose, locked }: { connection: IntegrationConnection; title: string; description: string; onClose: () => void; locked?: boolean }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#EEF1F5] px-5 py-4">
      <ProviderLogo providerId={connection.providerId} className="size-10" />
      <div className="min-w-0 flex-1">
        <DialogTitle className="text-[15px] font-semibold leading-5 text-[#0F1B3D]">{title}</DialogTitle>
        <DialogDescription className="mt-0.5 text-[12.5px] leading-4 text-[#6B7890]">{description}</DialogDescription>
      </div>
      <Button size="iconSm" variant="ghost" aria-label="Close" onClick={onClose} disabled={locked}>
        <span aria-hidden="true" className="text-[16px] leading-none">×</span>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reconnect                                                           */
/* ------------------------------------------------------------------ */

export function ReconnectDialog({ connection, open, onOpenChange }: { connection: IntegrationConnection | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!connection) return null;
  return <ReconnectBody key={`${connection.id}-${String(open)}`} connection={connection} open={open} onOpenChange={onOpenChange} />;
}

/** Reconnecting sends the browser to the provider; the connection is renewed when it comes back. Nothing here pretends otherwise. */
function ReconnectBody({ connection, open, onOpenChange }: { connection: IntegrationConnection; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, reconnect } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const [busy, setBusy] = useState(false);

  const dependencies = dependenciesFor(data.dependencies, connection.id).filter((dependency) => dependency.activeCount > 0);
  const reasonCode = (connection.statusReason?.code as ReconnectReason | undefined) ?? "token_expired";
  const reasonLabel = REASON_LABEL[reasonCode] ?? "Access needs to be renewed";

  if (!provider) return null;

  return (
    <FlowDialog open={open} onOpenChange={onOpenChange} width={580} locked={busy}>
      <FlowHeader connection={connection} title={`Reconnect ${provider.name}`} description={`${connection.accountName} · ${clientName(data.clients, connection.clientId)}`} onClose={() => onOpenChange(false)} locked={busy} />

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] p-3">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
            <KeyRound className="size-4 text-[#B54708]" />
            {reasonLabel}
          </p>
          <p className="mt-1 text-[12px] leading-4 text-[#3C4A66]">{connection.statusReason?.detail || "Renewing access keeps posting and reading working."}</p>
        </div>

        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Currently affected</p>
          {dependencies.length === 0 ? (
            <p className="text-[12.5px] text-[#6B7890]">Nothing is waiting on this connection right now.</p>
          ) : (
            <ul className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
              {dependencies.map((dependency) => (
                <li key={dependency.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-[#0F1B3D]">{MODULE_META[dependency.module].label}</span>
                    <span className="block truncate text-[11.5px] text-[#6B7890]">{dependency.feature}</span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-[#3C4A66]">
                    {dependency.activeCount} {dependency.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="flex items-start gap-2 text-[12px] leading-4 text-[#6B7890]">
          <ExternalLink className="mt-px size-3.5 shrink-0" />
          You&apos;ll be sent to {provider.name} to approve access again, then brought back here. OmniPlatform never sees your password. Nothing is changed or deleted while you reconnect.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="primary"
          iconRight={ArrowRight}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await reconnect(connection.id);
            if (!ok) setBusy(false);
          }}
        >
          Continue to {provider.name}
        </Button>
      </div>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Disconnect — impact analysis first                                  */
/* ------------------------------------------------------------------ */

export function DisconnectDialog({ connection, open, onOpenChange }: { connection: IntegrationConnection | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!connection) return null;
  return <DisconnectBody key={`${connection.id}-${String(open)}`} connection={connection} open={open} onOpenChange={onOpenChange} />;
}

function DisconnectBody({ connection, open, onOpenChange }: { connection: IntegrationConnection; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, disconnect } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const { withScope } = useClientScope();
  const impact = useMemo(() => disconnectImpact(data.dependencies, connection.id), [data.dependencies, connection.id]);
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!provider) return null;

  const settings = data.settings;
  const hasCritical = impact.critical.length > 0;
  const criticalCount = impact.critical.reduce((sum, dependency) => sum + dependency.activeCount, 0);
  const blockedByPolicy = hasCritical && settings.blockDisconnectWithScheduledPosts;
  const needsTyping = hasCritical && settings.confirmBeforeDisconnect;
  const ready = !blockedByPolicy && (!hasCritical || acknowledged) && (!needsTyping || typed.trim().toLowerCase() === "disconnect");

  return (
    <FlowDialog open={open} onOpenChange={onOpenChange} width={560} locked={busy}>
      <FlowHeader connection={connection} title={`Disconnect ${provider.name}?`} description={`${connection.accountName} · ${clientName(data.clients, connection.clientId)}`} onClose={() => onOpenChange(false)} locked={busy} />

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {impact.dependencies.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-sm border border-[#E4E9F0] bg-[#F8FAFC] p-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#12B76A]" />
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">Nothing in OmniPlatform is waiting on this integration right now, so disconnecting it won&apos;t interrupt any work.</p>
          </div>
        ) : (
          <>
            <div className={cn("flex items-start gap-2.5 rounded-sm border p-3", hasCritical ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#FBE3B6] bg-[#FFFAF0]")} role={hasCritical ? "alert" : "status"}>
              {hasCritical ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#C81E2B]" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B54708]" />}
              <p className="text-[12.5px] leading-5 text-[#3C4A66]">
                <b className="font-semibold text-[#0F1B3D]">This integration is in use.</b> {impact.totalItems} item{impact.totalItems === 1 ? "" : "s"} across {impact.modules.length} module
                {impact.modules.length === 1 ? "" : "s"} rely on it.
                {hasCritical && ` ${criticalCount} scheduled post${criticalCount === 1 ? "" : "s"} will fail to go out.`}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">What will be affected</p>
              <ul className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
                {impact.dependencies.map((dependency) => (
                  <li key={dependency.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F1B3D]">
                        {MODULE_META[dependency.module].label}
                        {dependency.critical && <span className="rounded-sm bg-[#FEF1F2] px-1 text-[10px] font-semibold text-[#C81E2B]">Stops</span>}
                      </span>
                      <span className="block truncate text-[11.5px] text-[#6B7890]">{dependency.feature}</span>
                    </span>
                    <span className={cn("shrink-0 text-[12px] font-semibold tabular-nums", dependency.critical ? "text-[#C81E2B]" : "text-[#3C4A66]")}>
                      {dependency.activeCount} {dependency.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {connection.resources.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Accounts that stop working</p>
                <ul className="flex flex-wrap gap-1">
                  {connection.resources.map((resource) => (
                    <li key={resource.id} className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#F1F4F8] px-2 text-[11.5px] text-[#24324F]">
                      {resource.name}
                      <span className="text-[#98A2B3]">· {RESOURCE_LABEL[resource.type]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockedByPolicy ? (
              <div className="flex items-start gap-2.5 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] p-3">
                <PauseCircle className="mt-0.5 size-4 shrink-0 text-[#6D28D9]" />
                <p className="text-[12.5px] leading-5 text-[#3C4A66]">
                  <b className="font-semibold text-[#0F1B3D]">Cancel or move the scheduled posts first.</b> Your integration settings stop a disconnect while posts are still waiting to go out through it.
                </p>
              </div>
            ) : (
              hasCritical && (
                <div className="space-y-2.5 rounded-sm border border-[#E4E9F0] p-3">
                  <label className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-5 text-[#24324F]">
                    <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-3.5 accent-[#C81E2B]" />
                    I understand {criticalCount} scheduled post{criticalCount === 1 ? "" : "s"} will fail, and nothing goes out until this is connected again.
                  </label>
                  {needsTyping && (
                    <FormField label={<span>Type <b className="font-mono">disconnect</b> to confirm</span>}>
                      <input value={typed} onChange={(event) => setTyped(event.target.value)} className={x.input} aria-label="Type disconnect to confirm" />
                    </FormField>
                  )}
                </div>
              )
            )}
          </>
        )}
        <p className="text-[11.5px] leading-4 text-[#98A2B3]">
          If posts were ever scheduled through its accounts their history is kept, and you can connect again at any time from Available.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        {impact.dependencies.length > 0 && (
          <Link
            href={withScope(intRoutes.detail(connection.id, "usage"))}
            onClick={() => onOpenChange(false)}
            className={cn("inline-flex h-9 items-center rounded-sm border border-[#DCE2EA] bg-white px-3.5 text-[12.5px] font-semibold text-[#24324F] hover:bg-[#F7F9FC]", x.focus)}
          >
            Review dependencies
          </Link>
        )}
        <Button
          variant="dangerSolid"
          icon={Unplug}
          loading={busy}
          disabled={!ready}
          disabledReason={blockedByPolicy ? "Cancel or move the scheduled posts first, as your settings require." : !acknowledged && hasCritical ? "Confirm you understand what will stop." : "Type “disconnect” to confirm."}
          onClick={async () => {
            setBusy(true);
            const ok = await disconnect(connection.id);
            setBusy(false);
            if (ok) onOpenChange(false);
          }}
        >
          Disconnect
        </Button>
      </div>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts: move to another client, or remove                         */
/* ------------------------------------------------------------------ */

export function MappingDialog({
  connection,
  resource,
  open,
  onOpenChange,
}: {
  connection: IntegrationConnection | null;
  resource: IntegrationResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!connection) return null;
  return <MappingBody key={`${connection.id}-${resource?.id ?? "any"}-${String(open)}`} connection={connection} initialResource={resource} open={open} onOpenChange={onOpenChange} />;
}

function MappingBody({
  connection,
  initialResource,
  open,
  onOpenChange,
}: {
  connection: IntegrationConnection;
  initialResource: IntegrationResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, can, changeMapping, removeResource } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const [resourceId, setResourceId] = useState(initialResource?.id ?? connection.resources[0]?.id ?? "");
  const resource = connection.resources.find((item) => item.id === resourceId) ?? null;
  const [target, setTarget] = useState(resource?.clientId ?? "");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = Boolean(resource && target && target !== resource.clientId);
  const locked = Boolean(resource?.hasPostHistory);

  const save = async () => {
    if (!resource || !dirty) return false;
    setBusy(true);
    const ok = await changeMapping(connection.id, resource.id, target);
    setBusy(false);
    if (ok) onOpenChange(false);
    return ok;
  };

  const remove = async () => {
    if (!resource) return;
    setBusy(true);
    const ok = await removeResource(connection.id, resource.id);
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  // Closing with a pending change asks first — Stay, Discard, or Save & leave.
  const requestClose = () => (dirty ? setConfirmLeave(true) : onOpenChange(false));

  if (!provider) return null;

  return (
    <FlowDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())} width={500} locked={busy}>
      <FlowHeader connection={connection} title="Manage accounts" description={`${provider.name} · ${connection.accountName}`} onClose={requestClose} locked={busy} />

      <div className="space-y-3 px-5 py-4">
        {connection.resources.length === 0 ? (
          <p className="text-[12.5px] leading-5 text-[#3C4A66]">No accounts are mapped to a client yet. Use “Add accounts” on the integration to choose which pages, locations or channels to connect.</p>
        ) : (
          <>
            <FormField label="Account or property">
              <SelectMenu
                label="Account or property"
                fullWidth
                size="md"
                value={resourceId}
                onChange={(value) => {
                  setResourceId(value);
                  setTarget(connection.resources.find((item) => item.id === value)?.clientId ?? "");
                }}
                options={connection.resources.map((item) => ({ value: item.id, label: item.name, description: `${RESOURCE_LABEL[item.type]} · ${clientName(data.clients, item.clientId)}` }))}
              />
            </FormField>
            {locked ? (
              <p className="flex items-start gap-2 rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] px-3 py-2 text-[12px] leading-4 text-[#3C4A66]">
                <AlertTriangle className="mt-px size-3.5 shrink-0 text-[#B54708]" />
                Posts were scheduled through this account for {clientName(data.clients, resource?.clientId ?? null)}, so it can&apos;t move to another client or be removed. Disconnect the whole integration if you need to stop using it.
              </p>
            ) : (
              <>
                <FormField label="Belongs to client" hint="Data from this account will appear under the selected client from now on.">
                  <SelectMenu label="Client" fullWidth size="md" value={target} onChange={setTarget} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} />
                </FormField>
                {resource && dirty && (
                  <p className="flex items-center gap-2 rounded-sm bg-[#F5F8FF] px-3 py-2 text-[12px] text-[#3C4A66]">
                    {clientName(data.clients, resource.clientId)}
                    <ArrowRight className="size-3.5 text-[#2563EB]" />
                    <b className="font-semibold text-[#0F1B3D]">{clientName(data.clients, target)}</b>
                  </p>
                )}
              </>
            )}
          </>
        )}

        {confirmLeave && (
          <div className="rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] p-3" role="alertdialog" aria-label="Unsaved mapping change">
            <p className="text-[12.5px] font-semibold text-[#0F1B3D]">You have an unsaved mapping change</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(false)}>
                Stay
              </Button>
              <Button size="sm" variant="danger" onClick={() => onOpenChange(false)}>
                Discard
              </Button>
              <Button size="sm" variant="primary" loading={busy} onClick={() => void save()}>
                Save &amp; leave
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#EEF1F5] px-5 py-3">
        <Button variant="danger" icon={Trash2} disabled={!resource || locked || !can.canChangeMapping.allowed} disabledReason={locked ? "Posts were scheduled through this account." : can.canChangeMapping.reason} loading={busy} onClick={() => void remove()}>
          Remove account
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={requestClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} gate={can.canChangeMapping} disabled={!dirty || locked} disabledReason="Choose a different client to save." onClick={() => void save()}>
            Save mapping
          </Button>
        </div>
      </div>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Add accounts: ask the provider what the login can reach, map them   */
/* ------------------------------------------------------------------ */

export function AddAccountsDialog({ connection, open, onOpenChange, defaultClientId }: { connection: IntegrationConnection | null; open: boolean; onOpenChange: (open: boolean) => void; defaultClientId?: string | null }) {
  if (!connection || !open) return null;
  return <AddAccountsBody key={connection.id} connection={connection} onOpenChange={onOpenChange} defaultClientId={defaultClientId ?? null} />;
}

function AddAccountsBody({ connection, onOpenChange, defaultClientId }: { connection: IntegrationConnection; onOpenChange: (open: boolean) => void; defaultClientId: string | null }) {
  const { data, can, discoverResources, mapResources } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const [found, setFound] = useState<DiscoveredResource[] | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const fallbackClient = defaultClientId && data.clients.some((client) => client.id === defaultClientId) ? defaultClientId : (data.clients[0]?.id ?? "");
  const mappedIds = useMemo(() => new Set(connection.resources.map((resource) => resource.externalId)), [connection.resources]);

  useEffect(() => {
    let cancelled = false;
    void discoverResources(connection.id).then((resources) => {
      if (!cancelled) setFound(resources ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [connection.id, discoverResources]);

  if (!provider) return null;

  const isMapped = (resource: DiscoveredResource) => mappedIds.has(resource.id);
  const free = (found ?? []).filter((resource) => !isMapped(resource));
  const chosen = free.filter((resource) => picked[resource.id]);

  const toggle = (resource: DiscoveredResource) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[resource.id]) delete next[resource.id];
      else next[resource.id] = fallbackClient;
      return next;
    });

  const save = async () => {
    setBusy(true);
    const outcome = await mapResources(
      connection.id,
      chosen.map((resource) => ({ resource, clientId: picked[resource.id]! })),
    );
    setBusy(false);
    if (outcome && outcome.failed.length === 0) onOpenChange(false);
  };

  return (
    <FlowDialog open onOpenChange={onOpenChange} width={620} locked={busy}>
      <FlowHeader connection={connection} title="Add accounts" description={`Choose which ${provider.resourceTypes.map((type) => type.label.toLowerCase()).join(" and ")} to use, and which client each belongs to.`} onClose={() => onOpenChange(false)} locked={busy} />

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {found === null ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="size-6 animate-spin text-[#2563EB]" />
            <p className="mt-3 text-[13px] font-semibold text-[#0F1B3D]">Asking {provider.name}…</p>
            <p className="mt-1 text-[12px] text-[#6B7890]">Looking up what this login can reach.</p>
          </div>
        ) : found.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13.5px] font-semibold text-[#0F1B3D]">No accounts found</p>
            <p className="mt-1 text-[12.5px] text-[#6B7890]">
              The {provider.name} login doesn&apos;t manage any {provider.resourceTypes.map((type) => type.label.toLowerCase()).join(" or ")} that OmniPlatform can use. Reconnect with a login that does.
            </p>
          </div>
        ) : data.clients.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-[#6B7890]">Create a client first, then come back to map these accounts.</p>
        ) : (
          <ul className="space-y-1">
            {found.map((resource) => {
              const mapped = isMapped(resource);
              const mappedTo = connection.resources.find((item) => item.externalId === resource.id);
              const checked = Boolean(picked[resource.id]);
              return (
                <li key={`${resource.type}-${resource.id}`} className={cn("flex flex-wrap items-center gap-3 rounded-sm border px-3 py-2", checked ? "border-[#2563EB] bg-[#F5F8FF]" : "border-[#E4E9F0] bg-white", mapped && "opacity-70")}>
                  <label className={cn("flex min-w-0 flex-1 items-center gap-3", !mapped && "cursor-pointer")}>
                    <input type="checkbox" checked={checked || mapped} disabled={mapped || busy} onChange={() => toggle(resource)} className="size-4 shrink-0 accent-[#2563EB]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{resource.name}</span>
                      <span className="block truncate text-[11.5px] text-[#6B7890]">{RESOURCE_LABEL[resource.type]}</span>
                    </span>
                  </label>
                  {mapped ? (
                    <span className="text-[11.5px] text-[#6B7890]">Already mapped to {clientName(data.clients, mappedTo?.clientId ?? null)}</span>
                  ) : checked ? (
                    <SelectMenu
                      label={`Client for ${resource.name}`}
                      size="sm"
                      align="end"
                      value={picked[resource.id]!}
                      onChange={(value) => setPicked((current) => ({ ...current, [resource.id]: value }))}
                      options={data.clients.map((client) => ({ value: client.id, label: client.name }))}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
          {chosen.length ? "Cancel" : "Close"}
        </Button>
        <Button variant="primary" loading={busy} gate={can.canChangeMapping} disabled={chosen.length === 0} disabledReason="Tick at least one account." onClick={() => void save()}>
          {chosen.length ? `Map ${chosen.length} ${chosen.length === 1 ? "account" : "accounts"}` : "Map accounts"}
        </Button>
      </div>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Check all                                                           */
/* ------------------------------------------------------------------ */

export function CheckAllDialog({ open, onOpenChange, connectionIds, scopeLabel }: { open: boolean; onOpenChange: (open: boolean) => void; connectionIds: string[]; scopeLabel: string }) {
  const { checkAll, runCheckAll, clearCheckAll, data } = useIntegrations();
  const running = checkAll?.running ?? false;
  const finished = checkAll && !checkAll.running;

  const close = () => {
    if (running) return;
    clearCheckAll();
    onOpenChange(false);
  };

  const skippedUpFront = data.connections.filter((connection) => !connectionIds.includes(connection.id) && connection.status !== "disconnected").length;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showClose={false} className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#EFF4FF] text-[#1D4ED8]">
            <RefreshCw className={cn("size-4", running && "animate-spin")} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[15px] font-semibold text-[#0F1B3D]">
              {finished ? "Checks finished" : running ? "Checking integrations…" : `Check ${connectionIds.length} integration${connectionIds.length === 1 ? "" : "s"}?`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
              {finished
                ? "Here's how each integration came back."
                : running
                  ? "Each integration is asked in turn what its login can reach. You can close this when it's done."
                  : `Asks every integration in ${scopeLabel} whether its login still works, renewing access where it can. Integrations that need reconnecting are skipped.`}
            </DialogDescription>
          </div>
        </div>

        <div className="px-5 pt-4">
          {checkAll ? (
            <>
              <span className="block h-2 overflow-hidden rounded-sm bg-[#EEF1F5]">
                <span className="block h-full rounded-sm bg-[#2563EB] transition-[width] duration-300" style={{ width: `${(checkAll.done / Math.max(checkAll.total, 1)) * 100}%` }} />
              </span>
              <p className="mt-1.5 text-[12px] tabular-nums text-[#6B7890]">
                {checkAll.done} of {checkAll.total} complete
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-1">
                {[
                  { label: "Working", value: checkAll.success, tone: "text-[#067647]" },
                  { label: "Failed", value: checkAll.failed, tone: "text-[#C81E2B]" },
                  { label: "Skipped", value: checkAll.skipped, tone: "text-[#6B7890]" },
                ].map((item) => (
                  <div key={item.label} className="rounded-sm border border-[#E4E9F0] px-2 py-1.5">
                    <dt className="text-[10.5px] text-[#6B7890]">{item.label}</dt>
                    <dd className={cn("text-[16px] font-semibold tabular-nums", item.tone)}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            skippedUpFront > 0 && (
              <p className="rounded-sm bg-[#F8FAFC] px-3 py-2 text-[12px] text-[#6B7890]">
                {skippedUpFront} integration{skippedUpFront === 1 ? " isn't" : "s aren't"} included because {skippedUpFront === 1 ? "it needs" : "they need"} attention first.
              </p>
            )
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
          {!checkAll && (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" icon={RefreshCw} disabled={connectionIds.length === 0} disabledReason="Nothing in this scope can be checked right now." onClick={() => void runCheckAll(connectionIds)}>
                Check {connectionIds.length}
              </Button>
            </>
          )}
          {checkAll && (
            <Button variant="primary" loading={running} onClick={close}>
              {running ? "Checking…" : "Done"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
