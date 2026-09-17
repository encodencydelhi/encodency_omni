"use client";

/**
 * Workspace context for the whole Website module.
 *
 * It owns the things that must survive tab changes and be reachable from any
 * screen: which client's website we are looking at, the running scan, the
 * shared overlays (issue drawer, fix guide, integration, export) and the
 * unsaved-changes guard that protects the Settings forms.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { websiteRepository } from "../data/repository";
import { useScanRunner, type ScanRunner } from "../data/hooks";
import { scanTypeLabel } from "../data/selectors";
import type { IntegrationKey, ScanType } from "../data/types";
import { ExportDialog } from "./dialogs/export-dialog";
import { FixGuideDialog } from "./dialogs/fix-guide-dialog";
import { IntegrationDialog } from "./dialogs/integration-dialog";
import { IssueDrawer } from "./dialogs/issue-drawer";
import { UnsavedChangesDialog } from "./dialogs/unsaved-changes-dialog";

export interface UnsavedGuard {
  isDirty: () => boolean;
  save: () => Promise<void>;
  discard: () => void;
}

export interface ClientWebsiteOption {
  id: string;
  name: string;
  domain: string | null;
}

interface WebsiteWorkspaceValue {
  clientId: string;
  clientName: string;
  domain: string | null;
  websiteUrl: string | null;
  hasWebsite: boolean;
  hasClient: boolean;
  clients: ClientWebsiteOption[];
  selectClient: (clientId: string) => void;
  scan: ScanRunner;
  runScan: (type: ScanType, pageId?: string) => void;
  openIssue: (issueId: string) => void;
  openFixGuide: (guideId: string) => void;
  openIntegration: (key: IntegrationKey) => void;
  openExport: () => void;
  /** Navigation that respects the unsaved-changes guard. */
  navigate: (href: string) => void;
  registerUnsavedGuard: (guard: UnsavedGuard | null) => void;
}

const WebsiteWorkspaceContext = createContext<WebsiteWorkspaceValue | null>(null);

export function useWebsiteWorkspace(): WebsiteWorkspaceValue {
  const context = useContext(WebsiteWorkspaceContext);
  if (!context) throw new Error("useWebsiteWorkspace must be used inside WebsiteWorkspaceProvider");
  return context;
}

export function WebsiteWorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { Clients, selectedProjectId, setSelectedProjectId } = useAdminContext();

  const clients = useMemo<ClientWebsiteOption[]>(
    () =>
      Clients.map((client) => ({
        id: client.id,
        name: client.name,
        domain: websiteRepository.resolveClientWebsite(client.id)?.domain ?? null,
      })),
    [Clients],
  );

  const hasClient = selectedProjectId !== "all" && selectedProjectId.length > 0;
  const active = clients.find((client) => client.id === selectedProjectId);
  const clientId = hasClient ? selectedProjectId : "";
  const clientName = active?.name ?? "";
  const domain = active?.domain ?? null;

  /* Overlays ------------------------------------------------------- */
  const [issueId, setIssueId] = useState<string | null>(null);
  const [fixGuideId, setFixGuideId] = useState<string | null>(null);
  const [integrationKey, setIntegrationKey] = useState<IntegrationKey | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  /* Scans ---------------------------------------------------------- */
  const scan = useScanRunner(clientId, (progress) => {
    toast.success(`${scanTypeLabel[progress.type]} complete`, {
      description:
        progress.type === "page"
          ? "This page's audit has been refreshed."
          : `${progress.pagesScanned} page${progress.pagesScanned === 1 ? "" : "s"} scanned. Results updated.`,
    });
  });

  const runScan = useCallback(
    (type: ScanType, pageId?: string) => {
      if (!clientId || !domain) {
        toast.error("No website configured for this client.");
        return;
      }
      if (scan.isRunning) {
        toast.info("A scan is already running", { description: "Wait for it to finish before starting another." });
        return;
      }
      toast.info(`${scanTypeLabel[type]} started`, { description: `Scanning ${domain}…` });
      void scan.start(type, pageId);
    },
    [clientId, domain, scan],
  );

  /* Unsaved-changes guard ------------------------------------------ */
  const guardRef = useRef<UnsavedGuard | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  const registerUnsavedGuard = useCallback((guard: UnsavedGuard | null) => {
    guardRef.current = guard;
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (guardRef.current?.isDirty()) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (guardRef.current?.isDirty()) {
        setPendingHref(href);
        return;
      }
      router.push(href);
    },
    [router],
  );

  const selectClient = useCallback(
    (nextClientId: string) => {
      const go = () => {
        setSelectedProjectId(nextClientId);
        scan.dismiss();
      };
      if (guardRef.current?.isDirty()) {
        setPendingHref(`__client:${nextClientId}`);
        return;
      }
      go();
    },
    [scan, setSelectedProjectId],
  );

  const resolvePending = useCallback(
    (href: string) => {
      if (href.startsWith("__client:")) {
        setSelectedProjectId(href.slice("__client:".length));
        scan.dismiss();
      } else {
        router.push(href);
      }
    },
    [router, scan, setSelectedProjectId],
  );

  const value = useMemo<WebsiteWorkspaceValue>(
    () => ({
      clientId,
      clientName,
      domain,
      websiteUrl: domain ? `https://${domain}` : null,
      hasWebsite: Boolean(domain),
      hasClient,
      clients,
      selectClient,
      scan,
      runScan,
      openIssue: setIssueId,
      openFixGuide: setFixGuideId,
      openIntegration: setIntegrationKey,
      openExport: () => setExportOpen(true),
      navigate,
      registerUnsavedGuard,
    }),
    [clientId, clientName, domain, hasClient, clients, selectClient, scan, runScan, navigate, registerUnsavedGuard],
  );

  return (
    <WebsiteWorkspaceContext.Provider value={value}>
      {children}

      <IssueDrawer
        clientId={clientId}
        issueId={issueId}
        onClose={() => setIssueId(null)}
        onOpenFixGuide={(guideId) => {
          setIssueId(null);
          setFixGuideId(guideId);
        }}
        onRescan={() => runScan("full-crawl")}
      />

      <FixGuideDialog
        guideId={fixGuideId}
        onClose={() => setFixGuideId(null)}
        onRescan={() => runScan("full-crawl")}
      />

      <IntegrationDialog
        clientId={clientId}
        domain={domain ?? ""}
        integrationKey={integrationKey}
        onClose={() => setIntegrationKey(null)}
      />

      <ExportDialog
        clientId={clientId}
        clientName={clientName}
        domain={domain ?? ""}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <UnsavedChangesDialog
        open={Boolean(pendingHref)}
        isSaving={isSaving}
        onStay={() => setPendingHref(null)}
        onDiscard={() => {
          guardRef.current?.discard();
          guardRef.current = null;
          const href = pendingHref;
          setPendingHref(null);
          if (href) resolvePending(href);
        }}
        onSaveAndLeave={() => {
          const guard = guardRef.current;
          const href = pendingHref;
          if (!guard || !href) return;
          setSaving(true);
          void guard
            .save()
            .then(() => {
              guardRef.current = null;
              setPendingHref(null);
              resolvePending(href);
            })
            .catch(() => toast.error("Could not save — your changes are still here."))
            .finally(() => setSaving(false));
        }}
      />
    </WebsiteWorkspaceContext.Provider>
  );
}
