"use client";

import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { USAGE_RESOURCES } from "@/features/companies/data/config";
import { Stepper } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { FEATURES } from "@/features/plans-subscriptions/data/catalogue";
import { INTEGRATION_PROVIDER, type IntegrationProvider } from "@/types/domain/integration";
import { PERMISSIONS, type Permission } from "@/types/domain/team";
import { CATEGORIES, ENVIRONMENTS, FLAG_TYPE, IMPLEMENTATION, KEY_HELP, OWNER_TEAMS, PROTECTION, RELATED_MODULES, STRATEGY, flagRoutes } from "../data/config";
import { describeError, useFlagList, useFlagMutations } from "../data/hooks";
import type { CreateFlagInput, Environment, FeatureCategory, FlagType, ImplementationStatus, Protection, RolloutStrategy, ValidationIssue } from "../data/types";
import { CompanyPicker } from "./company-picker";

const STEPS = ["Basic Info", "Type", "Environments", "Dependencies", "Initial Targeting", "Review"] as const;
const NONE = "__none__";
const AREA: Record<FeatureCategory, string> = { "AI & Content": "content", Automation: "automation", Channels: "channels", "Website & SEO": "seo", Analytics: "analytics", Workspace: "workspace", Agency: "agency", Platform: "platform", Security: "security", Billing: "billing" };

/** Which validation fields belong to which step, so an error stops you at the step that can fix it. */
const belongsTo = (step: number, field: string): boolean => {
  if (step === 0) return ["name", "key", "description", "ownerTeam", "documentation"].includes(field);
  if (step === 2) return field === "initial.development";
  if (step === 3) return field === "prerequisites";
  if (step === 4) return field.startsWith("initial.");
  return step === STEPS.length - 1;
};

type Initial = CreateFlagInput["initial"];
const off = () => ({ strategy: "disabled" as RolloutStrategy, percentage: 10, selectedCompanyIds: [] as string[], enabled: false });

const blank = (): CreateFlagInput => ({
  name: "", key: "", description: "", category: "Platform", ownerTeam: "", relatedModule: "Platform", documentation: "",
  type: "release", implementation: "in_development", protection: "standard",
  entitlement: null, requiredCapability: null, integrations: [], usageResource: null, prerequisites: [],
  initial: { development: off(), staging: off(), production: off() },
  reason: "",
});

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export function CreateFlagWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const mutations = useFlagMutations();
  const flags = useFlagList({ environment: "production" });
  const [form, setForm] = useState<CreateFlagInput>(blank);
  const [keyTouched, setKeyTouched] = useState(false);
  const [step, setStep] = useState(0);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialJson = useMemo(() => JSON.stringify(blank()), []);
  const dirty = JSON.stringify(form) !== initialJson;
  const guard = useUnsavedGuard({ dirty: dirty && !busy, onDiscard: onClose, label: "this feature flag" });

  const patch = (next: Partial<CreateFlagInput>) => { setForm((current) => ({ ...current, ...next })); setIssues([]); setError(null); };
  const patchEnv = (environment: Environment, next: Partial<Initial[Environment]>) => patch({ initial: { ...form.initial, [environment]: { ...form.initial[environment], ...next } } });
  const issue = (field: string) => issues.find((item) => item.field === field)?.message ?? null;

  const suggestKey = (name: string, category: FeatureCategory) => (keyTouched ? form.key : name.trim() ? `${AREA[category]}.${slug(name)}` : "");

  const validate = async (forStep: number): Promise<boolean> => {
    const found = await mutations.validateCreate(form);
    const relevant = found.filter((item) => belongsTo(forStep, item.field));
    setIssues(found);
    return relevant.length === 0;
  };

  const next = async () => { if (await validate(step)) setStep((current) => Math.min(current + 1, STEPS.length - 1)); };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!(await validate(STEPS.length - 1))) { setBusy(false); return; }
      const flag = await mutations.createFlag(form);
      toast.success(`${flag.name} Created`, { description: "It starts disabled in production. Creating a flag does not build the feature or change any company." });
      onClose();
      router.push(flagRoutes.flag(flag.key));
    } catch (failure) {
      setError(describeError(failure).message);
      setBusy(false);
    }
  };

  const productionNote = "A new flag is always disabled in production. Roll it out from the flag's Targeting & Rollout tab, which reviews impact first.";
  const listedFlags = flags.data?.rows ?? [];
  const availableIn: Environment[] = form.implementation === "not_implemented" ? [] : form.implementation === "in_development" ? ["development"] : ["development", "staging"];

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <SheetContent className="w-full max-w-none sm:max-w-2xl" showClose={!busy}>
          <SheetHeader className="gap-2">
            <SheetTitle>Create Feature Flag</SheetTitle>
            <SheetDescription>Register a flag for a feature. The flag controls availability and rollout only. It does not build the feature, grant an entitlement or change any company.</SheetDescription>
            <Stepper steps={[...STEPS]} current={step} className="pt-1" />
          </SheetHeader>

          <SheetBody className="space-y-3">
            {step === 0 ? (
              <>
                <Field label="Feature Name" htmlFor="flag-name" required error={issue("name")}>
                  <Input id="flag-name" value={form.name} maxLength={80} aria-invalid={Boolean(issue("name"))} onChange={(event) => patch({ name: event.target.value, key: suggestKey(event.target.value, form.category) })} placeholder="AI Content Generator" />
                </Field>
                <Field label="Stable Feature Key" htmlFor="flag-key" required error={issue("key")} hint={KEY_HELP}>
                  <Input id="flag-key" value={form.key} aria-invalid={Boolean(issue("key"))} className="font-mono" onChange={(event) => { setKeyTouched(true); patch({ key: event.target.value.trim().toLowerCase() }); }} placeholder="content.ai_generator" />
                </Field>
                <Field label="Description" htmlFor="flag-description" required error={issue("description")}>
                  <Textarea id="flag-description" rows={3} maxLength={300} value={form.description} aria-invalid={Boolean(issue("description"))} onChange={(event) => patch({ description: event.target.value })} placeholder="What the feature does, in a sentence or two." />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Category" htmlFor="flag-category">
                    <Select value={form.category} onValueChange={(value) => patch({ category: value as FeatureCategory, key: suggestKey(form.name, value as FeatureCategory) })}>
                      <SelectTrigger id="flag-category" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Owner Team" htmlFor="flag-owner" required error={issue("ownerTeam")}>
                    <Select value={form.ownerTeam || undefined} onValueChange={(value) => patch({ ownerTeam: value })}>
                      <SelectTrigger id="flag-owner" className="w-full" aria-invalid={Boolean(issue("ownerTeam"))}><SelectValue placeholder="Choose a team" /></SelectTrigger>
                      <SelectContent>{OWNER_TEAMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Related Module" htmlFor="flag-module">
                    <Select value={form.relatedModule} onValueChange={(value) => patch({ relatedModule: value })}>
                      <SelectTrigger id="flag-module" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{RELATED_MODULES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Documentation Link" htmlFor="flag-docs" error={issue("documentation")} hint="Optional.">
                    <Input id="flag-docs" value={form.documentation} aria-invalid={Boolean(issue("documentation"))} onChange={(event) => patch({ documentation: event.target.value })} placeholder="https://..." />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[0.8125rem]">Flag Type</Label>
                  <RadioGroup value={form.type} onValueChange={(value) => patch({ type: value as FlagType })} className="gap-1.5">
                    {(Object.keys(FLAG_TYPE) as FlagType[]).map((type) => (
                      <label key={type} className="flex cursor-pointer items-start gap-2 rounded-sm border border-border p-2.5 hover:bg-accent/40">
                        <RadioGroupItem value={type} className="mt-0.5" aria-label={FLAG_TYPE[type].label} />
                        <span><span className="block text-[0.8125rem] font-medium text-foreground">{FLAG_TYPE[type].label}</span><span className="block text-2xs text-muted-foreground">{FLAG_TYPE[type].description}</span></span>
                      </label>
                    ))}
                  </RadioGroup>
                  <p className="text-2xs text-muted-foreground">There is no entitlement or permission flag type. A flag never grants either.</p>
                </div>
                <Field label="Protection Level" htmlFor="flag-protection" hint={PROTECTION[form.protection].description}>
                  <Select value={form.protection} onValueChange={(value) => patch({ protection: value as Protection })}>
                    <SelectTrigger id="flag-protection" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(PROTECTION) as Protection[]).map((item) => <SelectItem key={item} value={item}>{PROTECTION[item].label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Field label="Implementation Status" htmlFor="flag-implementation" hint={IMPLEMENTATION[form.implementation].description}>
                  <Select value={form.implementation} onValueChange={(value) => patch({ implementation: value as ImplementationStatus, initial: { ...form.initial, development: value === "not_implemented" ? off() : form.initial.development } })}>
                    <SelectTrigger id="flag-implementation" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(IMPLEMENTATION) as ImplementationStatus[]).map((item) => <SelectItem key={item} value={item}>{IMPLEMENTATION[item].label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="divide-y divide-border rounded-sm border border-border">
                  {ENVIRONMENTS.map(({ value: environment, label }) => {
                    const production = environment === "production";
                    const supported = production ? false : availableIn.includes(environment);
                    return (
                      <div key={environment} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
                          <p className="text-2xs text-muted-foreground">{production ? "Always starts disabled." : supported ? "Can start enabled." : "The feature is not implemented here yet, so it starts disabled."}</p>
                        </div>
                        <Switch aria-label={`Start enabled in ${label}`} checked={form.initial[environment].enabled} disabled={production || !supported} onCheckedChange={(checked) => patchEnv(environment, { enabled: checked, strategy: checked ? "all" : "disabled" })} />
                      </div>
                    );
                  })}
                </div>
                <AlertBanner tone="info" title="Production Starts Disabled">{productionNote}</AlertBanner>
                {issue("initial.development") ? <p role="alert" className="text-2xs text-danger">{issue("initial.development")}</p> : null}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <AlertBanner tone="info" title="Availability Is Not Entitlement">A flag decides whether a feature is rolled out. Plan entitlement, user permission and integration readiness are separate checks, and a failed one never changes the flag.</AlertBanner>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Plan Entitlement" htmlFor="flag-entitlement" hint="The plan feature a company needs.">
                    <Select value={form.entitlement ?? NONE} onValueChange={(value) => patch({ entitlement: value === NONE ? null : value })}>
                      <SelectTrigger id="flag-entitlement" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>No Plan Requirement</SelectItem>{FEATURES.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Required Permission" htmlFor="flag-capability" hint="What a user needs to use it.">
                    <Select value={form.requiredCapability ?? NONE} onValueChange={(value) => patch({ requiredCapability: value === NONE ? null : (value as Permission) })}>
                      <SelectTrigger id="flag-capability" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>No Extra Permission</SelectItem>{PERMISSIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Usage Resource" htmlFor="flag-usage" hint="Exhausted usage limits an action but keeps the feature visible.">
                    <Select value={form.usageResource ?? NONE} onValueChange={(value) => patch({ usageResource: value === NONE ? null : value })}>
                      <SelectTrigger id="flag-usage" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>Not Metered</SelectItem>{USAGE_RESOURCES.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <fieldset className="space-y-1">
                  <legend className="text-[0.8125rem] font-medium text-foreground">Required Integrations</legend>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {(Object.keys(INTEGRATION_PROVIDER) as IntegrationProvider[]).map((provider) => (
                      <label key={provider} className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-[0.8125rem] hover:bg-accent/40">
                        <Checkbox checked={form.integrations.includes(provider)} onCheckedChange={(checked) => patch({ integrations: checked ? [...form.integrations, provider] : form.integrations.filter((item) => item !== provider) })} />
                        {INTEGRATION_PROVIDER[provider].label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-1">
                  <legend className="text-[0.8125rem] font-medium text-foreground">Prerequisite Flags</legend>
                  <p className="text-2xs text-muted-foreground">This feature is available only where every prerequisite is available.</p>
                  <div className="max-h-44 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
                    {listedFlags.filter((row) => row.flag.lifecycle !== "archived").map((row) => (
                      <label key={row.flag.key} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[0.8125rem] hover:bg-accent/40">
                        <Checkbox checked={form.prerequisites.includes(row.flag.key)} onCheckedChange={(checked) => patch({ prerequisites: checked ? [...form.prerequisites, row.flag.key] : form.prerequisites.filter((item) => item !== row.flag.key) })} />
                        <span className="min-w-0 flex-1 truncate">{row.flag.name}</span>
                        <span className="font-mono text-2xs text-muted-foreground">{row.flag.key}</span>
                      </label>
                    ))}
                  </div>
                  {issue("prerequisites") ? <p role="alert" className="text-2xs text-danger">{issue("prerequisites")}</p> : null}
                </fieldset>
              </>
            ) : null}

            {step === 4 ? (
              <>
                {ENVIRONMENTS.map(({ value: environment, label }) => {
                  const config = form.initial[environment];
                  if (environment === "production") {
                    return (
                      <div key={environment} className="rounded-sm border border-border p-3">
                        <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
                        <p className="text-2xs text-muted-foreground">Disabled at creation. {productionNote}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={environment} className="space-y-2 rounded-sm border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
                        {!config.enabled ? <span className="text-2xs text-muted-foreground">Starts disabled</span> : null}
                      </div>
                      {config.enabled ? (
                        <>
                          <Field label="Rollout Strategy" htmlFor={`strategy-${environment}`}>
                            <Select value={config.strategy} onValueChange={(value) => patchEnv(environment, { strategy: value as RolloutStrategy })}>
                              <SelectTrigger id={`strategy-${environment}`} className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>{(["internal", "selected", "percentage", "all"] as RolloutStrategy[]).map((item) => <SelectItem key={item} value={item}>{STRATEGY[item].label}</SelectItem>)}</SelectContent>
                            </Select>
                          </Field>
                          <p className="text-2xs text-muted-foreground">{STRATEGY[config.strategy].description}</p>
                          {config.strategy === "percentage" ? (
                            <Field label="Percentage" htmlFor={`percentage-${environment}`} hint="A stable share of companies, chosen by a deterministic hash. Never random.">
                              <Input id={`percentage-${environment}`} type="number" min={1} max={100} value={config.percentage} onChange={(event) => patchEnv(environment, { percentage: Number(event.target.value) })} className="w-28" />
                            </Field>
                          ) : null}
                          {config.strategy === "selected" ? <CompanyPicker selected={config.selectedCompanyIds} onChange={(ids) => patchEnv(environment, { selectedCompanyIds: ids })} /> : null}
                        </>
                      ) : (
                        <p className="text-2xs text-muted-foreground">Not enabled in this environment, so there is nothing to target.</p>
                      )}
                      {issue(`initial.${environment}`) ? <p role="alert" className="text-2xs text-danger">{issue(`initial.${environment}`)}</p> : null}
                    </div>
                  );
                })}
              </>
            ) : null}

            {step === 5 ? (
              <>
                <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
                  {[
                    ["Name", form.name],
                    ["Key", form.key],
                    ["Category", form.category],
                    ["Owner Team", form.ownerTeam],
                    ["Type", FLAG_TYPE[form.type].label],
                    ["Protection", PROTECTION[form.protection].label],
                    ["Implementation", IMPLEMENTATION[form.implementation].label],
                    ["Plan Entitlement", form.entitlement ? (FEATURES.find((item) => item.key === form.entitlement)?.name ?? form.entitlement) : "None"],
                    ["Integrations", form.integrations.length ? form.integrations.map((item) => INTEGRATION_PROVIDER[item].label).join(", ") : "None"],
                    ["Prerequisites", form.prerequisites.length ? form.prerequisites.join(", ") : "None"],
                    ["Development", form.initial.development.enabled ? STRATEGY[form.initial.development.strategy].label : "Disabled"],
                    ["Staging", form.initial.staging.enabled ? STRATEGY[form.initial.staging.strategy].label : "Disabled"],
                    ["Production", "Disabled"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 truncate text-right font-medium text-foreground">{value || "-"}</dd></div>
                  ))}
                </dl>
                <Field label="Creation Note" htmlFor="flag-reason" hint="Optional. Recorded with the creation.">
                  <Textarea id="flag-reason" rows={2} maxLength={300} value={form.reason} onChange={(event) => patch({ reason: event.target.value })} />
                </Field>
                <AlertBanner tone="info" title="What Creating Does">It registers the flag, disabled in production, with an initial configuration version. It does not implement the feature, change a plan or notify any company.</AlertBanner>
                {issues.length > 0 ? <AlertBanner tone="danger" title="Fix These First"><ul className="list-disc pl-4">{issues.map((item) => <li key={`${item.field}-${item.message}`}>{item.message}</li>)}</ul></AlertBanner> : null}
              </>
            ) : null}
            {error ? <AlertBanner tone="danger" title="Flag Not Created">{error}</AlertBanner> : null}
          </SheetBody>

          <SheetFooter className="flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <div className="flex items-center gap-1.5">
              {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}><ArrowLeftIcon />Back</Button> : null}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => void next()}>Next<ArrowRightIcon /></Button>
              ) : (
                <Button onClick={() => void create()} disabled={busy}>{busy ? <Loader2Icon className="animate-spin" /> : null}Create Feature Flag</Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {guard.guardDialog}
    </>
  );
}
