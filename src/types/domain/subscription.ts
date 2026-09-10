import type { EntityRef, StatusRegistry } from "@/types/common";
import type { PlanTier } from "./plan";

export const SUBSCRIPTION_STATUS = {
  active: { label: "Active", tone: "success" },
  trial: { label: "Trial", tone: "info" },
  past_due: { label: "Past Due", tone: "warning", description: "Retrying payment" },
  cancelled: { label: "Cancelled", tone: "neutral", description: "Runs until the period ends" },
  expired: { label: "Expired", tone: "danger" },
} as const satisfies StatusRegistry<string>;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;

export const BILLING_CYCLE = {
  monthly: { label: "Monthly", tone: "neutral" },
  annual: { label: "Annual", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type BillingCycle = keyof typeof BILLING_CYCLE;

export const PAYMENT_STATUS = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

export interface Subscription {
  id: string;
  company: EntityRef;
  planTier: PlanTier;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startedAt: string;
  renewsAt: string;
  cancelledAt: string | null;
  amountMinor: number;
  currency: string;
  paymentStatus: PaymentStatus;
  seats: number;
  autoRenew: boolean;
}

export interface SubscriptionFilters {
  status: SubscriptionStatus;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  paymentStatus: PaymentStatus;
}

export type SubscriptionSortField =
  | "company"
  | "planName"
  | "status"
  | "startedAt"
  | "renewsAt"
  | "amountMinor";
