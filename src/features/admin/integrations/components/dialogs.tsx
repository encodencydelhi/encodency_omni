"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  PauseCircle,
  RefreshCw,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { MODULE_META, REASON_LABEL, RESOURCE_LABEL, intRoutes } from "../integrations-data/config";
import { useClientScope, useProvider } from "../integrations-data/hooks";
import { clientName, dependenciesFor, disconnectImpact } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationResource, ReconnectReason } from "../integrations-data/types";
import { Button, FormField, PermissionChip, ProviderLogo, SelectMenu, StatusChip, x } from "./ui";

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

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5 border-b border-[#EEF1F5] px-5 py-2.5" aria-label="Progress">
      {steps.map((step, index) => (
        <li key={step} className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold",
              index < current ? "bg-[#12B76A] text-white" : index === current ? "bg-[#2563EB] text-white" : "bg-[#F1F4F8] text-[#98A2B3]",
            )}
            aria-current={index === current ? "step" : undefined}
          >
            {index < current ? "✓" : index + 1}
          </span>
          <span className={cn("truncate text-[11.5px] font-medium", index === current ? "text-[#0F1B3D]" : "text-[#98A2B3]", "max-sm:hidden")}>{step}</span>
          {index < steps.length - 1 && <span className="h-px w-3 shrink-0 bg-[#E4E9F0] sm:w-5" />}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Reconnect                                                           */
/* ------------------------------------------------------------------ */

type ReconnectStep = "reason" | "authorizing" | "review" | "done";

export function ReconnectDialog({ connection, open, onOpenChange }: { connection: IntegrationConnection | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!connection) return null;
  return <ReconnectBody key={`${connection.id}-${String(open)}`} connection={connection} open={open} onOpenChange={onOpenChange} />;
}

function ReconnectBody({ connection, open, onOpenChange }: { connection: IntegrationConnection; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, authorize, reconnect, syncJobs } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const { withScope } = useClientScope();
  const router = useRouter();
  const [step, setStep] = useState<ReconnectStep>("reason");
  const [busy, setBusy] = useState(false);

  const live = data.connections.find((item) => item.id === connection.id) ?? connection;
  const dependencies = dependenciesFor(data.dependencies, connection.id).filter((dependency) => dependency.activeCount > 0);
  const reasonCode = (connection.statusReason?.code as ReconnectReason | undefined) ?? "token_expired";
  const reasonLabel = REASON_LABEL[reasonCode] ?? "Access needs to be renewed";
  const lacking = connection.permissions.filter((permission) => permission.status === "missing" || permission.status === "expired");
  const job = syncJobs[connection.id];

  if (!provider) return null;
  const locked = busy || step === "authorizing";
  const stepIndex = { reason: 0, authorizing: 1, review: 2, done: 3 }[step];

  return (
    <FlowDialog open={open} onOpenChange={onOpenChange} width={580} locked={locked}>
      <FlowHeader
        connection={connection}
        title={step === "done" ? `${provider.name} reconnected` : `Reconnect ${provider.name}`}
        description={`${connection.accountName} · ${clientName(data.clients, connection.clientId)}`}
        onClose={() => onOpenChange(false)}
        locked={locked}
      />
      <Steps steps={["Why", "Authorize", "Review", "Done"]} current={stepIndex} />

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {step === "reason" && (
          <div className="space-y-3">
            <div className="rounded-sm border border-[#FBE3B6] bg-[#FFFAF0] p-3">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
                <KeyRound className="size-4 text-[#B54708]" />
                {reasonLabel}
              </p>
              <p className="mt-1 text-[12px] leading-4 text-[#3C4A66]">{connection.statusReason?.detail ?? "Renewing access keeps syncing and publishing working."}</p>
            </div>

            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Currently affected</p>
              {dependencies.length === 0 ? (
                <p className="text-[12.5px] text-[#6B7890]">No OmniPlatform features rely on this connection yet.</p>
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
              You&apos;ll be sent to {provider.name} to approve access again. OmniPlatform never sees your password. Nothing is changed or deleted while you reconnect.
            </p>
          </div>
        )}

        {step === "authorizing" && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="size-7 animate-spin text-[#2563EB]" />
            <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">Waiting for {provider.name}…</p>
            <p className="mt-1 max-w-[360px] text-[12.5px] leading-5 text-[#6B7890]">Approve access in the {provider.name} window. This screen continues automatically when you&apos;re done.</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3">
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">
              {provider.name} approved the request. These permissions will be active once you finish:
            </p>
            <ul className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
              {provider.permissions.map((definition) => {
                const current = connection.permissions.find((permission) => permission.key === definition.key);
                const restored = lacking.some((permission) => permission.key === definition.key);
                return (
                  <li key={definition.key} className="flex items-start justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F1B3D]">
                        {definition.label}
                        {restored && <span className="rounded-sm bg-[#ECFAF3] px-1 text-[10px] font-semibold text-[#067647]">Restored</span>}
                      </span>
                      <span className="block text-[11.5px] leading-4 text-[#6B7890]">{definition.description}</span>
                    </span>
                    <PermissionChip status={current?.status === "optional" ? "optional" : "granted"} />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-sm border border-[#C6EFD9] bg-[#F4FCF8] p-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#12B76A]" />
              <div>
                <p className="text-[13px] font-semibold text-[#0F1B3D]">Access renewed</p>
                <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">
                  {dependencies.length ? `${dependencies.length} dependent feature${dependencies.length === 1 ? "" : "s"} can run again.` : "The connection is healthy again."} The next token lasts 60 days.
                </p>
              </div>
            </div>
            <div className="rounded-sm border border-[#E4E9F0] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-medium text-[#0F1B3D]">Fresh sync</p>
                <StatusChip status={live.status} progress={job?.progress} />
              </div>
              {job ? (
                <>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-sm bg-[#EEF1F5]">
                    <span className="block h-full rounded-sm bg-[#2563EB] transition-[width] duration-300" style={{ width: `${job.progress}%` }} />
                  </span>
                  <p className="mt-1 text-[11.5px] text-[#6B7890]">{job.phase}</p>
                </>
              ) : (
                <p className="mt-1 text-[11.5px] text-[#6B7890]">{live.status === "sync_failed" ? "The first sync failed — open the integration to retry." : "Completed. Data is up to date."}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
        {step === "reason" && (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              iconRight={ArrowRight}
              onClick={async () => {
                setStep("authorizing");
                const ok = await authorize(connection.providerId);
                setStep(ok ? "review" : "reason");
              }}
            >
              Continue to {provider.name}
            </Button>
          </>
        )}
        {step === "review" && (
          <>
            <Button variant="ghost" onClick={() => setStep("reason")} disabled={busy}>
              Back
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await reconnect(connection.id);
                setBusy(false);
                if (ok) setStep("done");
              }}
            >
              Complete reconnect
            </Button>
          </>
        )}
        {step === "done" && (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                router.push(withScope(intRoutes.detail(connection.id)));
              }}
            >
              View integration
            </Button>
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </>
        )}
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

  const security = data.settings.security;
  const hasCritical = impact.critical.length > 0;
  const criticalCount = impact.critical.reduce((sum, dependency) => sum + dependency.activeCount, 0);
  const blockedByPolicy = hasCritical && security.requirePauseBeforeDisconnect;
  const needsTyping = hasCritical && security.confirmCriticalDisconnect;
  const ready = !blockedByPolicy && (!hasCritical || acknowledged) && (!needsTyping || typed.trim().toLowerCase() === "disconnect");

  return (
    <FlowDialog open={open} onOpenChange={onOpenChange} width={560} locked={busy}>
      <FlowHeader
        connection={connection}
        title={`Disconnect ${provider.name}?`}
        description={`${connection.accountName} · ${clientName(data.clients, connection.clientId)}`}
        onClose={() => onOpenChange(false)}
        locked={busy}
      />

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {impact.dependencies.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-sm border border-[#E4E9F0] bg-[#F8FAFC] p-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#12B76A]" />
            <p className="text-[12.5px] leading-5 text-[#3C4A66]">Nothing in OmniPlatform depends on this integration right now, so disconnecting it won&apos;t interrupt any work.</p>
          </div>
        ) : (
          <>
            <div className={cn("flex items-start gap-2.5 rounded-sm border p-3", hasCritical ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#FBE3B6] bg-[#FFFAF0]")} role={hasCritical ? "alert" : "status"}>
              {hasCritical ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#C81E2B]" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B54708]" />}
              <p className="text-[12.5px] leading-5 text-[#3C4A66]">
                <b className="font-semibold text-[#0F1B3D]">This integration is in use.</b> {impact.totalItems} item{impact.totalItems === 1 ? "" : "s"} across{" "}
                {impact.modules.length} module{impact.modules.length === 1 ? "" : "s"} rely on it.
                {hasCritical && ` ${criticalCount} of them are live and will stop working immediately.`}
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

            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Accounts that stop syncing</p>
              <ul className="flex flex-wrap gap-1">
                {connection.resources.map((resource) => (
                  <li key={resource.id} className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#F1F4F8] px-2 text-[11.5px] text-[#24324F]">
                    {resource.name}
                    <span className="text-[#98A2B3]">· {RESOURCE_LABEL[resource.type]}</span>
                  </li>
                ))}
              </ul>
            </div>

            {blockedByPolicy ? (
              <div className="flex items-start gap-2.5 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] p-3">
                <PauseCircle className="mt-0.5 size-4 shrink-0 text-[#6D28D9]" />
                <p className="text-[12.5px] leading-5 text-[#3C4A66]">
                  <b className="font-semibold text-[#0F1B3D]">Pause or reassign first.</b> Your company requires live items to be paused or moved to another account before a critical integration is disconnected.
                </p>
              </div>
            ) : (
              hasCritical && (
                <div className="space-y-2.5 rounded-sm border border-[#E4E9F0] p-3">
                  <label className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-5 text-[#24324F]">
                    <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-3.5 accent-[#C81E2B]" />
                    I understand {criticalCount} live item{criticalCount === 1 ? "" : "s"} will stop, and nothing will run until this is connected again.
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
        <p className="text-[11.5px] leading-4 text-[#98A2B3]">Synced history is kept, and you can connect again at any time from Available.</p>
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
          disabledReason={
            blockedByPolicy
              ? "Pause or reassign the live items first, as required by your Security settings."
              : !acknowledged && hasCritical
                ? "Confirm you understand what will stop."
                : "Type “disconnect” to confirm."
          }
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
/* Client mapping                                                      */
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
  const { data, changeMapping } = useIntegrations();
  const provider = useProvider(connection.providerId);
  const [resourceId, setResourceId] = useState(initialResource?.id ?? connection.resources[0]?.id ?? "");
  const resource = connection.resources.find((item) => item.id === resourceId) ?? null;
  const [target, setTarget] = useState(resource?.clientId ?? "");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = Boolean(resource && target && target !== resource.clientId);

  const save = async () => {
    if (!resource || !dirty) return false;
    setBusy(true);
    const ok = await changeMapping(connection.id, resource.id, target);
    setBusy(false);
    if (ok) onOpenChange(false);
    return ok;
  };

  // Closing with a pending change asks first — Stay, Discard, or Save & leave.
  const requestClose = () => (dirty ? setConfirmLeave(true) : onOpenChange(false));

  if (!provider) return null;

  return (
    <FlowDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())} width={500} locked={busy}>
      <FlowHeader connection={connection} title="Change client mapping" description={`${provider.name} · ${connection.accountName}`} onClose={requestClose} locked={busy} />

      <div className="space-y-3 px-5 py-4">
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
        <FormField label="Belongs to client" hint="Data from this account will appear under the selected client from now on. Historical reports are not moved.">
          <SelectMenu label="Client" fullWidth size="md" value={target} onChange={setTarget} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} />
        </FormField>
        {resource && dirty && (
          <p className="flex items-center gap-2 rounded-sm bg-[#F5F8FF] px-3 py-2 text-[12px] text-[#3C4A66]">
            {clientName(data.clients, resource.clientId)}
            <ArrowRight className="size-3.5 text-[#2563EB]" />
            <b className="font-semibold text-[#0F1B3D]">{clientName(data.clients, target)}</b>
          </p>
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

      <div className="flex items-center justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
        <Button variant="ghost" onClick={requestClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" loading={busy} disabled={!dirty} disabledReason="Choose a different client to save." onClick={() => void save()}>
          Save mapping
        </Button>
      </div>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Sync all                                                            */
/* ------------------------------------------------------------------ */

export function SyncAllDialog({ open, onOpenChange, connectionIds, scopeLabel }: { open: boolean; onOpenChange: (open: boolean) => void; connectionIds: string[]; scopeLabel: string }) {
  const { syncAll, runSyncAll, clearSyncAll, data } = useIntegrations();
  const running = syncAll?.running ?? false;
  const finished = syncAll && !syncAll.running;

  const close = () => {
    if (running) return;
    clearSyncAll();
    onOpenChange(false);
  };

  const skippedUpFront = data.connections.filter(
    (connection) => !connectionIds.includes(connection.id) && connection.status !== "disconnected",
  ).length;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showClose={false} className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#EFF4FF] text-[#1D4ED8]">
            <RefreshCw className={cn("size-4", running && "animate-spin")} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[15px] font-semibold text-[#0F1B3D]">
              {finished ? "Sync finished" : running ? "Syncing integrations…" : `Sync ${connectionIds.length} integration${connectionIds.length === 1 ? "" : "s"}?`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
              {finished
                ? "Here's how each integration came back."
                : running
                  ? "You can close this when it's done. Syncing continues if you navigate away."
                  : `Pulls the latest data for every syncable integration in ${scopeLabel}. Integrations that need reconnecting or are rate limited are skipped.`}
            </DialogDescription>
          </div>
        </div>

        <div className="px-5 pt-4">
          {syncAll ? (
            <>
              <span className="block h-2 overflow-hidden rounded-sm bg-[#EEF1F5]">
                <span className="block h-full rounded-sm bg-[#2563EB] transition-[width] duration-300" style={{ width: `${(syncAll.done / Math.max(syncAll.total, 1)) * 100}%` }} />
              </span>
              <p className="mt-1.5 text-[12px] tabular-nums text-[#6B7890]">
                {syncAll.done} of {syncAll.total} complete
              </p>
              <dl className="mt-3 grid grid-cols-4 gap-1">
                {[
                  { label: "Succeeded", value: syncAll.success, tone: "text-[#067647]" },
                  { label: "Partial", value: syncAll.partial, tone: "text-[#B54708]" },
                  { label: "Failed", value: syncAll.failed, tone: "text-[#C81E2B]" },
                  { label: "Skipped", value: syncAll.skipped, tone: "text-[#6B7890]" },
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
          {!syncAll && (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" icon={RefreshCw} disabled={connectionIds.length === 0} disabledReason="Nothing in this scope can be synced right now." onClick={() => void runSyncAll(connectionIds)}>
                Sync {connectionIds.length}
              </Button>
            </>
          )}
          {syncAll && (
            <Button variant="primary" loading={running} onClick={close}>
              {running ? "Syncing…" : "Done"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
