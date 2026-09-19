/**
 * The platform's current MRR, derived from the same subscription records and the
 * same `computeMrr` the Companies and Plans & Subscriptions screens use. The main
 * dashboard reads it from here so all three can never show different numbers.
 */
import { platformNow } from "@/features/companies/data/clock";
import { STAFF } from "@/features/companies/data/mock/dataset";
import { allBundles } from "@/features/companies/data/mock/store";
import { computeMrr, planForSubscription } from "@/features/companies/data/selectors";
import { commercialContext } from "./plan-store";

export function platformMrr(currency = "INR"): { mrrMinor: number; currency: string } {
  const ctx = { now: platformNow(), staff: STAFF, ...commercialContext() };
  let total = 0;
  for (const bundle of allBundles()) {
    // Currencies are never added together: only subscriptions priced in `currency` count.
    if (planForSubscription(ctx, bundle.subscription).currency !== currency) continue;
    total += computeMrr(ctx, bundle);
  }
  return { mrrMinor: total, currency };
}
