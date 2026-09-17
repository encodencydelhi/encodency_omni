"use client";

/**
 * Connect / manage / disconnect an integration.
 *
 * The OAuth handshakes do not exist yet. Rather than fake a Google consent
 * screen, this dialog is explicit: it sets the integration state for this
 * workspace so the capability-gated screens can be seen working, and says so.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link2, Unlink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { useIntegrationMutations, useWebsiteCapabilities } from "../../data/hooks";
import { integrationStatusLabel, integrationTone } from "../../data/capability-provider";
import { formatDateTime } from "../../data/selectors";
import type { IntegrationKey } from "../../data/types";
import { Chip, WButton } from "../ui/kit";

const PLACEHOLDER: Record<IntegrationKey, string> = {
  ga4: "properties/418290145",
  searchConsole: "sc-domain:example.org",
  omniTracking: "omni-site-key",
  ownership: "TXT record value",
};

const FIELD_LABEL: Record<IntegrationKey, string> = {
  ga4: "GA4 property",
  searchConsole: "Search Console property",
  omniTracking: "Tracking site key",
  ownership: "Verification record",
};

function trackingSnippet(siteKey: string, domain: string) {
  return `<!-- OmniPlatform tracking — place before </head> on ${domain} -->
<script async src="https://cdn.omniplatform.app/t.js" data-site="${siteKey}"></script>`;
}

export function IntegrationDialog({
  clientId,
  domain,
  integrationKey,
  onClose,
}: {
  clientId: string;
  domain: string;
  integrationKey: IntegrationKey | null;
  onClose: () => void;
}) {
  const { data: capabilities } = useWebsiteCapabilities(clientId, Boolean(integrationKey));
  const { connect, disconnect } = useIntegrationMutations(clientId);
  const integration = integrationKey ? capabilities?.integrations[integrationKey] : undefined;

  /**
   * Local edits are keyed to the integration being edited, so switching from
   * GA4 to Search Console starts clean without an effect resetting state.
   */
  const [edit, setEdit] = useState<{ key: IntegrationKey; property: string } | null>(null);
  const [copied, setCopied] = useState<IntegrationKey | null>(null);
  const property =
    edit && edit.key === integrationKey
      ? edit.property
      : (integration?.property ?? (integrationKey ? PLACEHOLDER[integrationKey] : ""));
  const setProperty = (value: string) => {
    if (integrationKey) setEdit({ key: integrationKey, property: value });
  };

  const connected =
    integration?.status === "connected" || integration?.status === "installed" || integration?.status === "needs-attention";

  const siteKey = `omni-${clientId}`;

  return (
    <Dialog open={Boolean(integrationKey)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-lg rounded-lg border-[#E6EBF4] bg-white p-0">
        <DialogHeader className="border-b border-[#EEF2F8] p-5 pr-12">
          <span className="flex items-center gap-2">
            <DialogTitle className="text-[15px] font-semibold text-[#111C3A]">
              {integration?.name ?? "Integration"}
            </DialogTitle>
            {integration ? (
              <Chip tone={integrationTone(integration.status) === "good" ? "good" : integrationTone(integration.status) === "warn" ? "warn" : "muted"} dot>
                {integrationStatusLabel(integration.status)}
              </Chip>
            ) : null}
          </span>
          <DialogDescription className="text-[12px] leading-relaxed text-[#6B7A94]">
            {integration?.detail}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[56vh] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Unlocks</h3>
            <ul className="flex flex-wrap gap-1.5">
              {(integration?.unlocks ?? []).map((item) => (
                <li key={item}>
                  <Chip tone={connected ? "good" : "muted"}>{item}</Chip>
                </li>
              ))}
            </ul>
          </div>

          {integrationKey === "omniTracking" ? (
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                Tracking snippet
              </h3>
              <pre className="scrollbar-thin overflow-x-auto rounded-md bg-[#0F172A] p-3 text-[10.5px] leading-relaxed text-[#E2E8F0]">
                <code>{trackingSnippet(siteKey, domain)}</code>
              </pre>
              <WButton
                className="mt-2"
                size="sm"
                icon={copied === integrationKey ? Check : Copy}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(trackingSnippet(siteKey, domain))
                    .then(() => {
                      setCopied(integrationKey);
                      toast.success("Snippet copied to clipboard");
                    })
                    .catch(() => toast.error("Could not copy — select the snippet and copy manually."));
                }}
              >
                {copied === integrationKey ? "Copied" : "Copy snippet"}
              </WButton>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6B7A94]">
                Someone with access to the website has to paste this in. Until events arrive, behaviour data and
                heatmaps stay locked — we will not estimate them.
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="integration-property"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]"
              >
                {integrationKey ? FIELD_LABEL[integrationKey] : "Property"}
              </label>
              <input
                id="integration-property"
                value={property}
                onChange={(event) => setProperty(event.target.value)}
                placeholder={integrationKey ? PLACEHOLDER[integrationKey] : ""}
                className={cn(
                  "h-9 w-full rounded-md border border-[#DAE1EC] px-2.5 text-[12px] text-[#28354C]",
                  "focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20",
                )}
              />
            </div>
          )}

          {integration?.lastSyncAt ? (
            <p className="text-[11px] text-[#6B7A94]">Last sync: {formatDateTime(integration.lastSyncAt)}</p>
          ) : null}

          <p className="rounded-md bg-[#FDF3E3] px-3 py-2 text-[11px] leading-relaxed text-[#9A5B08]">
            The OAuth handshake is not built yet. Connecting here sets the integration state for this workspace so you
            can see exactly what it unlocks — it does not reach Google or install anything on the website.
          </p>
        </div>

        <DialogFooter className="border-t border-[#EEF2F8] p-4">
          <WButton onClick={onClose}>Cancel</WButton>
          {connected ? (
            <WButton
              tone="danger"
              icon={Unlink}
              disabled={disconnect.isPending || !integrationKey}
              disabledReason="Disconnecting…"
              onClick={() => {
                if (!integrationKey) return;
                disconnect.mutate(integrationKey, {
                  onSuccess: () => {
                    setEdit(null);
                    toast.success(`${integration?.name} disconnected`, {
                      description: "Everything it unlocked is locked again.",
                    });
                    onClose();
                  },
                  onError: () => toast.error("Could not disconnect."),
                });
              }}
            >
              Disconnect
            </WButton>
          ) : (
            <WButton
              tone="primary"
              icon={Link2}
              disabled={connect.isPending || !integrationKey || (integrationKey !== "omniTracking" && !property.trim())}
              disabledReason={
                connect.isPending ? "Connecting…" : "Enter the property identifier first"
              }
              onClick={() => {
                if (!integrationKey) return;
                connect.mutate(
                  { key: integrationKey, property: integrationKey === "omniTracking" ? siteKey : property.trim() },
                  {
                    onSuccess: () => {
                      setEdit(null);
                      toast.success(
                        integrationKey === "omniTracking"
                          ? "Tracking marked as installed"
                          : `${integration?.name} connected`,
                        { description: "The screens it unlocks are now available." },
                      );
                      onClose();
                    },
                    onError: () => toast.error("Could not connect."),
                  },
                );
              }}
            >
              {integrationKey === "omniTracking" ? "Mark as installed" : "Connect"}
            </WButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
