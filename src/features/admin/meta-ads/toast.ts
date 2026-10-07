import { toast as sonner } from "sonner";
import { LIVE } from "./data-source";

/**
 * The Ads pages announce actions (pause, duplicate, export, assign…) with a
 * success toast. In live mode the Meta Ads workspace is read-only, so claiming
 * success would be a lie: those calls become one honest notice instead.
 * Warnings/errors/info pass through untouched.
 */
const NOT_AVAILABLE = "Not available yet — Meta Ads is read-only here. Manage this in Meta Ads Manager.";

type ToastApi = typeof sonner;

const readOnly = new Proxy(sonner, {
  get(target, prop, receiver) {
    if (prop === "success" || prop === "warning") {
      return () => target.info(NOT_AVAILABLE, { id: "meta-ads-read-only" });
    }
    return Reflect.get(target, prop, receiver);
  },
}) as ToastApi;

export const toast: ToastApi = LIVE ? readOnly : sonner;
