"use client";

/**
 * Lands after the backend's OAuth 302: `/admin/integrations?status=…&provider=…&reason=…`.
 *
 * Shows a single toast, quietly reloads the snapshot on success so a freshly
 * stored connection is picked up, then strips the callback params so refresh
 * and shared URLs never replay the message. Inert when those params are absent.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  oauthCallbackFeedback,
  parseOAuthCallbackParams,
  stripOAuthCallbackParams,
} from "../integrations-data/oauth-callback";
import { consumeGbpReturn } from "@/features/admin/google-business/live/gbp-return";
import { CONNECT_MARKER_KEY, useIntegrations, type ConnectMarker } from "../store/integrations-store";

export function OAuthCallbackHandler() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { reload, offerAccountsFor } = useIntegrations();
  const raw = params?.toString() ?? "";
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const result = parseOAuthCallbackParams(params);
    if (!result) return;
    // React Strict Mode double-invokes effects; key on the raw query so the
    // toast fires once, and a later callback with different params still fires.
    if (handled.current === raw) return;
    handled.current = raw;

    const feedback = oauthCallbackFeedback(result);
    if (feedback.tone === "success") {
      toast.success(feedback.title, { description: feedback.description });
      // Started from the Google Business page: go straight back so the user can pick the location there.
      if (result.provider === "GOOGLE_BUSINESS" && consumeGbpReturn()) {
        router.replace("/admin/google-business");
        return;
      }
      // A brand-new login is offered "Add accounts" once the fresh snapshot arrives (see AccountsPrompt).
      try {
        const stored = window.sessionStorage.getItem(CONNECT_MARKER_KEY);
        if (stored) {
          window.sessionStorage.removeItem(CONNECT_MARKER_KEY);
          offerAccountsFor(JSON.parse(stored) as ConnectMarker);
        }
      } catch {
        // Storage blocked: the person opens "Add accounts" from the integration instead.
      }
      reload();
    } else {
      try {
        window.sessionStorage.removeItem(CONNECT_MARKER_KEY);
      } catch {
        // Nothing to clean up.
      }
      toast.error(feedback.title, { description: feedback.description });
    }

    const next = stripOAuthCallbackParams(params);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, raw, pathname, router, reload, offerAccountsFor]);

  return null;
}
