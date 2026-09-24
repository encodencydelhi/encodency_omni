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
import { useIntegrations } from "../store/integrations-store";

export function OAuthCallbackHandler() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { reload } = useIntegrations();
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
      reload();
    } else {
      toast.error(feedback.title, { description: feedback.description });
    }

    const next = stripOAuthCallbackParams(params);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, raw, pathname, router, reload]);

  return null;
}
