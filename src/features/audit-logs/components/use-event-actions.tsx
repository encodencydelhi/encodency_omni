"use client";

import { ClipboardCopyIcon, DownloadIcon, EyeIcon, FileSearchIcon, LinkIcon, PlusIcon, WorkflowIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionMenuItem } from "@/components/shared/action-menu";
import { auditRoutes } from "../data/config";
import { useAuditCapabilities } from "../data/hooks";
import type { AuditEvent } from "../data/types";
import { ALL_TIME } from "./event-picker";
import { AddToInvestigationDialog } from "./add-to-investigation";
import { ExportDialog } from "./export-dialog";

/**
 * The row actions every event list shares. There is deliberately no edit, delete or
 * "rewrite result" action: an original audit event can be read, filtered, exported, linked to
 * an investigation and followed to its related resources, and nothing else.
 */
export function useEventActions(): { menuFor: (event: AuditEvent, options?: { onPreview?: () => void; back?: string }) => ActionMenuItem[]; nodes: ReactNode } {
  const router = useRouter();
  const capabilities = useAuditCapabilities();
  const [linking, setLinking] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState<AuditEvent | null>(null);

  const menuFor = (event: AuditEvent, options: { onPreview?: () => void; back?: string } = {}): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    if (options.onPreview) items.push({ id: "preview", label: "Quick Preview", icon: EyeIcon, onSelect: options.onPreview });
    items.push({ id: "open", label: "Open Full Event", icon: FileSearchIcon, onSelect: () => router.push(auditRoutes.event(event.id, options.back)) });
    const related = event.target.href ?? event.related.find((ref) => ref.href)?.href ?? null;
    if (related) items.push({ id: "related", label: "View Related Resource", icon: LinkIcon, onSelect: () => router.push(related) });
    if (event.correlationId) items.push({ id: "workflow", label: "View Correlated Events", icon: WorkflowIcon, onSelect: () => router.push(auditRoutes.events({ corr: event.correlationId ?? undefined, range: "custom", from: "2000-01-01", to: "2099-12-31" })) });
    if (capabilities.canManageInvestigations) items.push({ id: "investigate", label: "Add To Investigation", icon: PlusIcon, separatorBefore: true, onSelect: () => setLinking(event) });
    items.push({ id: "copy", label: "Copy Event ID", icon: ClipboardCopyIcon, separatorBefore: !capabilities.canManageInvestigations, onSelect: () => { void navigator.clipboard?.writeText(event.id).then(() => toast.success("Event ID Copied", { description: event.id })); } });
    if (capabilities.canExport) items.push({ id: "export", label: "Export Event", icon: DownloadIcon, onSelect: () => setExporting(event) });
    return items;
  };

  const nodes = (
    <>
      {linking ? <AddToInvestigationDialog event={linking} onClose={() => setLinking(null)} onDone={(id) => router.push(auditRoutes.investigation(id))} /> : null}
      {exporting ? <ExportDialog query={{ window: ALL_TIME, eventId: exporting.id }} subject={`Event ${exporting.id}`} onClose={() => setExporting(null)} /> : null}
    </>
  );
  return { menuFor, nodes };
}
