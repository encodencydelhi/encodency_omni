"use client";

/**
 * One definition of what you can do to a connection. Overview cards, the
 * Connected table, issue rows and the detail page all use it, so an action
 * behaves — and explains itself when blocked — identically everywhere.
 */

import { useState, type ReactNode } from "react";
import { ArrowRightLeft, Eye, KeyRound, RefreshCw, Unplug, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { disconnectCapability, reconnectCapability, syncCapability } from "../integrations-data/capability-provider";
import { intRoutes } from "../integrations-data/config";
import { useClientScope } from "../integrations-data/hooks";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationResource } from "../integrations-data/types";
import { DisconnectDialog, MappingDialog, ReconnectDialog } from "./dialogs";
import { Button, type MenuItem } from "./ui";

export interface ConnectionActionsApi {
  menuItems: (connection: IntegrationConnection, options?: { hideView?: boolean }) => (MenuItem | "separator")[];
  openReconnect: (connection: IntegrationConnection) => void;
  openDisconnect: (connection: IntegrationConnection) => void;
  openMapping: (connection: IntegrationConnection, resource?: IntegrationResource) => void;
  sync: (connection: IntegrationConnection) => void;
  /** Mount once per screen. */
  dialogs: ReactNode;
}

export function useConnectionActions(): ConnectionActionsApi {
  const { can, syncJobs, syncNow } = useIntegrations();
  const { withScope } = useClientScope();
  const [reconnectTarget, setReconnectTarget] = useState<IntegrationConnection | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationConnection | null>(null);
  const [mappingTarget, setMappingTarget] = useState<{ connection: IntegrationConnection; resource: IntegrationResource | null } | null>(null);

  const menuItems: ConnectionActionsApi["menuItems"] = (connection, options) => {
    const disconnected = connection.status === "disconnected";
    return [
      { label: "View details", icon: Eye, href: withScope(intRoutes.detail(connection.id)), hidden: options?.hideView },
      { label: "Sync now", icon: RefreshCw, onSelect: () => void syncNow(connection.id), gate: syncCapability(connection, can.canSync, Boolean(syncJobs[connection.id])), hidden: disconnected },
      { label: "Reconnect", icon: KeyRound, onSelect: () => setReconnectTarget(connection), gate: reconnectCapability(connection, can.canReconnect), hidden: disconnected },
      { label: "Manage mapping", icon: ArrowRightLeft, onSelect: () => setMappingTarget({ connection, resource: null }), gate: can.canChangeMapping, hidden: disconnected },
      { label: "View usage", icon: Waypoints, href: withScope(intRoutes.detail(connection.id, "usage")) },
      "separator",
      { label: "Connect again", icon: KeyRound, href: withScope(`${intRoutes.available}?connect=1&provider=${connection.providerId}${connection.clientId ? `&for=${connection.clientId}` : ""}`), gate: can.canConnect, hidden: !disconnected },
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
    </>
  );

  return {
    menuItems,
    openReconnect: setReconnectTarget,
    openDisconnect: setDisconnectTarget,
    openMapping: (connection, resource) => setMappingTarget({ connection, resource: resource ?? null }),
    sync: (connection) => void syncNow(connection.id),
    dialogs,
  };
}

/**
 * Sync button that shows the sync as it happens: spinner and live progress
 * while running, then the button returns with an updated "last sync".
 */
export function SyncButton({ connection, size = "sm", variant = "secondary", className, label = "Sync now" }: { connection: IntegrationConnection; size?: "xs" | "sm" | "md"; variant?: "secondary" | "primary" | "ghost"; className?: string; label?: string }) {
  const { can, syncJobs, syncNow } = useIntegrations();
  const job = syncJobs[connection.id];
  const gate = syncCapability(connection, can.canSync, Boolean(job));

  if (job) {
    return (
      <span className={cn("inline-flex h-8 min-w-[112px] items-center gap-2 rounded-sm border border-[#D5E1FD] bg-[#F5F8FF] px-2.5 text-[12px] font-semibold text-[#1D4ED8]", size === "xs" && "h-7 min-w-[96px] text-[11.5px]", className)} role="status" aria-live="polite">
        <RefreshCw className="size-3.5 animate-spin" />
        <span className="tabular-nums">{job.progress}%</span>
        <span className="h-1 w-8 overflow-hidden rounded-sm bg-[#D5E1FD]">
          <span className="block h-full bg-[#2563EB] transition-[width] duration-300" style={{ width: `${job.progress}%` }} />
        </span>
      </span>
    );
  }

  return (
    <Button size={size} variant={variant} icon={RefreshCw} gate={gate} className={className} onClick={() => void syncNow(connection.id)}>
      {label}
    </Button>
  );
}
