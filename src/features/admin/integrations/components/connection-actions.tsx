"use client";

/**
 * One definition of what you can do to a connection. Overview cards, the
 * Connected table, issue rows and the detail page all use it, so an action
 * behaves — and explains itself when blocked — identically everywhere.
 */

import { useState, type ReactNode } from "react";
import { ArrowRightLeft, Eye, KeyRound, Plus, RefreshCw, Unplug, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { checkCapability, disconnectCapability, reconnectCapability } from "../integrations-data/capability-provider";
import { intRoutes } from "../integrations-data/config";
import { useClientScope } from "../integrations-data/hooks";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationResource } from "../integrations-data/types";
import { AddAccountsDialog, DisconnectDialog, MappingDialog, ReconnectDialog } from "./dialogs";
import { Button, type MenuItem } from "./ui";

export interface ConnectionActionsApi {
  menuItems: (connection: IntegrationConnection, options?: { hideView?: boolean }) => (MenuItem | "separator")[];
  openReconnect: (connection: IntegrationConnection) => void;
  openDisconnect: (connection: IntegrationConnection) => void;
  openMapping: (connection: IntegrationConnection, resource?: IntegrationResource) => void;
  openAddAccounts: (connection: IntegrationConnection) => void;
  check: (connection: IntegrationConnection) => void;
  /** Mount once per screen. */
  dialogs: ReactNode;
}

export function useConnectionActions(): ConnectionActionsApi {
  const { can, checkJobs, checkNow } = useIntegrations();
  const { withScope } = useClientScope();
  const [reconnectTarget, setReconnectTarget] = useState<IntegrationConnection | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationConnection | null>(null);
  const [mappingTarget, setMappingTarget] = useState<{ connection: IntegrationConnection; resource: IntegrationResource | null } | null>(null);
  const [addTarget, setAddTarget] = useState<IntegrationConnection | null>(null);

  const menuItems: ConnectionActionsApi["menuItems"] = (connection, options) => {
    const disconnected = connection.status === "disconnected";
    return [
      { label: "View details", icon: Eye, href: withScope(intRoutes.detail(connection.id)), hidden: options?.hideView },
      { label: "Check now", icon: RefreshCw, onSelect: () => void checkNow(connection.id), gate: checkCapability(connection, can.canCheck, Boolean(checkJobs[connection.id])), hidden: disconnected },
      { label: "Reconnect", icon: KeyRound, onSelect: () => setReconnectTarget(connection), gate: reconnectCapability(connection, can.canReconnect), hidden: disconnected },
      { label: "Add accounts", icon: Plus, onSelect: () => setAddTarget(connection), gate: can.canChangeMapping, hidden: disconnected },
      { label: "Manage accounts", icon: ArrowRightLeft, onSelect: () => setMappingTarget({ connection, resource: null }), gate: can.canChangeMapping, hidden: disconnected },
      { label: "View usage", icon: Waypoints, href: withScope(intRoutes.detail(connection.id, "usage")) },
      "separator",
      { label: "Connect again", icon: KeyRound, href: withScope(`${intRoutes.available}?connect=1&provider=${connection.providerId}`), gate: can.canConnect, hidden: !disconnected },
      { label: "Disconnect", icon: Unplug, danger: true, onSelect: () => setDisconnectTarget(connection), gate: disconnectCapability(connection, can.canDisconnect), hidden: disconnected },
    ];
  };

  const dialogs = (
    <>
      <ReconnectDialog connection={reconnectTarget} open={reconnectTarget !== null} onOpenChange={(open) => !open && setReconnectTarget(null)} />
      <DisconnectDialog connection={disconnectTarget} open={disconnectTarget !== null} onOpenChange={(open) => !open && setDisconnectTarget(null)} />
      <MappingDialog
        connection={mappingTarget?.connection ?? null}
        resource={mappingTarget?.resource ?? null}
        open={mappingTarget !== null}
        onOpenChange={(open) => !open && setMappingTarget(null)}
      />
      <AddAccountsDialog connection={addTarget} open={addTarget !== null} onOpenChange={(open) => !open && setAddTarget(null)} />
    </>
  );

  return {
    menuItems,
    openReconnect: setReconnectTarget,
    openDisconnect: setDisconnectTarget,
    openMapping: (connection, resource) => setMappingTarget({ connection, resource: resource ?? null }),
    openAddAccounts: setAddTarget,
    check: (connection) => void checkNow(connection.id),
    dialogs,
  };
}

/**
 * Check button. A check really asks the provider what the login can reach, so there is no percentage to show: while it runs
 * the button says so, then returns with an updated "last check".
 */
export function CheckButton({ connection, size = "sm", variant = "secondary", className, label = "Check now" }: { connection: IntegrationConnection; size?: "xs" | "sm" | "md"; variant?: "secondary" | "primary" | "ghost"; className?: string; label?: string }) {
  const { can, checkJobs, checkNow } = useIntegrations();
  const job = checkJobs[connection.id];
  const gate = checkCapability(connection, can.canCheck, Boolean(job));

  if (job) {
    return (
      <span className={cn("inline-flex h-8 items-center gap-2 rounded-sm border border-[#D5E1FD] bg-[#F5F8FF] px-2.5 text-[12px] font-semibold text-[#1D4ED8]", size === "xs" && "h-7 text-[11.5px]", className)} role="status" aria-live="polite">
        <RefreshCw className="size-3.5 animate-spin" />
        Checking…
      </span>
    );
  }

  return (
    <Button size={size} variant={variant} icon={RefreshCw} gate={gate} className={className} onClick={() => void checkNow(connection.id)}>
      {label}
    </Button>
  );
}
