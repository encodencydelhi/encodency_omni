"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { actionGates, evaluateCapabilities, type ActionGates } from "../billing-data/capability-provider";
import { BILLING_MOCK_MODE } from "../billing-data/config";
import { errorMessage, getBillingRepository, type PaymentMethodInput, type PlanChangeInput } from "../billing-data/repository";
import type {
  AddOnKey,
  BillingCapabilities,
  BillingContact,
  BillingCycle,
  BillingProfile,
  BillingRole,
  BillingScenario,
  BillingSnapshot,
  LimitKey,
  PlanId,
} from "../billing-data/types";

export type Flow =
  | { kind: "upgrade"; planId?: PlanId; cycle?: BillingCycle }
  | { kind: "plan_details" }
  | { kind: "cycle" }
  | { kind: "payment"; role: "primary" | "backup" }
  | { kind: "breakdown" }
  | { kind: "details" }
  | { kind: "contact"; contactId: string | null }
  | { kind: "invoice"; invoiceId: string }
  | { kind: "payment_detail"; paymentId: string }
  | { kind: "credits" }
  | { kind: "addon"; limit: LimitKey }
  | { kind: "downgrade"; planId?: PlanId }
  | { kind: "cancel" }
  | { kind: "sales" }
  | { kind: "pay"; invoiceId: string }
  | { kind: "resume" }
  | { kind: "withdraw" };

export type ActionResult = { ok: true } | { ok: false; message: string; hint: string };

interface Simulation {
  failNextPayment: boolean;
  loading: boolean;
  loadError: boolean;
}

interface BillingContextValue {
  status: "loading" | "ready" | "error";
  snapshot: BillingSnapshot | null;
  loadError: { message: string; hint: string } | null;
  mode: "mock" | "live";
  scenario: BillingScenario;
  role: BillingRole;
  can: BillingCapabilities;
  gates: ActionGates | null;
  simulation: Simulation;
  flow: Flow | null;
  openFlow: (flow: Flow) => void;
  closeFlow: () => void;
  highlighted: string | null;
  focusSection: (id: string) => void;
  upgradeDraft: { planId: PlanId; cycle: BillingCycle } | null;
  setUpgradeDraft: (draft: { planId: PlanId; cycle: BillingCycle } | null) => void;
  retry: () => void;
  setScenario: (scenario: BillingScenario) => void;
  setRole: (role: BillingRole | null) => void;
  simulate: (patch: Partial<Simulation>) => void;
  actions: {
    changePlan: (input: Omit<PlanChangeInput, "actor">) => Promise<ActionResult>;
    withdrawPendingChange: () => Promise<ActionResult>;
    cancel: (reason: string, feedback: string) => Promise<ActionResult>;
    resume: () => Promise<ActionResult>;
    savePaymentMethod: (input: PaymentMethodInput, role: "primary" | "backup") => Promise<ActionResult>;
    setPrimaryMethod: (id: string) => Promise<ActionResult>;
    removePaymentMethod: (id: string) => Promise<ActionResult>;
    payInvoice: (invoiceId: string) => Promise<ActionResult>;
    saveProfile: (profile: BillingProfile) => Promise<ActionResult>;
    saveContact: (contact: BillingContact) => Promise<ActionResult>;
    removeContact: (id: string) => Promise<ActionResult>;
    buyCredits: (packId: string) => Promise<ActionResult>;
    setAddOn: (key: AddOnKey, quantity: number) => Promise<ActionResult>;
    requestSales: (message: string, contactEmail: string) => Promise<ActionResult>;
  };
}

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getBillingRepository(), []);
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<{ message: string; hint: string } | null>(null);
  const [scenario, setScenarioState] = useState<BillingScenario>("active");
  const [roleOverride, setRoleOverride] = useState<BillingRole | null>(null);
  const [simulation, setSimulation] = useState<Simulation>({ failNextPayment: false, loading: false, loadError: false });
  const [flow, setFlow] = useState<Flow | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [upgradeDraft, setUpgradeDraft] = useState<{ planId: PlanId; cycle: BillingCycle } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository
      .loadSnapshot(scenario)
      .then((next) => {
        if (cancelled) return;
        setSnapshot(next);
        setLoadError(null);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(errorMessage(error));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [repository, scenario, reloadKey]);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setSimulation((current) => ({ ...current, loadError: false }));
    setReloadKey((key) => key + 1);
  }, []);

  const setScenario = useCallback((next: BillingScenario) => {
    setStatus("loading");
    setFlow(null);
    setUpgradeDraft(null);
    setSimulation((current) => ({ ...current, failNextPayment: false }));
    setScenarioState(next);
    setReloadKey((key) => key + 1);
  }, []);

  const simulate = useCallback(
    (patch: Partial<Simulation>) => {
      if (patch.failNextPayment !== undefined) repository.failNextPayment(patch.failNextPayment);
      setSimulation((current) => ({ ...current, ...patch }));
    },
    [repository],
  );

  const role: BillingRole = roleOverride ?? snapshot?.currentUser.role ?? "org_admin";
  const can = useMemo(() => evaluateCapabilities(role), [role]);
  const gates = useMemo(() => (snapshot ? actionGates(snapshot, can) : null), [snapshot, can]);
  const actor = snapshot?.currentUser.name ?? "You";

  const run = useCallback(
    async (task: () => Promise<BillingSnapshot>, options: { payment?: boolean } = {}): Promise<ActionResult> => {
      // The failure preview is one-shot: it's consumed by the next call that takes a payment.
      const consume = () => {
        if (!options.payment) return;
        repository.failNextPayment(false);
        setSimulation((current) => ({ ...current, failNextPayment: false }));
      };
      try {
        const next = await task();
        setSnapshot(next);
        consume();
        return { ok: true };
      } catch (error) {
        consume();
        return { ok: false, ...errorMessage(error) };
      }
    },
    [repository],
  );

  const actions = useMemo<BillingContextValue["actions"]>(
    () => ({
      changePlan: (input) => run(() => repository.changePlan({ ...input, actor }), { payment: true }),
      withdrawPendingChange: () => run(() => repository.withdrawPendingChange(actor)),
      cancel: (reason, feedback) => run(() => repository.cancelSubscription({ reason, feedback, actor })),
      resume: () => run(() => repository.resumeSubscription(actor)),
      savePaymentMethod: (input, methodRole) => run(() => repository.savePaymentMethod(input, methodRole), { payment: true }),
      setPrimaryMethod: (id) => run(() => repository.setPrimaryMethod(id)),
      removePaymentMethod: (id) => run(() => repository.removePaymentMethod(id)),
      payInvoice: (invoiceId) => run(() => repository.payInvoice(invoiceId), { payment: true }),
      saveProfile: (profile) => run(() => repository.saveProfile(profile)),
      saveContact: (contact) => run(() => repository.saveContact(contact)),
      removeContact: (id) => run(() => repository.removeContact(id)),
      buyCredits: (packId) => run(() => repository.buyCredits(packId), { payment: true }),
      setAddOn: (key, quantity) => run(() => repository.setAddOn(key, quantity), { payment: true }),
      requestSales: (message, contactEmail) => run(() => repository.requestSales({ message, contactEmail })),
    }),
    [repository, run, actor],
  );

  const focusSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlighted(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), 1800);
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      status: simulation.loading ? "loading" : simulation.loadError ? "error" : status,
      snapshot,
      loadError: simulation.loadError ? { message: "Billing data is unavailable.", hint: "OmniPlatform couldn't load your billing details. Your subscription and payments aren't affected." } : loadError,
      mode: repository.mode,
      scenario,
      role,
      can,
      gates,
      simulation,
      flow,
      openFlow: setFlow,
      closeFlow: () => setFlow(null),
      highlighted,
      focusSection,
      upgradeDraft,
      setUpgradeDraft,
      retry,
      setScenario,
      setRole: setRoleOverride,
      simulate,
      actions,
    }),
    [status, snapshot, loadError, repository.mode, scenario, role, can, gates, simulation, flow, highlighted, focusSection, upgradeDraft, retry, setScenario, simulate, actions],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) throw new Error("useBilling must be used inside <BillingProvider>");
  return context;
}

/** The ready snapshot. Only call below the page's loading/error gate. */
export function useSnapshot(): BillingSnapshot {
  const { snapshot } = useBilling();
  if (!snapshot) throw new Error("Billing snapshot requested before it loaded");
  return snapshot;
}

export const isMockMode = BILLING_MOCK_MODE;
