"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useBilling, useSnapshot } from "../store/billing-store";
import {
  attentionItems,
  backupMethod,
  nextPayment,
  outstandingInvoice,
  planById,
  primaryMethod,
  recommendedPlan,
  subscriptionFlags,
  usageRows,
} from "./selectors";

const noopSubscribe = () => () => {};

export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Re-renders periodically so relative dates stay true. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Everything the page derives from the snapshot, computed once per change. */
export function useBillingView() {
  const snapshot = useSnapshot();
  const now = useNow();
  return useMemo(() => {
    const plan = planById(snapshot.plans, snapshot.subscription.planId);
    return {
      snapshot,
      now,
      plan,
      flags: subscriptionFlags(snapshot),
      usage: usageRows(snapshot),
      next: nextPayment(snapshot),
      primary: primaryMethod(snapshot.paymentMethods),
      backup: backupMethod(snapshot.paymentMethods),
      outstanding: outstandingInvoice(snapshot),
      attention: attentionItems(snapshot, now),
      recommended: recommendedPlan(snapshot),
    };
  }, [snapshot, now]);
}

export function useGates() {
  const { gates } = useBilling();
  if (!gates) throw new Error("Billing gates requested before the snapshot loaded");
  return gates;
}

/** Warns before the tab closes while a form has unsaved edits. */
export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
