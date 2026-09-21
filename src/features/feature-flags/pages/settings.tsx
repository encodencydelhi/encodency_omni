"use client";

import { CheckIcon, MinusIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/features/companies/components/primitives";
import { PROTECTION, GOVERNANCE, FLAGS_MOCK_MODE } from "../data/config";
import { useFlagCapabilities, useFlagMutations } from "../data/hooks";
import { DemoTag, ProtectionBadge } from "../components/badges";

const SECTIONS: Array<{ key: keyof typeof GOVERNANCE; title: string; description: string }> = [
  { key: "creation", title: "Flag Creation Governance", description: "What a new flag must have and how it starts." },
  { key: "production", title: "Production Change Governance", description: "What a change to production needs." },
  { key: "rollout", title: "Rollout Governance", description: "How targeting is allowed to work." },
  { key: "lifecycle", title: "Lifecycle Governance", description: "Review, deprecation, cleanup and archive rules." },
];

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-1.5 sm:grid-cols-[14rem_1fr] sm:gap-3">
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="text-[0.8125rem] text-foreground">{value}</dd>
    </div>
  );
}

/**
 * The governance policy that shapes every flag change, shown read-only. It is derived from
 * the same constants the change review uses, so what this page says is what is enforced
 * in the demo. Editing a policy is a separate, audited capability that does not exist yet.
 */
export function SettingsPage() {
  const capabilities = useFlagCapabilities();
  const mutations = useFlagMutations();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const permissions: Array<[string, boolean]> = [
    ["View Flags And Rollouts", capabilities.canViewFlags],
    ["Create Flags", capabilities.canCreateFlags],
    ["Change Non-Production Rollouts", capabilities.canChangeRollout],
    ["Change Production Rollouts", capabilities.canChangeProduction],
    ["Change Protected Flags", capabilities.canManageProtected],
    ["Emergency Disable In Production", capabilities.canEmergencyDisable],
    ["Deprecate And Archive Flags", capabilities.canManageLifecycle],
    ["View Company Access", capabilities.canViewCompanyAccess],
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Settings & Governance"
        description="The rules that shape flag creation, production changes, rollouts and lifecycle. This policy is read-only in this phase."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo policy</DemoTag> : undefined}
      />

      <AlertBanner tone="info" title="Read-Only Policy">Governance rules are shown so it is clear how changes are reviewed. They cannot be edited from this screen, and no approval service is connected, so a change that needs approval stays pending.</AlertBanner>

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        {SECTIONS.map((section) => (
          <Panel key={section.key} title={section.title} description={section.description}>
            <dl className="divide-y divide-border">
              {GOVERNANCE[section.key].map((rule) => <Rule key={rule.label} label={rule.label} value={rule.value} />)}
            </dl>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        <Panel title="Protection Levels" description="How much care a flag needs before it is changed in production.">
          <ul className="divide-y divide-border">
            {(Object.keys(PROTECTION) as Array<keyof typeof PROTECTION>).map((level) => (
              <li key={level} className="flex items-start gap-3 py-2"><ProtectionBadge level={level} /><p className="text-[0.8125rem] text-muted-foreground">{PROTECTION[level].description}</p></li>
            ))}
          </ul>
        </Panel>

        <Panel title="What You Can Do" description="Your access to Feature Flags. The backend must enforce the same rules; hiding a control is not security.">
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {permissions.map(([label, allowed]) => (
              <li key={label} className="flex items-center gap-2 py-1 text-[0.8125rem]">
                {allowed ? <CheckIcon className="size-4 text-success" aria-label="Allowed" /> : <MinusIcon className="size-4 text-muted-foreground" aria-label="Not allowed" />}
                <span className={allowed ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-2xs text-muted-foreground">There is no &ldquo;approve&rdquo; permission because there is no approval service to approve in.</p>
        </Panel>
      </div>

      {FLAGS_MOCK_MODE ? (
        <Panel title="Demo Data" description="Flags, changes and versions are held in this browser session only.">
          <p className="mb-2 text-[0.8125rem] text-muted-foreground">Resetting restores the original demo flags, rollouts, pending requests and history. Company, plan and subscription records are not touched.</p>
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}><RotateCcwIcon />Reset Demo Flag Data</Button>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !busy && setConfirming(open)}
        title="Reset Demo Flag Data?"
        description="Every flag, rollout, pending request and history entry returns to its original demo state. Nothing outside Feature Flags changes."
        confirmLabel="Reset"
        variant="destructive"
        isPending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await mutations.resetDemoData();
            toast.success("Demo Flag Data Reset");
            setConfirming(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
