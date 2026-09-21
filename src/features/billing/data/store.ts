/**
 * EnCodency OmniPlatform - Reactive In-Memory Billing Store
 * Single source of truth managing all financial records, derived calculations, and mutations.
 */

import {
  INITIAL_BILLING_ACCOUNTS,
  INITIAL_BILLING_POLICIES,
  INITIAL_CREDIT_NOTES,
  INITIAL_FINANCIAL_ACTIVITIES,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_RECONCILIATION_EXCEPTIONS,
  INITIAL_REFUNDS,
  INITIAL_ACCOUNT_CREDITS_LEDGER,
} from "./mock-data";
import type {
  BillingAccount,
  BillingPolicies,
  CreditNote,
  FinancialActivity,
  Invoice,
  Payment,
  ReconciliationException,
  Refund,
  AccountCreditLedgerEntry,
} from "./types";
import { addMinor, subMinor } from "./money";
import { deriveInvoiceCollectionState, deriveInvoiceTimingState } from "./selectors";

type Listener = () => void;

class BillingStore {
  private accounts: BillingAccount[] = [...INITIAL_BILLING_ACCOUNTS];
  private invoices: Invoice[] = [...INITIAL_INVOICES];
  private payments: Payment[] = [...INITIAL_PAYMENTS];
  private creditNotes: CreditNote[] = [...INITIAL_CREDIT_NOTES];
  private ledgerEntries: AccountCreditLedgerEntry[] = [...INITIAL_ACCOUNT_CREDITS_LEDGER];
  private refunds: Refund[] = [...INITIAL_REFUNDS];
  private exceptions: ReconciliationException[] = [...INITIAL_RECONCILIATION_EXCEPTIONS];
  private activities: FinancialActivity[] = [...INITIAL_FINANCIAL_ACTIVITIES];
  private policies: BillingPolicies = { ...INITIAL_BILLING_POLICIES };
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private logActivity(
    eventType: FinancialActivity["eventType"],
    companyId: string,
    companyName: string,
    reference: string,
    result: string,
    actor = "Sompal Singh (Super Admin)",
    details?: Record<string, unknown>,
  ) {
    const activity: FinancialActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      companyId,
      companyName,
      eventType,
      reference,
      result,
      details,
    };
    this.activities = [activity, ...this.activities];
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

  // Mutations
  public createDraftInvoice(input: {
    companyId: string;
    billingAccountId: string;
    type: Invoice["type"];
    currency: string;
    dueAt: string;
    notes?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPriceMinor: number;
      taxRatePercent: number;
      discountMinor?: number;
    }>;
  }): Invoice {
    const account = this.accounts.find((a) => a.id === input.billingAccountId);
    if (!account) throw new Error("Billing account not found");

    const seq = 100 + this.invoices.length + 1;
    const invoiceNumber = `${this.policies.invoicePrefix}-${seq.toString().padStart(4, "0")}`;

    let subtotalMinor = 0;
    let taxMinor = 0;
    let discountMinor = 0;

    const lineItems = input.lineItems.map((item, idx) => {
      const disc = item.discountMinor ?? 0;
      const preTax = Math.max(0, item.quantity * item.unitPriceMinor - disc);
      const itemTax = Math.round((preTax * item.taxRatePercent) / 100);
      const total = preTax + itemTax;

      subtotalMinor += item.quantity * item.unitPriceMinor;
      discountMinor += disc;
      taxMinor += itemTax;

      return {
        id: `li_${seq}_${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: disc,
        taxRatePercent: item.taxRatePercent,
        totalMinor: total,
      };
    });

    const totalMinor = subtotalMinor - discountMinor + taxMinor;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      number: invoiceNumber,
      companyId: account.companyId,
      companyName: account.companyName,
      billingAccountId: account.id,
      subscriptionId: null,
      subscriptionName: null,
      type: input.type,
      documentState: "draft",
      collectionState: "unpaid",
      timingState: "not_due",
      issuedAt: new Date().toISOString(),
      dueAt: input.dueAt,
      paidAt: null,
      currency: input.currency,
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor,
      adjustedReceivableMinor: totalMinor,
      allocatedPaymentsMinor: 0,
      accountCreditAppliedMinor: 0,
      outstandingBalanceMinor: totalMinor,
      lineItems,
      notes: input.notes ?? null,
      billingAddress: account.address,
      issuerLegalName: this.policies.issuerEntity,
      issuerAddress: {
        line1: "Prestige Cyber Tech Park",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560103",
        country: "India",
      },
      issuerTaxId: this.policies.issuerTaxId,
      clientTaxId: account.taxId ?? undefined,
    };

    this.invoices = [newInvoice, ...this.invoices];
    this.logActivity(
      "invoice_draft_created",
      account.companyId,
      account.companyName,
      newInvoice.number,
      `Draft invoice ${newInvoice.number} saved (${input.currency} ${(totalMinor / 100).toFixed(2)})`,
      "Sompal Singh (Super Admin)",
      { invoiceId: newInvoice.id, totalMinor },
    );

    this.notify();
    return newInvoice;
  }

  public allocatePayment(
    paymentId: string,
    allocations: Array<{ invoiceId: string; amountMinor: number }>,
  ): void {
    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error("Payment not found");

    const totalToAllocate = allocations.reduce((acc, a) => acc + a.amountMinor, 0);
    if (totalToAllocate <= 0) throw new Error("Allocation amount must be greater than zero");
    if (totalToAllocate > payment.unallocatedBalanceMinor) {
      throw new Error(
        `Allocation total (${totalToAllocate / 100}) exceeds unallocated funds (${payment.unallocatedBalanceMinor / 100})`,
      );
    }

    for (const item of allocations) {
      const invoice = this.invoices.find((i) => i.id === item.invoiceId);
      if (!invoice) throw new Error(`Invoice ${item.invoiceId} not found`);
      if (invoice.companyId !== payment.companyId) {
        throw new Error(`Cross-company allocation not permitted between ${invoice.companyName} and ${payment.companyName}`);
      }
      if (invoice.currency !== payment.currency) {
        throw new Error(`Currency mismatch: cannot allocate ${payment.currency} to ${invoice.currency}`);
      }
      if (item.amountMinor > invoice.outstandingBalanceMinor) {
        throw new Error(`Allocation of ${item.amountMinor / 100} exceeds invoice outstanding balance ${invoice.outstandingBalanceMinor / 100}`);
      }
    }

    // Apply allocations
    const newAllocations = [...payment.allocations];
    let allocatedSum = 0;

    for (const item of allocations) {
      const invoice = this.invoices.find((i) => i.id === item.invoiceId)!;
      const allocRecord = {
        id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        amountMinor: item.amountMinor,
        allocatedAt: new Date().toISOString(),
        allocatedBy: "Sompal Singh (Finance Ops)",
      };
      newAllocations.push(allocRecord);
      allocatedSum += item.amountMinor;

      // Update invoice
      invoice.allocatedPaymentsMinor += item.amountMinor;
      invoice.outstandingBalanceMinor = Math.max(
        0,
        invoice.adjustedReceivableMinor - invoice.allocatedPaymentsMinor - invoice.accountCreditAppliedMinor,
      );
      invoice.collectionState = deriveInvoiceCollectionState(
        invoice.adjustedReceivableMinor,
        invoice.allocatedPaymentsMinor,
        invoice.accountCreditAppliedMinor,
      );
      invoice.timingState = deriveInvoiceTimingState(invoice.dueAt, invoice.collectionState);
      if (invoice.collectionState === "paid") {
        invoice.paidAt = new Date().toISOString();
      }

      this.logActivity(
        "payment_allocated",
        payment.companyId,
        payment.companyName,
        `${payment.reference} -> ${invoice.number}`,
        `${payment.currency} ${(item.amountMinor / 100).toFixed(2)} allocated to ${invoice.number}`,
      );
    }

    // Update payment
    payment.allocations = newAllocations;
    payment.allocatedAmountMinor += allocatedSum;
    payment.unallocatedBalanceMinor -= allocatedSum;
    payment.allocationStatus =
      payment.unallocatedBalanceMinor === 0 ? "fully_allocated" : "partially_allocated";

    this.recalculateAccountBalances(payment.billingAccountId);
    this.notify();
  }

  public applyAccountCredit(accountId: string, invoiceId: string, amountMinor: number): void {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error("Billing account not found");
    const invoice = this.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    if (account.availableCreditMinor < amountMinor) {
      throw new Error("Insufficient available credit on billing account");
    }
    if (invoice.outstandingBalanceMinor < amountMinor) {
      throw new Error("Application amount exceeds outstanding invoice balance");
    }

    // Add debit ledger entry
    const newBalance = account.availableCreditMinor - amountMinor;
    const ledgerEntry: AccountCreditLedgerEntry = {
      id: `acl_${Date.now()}`,
      companyId: account.companyId,
      billingAccountId: account.id,
      date: new Date().toISOString(),
      entryType: "applied_to_invoice",
      reference: invoice.number,
      creditMinor: 0,
      debitMinor: amountMinor,
      runningBalanceMinor: newBalance,
      currency: account.currency,
      description: `Applied credit balance to ${invoice.number}`,
      status: "posted",
    };

    this.ledgerEntries = [ledgerEntry, ...this.ledgerEntries];
    account.availableCreditMinor = newBalance;

    // Update invoice
    invoice.accountCreditAppliedMinor += amountMinor;
    invoice.outstandingBalanceMinor = Math.max(
      0,
      invoice.adjustedReceivableMinor - invoice.allocatedPaymentsMinor - invoice.accountCreditAppliedMinor,
    );
    invoice.collectionState = deriveInvoiceCollectionState(
      invoice.adjustedReceivableMinor,
      invoice.allocatedPaymentsMinor,
      invoice.accountCreditAppliedMinor,
    );
    invoice.timingState = deriveInvoiceTimingState(invoice.dueAt, invoice.collectionState);

    this.logActivity(
      "credit_applied",
      account.companyId,
      account.companyName,
      `Credit applied to ${invoice.number}`,
      `${account.currency} ${(amountMinor / 100).toFixed(2)} credit applied to invoice ${invoice.number}`,
    );

    this.recalculateAccountBalances(account.id);
    this.notify();
  }

  public createCreditNote(input: {
    invoiceId: string;
    amountMinor: number;
    reason: string;
    disposition: CreditNote["disposition"];
  }): CreditNote {
    const invoice = this.invoices.find((i) => i.id === input.invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    if (input.amountMinor > invoice.totalMinor) {
      throw new Error("Credit note amount cannot exceed original invoice total");
    }

    const seq = this.creditNotes.length + 1;
    const creditNote: CreditNote = {
      id: `cn_${Date.now()}`,
      number: `CN-2026-${seq.toString().padStart(3, "0")}`,
      companyId: invoice.companyId,
      companyName: invoice.companyName,
      billingAccountId: invoice.billingAccountId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      currency: invoice.currency,
      amountMinor: input.amountMinor,
      reason: input.reason,
      status: "pending_approval",
      disposition: input.disposition,
      issuedAt: null,
      approvedBy: null,
      createdAt: new Date().toISOString(),
    };

    this.creditNotes = [creditNote, ...this.creditNotes];
    this.logActivity(
      "credit_note_drafted",
      invoice.companyId,
      invoice.companyName,
      creditNote.number,
      `Credit note draft ${creditNote.number} created for ${invoice.currency} ${(input.amountMinor / 100).toFixed(2)}`,
    );

    this.notify();
    return creditNote;
  }

  public approveCreditNote(creditNoteId: string): void {
    const cn = this.creditNotes.find((c) => c.id === creditNoteId);
    if (!cn) throw new Error("Credit note not found");

    cn.status = "issued";
    cn.issuedAt = new Date().toISOString();
    cn.approvedBy = "Sompal Singh (Head of Finance)";

    const invoice = this.invoices.find((i) => i.id === cn.invoiceId);
    if (invoice) {
      invoice.adjustedReceivableMinor = Math.max(0, invoice.adjustedReceivableMinor - cn.amountMinor);
      invoice.outstandingBalanceMinor = Math.max(
        0,
        invoice.adjustedReceivableMinor - invoice.allocatedPaymentsMinor - invoice.accountCreditAppliedMinor,
      );
      invoice.collectionState = deriveInvoiceCollectionState(
        invoice.adjustedReceivableMinor,
        invoice.allocatedPaymentsMinor,
        invoice.accountCreditAppliedMinor,
      );
      invoice.timingState = deriveInvoiceTimingState(invoice.dueAt, invoice.collectionState);
    }

    if (cn.disposition === "retain_as_account_credit") {
      const account = this.accounts.find((a) => a.id === cn.billingAccountId);
      if (account) {
        const newBalance = account.availableCreditMinor + cn.amountMinor;
        const entry: AccountCreditLedgerEntry = {
          id: `acl_${Date.now()}`,
          companyId: cn.companyId,
          billingAccountId: cn.billingAccountId,
          date: new Date().toISOString(),
          entryType: "credit_note_issued",
          reference: cn.number,
          creditMinor: cn.amountMinor,
          debitMinor: 0,
          runningBalanceMinor: newBalance,
          currency: cn.currency,
          description: `Credit note ${cn.number} posted to account balance`,
          status: "posted",
        };
        this.ledgerEntries = [entry, ...this.ledgerEntries];
        account.availableCreditMinor = newBalance;
      }
    }

    this.logActivity(
      "credit_note_approved",
      cn.companyId,
      cn.companyName,
      cn.number,
      `Credit note ${cn.number} approved and posted`,
    );

    this.recalculateAccountBalances(cn.billingAccountId);
    this.notify();
  }

  public requestRefund(input: {
    paymentId: string;
    requestedAmountMinor: number;
    reason: string;
  }): Refund {
    const payment = this.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new Error("Payment not found");

    if (input.requestedAmountMinor > payment.grossAmountMinor) {
      throw new Error("Refund amount exceeds gross payment amount");
    }

    const seq = this.refunds.length + 1;
    const refund: Refund = {
      id: `rfd_${Date.now()}`,
      reference: `RFD-2026-${seq.toString().padStart(2, "0")}`,
      companyId: payment.companyId,
      companyName: payment.companyName,
      billingAccountId: payment.billingAccountId,
      paymentId: payment.id,
      paymentReference: payment.reference,
      invoiceId: payment.allocations[0]?.invoiceId ?? null,
      invoiceNumber: payment.allocations[0]?.invoiceNumber ?? null,
      currency: payment.currency,
      originalPaymentAmountMinor: payment.grossAmountMinor,
      previouslyRefundedMinor: 0,
      availableRefundableMinor: payment.grossAmountMinor,
      requestedAmountMinor: input.requestedAmountMinor,
      reason: input.reason,
      status: "pending_approval",
      requestedBy: "Sompal Singh (Finance Ops)",
      approvedBy: null,
      providerRefundReference: null,
      createdAt: new Date().toISOString(),
      processedAt: null,
    };

    this.refunds = [refund, ...this.refunds];
    this.logActivity(
      "refund_requested",
      payment.companyId,
      payment.companyName,
      refund.reference,
      `Refund request ${refund.reference} submitted for ${payment.currency} ${(input.requestedAmountMinor / 100).toFixed(2)}`,
    );

    this.notify();
    return refund;
  }

  public recordManualPayment(input: {
    companyId: string;
    billingAccountId: string;
    amountMinor: number;
    currency: string;
    method: string;
    providerReference: string;
    notes?: string;
  }): Payment {
    const account = this.accounts.find((a) => a.id === input.billingAccountId);
    if (!account) throw new Error("Billing account not found");

    const seq = 8800 + this.payments.length + 1;
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      reference: `PAY-2026-${seq}`,
      companyId: account.companyId,
      companyName: account.companyName,
      billingAccountId: account.id,
      provider: "Manual Bank Wire",
      providerReference: input.providerReference,
      method: input.method,
      currency: input.currency,
      grossAmountMinor: input.amountMinor,
      feeMinor: 0,
      netAmountMinor: input.amountMinor,
      attemptStatus: "pending",
      settlementStatus: "pending",
      reconciliationStatus: "needs_review",
      allocationStatus: "unallocated",
      allocatedAmountMinor: 0,
      unallocatedBalanceMinor: input.amountMinor,
      failureReason: null,
      createdAt: new Date().toISOString(),
      settledAt: null,
      allocations: [],
    };

    this.payments = [payment, ...this.payments];
    this.logActivity(
      "payment_recorded",
      account.companyId,
      account.companyName,
      payment.reference,
      `Manual payment ${payment.reference} recorded in Pending Verification state`,
    );

    this.notify();
    return payment;
  }

  public voidInvoice(invoiceId: string, reason: string): void {
    const invoice = this.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.allocatedPaymentsMinor > 0) {
      throw new Error("Cannot void an invoice with allocated payments. Please unallocate or issue a credit note.");
    }

    invoice.documentState = "void";
    invoice.notes = invoice.notes ? `${invoice.notes} | Voided: ${reason}` : `Voided: ${reason}`;

    this.logActivity(
      "invoice_voided",
      invoice.companyId,
      invoice.companyName,
      invoice.number,
      `Invoice ${invoice.number} marked as void (${reason})`,
    );

    this.recalculateAccountBalances(invoice.billingAccountId);
    this.notify();
  }

  public updateBillingAccount(
    accountId: string,
    updates: Partial<Pick<BillingAccount, "legalName" | "billingEmail" | "billingContact" | "billingPhone" | "taxId" | "paymentTerms" | "address">>,
  ): void {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error("Billing account not found");

    Object.assign(account, updates);
    this.logActivity(
      "billing_account_updated",
      account.companyId,
      account.companyName,
      account.legalName,
      `Billing contact and legal preferences updated`,
    );

    this.notify();
  }

  public updateReconciliationIssue(
    issueId: string,
    updates: {
      status?: ReconciliationException["status"];
      assignedOwner?: string;
      newNote?: string;
    },
  ): void {
    const exp = this.exceptions.find((e) => e.id === issueId);
    if (!exp) throw new Error("Exception not found");

    if (updates.status) exp.status = updates.status;
    if (updates.assignedOwner) exp.assignedOwner = updates.assignedOwner;
    if (updates.newNote) {
      exp.investigationNotes = [...exp.investigationNotes, updates.newNote];
    }

    this.logActivity(
      "reconciliation_reviewed",
      exp.companyId,
      exp.companyName,
      exp.financialReference,
      `Exception ${exp.financialReference} investigation status updated to ${exp.status}`,
    );

    this.notify();
  }

  public updatePolicies(newPolicies: Partial<BillingPolicies>): void {
    this.policies = { ...this.policies, ...newPolicies };
    this.logActivity(
      "policy_updated",
      "platform",
      "OmniPlatform Governance",
      "POL-BILLING",
      "Platform billing governance and invoicing policies updated",
    );
    this.notify();
  }

  private recalculateAccountBalances(accountId: string) {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) return;

    const companyInvoices = this.invoices.filter(
      (i) => i.billingAccountId === accountId && i.documentState === "issued",
    );
    const outstanding = companyInvoices.reduce((acc, i) => acc + i.outstandingBalanceMinor, 0);
    const overdue = companyInvoices
      .filter((i) => i.timingState === "overdue")
      .reduce((acc, i) => acc + i.outstandingBalanceMinor, 0);

    account.currentOutstandingMinor = outstanding;
    account.overdueMinor = overdue;
    account.unpaidInvoiceCount = companyInvoices.filter((i) => i.collectionState !== "paid").length;
  }
}

export const billingStore = new BillingStore();
