import { planById, primaryMethod, subscriptionFlags } from "./selectors";
import type { BillingCapabilities, BillingRole, BillingSnapshot, Capability, PaymentMethod } from "./types";

const ALLOW: Capability = { allowed: true };
const deny = (reason: string): Capability => ({ allowed: false, reason });

const MANAGERS: BillingRole[] = ["org_admin", "billing_admin"];

export function evaluateCapabilities(role: BillingRole): BillingCapabilities {
  const manages = MANAGERS.includes(role);
  const needsAdmin = (what: string) => deny(`Only Organization Admins and Billing Admins can ${what}.`);
  return {
    canViewBilling: role === "member" ? deny("Billing is visible to admins and managers only.") : ALLOW,
    canManageSubscription: manages ? ALLOW : needsAdmin("change the subscription"),
    canManagePayment: manages ? ALLOW : needsAdmin("manage payment methods"),
    canDownloadInvoices: role === "member" ? deny("Ask an admin for a copy of this invoice.") : ALLOW,
    canEditBillingDetails: manages ? ALLOW : needsAdmin("edit billing details"),
    canBuyCredits: manages ? ALLOW : needsAdmin("buy credits or add-ons"),
  };
}

function first(...checks: (Capability | null)[]): Capability {
  return checks.find((check) => check && !check.allowed) ?? ALLOW;
}

export function actionGates(snapshot: BillingSnapshot, can: BillingCapabilities) {
  const flags = subscriptionFlags(snapshot);
  const plan = planById(snapshot.plans, snapshot.subscription.planId);
  const topPlan = Math.max(...snapshot.plans.map((item) => item.rank));
  const lowestPlan = Math.min(...snapshot.plans.map((item) => item.rank));
  const hasMethod = Boolean(primaryMethod(snapshot.paymentMethods));
  const settleFirst = flags.paymentProblem ? deny("Settle the outstanding invoice first. Update the payment method or pay it now.") : null;
  const resumeFirst = flags.cancelling ? deny("Resume your subscription first — it's set to cancel at the end of this period.") : null;
  const reactivateFirst = flags.cancelled ? deny("Your subscription is cancelled. Reactivate it first.") : null;

  return {
    upgrade: first(can.canManageSubscription, settleFirst, plan.rank >= topPlan ? deny("You're already on the highest plan.") : null),
    changeCycle: first(
      can.canManageSubscription,
      flags.trial ? deny("Choose a plan first — the billing cycle is set when you do.") : null,
      reactivateFirst,
      resumeFirst,
      settleFirst,
      plan.annualMonthlyPrice === null ? deny("This plan has a custom contract. Contact your account manager.") : null,
    ),
    downgrade: first(
      can.canManageSubscription,
      flags.trial ? deny("You're on a trial. Pick any plan with “Choose plan”.") : null,
      reactivateFirst,
      resumeFirst,
      settleFirst,
      plan.rank <= lowestPlan ? deny("You're already on the lowest plan.") : null,
    ),
    cancel: first(
      can.canManageSubscription,
      flags.trial ? deny("Trials end on their own and nothing is charged. There's nothing to cancel.") : null,
      flags.cancelled ? deny("Your subscription is already cancelled.") : null,
      flags.cancelling ? deny("Cancellation is already scheduled. You can resume instead.") : null,
    ),
    buyCredits: first(
      can.canBuyCredits,
      reactivateFirst,
      settleFirst,
      !hasMethod ? deny("Add a payment method first. Credit packs are charged straight away.") : null,
    ),
    addOns: first(
      can.canBuyCredits,
      flags.trial ? deny("Add-ons are available once you choose a plan.") : null,
      reactivateFirst,
      resumeFirst,
      settleFirst,
      !hasMethod ? deny("Add a payment method first.") : null,
    ),
    managePayment: can.canManagePayment,
    editDetails: can.canEditBillingDetails,
    downloadInvoices: can.canDownloadInvoices,
  };
}

export type ActionGates = ReturnType<typeof actionGates>;

export function removeMethodGate(method: PaymentMethod, snapshot: BillingSnapshot, can: BillingCapabilities): Capability {
  const flags = subscriptionFlags(snapshot);
  const others = snapshot.paymentMethods.filter((item) => item.id !== method.id);
  return first(
    can.canManagePayment,
    method.role === "primary" && others.length === 0 && flags.live && !flags.trial && !flags.cancelling
      ? deny("Your subscription needs a payment method. Add a backup method first, then remove this one.")
      : null,
  );
}
