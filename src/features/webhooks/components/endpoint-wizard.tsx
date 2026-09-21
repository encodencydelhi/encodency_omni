/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Add Endpoint wizard: identity, destination & ownership, subscriptions, delivery & security, review.
 *
 * Saves a demo configuration only. The endpoint does not receive real platform deliveries, and no
 * signing secret is generated or stored.
 */

"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABEL, ENVIRONMENT_OPTIONS, PRIVACY_LABEL, RETRY_POLICIES, SIGNING_STATE, WEBHOOK_ROUTES } from "../data/config";
import { useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import { endpointSecurityWarnings } from "../data/selectors";
import type { CreateEndpointInput, EventCategory, OutgoingEndpoint } from "../data/types";
import { checkDestinationUrl, DESCRIPTION_MAX, ENDPOINT_NAME_MAX, hasErrors, validateEndpointDraft, type EndpointFormErrors, type EndpointStepId } from "../data/validation";
import { Chip, Notice, State } from "./kit";
import { useWebhookData, useWebhooks } from "./webhooks-context";

const STEPS: Array<{ id: EndpointStepId; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "destination", label: "Destination" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "delivery", label: "Delivery & Security" },
  { id: "review", label: "Review & Save" },
];

function Field({ label, htmlFor, hint, error, required, children }: { label: string; htmlFor?: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}{required ? " *" : ""}</Label>
      {children}
      {error ? <p className="text-2xs text-danger" role="alert">{error}</p> : hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EndpointWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { snapshot, environment } = useWebhookData();
  const { setEnvironment } = useWebhooks();
  const router = useRouter();

  const blank = (): CreateEndpointInput => ({
    name: "", description: "", environment, ownerScope: "company", companyId: null, destinationUrl: "",
    allowedAudience: "", contactRef: null, eventKeys: [], timeoutMs: 10_000,
    retryPolicyRef: "retry-policy/standard-v1", payloadPrivacy: "operational", state: "draft",
  });

  const [draft, setDraft] = useState<CreateEndpointInput>(blank);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<EndpointFormErrors>({});

  const create = useWebhookMutation(environment, (input: CreateEndpointInput) => webhooksRepository.createEndpoint(input.environment, input));
  const existingNames = useMemo(() => snapshot.endpoints.map((endpoint) => endpoint.name), [snapshot.endpoints]);
  const urlCheck = useMemo(() => checkDestinationUrl(draft.destinationUrl, draft.environment), [draft.destinationUrl, draft.environment]);

  const patch = (changes: Partial<CreateEndpointInput>) => setDraft((current) => ({ ...current, ...changes }));
  const reset = () => { setDraft(blank()); setStep(0); setErrors({}); };
  const close = (next: boolean) => { if (!next) reset(); onOpenChange(next); };

  const current = STEPS[step]!;
  const next = () => {
    const found = validateEndpointDraft(draft, current.id, { existingNames });
    setErrors(found);
    if (!hasErrors(found)) setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const save = async () => {
    const found = validateEndpointDraft(draft, "review", { existingNames });
    setErrors(found);
    if (hasErrors(found)) {
      const first = found.name || found.companyId ? 0 : found.destinationUrl ? 1 : found.eventKeys ? 2 : 3;
      setStep(first);
      return;
    }
    try {
      const saved = await create.mutateAsync(draft);
      toast.success("Demo endpoint saved", { description: "It is a demo configuration only. It is not receiving real platform deliveries." });
      if (saved.environment !== environment) setEnvironment(saved.environment);
      close(false);
      router.push(WEBHOOK_ROUTES.endpoint(saved.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The endpoint could not be saved.");
    }
  };

  const eligibleTypes = snapshot.eventTypes.filter((type) => type.availability === "available");
  const groups = (Object.keys(CATEGORY_LABEL) as EventCategory[])
    .map((category) => ({ category, types: eligibleTypes.filter((type) => type.category === category) }))
    .filter((group) => group.types.length);
  const companyScoped = draft.ownerScope === "company";
  const company = snapshot.companies.find((item) => item.id === draft.companyId);
  const policy = RETRY_POLICIES.find((item) => item.ref === draft.retryPolicyRef)!;

  const previewEndpoint: Pick<OutgoingEndpoint, "signing" | "security" | "hadQueryString"> = {
    signing: { method: "hmac_sha256", state: "demo_reference", secretVersionRef: null, lastRotationAt: null, reviewStatus: "not_reviewed" },
    security: { httpsState: urlCheck.scheme, urlValidationState: urlCheck.ok ? (urlCheck.warnings.length ? "warnings" : "passed_preliminary") : "failed", lastSecurityReviewAt: null },
    hadQueryString: urlCheck.hadQueryString,
  };
  const reviewWarnings = endpointSecurityWarnings(previewEndpoint as OutgoingEndpoint);

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="max-w-none sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Add Outgoing Endpoint</SheetTitle>
          <SheetDescription>Configure a destination and event subscriptions. This saves a demo configuration only.</SheetDescription>
          <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Wizard steps">
            {STEPS.map((item, index) => (
              <li key={item.id} aria-current={index === step ? "step" : undefined}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => setStep(index)}
                  className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors", index === step ? "border-primary/40 bg-primary-subtle text-primary" : index < step ? "border-border text-foreground hover:bg-accent" : "border-border text-muted-foreground")}
                >
                  <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px]", index < step ? "bg-success text-white" : "bg-muted")}>{index < step ? <CheckIcon className="size-2.5" /> : index + 1}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {step === 0 ? (
            <div className="space-y-4">
              <Field label="Endpoint name" htmlFor="ep-name" required error={errors.name} hint={`${draft.name.length}/${ENDPOINT_NAME_MAX}`}>
                <Input id="ep-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={Boolean(errors.name)} placeholder="e.g. Acme - Publishing Sync" autoFocus />
              </Field>
              <Field label="Description" htmlFor="ep-desc" error={errors.description} hint={`${draft.description.length}/${DESCRIPTION_MAX}`}>
                <Textarea id="ep-desc" rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
              </Field>
              <Field label="Environment" htmlFor="ep-env" hint="Production requires HTTPS.">
                <Select value={draft.environment} onValueChange={(value) => patch({ environment: value as CreateEndpointInput["environment"] })}>
                  <SelectTrigger id="ep-env"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENVIRONMENT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Owner scope" hint="Platform endpoints receive cross-company operational events. Company endpoints only receive that company's events.">
                <RadioGroup value={draft.ownerScope} onValueChange={(value) => patch({ ownerScope: value as "platform" | "company", companyId: value === "platform" ? null : draft.companyId, eventKeys: [] })} className="grid gap-2 sm:grid-cols-2">
                  {[{ v: "company", t: "Company", d: "Owned by one tenant company" }, { v: "platform", t: "Platform", d: "Owned by EnCodency operations" }].map((o) => (
                    <label key={o.v} className={cn("flex cursor-pointer items-start gap-2.5 rounded-sm border p-3", draft.ownerScope === o.v ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                      <RadioGroupItem value={o.v} className="mt-0.5" />
                      <span><span className="block text-[0.8125rem] font-medium">{o.t}</span><span className="text-2xs text-muted-foreground">{o.d}</span></span>
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              {companyScoped ? (
                <Field label="Company" htmlFor="ep-company" required error={errors.companyId} hint="From the company registry.">
                  <Select value={draft.companyId ?? ""} onValueChange={(value) => patch({ companyId: value })}>
                    <SelectTrigger id="ep-company" aria-invalid={Boolean(errors.companyId)}><SelectValue placeholder="Select a company" /></SelectTrigger>
                    <SelectContent>{snapshot.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <Notice tone="warning" title="Frontend validation is preliminary">
                It does not make a destination safe to call. A backend must enforce SSRF protection, DNS resolution checks, redirect policy, private-address blocking and egress controls.
              </Notice>
              <Field label="Destination HTTPS URL" htmlFor="ep-url" required error={errors.destinationUrl}>
                <Input id="ep-url" value={draft.destinationUrl} onChange={(e) => patch({ destinationUrl: e.target.value })} aria-invalid={Boolean(errors.destinationUrl)} placeholder="https://hooks.example.com/omniplatform" inputMode="url" autoComplete="off" />
              </Field>
              {draft.destinationUrl.trim() ? (
                <div className="space-y-1.5 rounded-sm border border-border p-3" aria-live="polite">
                  {urlCheck.ok ? <p className="text-[0.8125rem] font-medium text-foreground">Preliminary check passed. Stored as <span className="font-mono text-2xs">{urlCheck.sanitizedUrl}</span></p> : null}
                  {urlCheck.errors.map((message) => <p key={message} className="text-2xs text-danger">{message}</p>)}
                  {urlCheck.warnings.map((message) => <p key={message} className="text-2xs text-warning">{message}</p>)}
                </div>
              ) : null}
              <Field label="Allowed event audience" htmlFor="ep-aud" hint="Optional. Leave blank to use the default for the owner scope.">
                <Input id="ep-aud" value={draft.allowedAudience} onChange={(e) => patch({ allowedAudience: e.target.value })} />
              </Field>
              <Field label="Contact / owner reference" htmlFor="ep-contact" hint="Optional. A team mailbox is preferable to a personal address.">
                <Input id="ep-contact" value={draft.contactRef ?? ""} onChange={(e) => patch({ contactRef: e.target.value || null })} />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {errors.eventKeys ? <p className="text-2xs text-danger" role="alert">{errors.eventKeys}</p> : null}
              {companyScoped ? <Notice tone="info">Company-scoped endpoints cannot subscribe to platform-only events.</Notice> : null}
              {groups.map((group) => (
                <fieldset key={group.category} className="space-y-1.5">
                  <legend className="mb-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">{CATEGORY_LABEL[group.category]}</legend>
                  {group.types.map((type) => {
                    const blocked = companyScoped && (!type.customerSubscribable || type.audience === "platform");
                    const checked = draft.eventKeys.includes(type.key);
                    return (
                      <label key={type.key} className={cn("flex items-start gap-2.5 rounded-sm border p-3", blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer", checked ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                        <Checkbox checked={checked} disabled={blocked} onCheckedChange={(value) => patch({ eventKeys: value === true ? [...draft.eventKeys, type.key] : draft.eventKeys.filter((key) => key !== type.key) })} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5"><span className="text-[0.8125rem] font-medium">{type.name}</span><span className="font-mono text-2xs text-muted-foreground">{type.key}</span></span>
                          <span className="block text-2xs text-muted-foreground">{type.description}</span>
                          <span className="mt-1 flex flex-wrap gap-1"><Chip>Schema {type.schemaVersion}</Chip><Chip tone="success">Available</Chip>{type.audience === "platform" ? <Chip tone="warning">Platform-only</Chip> : null}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
              <p className="text-2xs text-muted-foreground">Only event types the platform defines are listed. This is a demo catalogue: the producers are not connected.</p>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <Notice tone="warning" title="Signing Not Configured / Demo Reference">
                No signing implementation exists yet. A signing secret is not generated, shown or stored in the browser. Recipients cannot verify events until backend key management exists.
              </Notice>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Signing method reference"><Input value="HMAC-SHA256 (reference)" readOnly disabled /></Field>
                <Field label="Signing configuration state"><div className="pt-1.5"><State registry={SIGNING_STATE} status="demo_reference" /></div></Field>
                <Field label="Delivery timeout (ms)" htmlFor="ep-timeout" error={errors.timeoutMs} hint="1,000 to 30,000 ms.">
                  <Input id="ep-timeout" type="number" min={1000} max={30000} step={500} value={draft.timeoutMs} onChange={(e) => patch({ timeoutMs: Number(e.target.value) })} aria-invalid={Boolean(errors.timeoutMs)} />
                </Field>
                <Field label="Retry policy reference" htmlFor="ep-retry" hint={`${policy.maxAttempts} attempts. ${policy.backoff}`}>
                  <Select value={draft.retryPolicyRef} onValueChange={(value) => patch({ retryPolicyRef: value })}>
                    <SelectTrigger id="ep-retry"><SelectValue /></SelectTrigger>
                    <SelectContent>{RETRY_POLICIES.map((p) => <SelectItem key={p.ref} value={p.ref}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Event schema version"><Input value="Latest compatible per subscription" readOnly disabled /></Field>
                <Field label="Payload privacy classification" htmlFor="ep-privacy">
                  <Select value={draft.payloadPrivacy} onValueChange={(value) => patch({ payloadPrivacy: value as CreateEndpointInput["payloadPrivacy"] })}>
                    <SelectTrigger id="ep-privacy"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIVACY_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Initial endpoint state" hint="Enabled marks the demo configuration as eligible. It does not start real deliveries.">
                <RadioGroup value={draft.state} onValueChange={(value) => patch({ state: value as "draft" | "enabled" })} className="flex gap-4">
                  {[{ v: "draft", t: "Draft" }, { v: "enabled", t: "Enabled" }].map((o) => (
                    <label key={o.v} className="flex cursor-pointer items-center gap-2 text-[0.8125rem]"><RadioGroupItem value={o.v} />{o.t}</label>
                  ))}
                </RadioGroup>
              </Field>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  ["Endpoint", draft.name],
                  ["Scope", companyScoped ? "Company" : "Platform"],
                  ["Company", company?.name ?? "Platform-wide"],
                  ["Environment", draft.environment],
                  ["Destination", urlCheck.sanitizedUrl ?? "Invalid"],
                  ["Signing readiness", "Demo reference only. Not configured"],
                  ["Delivery policy", `${draft.timeoutMs} ms timeout, ${policy.name}, ${PRIVACY_LABEL[draft.payloadPrivacy]} payloads`],
                  ["Initial state", draft.state === "draft" ? "Draft" : "Enabled (demo)"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0"><dt className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="break-words text-[0.8125rem]">{value}</dd></div>
                ))}
              </dl>
              <div className="space-y-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Subscribed events ({draft.eventKeys.length})</p>
                <div className="flex flex-wrap gap-1">{draft.eventKeys.map((key) => <Chip key={key}><span className="font-mono">{key}</span></Chip>)}</div>
              </div>
              <div className="space-y-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Known security warnings</p>
                <ul className="list-disc space-y-1 pl-4 text-[0.8125rem]">
                  {reviewWarnings.map((w) => <li key={w}>{w}</li>)}
                  <li>Backend SSRF, DNS, redirect and egress enforcement is not implemented. Frontend validation is not a safety guarantee.</li>
                </ul>
              </div>
              {hasErrors(errors) ? <Notice tone="danger">{Object.values(errors).find(Boolean)}</Notice> : null}
              <Notice tone="brand">Saving creates a demo configuration in this browser session. It will not receive real platform webhook deliveries.</Notice>
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="justify-between">
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
            {step < STEPS.length - 1 ? <Button onClick={next}>Continue</Button> : (
              <Button onClick={() => void save()} disabled={create.isPending}>
                {create.isPending ? <Loader2Icon className="animate-spin" /> : null}
                Save Demo Endpoint
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
