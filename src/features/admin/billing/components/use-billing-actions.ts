"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invoicePdf, receiptPdf, summaryPdf } from "../billing-data/documents";
import { downloadFile, hasReceipt, type AttentionAction } from "../billing-data/selectors";
import type { Invoice } from "../billing-data/types";
import { useBilling } from "../store/billing-store";

export function useBillingActions() {
  const { snapshot, openFlow, focusSection, gates, can } = useBilling();
  const router = useRouter();

  const downloadInvoice = useCallback(
    (invoice: Invoice) => {
      if (!snapshot) return;
      try {
        downloadFile(`${invoice.number}.pdf`, invoicePdf(invoice, snapshot) as BlobPart, "application/pdf");
        toast.success(`${invoice.number} downloaded`);
      } catch {
        toast.error("Invoice unavailable", { description: "The document couldn't be generated. Try again in a moment." });
      }
    },
    [snapshot],
  );

  const downloadReceipt = useCallback(
    (invoice: Invoice) => {
      if (!snapshot || !hasReceipt(invoice)) return;
      try {
        downloadFile(`${invoice.number}-receipt.pdf`, receiptPdf(invoice, snapshot) as BlobPart, "application/pdf");
        toast.success(`Receipt for ${invoice.number} downloaded`);
      } catch {
        toast.error("Receipt unavailable", { description: "The document couldn't be generated. Try again in a moment." });
      }
    },
    [snapshot],
  );

  const downloadSummary = useCallback(() => {
    if (!snapshot) return;
    const now = new Date();
    downloadFile(`billing-summary-${now.toISOString().slice(0, 10)}.pdf`, summaryPdf(snapshot, now) as BlobPart, "application/pdf");
    toast.success("Billing summary downloaded");
  }, [snapshot]);

  const runAttention = useCallback(
    (action: AttentionAction) => {
      switch (action.kind) {
        case "update_payment":
        case "add_payment":
          return openFlow({ kind: "payment", role: "primary" });
        case "pay_invoice":
          return openFlow({ kind: "pay", invoiceId: action.invoiceId });
        case "view_invoice":
          return openFlow({ kind: "invoice", invoiceId: action.invoiceId });
        case "upgrade":
        case "choose_plan":
          return openFlow({ kind: "upgrade" });
        case "reactivate":
          return openFlow({ kind: "upgrade", planId: snapshot?.subscription.planId });
        case "buy_credits":
          return openFlow({ kind: "credits" });
        case "add_on":
          return openFlow({ kind: "addon", limit: action.limit });
        case "resume":
          return openFlow({ kind: "resume" });
        case "view_breakdown":
          return openFlow({ kind: "breakdown" });
        case "withdraw_change":
          return openFlow({ kind: "withdraw" });
        case "add_contact":
          return openFlow({ kind: "contact", contactId: null });
        case "edit_details":
          return openFlow({ kind: "details" });
        case "link":
          return router.push(action.href);
      }
    },
    [openFlow, router, snapshot],
  );

  /** Gate for an attention action, so its button can explain itself when it can't run. */
  const gateFor = useCallback(
    (action: AttentionAction) => {
      if (!gates) return undefined;
      switch (action.kind) {
        case "update_payment":
        case "add_payment":
        case "pay_invoice":
          return gates.managePayment;
        case "upgrade":
          return gates.upgrade;
        case "choose_plan":
        case "reactivate":
        case "resume":
        case "withdraw_change":
          return can.canManageSubscription;
        case "buy_credits":
          return gates.buyCredits;
        case "add_on":
          return gates.addOns;
        case "add_contact":
        case "edit_details":
          return gates.editDetails;
        case "view_invoice":
        case "view_breakdown":
        case "link":
          return undefined;
      }
    },
    [gates, can],
  );

  return { downloadInvoice, downloadReceipt, downloadSummary, runAttention, gateFor, openFlow, focusSection };
}
