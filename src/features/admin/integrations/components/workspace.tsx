"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, ChevronRight, Download, Plug, Plus, RefreshCw, ServerOff, Settings as SettingsIcon, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { intRoutes } from "../integrations-data/config";
import { useClientScope, useScopedData } from "../integrations-data/hooks";
import { ALL_CLIENTS, clientName, downloadFile, isActive, toCsv } from "../integrations-data/selectors";
import { syncCapability } from "../integrations-data/capability-provider";
import { useIntegrations } from "../store/integrations-store";
import { ConnectFlow } from "./connect-flow";
import { SyncAllDialog } from "./dialogs";
import { ActionMenu, Button, Card, EmptyState, SelectMenu, buttonClass, x } from "./ui";

const TABS = [
  { key: "overview", label: "Overview", href: intRoutes.overview },
  { key: "connected", label: "Connected", href: intRoutes.connected },
  { key: "available", label: "Available", href: intRoutes.available },
  { key: "activity", label: "Activity", href: intRoutes.activity },
  { key: "settings", label: "Settings", href: intRoutes.settings },
] as const;

function activeTab(pathname: string) {
  if (pathname === intRoutes.overview) return "overview";
  const match = TABS.find((tab) => tab.key !== "overview" && pathname.startsWith(tab.href));
  // Detail pages sit under Connected.
  return match?.key ?? "connected";
}

export function IntegrationsWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? intRoutes.overview;
  const tab = activeTab(pathname);
  const { serviceError, simulation, retryLoad } = useIntegrations();
  const isDetail = !TABS.some((item) => item.href === pathname);

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F6F8FB] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-3">
        <Header tab={tab} isDetail={isDetail} />
        <Tabs active={tab} />
        <main className="min-w-0">
          {serviceError ? (
            <Card>
              <EmptyState
                icon={ServerOff}
                title="Unable to load integrations"
                description={
                  <>
                    {serviceError.message}
                    <span className="mt-2 block text-[12px] text-[#98A2B3]">{serviceError.hint}</span>
                  </>
                }
                action={<Button variant="primary" icon={RefreshCw} onClick={retryLoad}>Retry</Button>}
                secondary={<Button variant="secondary" href="/admin">Back to dashboard</Button>}
              />
            </Card>
          ) : simulation.loadError ? (
            <Card>
              <EmptyState
                icon={AlertTriangle}
                title="Connection data unavailable"
                description="OmniPlatform couldn't load connection data. Your integrations keep running — only this view is affected."
                action={<Button variant="primary" icon={RefreshCw} onClick={retryLoad}>Retry</Button>}
                secondary={<Button variant="secondary" href={intRoutes.settings}>Open settings</Button>}
              />
            </Card>
          ) : (
            children
          )}
        </main>
      </div>
      <ConnectFlow />
      <UnsavedChangesDialog />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header({ tab, isDetail }: { tab: string; isDetail: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data, can, ready, syncJobs } = useIntegrations();
  const { clientId, label, withScope } = useClientScope();
  const { connections } = useScopedData();
  const [syncAllOpen, setSyncAllOpen] = useState(false);

  // Only connections that can actually sync are offered to Sync All.
  const syncable = useMemo(
    () => connections.filter((connection) => isActive(connection) && syncCapability(connection, can.canSync, Boolean(syncJobs[connection.id])).allowed).map((connection) => connection.id),
    [connections, can.canSync, syncJobs],
  );

  const setClient = (value: string) => {
    const next = new URLSearchParams(params?.toString());
    if (value === ALL_CLIENTS) next.delete("client");
    else next.set("client", value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : (pathname ?? intRoutes.overview), { scroll: false });
  };

  const openConnect = () => {
    const next = new URLSearchParams(params?.toString());
    next.set("connect", "1");
    if (clientId !== ALL_CLIENTS) next.set("for", clientId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const exportConnections = () => {
    const rows = connections.map((connection) => ({
      integration: data.providers.find((provider) => provider.id === connection.providerId)?.name ?? connection.providerId,
      account: connection.accountName,
      client: clientName(data.clients, connection.clientId),
      status: connection.status,
      last_sync: connection.lastSyncAt ?? "",
      next_sync: connection.nextSyncAt ?? "",
      resources: connection.resources.map((resource) => resource.name).join(" | "),
      connected_by: connection.connectedBy,
      connected_at: connection.connectedAt,
    }));
    downloadFile(`integrations-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  };

  const tabLabel = TABS.find((item) => item.key === tab)?.label ?? "Overview";

  return (
    <header className="flex flex-col gap-2.5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#6B7890]">
        <span>Management</span>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <Link href={withScope(intRoutes.overview)} className={cn("rounded hover:text-[#0F1B3D]", x.focus)}>
          Integrations
        </Link>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <span aria-current="page" className="font-semibold text-[#0F1B3D]">
          {isDetail ? "Integration details" : tabLabel}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[#0F1B3D] text-white shadow-[0_2px_8px_rgba(15,27,61,0.2)]">
            <Plug className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.015em] text-[#0F1B3D]">
              Integrations
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-4 text-[#6B7890]">Connect and manage external services used by your organization and clients.</p>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:justify-end">
          <SelectMenu
            label="Client"
            icon={Users}
            size="md"
            align="end"
            value={clientId}
            onChange={setClient}
            disabled={!ready}
            options={[{ value: ALL_CLIENTS, label: "All clients" }, ...data.clients.map((client) => ({ value: client.id, label: client.name }))]}
            className="h-9 min-w-[170px]"
          />
          <Button variant="secondary" icon={Activity} href={withScope(intRoutes.activity)} className="h-9 max-sm:hidden">
            View activity
          </Button>
          <Button
            variant="secondary"
            icon={RefreshCw}
            className="h-9"
            disabled={!ready || syncable.length === 0}
            disabledReason={!ready ? "Still loading integrations." : `Nothing in ${label} can be synced right now.`}
            gate={ready ? can.canSync : undefined}
            onClick={() => setSyncAllOpen(true)}
          >
            Sync all
          </Button>
          <Button variant="primary" icon={Plus} className="h-9" gate={ready ? can.canConnect : undefined} disabled={!ready} disabledReason="Still loading integrations." onClick={openConnect}>
            Connect integration
          </Button>
          <ActionMenu
            label="More integration actions"
            width={220}
            trigger={
              <button type="button" className={buttonClass("secondary", "icon", "size-9")}>
                <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">⋯</span>
              </button>
            }
            items={[
              { label: "Export connections (CSV)", icon: Download, onSelect: exportConnections, disabledReason: connections.length ? undefined : "No connections in this view." },
              { label: "View activity", icon: Activity, href: withScope(intRoutes.activity) },
              { label: "Integration settings", icon: SettingsIcon, href: withScope(intRoutes.settings) },
              { label: "Browse available", icon: Plug, href: withScope(intRoutes.available) },
            ]}
          />
        </div>
      </div>

      <SyncAllDialog open={syncAllOpen} onOpenChange={setSyncAllOpen} connectionIds={syncable} scopeLabel={label} />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function Tabs({ active }: { active: string }) {
  const { ready } = useIntegrations();
  const { withScope } = useClientScope();
  const { summary, issues } = useScopedData();

  return (
    <nav aria-label="Integration sections" className="scrollbar-thin -mb-px flex gap-0.5 overflow-x-auto border-b border-[#E4E9F0]">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={withScope(tab.href)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1.5 text-[13px] font-semibold transition-colors",
              isActive ? "border-[#2563EB] text-[#0F1B3D]" : "border-transparent text-[#6B7890] hover:border-[#D0D7E2] hover:text-[#0F1B3D]",
              x.focus,
            )}
          >
            {tab.label}
            {ready && tab.key === "overview" && issues.length > 0 && (
              <span className="rounded-sm bg-[#FEF1F2] px-1.5 text-[10.5px] font-bold leading-4 tabular-nums text-[#C81E2B]" title={`${issues.length} need attention`}>
                {issues.length}
              </span>
            )}
            {ready && tab.key === "connected" && (
              <span className="rounded-sm bg-[#F1F4F8] px-1.5 text-[10.5px] font-bold leading-4 tabular-nums text-[#6B7890]">{summary.connected + summary.needsAttention}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Unsaved changes                                                     */
/* ------------------------------------------------------------------ */

function UnsavedChangesDialog() {
  const { guardRef, registerGuard } = useIntegrations();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<{ href: string; label?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!guardRef.current?.dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === pathname && url.hash)) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({ href: `${url.pathname}${url.search}${url.hash}`, label: guardRef.current.label });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [guardRef, pathname]);

  const leave = (href: string) => {
    registerGuard(null);
    setPending(null);
    router.push(href);
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && !saving && setPending(null)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[420px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#FFF7E8] text-[#B54708]">
              <AlertTriangle className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] leading-5 text-[#0F1B3D]">You have unsaved changes</DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
                {pending?.label ? `Your changes to ${pending.label} haven't been saved.` : "Your changes haven't been saved."} If you leave now they&apos;ll be lost.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-5 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="ghost" onClick={() => setPending(null)} disabled={saving}>
            Stay
          </Button>
          <Button variant="danger" onClick={() => pending && leave(pending.href)} disabled={saving}>
            Discard
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={async () => {
              const target = pending?.href;
              const save = guardRef.current?.save;
              if (!target || !save) return;
              setSaving(true);
              const ok = await save();
              setSaving(false);
              if (ok) leave(target);
              else setPending(null);
            }}
          >
            Save &amp; leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
