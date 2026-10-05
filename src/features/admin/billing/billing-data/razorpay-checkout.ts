/**
 * Razorpay Checkout, the browser half of an online payment. The server creates the order and later verifies the signed result; this only opens Razorpay's own
 * payment window (card, UPI and net banking details are typed there and never reach OmniPlatform) and hands back what Razorpay returns.
 */
import { useSyncExternalStore } from "react";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * True while Razorpay's payment window is open. A modal dialog (the billing flows) keeps keyboard focus inside itself, which makes the typing fields in Razorpay's
 * window (its own iframe, outside the dialog) unusable, so the billing flows step aside while this is true and come back when the payment ends.
 */
let paymentWindowOpen = false;
const listeners = new Set<() => void>();

function setPaymentWindowOpen(open: boolean) {
  paymentWindowOpen = open;
  listeners.forEach((listener) => listener());
}

export function usePaymentWindowOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => paymentWindowOpen,
    () => false,
  );
}

export interface CheckoutOrder {
  invoiceId: string;
  orderId: string;
  keyId: string;
  amount: number;
  currency: "INR";
  planName: string;
  description: string;
}

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** The person closed the payment window without paying. */
export class CheckoutCancelled extends Error {
  constructor() {
    super("Payment cancelled");
    this.name = "CheckoutCancelled";
  }
}

/** Razorpay reported the payment as failed (declined card, wrong OTP, ...). */
export class CheckoutFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutFailed";
  }
}

/** The payment window's script could not be loaded (offline, blocked). */
export class CheckoutUnavailable extends Error {
  constructor() {
    super("Payment window unavailable");
    this.name = "CheckoutUnavailable";
  }
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

let loading: Promise<RazorpayConstructor> | null = null;

function loadRazorpay(): Promise<RazorpayConstructor> {
  const existing = (globalThis as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  if (typeof document === "undefined") return Promise.reject(new CheckoutUnavailable());
  loading ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const loaded = (globalThis as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (loaded) resolve(loaded);
      else reject(new CheckoutUnavailable());
    };
    script.onerror = () => reject(new CheckoutUnavailable());
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // a later attempt may succeed
    throw error;
  });
  return loading;
}

/** Opens the payment window for an order and resolves with the signed result once the person has paid. */
export async function collectPayment(order: CheckoutOrder, prefill: { name: string; email: string }): Promise<CheckoutResult> {
  const Razorpay = await loadRazorpay();
  setPaymentWindowOpen(true);
  return new Promise<CheckoutResult>((resolve, reject) => {
    // A failed attempt can be retried inside Razorpay's window, so only closing it ends this payment (reported as the last failure, if there was one).
    let lastFailure: string | null = null;
    const window = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "OmniPlatform",
      description: order.description,
      prefill: { name: prefill.name || undefined, email: prefill.email || undefined },
      theme: { color: "#E5202E" },
      handler: (result: CheckoutResult) => resolve(result),
      modal: { ondismiss: () => reject(lastFailure ? new CheckoutFailed(lastFailure) : new CheckoutCancelled()) },
    });
    window.on("payment.failed", (response) => {
      lastFailure = response.error?.description || "The payment failed.";
    });
    try {
      window.open();
    } catch (error) {
      reject(error);
    }
  }).finally(() => setPaymentWindowOpen(false));
}
