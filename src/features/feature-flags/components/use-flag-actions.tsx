"use client";

import { ActivityIcon, ArchiveIcon, BuildingIcon, EyeIcon, FlagOffIcon, PowerIcon, PowerOffIcon, RotateCcwIcon, SlidersHorizontalIcon, SnowflakeIcon, TimerResetIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { flagRoutes } from "../data/config";
import { useFlagCapabilities } from "../data/hooks";
import type { FlagRow } from "../data/types";
import { ChangeReviewDrawer, type ChangeRequest } from "./change-review";
import { LifecycleDialog } from "./lifecycle-dialog";

/**
 * The row actions every flag list shares. There is no unguarded toggle: enabling,
 * disabling, emergency disable and restore all open the impact review, and in
 * production that review needs a reason and may need approval.
 */
export function useFlagActions(): { menuFor: (row: FlagRow, extra?: { onPreview?: () => void }) => ActionMenuItem[]; nodes: ReactNode } {
  const router = useRouter();
  const capabilities = useFlagCapabilities();
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [lifecycle, setLifecycle] = useState<{ row: FlagRow; action: "deprecate" | "archive" } | null>(null);

  const menuFor = (row: FlagRow, extra: { onPreview?: () => void } = {}): ActionMenuItem[] => {
    const { flag, environment, config, state } = row;
    const production = environment === "production";
    const editable = flag.lifecycle !== "archived";
    const canChange = production ? capabilities.canChangeProduction : capabilities.canChangeRollout;
    const base = { flagKey: flag.key, flagName: flag.name, environment } as const;
    const items: ActionMenuItem[] = [];

    if (extra.onPreview) items.push({ id: "preview", label: "Quick Preview", icon: EyeIcon, onSelect: extra.onPreview });
    items.push({ id: "open", label: "View Details", icon: FlagOffIcon, onSelect: () => router.push(flagRoutes.flag(flag.key, environment)) });

    if (editable) {
      items.push({ id: "targeting", label: "Edit Rollout", icon: SlidersHorizontalIcon, onSelect: () => router.push(flagRoutes.flag(flag.key, environment, "targeting")), disabled: !canChange });
      if (state === "emergency_off") {
        items.push({ id: "restore", label: "Restore From Emergency Off", icon: RotateCcwIcon, disabled: !canChange, onSelect: () => setRequest({ ...base, proposed: { emergencyOff: false }, title: "Restore From Emergency Off", kind: "restore", description: `${flag.name} returns to the rollout configuration that was preserved when it was disabled.` }) });
      } else if (state === "enabled") {
        items.push({ id: "disable", label: "Disable", icon: PowerOffIcon, disabled: !canChange, onSelect: () => setRequest({ ...base, proposed: { enabled: false }, title: `Disable ${flag.name}` }) });
        if (flag.protection !== "protected") items.push({ id: "emergency", label: "Emergency Disable", icon: SnowflakeIcon, variant: "destructive", disabled: production ? !capabilities.canEmergencyDisable : !capabilities.canChangeRollout, onSelect: () => setRequest({ ...base, proposed: { emergencyOff: true }, title: `Emergency Disable ${flag.name}`, kind: "emergency" }) });
      } else {
        items.push(
          config.strategy === "disabled"
            ? { id: "enable", label: "Set Up Rollout", icon: PowerIcon, disabled: !canChange, onSelect: () => router.push(flagRoutes.flag(flag.key, environment, "targeting")) }
            : { id: "enable", label: "Enable", icon: PowerIcon, disabled: !canChange, onSelect: () => setRequest({ ...base, proposed: { enabled: true }, title: `Enable ${flag.name}` }) },
        );
      }
    }
    items.push({ id: "impact", label: "View Company Impact", icon: BuildingIcon, separatorBefore: true, onSelect: () => router.push(flagRoutes.flag(flag.key, environment, "impact")) });
    items.push({ id: "activity", label: "View Activity", icon: ActivityIcon, onSelect: () => router.push(flagRoutes.flag(flag.key, environment, "activity")) });
    if (editable && capabilities.canManageLifecycle) {
      if (flag.lifecycle !== "deprecated") items.push({ id: "deprecate", label: "Deprecate", icon: TimerResetIcon, separatorBefore: true, onSelect: () => setLifecycle({ row, action: "deprecate" }) });
      items.push({ id: "archive", label: "Archive", icon: ArchiveIcon, variant: "destructive", onSelect: () => setLifecycle({ row, action: "archive" }) });
    }
    return items;
  };

  const nodes = (
    <>
      <ChangeReviewDrawer request={request} onClose={() => setRequest(null)} />
      {lifecycle ? <LifecycleDialog flagKey={lifecycle.row.flag.key} flagName={lifecycle.row.flag.name} action={lifecycle.action} environment={lifecycle.row.environment} onClose={() => setLifecycle(null)} /> : null}
    </>
  );

  return { menuFor, nodes };
}
