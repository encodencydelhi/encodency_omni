"use client";

import {
  ActivityIcon,
  ArchiveIcon,
  BuildingIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  EyeIcon,
  GlobeIcon,
  PencilIcon,
  PlugIcon,
  SquareArrowOutUpRightIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { ROUTES } from "@/config/routes";
import { clientHref, clientSectionHref } from "../data/config";
import { useClientCapabilities } from "../data/hooks";
import type { ClientSection, ClientSummary } from "../data/types";
import { ClientEditDrawer } from "./client-edit-drawer";
import { LifecycleFlow, type LifecycleKind } from "./flows/lifecycle-flows";

export type ClientFlow = { kind: "edit"; summary: ClientSummary } | { kind: LifecycleKind; targets: ClientSummary[] };

const VIEWS: ReadonlyArray<{ id: ClientSection; label: string; icon: typeof UsersIcon; capability: "canViewAllClients" | "canViewClientConnections" | "canViewClientWebsiteSeo" | "canViewClientActivity" }> = [
  { id: "team", label: "View Team", icon: UsersIcon, capability: "canViewAllClients" },
  { id: "channels", label: "View Channels", icon: PlugIcon, capability: "canViewClientConnections" },
  { id: "website-seo", label: "View Website & SEO", icon: GlobeIcon, capability: "canViewClientWebsiteSeo" },
  { id: "activity", label: "View Activity", icon: ActivityIcon, capability: "canViewClientActivity" },
];

/**
 * The single place that decides which actions a client offers and hosts the
 * dialogs behind them. Rows, the preview drawer, the detail header and the bulk
 * bar all ask this hook, so an action is valid (or hidden) for the same reasons
 * everywhere - and archived clients never offer a way to change them.
 */
export function useClientActions() {
  const router = useRouter();
  const capabilities = useClientCapabilities();
  const [flow, setFlow] = useState<ClientFlow | null>(null);
  const closeFlow = useCallback(() => setFlow(null), []);

  const lifecycleItems = useCallback(
    (summary: ClientSummary, separatorFirst: boolean): ActionMenuItem[] => {
      const items: ActionMenuItem[] = [];
      let first = separatorFirst;
      const add = (item: ActionMenuItem) => {
        items.push({ ...item, separatorBefore: first });
        first = false;
      };
      if (summary.workspace === "active" && capabilities.canPauseClient) {
        add({ id: "pause", label: "Pause Client", icon: CirclePauseIcon, onSelect: () => setFlow({ kind: "pause", targets: [summary] }) });
      }
      if (summary.workspace === "paused" && capabilities.canResumeClient) {
        add({ id: "resume", label: "Resume Client", icon: CirclePlayIcon, onSelect: () => setFlow({ kind: "resume", targets: [summary] }) });
      }
      if (summary.workspace !== "archived" && capabilities.canArchiveClient) {
        add({ id: "archive", label: "Archive Client", icon: ArchiveIcon, variant: "destructive", onSelect: () => setFlow({ kind: "archive", targets: [summary] }) });
      }
      return items;
    },
    [capabilities],
  );

  const rowMenu = useCallback(
    (summary: ClientSummary, options: { onPreview?: (summary: ClientSummary) => void } = {}): ActionMenuItem[] => {
      const id = summary.client.id;
      const archived = summary.workspace === "archived";
      const items: ActionMenuItem[] = [{ id: "open", label: "Open Client", icon: SquareArrowOutUpRightIcon, onSelect: () => router.push(clientHref(id)) }];
      if (options.onPreview) items.push({ id: "preview", label: "Quick Preview", icon: EyeIcon, onSelect: () => options.onPreview?.(summary) });
      if (capabilities.canEditClient && !archived) items.push({ id: "edit", label: "Edit Client", icon: PencilIcon, onSelect: () => setFlow({ kind: "edit", summary }) });
      items.push({ id: "company", label: "Open Parent Company", icon: BuildingIcon, onSelect: () => router.push(ROUTES.superAdmin.company(summary.company.id)) });
      VIEWS.forEach((view, index) => {
        if (!capabilities[view.capability]) return;
        items.push({ id: view.id, label: view.label, icon: view.icon, separatorBefore: index === 0, onSelect: () => router.push(clientSectionHref(id, view.id)) });
      });
      return [...items, ...lifecycleItems(summary, true)];
    },
    [capabilities, lifecycleItems, router],
  );

  /** The "More" menu on the detail header. */
  const detailMenu = useCallback(
    (summary: ClientSummary): ActionMenuItem[] => {
      const id = summary.client.id;
      const items: ActionMenuItem[] = [];
      if (summary.attention.length > 0) {
        items.push({ id: "issues", label: "Review Issues", icon: EyeIcon, onSelect: () => router.push(`${clientHref(id)}#needs-attention`) });
      }
      if (capabilities.canViewClientActivity) {
        items.push({ id: "activity", label: "View Activity", icon: ActivityIcon, onSelect: () => router.push(clientSectionHref(id, "activity")) });
      }
      return [...items, ...lifecycleItems(summary, items.length > 0)];
    },
    [capabilities, lifecycleItems, router],
  );

  const dialogs: ReactNode = useMemo(() => {
    if (!flow) return null;
    if (flow.kind === "edit") return <ClientEditDrawer summary={flow.summary} onClose={closeFlow} />;
    return <LifecycleFlow kind={flow.kind} targets={flow.targets} onClose={closeFlow} />;
  }, [closeFlow, flow]);

  return { capabilities, openFlow: setFlow, closeFlow, rowMenu, detailMenu, dialogs };
}
