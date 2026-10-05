/**
 * EnCodency OmniPlatform - Live Billing Store
 * The same surface as the sample-data store the Billing pages were built on, backed by the platform's billing API: everything shown is read from the server,
 * and every change is made by the server and then read back. Nothing is held or invented here.
 */

import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import type {
  AccountCreditLedgerEntry,
  BillingAccount,
  BillingPolicies,
  CreditNote,
  FinancialActivity,
  Invoice,
  Payment,
  ReconciliationException,
  Refund,
} from "./types";

type Listener = () => void;

/** What `GET /super-admin/billing/snapshot` returns. */
export interface LiveBillingSnapshot {
  accounts: BillingAccount[];
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  ledgerEntries: AccountCreditLedgerEntry[];
  refunds: Refund[];
  exceptions: ReconciliationException[];
  activities: FinancialActivity[];
  policies: BillingPolicies;
  gatewayConfigured: boolean;
}

/** Shown only until the first read finishes: the policies the server starts with. */
const EMPTY_POLICIES: BillingPolicies = {
  invoicePrefix: "INV",
  defaultDueDays: 14,
  invoiceTemplate: "modern_compact",
  issuerEntity: "",
  issuerTaxId: "",
  allowPartialPayments: true,
  manualPaymentRequiresApproval: true,
  autoReconciliationThresholdMinor: 0,
  creditNoteRequiresFinanceApproval: true,
  refundMaxInstantThresholdMinor: 0,
  requireTwoPersonApprovalForLargeRefunds: true,
  highImpactThresholdMinor: 0,
  disclaimerText: "",
};

const BASE = "/super-admin/billing";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export class LiveBillingStore {
  private accounts: BillingAccount[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private creditNotes: CreditNote[] = [];
  private ledgerEntries: AccountCreditLedgerEntry[] = [];
  private refunds: Refund[] = [];
  private exceptions: ReconciliationException[] = [];
  private activities: FinancialActivity[] = [];
  private policies: BillingPolicies = EMPTY_POLICIES;
  private gatewayConfigured = false;
  private status: LoadStatus = "idle";
  private listeners: Set<Listener> = new Set();
  private inFlight: Promise<void> | null = null;
  private visibilityBound = false;

  /** The first page to listen starts the read; coming back to the tab reads again, so what other people did while it was away shows up. */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.status === "idle") void this.refresh();
    if (!this.visibilityBound && typeof document !== "undefined") {
      this.visibilityBound = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.listeners.size > 0) void this.refresh();
      });
    }
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getStatus(): LoadStatus {
    return this.status;
  }

  public isGatewayConfigured(): boolean {
    return this.gatewayConfigured;
  }

  /** Reads everything again. Concurrent calls share one read. */
  public refresh(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.status === "idle") this.status = "loading";
    this.inFlight = (async () => {
      try {
        const snapshot = await apiClient.request<LiveBillingSnapshot>({ method: "GET", path: `${BASE}/snapshot` });
        this.accounts = snapshot.accounts;
        this.invoices = snapshot.invoices;
        this.payments = snapshot.payments;
        this.creditNotes = snapshot.creditNotes;
        this.ledgerEntries = snapshot.ledgerEntries;
        this.refunds = snapshot.refunds;
        this.exceptions = snapshot.exceptions;
        this.activities = snapshot.activities;
        this.policies = snapshot.policies;
        this.gatewayConfigured = snapshot.gatewayConfigured;
        this.status = "ready";
      } catch (error) {
        const wasError = this.status === "error";
        this.status = "error";
        if (!wasError) toast.error(messageOf(error, "Billing data couldn't be loaded"));
      } finally {
        this.inFlight = null;
        this.notify();
      }
    })();
    return this.inFlight;
  }

  // Getters
  public getAccounts(): BillingAccount[] {
    return this.accounts;
  }
  public getInvoices(): Invoice[] {
    return this.invoices;
  }
  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((i) => i.id === id || i.number === id);
  }
  public getPayments(): Payment[] {
    return this.payments;
  }
  public getPaymentById(id: string): Payment | undefined {
    return this.payments.find((p) => p.id === id || p.reference === id);
  }
  public getCreditNotes(): CreditNote[] {
    return this.creditNotes;
  }
  public getLedgerEntries(): AccountCreditLedgerEntry[] {
    return this.ledgerEntries;
  }
  public getRefunds(): Refund[] {
    return this.refunds;
  }
  public getExceptions(): ReconciliationException[] {
    return this.exceptions;
  }
  public getActivities(): FinancialActivity[] {
    return this.activities;
  }
  public getPolicies(): BillingPolicies {
    return this.policies;
  }

  /** Runs one change on the server, then reads everything back so every page agrees with it. A refused change throws the server's own reason. */
  private async change<T>(method: "POST" | "PATCH" | "PUT", path: string, body?: unknown): Promise<T> {
    let result: T;
    try {
      result = await apiClient.request<T>({ method, path: `${BASE}${path}`, ...(body === undefined ? {} : { body }) });
    } catch (error) {
      // A refusal can mean what is on screen is out of date (someone else just acted): read again so it is not left stale.
      void this.refresh();
      throw new Error(messageOf(error, "The change could not be made"));
    }
    await this.refresh();
    return result;
  }

  // Mutations
  public async createDraftInvoice(input: {
    companyId: string;
    billingAccountId: string;
    type: Invoice["type"];
    currency: string;
    dueAt: string;
    notes?: string;
    lineItems: Array<{ description: string; quantity: number; unitPriceMinor: number; taxRatePercent: number; discountMinor?: number }>;
  }): Promise<Invoice> {
    return this.change<Invoice>("POST", "/invoices", {
      billingAccountId: input.billingAccountId,
      type: input.type,
      currency: input.currency,
      dueAt: input.dueAt,
      ...(input.notes ? { notes: input.notes } : {}),
      lineItems: input.lineItems.map((li) => ({ description: li.description, quantity: li.quantity, unitPriceMinor: li.unitPriceMinor, taxRatePercent: li.taxRatePercent, ...(li.discountMinor ? { discountMinor: li.discountMinor } : {}) })),
    });
  }

  public async issueInvoice(invoiceId: string): Promise<Invoice> {
    return this.change<Invoice>("POST", `/invoices/${encodeURIComponent(invoiceId)}/issue`);
  }

  public async voidInvoice(invoiceId: string, reason: string): Promise<void> {
    await this.change("POST", `/invoices/${encodeURIComponent(invoiceId)}/void`, { reason });
  }

  public async allocatePayment(paymentId: string, allocations: Array<{ invoiceId: string; amountMinor: number }>): Promise<void> {
    await this.change("POST", `/payments/${encodeURIComponent(paymentId)}/allocate`, { allocations });
  }

  public async applyAccountCredit(accountId: string, invoiceId: string, amountMinor: number): Promise<void> {
    await this.change("POST", `/accounts/${encodeURIComponent(accountId)}/apply-credit`, { invoiceId, amountMinor });
  }

  public async createCreditNote(input: { invoiceId: string; amountMinor: number; reason: string; disposition: CreditNote["disposition"] }): Promise<CreditNote> {
    return this.change<CreditNote>("POST", "/credit-notes", input);
  }

  public async approveCreditNote(creditNoteId: string): Promise<void> {
    await this.change("POST", `/credit-notes/${encodeURIComponent(creditNoteId)}/approve`);
  }

  public async requestRefund(input: { paymentId: string; requestedAmountMinor: number; reason: string }): Promise<Refund> {
    return this.change<Refund>("POST", "/refunds", input);
  }

  public async approveRefund(refundId: string): Promise<Refund> {
    return this.change<Refund>("POST", `/refunds/${encodeURIComponent(refundId)}/approve`);
  }

  public async rejectRefund(refundId: string, reason?: string): Promise<Refund> {
    return this.change<Refund>("POST", `/refunds/${encodeURIComponent(refundId)}/reject`, reason ? { reason } : {});
  }

  public async recordManualPayment(input: {
    companyId: string;
    billingAccountId: string;
    amountMinor: number;
    currency: string;
    method: string;
    providerReference: string;
    notes?: string;
  }): Promise<Payment> {
    return this.change<Payment>("POST", "/payments/manual", {
      billingAccountId: input.billingAccountId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      method: input.method,
      providerReference: input.providerReference,
      ...(input.notes ? { notes: input.notes } : {}),
    });
  }

  public async updateBillingAccount(
    accountId: string,
    updates: Partial<Pick<BillingAccount, "legalName" | "billingEmail" | "billingContact" | "billingPhone" | "taxId" | "paymentTerms" | "address">>,
  ): Promise<void> {
    await this.change("PATCH", `/accounts/${encodeURIComponent(accountId)}`, updates);
  }

  public async updateReconciliationIssue(
    issueId: string,
    updates: { status?: ReconciliationException["status"]; assignedOwner?: string; newNote?: string },
  ): Promise<void> {
    await this.change("PATCH", `/reconciliation/${encodeURIComponent(issueId)}`, updates);
  }

  public async updatePolicies(newPolicies: Partial<BillingPolicies>): Promise<void> {
    await this.change("PUT", "/policies", { ...this.policies, ...newPolicies });
  }
}

/** The server's own words when it refused something, otherwise a plain fallback. */
function messageOf(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : fallback;
}
