"use client";

import { useBilling } from "../store/billing-store";
import { ContactSheet, DetailsSheet } from "./flows/account-flows";
import { CancelFlow, ResumeFlow } from "./flows/cancel-flow";
import { AddOnFlow, CreditsFlow } from "./flows/credits-addon-flows";
import { CycleFlow, WithdrawChangeFlow } from "./flows/cycle-flow";
import { DowngradeFlow } from "./flows/downgrade-flow";
import { InvoiceDetailSheet, PaymentDetailSheet } from "./flows/invoice-detail";
import { BreakdownSheet, PayInvoiceFlow, PaymentMethodFlow } from "./flows/payment-flows";
import { PlanDetailsFlow } from "./flows/plan-details-flow";
import { SalesFlow, UpgradeFlow } from "./flows/upgrade-flow";

/** Mounts whichever flow the store says is open. One at a time, by design. */
export function FlowRouter() {
  const { flow } = useBilling();
  if (!flow) return null;

  switch (flow.kind) {
    case "upgrade":
      return <UpgradeFlow initialPlan={flow.planId} initialCycle={flow.cycle} />;
    case "plan_details":
      return <PlanDetailsFlow />;
    case "cycle":
      return <CycleFlow />;
    case "withdraw":
      return <WithdrawChangeFlow />;
    case "payment":
      return <PaymentMethodFlow role={flow.role} />;
    case "breakdown":
      return <BreakdownSheet />;
    case "details":
      return <DetailsSheet />;
    case "contact":
      return <ContactSheet contactId={flow.contactId} />;
    case "invoice":
      return <InvoiceDetailSheet invoiceId={flow.invoiceId} />;
    case "payment_detail":
      return <PaymentDetailSheet paymentId={flow.paymentId} />;
    case "pay":
      return <PayInvoiceFlow invoiceId={flow.invoiceId} />;
    case "credits":
      return <CreditsFlow />;
    case "addon":
      return <AddOnFlow limit={flow.limit} />;
    case "downgrade":
      return <DowngradeFlow initialPlan={flow.planId} />;
    case "cancel":
      return <CancelFlow />;
    case "resume":
      return <ResumeFlow />;
    case "sales":
      return <SalesFlow />;
    default:
      return null;
  }
}
