

export type PlanId = "starter" | "growth" | "professional" | "enterprise";
export type BillingCycle = "monthly" | "annual";

/** Metered or counted limits. `null` in a limit means unlimited. */
export type LimitKey =
  | "clients"
  | "teamMembers"
  | "channels"
  | "aiCredits"
  | "automations"
  | "automationRuns"
  | "scheduledPosts"
  | "reports"
  | "storageGb";

export type PlanLimits = Record<LimitKey, number | null>;

export type FeatureKey =
  | "publishing"
  | "calendar"
  | "automation"
  | "seo"
  | "website_intel"
  | "analytics"
  | "advanced_analytics"
  | "reporting"
  | "white_label"
  | "collaboration"
  | "approvals"
  | "audit_logs"
  | "premium_channels"
  | "crm"
  | "sso"
  | "api_access";

export type SupportLevel = "email" | "priority" | "dedicated";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Rank orders plans: higher is bigger. Upgrades go up, downgrades go down. */
  rank: number;
  /** Price per month when billed monthly, before GST. `null` for contact-sales plans. */
  monthlyPrice: number | null;
  /** Effective price per month when billed annually, before GST. `null` when annual isn't offered. */
  annualMonthlyPrice: number | null;
  contactSales: boolean;
  limits: PlanLimits;
  features: FeatureKey[];
  support: SupportLevel;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "payment_due"
  | "past_due"
  | "grace_period"
  | "scheduled_cancellation"
  | "cancelled";

export type ChangeKind = "upgrade" | "downgrade" | "cycle_change" | "cancellation" | "reactivation" | "resume" | "trial_conversion";
export type ChangeStatus = "scheduled" | "applied" | "withdrawn";

/** Items the admin chose to keep when a downgrade lowers a limit. The rest are archived when it takes effect. */
export interface DowngradeResolution {
  keep: Partial<Record<LimitKey, string[]>>;
}

export interface SubscriptionChange {
  id: string;
  kind: ChangeKind;
  status: ChangeStatus;
  fromPlan: PlanId;
  toPlan: PlanId;
  fromCycle: BillingCycle;
  toCycle: BillingCycle;
  requestedAt: string;
  requestedBy: string;
  effectiveAt: string;
  /** Charged when the change was applied, before GST. */
  amount: number | null;
  note: string | null;
  resolution?: DowngradeResolution;
  reason?: string;
}

export interface Subscription {
  id: string;
  planId: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  /** Set while status is grace_period: service continues until this moment. */
  graceEndsAt: string | null;
  cancelAt: string | null;
  cancelledAt: string | null;
  /** At most one scheduled change (downgrade or cycle change) waits for the renewal. */
  pendingChange: SubscriptionChange | null;
  history: SubscriptionChange[];
}

export interface UsageMetric {
  key: LimitKey;
  used: number;
  /** Monthly metrics reset each billing period; counted metrics don't. */
  resets: boolean;
}

/** A named thing counted by a limit — used to resolve downgrade conflicts. */
export interface UsageEntity {
  id: string;
  name: string;
  detail: string;
  /** Can't be archived (e.g. the signed-in admin). */
  locked?: boolean;
}

export type CardBrand = "visa" | "mastercard" | "rupay" | "amex";
export type PaymentMethodType = "card" | "upi";
export type PaymentMethodRole = "primary" | "backup";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  role: PaymentMethodRole;
  brand: CardBrand | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  /** UPI AutoPay handle, masked. */
  upiId: string | null;
  holderName: string;
  addedAt: string;
}

export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded" | "voided";
export type LineItemKind = "plan" | "addon" | "credits" | "usage" | "discount" | "proration" | "account_credit";

export interface InvoiceLineItem {
  id: string;
  kind: LineItemKind;
  description: string;
  quantity: number;
  unitAmount: number;
  /** Negative for discounts and credits. */
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  lines: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  paymentMethodLabel: string | null;
  paidAt: string | null;
  transactionId: string | null;
  refundedAt: string | null;
  note: string | null;
}

export type PaymentStatus = "successful" | "failed" | "refunded" | "pending";

export interface Payment {
  id: string;
  reference: string;
  invoiceId: string | null;
  date: string;
  amount: number;
  methodLabel: string;
  status: PaymentStatus;
  description: string;
  failureReason: string | null;
}

export interface BillingProfile {
  legalName: string;
  billingEmail: string;
  billingPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  taxId: string;
}

export type ContactKind = "primary" | "finance" | "other";

export interface BillingContact {
  id: string;
  kind: ContactKind;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
}

export interface CreditBalance {
  /** Included in the plan each period. */
  included: number;
  /** Used this period (plan credits are spent before purchased ones). */
  used: number;
  /** Bought in packs; roll over until used or until they expire. */
  purchased: number;
  purchasedExpireAt: string | null;
  resetsAt: string;
}

export type AddOnKey = "extra_seats" | "extra_clients" | "extra_channels";

export interface AddOnDefinition {
  key: AddOnKey;
  name: string;
  description: string;
  limit: LimitKey;
  /** How much of the limit one unit adds. */
  unitSize: number;
  unitLabel: string;
  /** Per unit, per month, before GST. */
  monthlyPrice: number;
  maxQuantity: number;
  availableOn: PlanId[];
}

export interface ActiveAddOn {
  key: AddOnKey;
  quantity: number;
  since: string;
}

export interface SalesRequest {
  requestedAt: string;
  message: string;
  contactEmail: string;
}

export type BillingRole = "org_admin" | "billing_admin" | "manager" | "member";

export interface Capability {
  allowed: boolean;
  reason?: string;
}

export type CapabilityKey =
  | "canViewBilling"
  | "canManageSubscription"
  | "canManagePayment"
  | "canDownloadInvoices"
  | "canEditBillingDetails"
  | "canBuyCredits";

export type BillingCapabilities = Record<CapabilityKey, Capability>;

export type BillingScenario =
  | "active"
  | "card_expiring"
  | "payment_due"
  | "past_due"
  | "grace_period"
  | "trial"
  | "scheduled_cancellation"
  | "cancelled";

export interface BillingSnapshot {
  organizationName: string;
  currentUser: { name: string; email: string; role: BillingRole };
  plans: Plan[];
  subscription: Subscription;
  usage: UsageMetric[];
  entities: Partial<Record<LimitKey, UsageEntity[]>>;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  payments: Payment[];
  profile: BillingProfile;
  contacts: BillingContact[];
  credits: CreditBalance;
  creditPacks: CreditPack[];
  addOnCatalog: AddOnDefinition[];
  addOns: ActiveAddOn[];
  salesRequest: SalesRequest | null;
  /** GST rate the service applies to this organization. Read-only here. */
  taxRate: number;
  currency: "INR";
}
