"use client";
import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  Gauge,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Timer,
  UserRound,
  Wifi,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { useWebsiteCapabilities, useWebsiteSummary, useWebsiteTarget } from "../data/hooks";
import { formatRelative } from "../data/selectors";
import { integrationStatusLabel, integrationTone } from "../data/capability-provider";
import type { IntegrationKey, LiveStatus } from "../data/types";
import { Chip, WButton } from "./ui/kit";
import { NoClientSelectedState, NoWebsiteState } from "./ui/states";
import { useWebsiteWorkspace } from "./website-workspace";

const TABS: { label: string; href: string }[] = [
  { label: "Overview", href: "/admin/website" },
  { label: "Pages", href: "/admin/website/pages" },
  { label: "SEO", href: "/admin/website/seo" },
  { label: "Performance", href: "/admin/website/performance" },
  { label: "Analytics", href: "/admin/website/analytics" },
  { label: "Forms & CTAs", href: "/admin/website/forms" },
  { label: "Monitoring", href: "/admin/website/monitoring" },
  { label: "Issues", href: "/admin/website/issues" },
  { label: "Settings", href: "/admin/website/settings" },
];

const STATUS_META: Record<LiveStatus, { label: string; tone: "good" | "warn" | "bad" | "muted" }> = {
  live: { label: "Live", tone: "good" },
  degraded: { label: "Degraded", tone: "warn" },
  down: { label: "Down", tone: "bad" },
  unknown: { label: "Status unknown", tone: "muted" },
};

const INTEGRATION_SHORT: Record<IntegrationKey, string> = {
  ga4: "GA4",
  searchConsole: "Search Console",
  omniTracking: "Tracking",
  ownership: "Ownership",
};

function activeTabHref(pathname: string): string {
  const match = TABS.filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.href ?? "/admin/website";
}

function ScanBanner() {
  const { scan } = useWebsiteWorkspace();
  if (!scan.progress && !scan.error) return null;

  if (scan.error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F7CFCC] bg-[#FDECEB] px-3 py-2">
        <p className="text-[11.5px] font-medium text-[#C0261F]">Scan failed — {scan.error.message}</p>
        <WButton size="sm" onClick={scan.dismiss}>
          Dismiss
        </WButton>
      </div>
    );
  }

  const progress = scan.progress;
  if (!progress) return null;
  const done = progress.status === "completed";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        done ? "border-[#BDE8D6] bg-[#E6F6EF]" : "border-[#C9DDFA] bg-[#EFF5FE]",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-[11.5px] font-semibold", done ? "text-[#0B7A55]" : "text-[#1D4ED8]")}>
          {done ? "Scan complete" : progress.stage}
          <span className="ml-2 font-normal text-[#5B6B85]">
            {progress.pagesScanned} page{progress.pagesScanned === 1 ? "" : "s"} · {progress.progress}%
          </span>
        </p>
        <WButton
          size="sm"
          onClick={() => {
            // Stopping the banner mid-run stops the scan; saying "hide" would
            // imply it carries on in the background, which it does not.
            if (!done) toast.info("Scan cancelled", { description: "No results were recorded." });
            scan.dismiss();
          }}
        >
          {done ? "Dismiss" : "Cancel scan"}
        </WButton>
      </div>
      <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/70">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-300", done ? "bg-[#12A06D]" : "bg-[#2563EB]")}
          style={{ width: `${progress.progress}%` }}
        />
      </span>
    </div>
  );
}

// function ClientSwitcher() {
//   const { clients, clientId, clientName, selectClient } = useWebsiteWorkspace();
//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <button
//           type="button"
//           className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#DAE1EC] bg-white px-2 text-[11.5px] font-semibold text-[#28354C] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
//         >
//           <UserRound className="size-3.5 text-[#6B7A94]" aria-hidden />
//           <span className="text-[#6B7A94]">Client:</span>
//           {clientName || "Select"}
//           <ChevronDown className="size-3 text-[#94A3B8]" aria-hidden />
//         </button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="start" className="w-60">
//         <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
//           Client website
//         </DropdownMenuLabel>
//         {clients.map((client) => (
//           <DropdownMenuItem
//             key={client.id}
//             onSelect={() => selectClient(client.id)}
//             className="flex cursor-pointer items-center justify-between gap-2 text-[12px]"
//           >
//             <span className="min-w-0">
//               <span className="block truncate font-medium">{client.name}</span>
//               <span className="block truncate text-[10.5px] text-[#94A3B8]">
//                 {client.domain ?? "No website URL"}
//               </span>
//             </span>
//             {client.id === clientId ? <Chip tone="info">Active</Chip> : null}
//           </DropdownMenuItem>
//         ))}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

function WebsiteHeader() {
  const { clientId, domain, websiteUrl, hasWebsite, runScan, openExport, openIntegration, navigate, scan } =
    useWebsiteWorkspace();
  const { data: target } = useWebsiteTarget(clientId, hasWebsite);
  const { data: capabilities } = useWebsiteCapabilities(clientId, hasWebsite);
  const { data: summary } = useWebsiteSummary(clientId, hasWebsite);
  const status = STATUS_META[target?.status ?? "unknown"];

  return (
    <header className="space-y-2.5 pt-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* The module mark carries its own background, so it sits on the
              white header rather than inside a tinted tile. */}
          <Image
            src="/website-logo.png"
            alt=""
            width={96}
            height={96}
            priority
            className="-mt-1 size-14 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0F1A38]">Website</h1>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {hasWebsite && websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded text-[12.5px] font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                >
                  {domain}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : (
                <span className="text-[12.5px] font-semibold text-[#94A3B8]">No website URL</span>
              )}
              <Chip tone={status.tone} dot>
                {status.label}
              </Chip>
              {target ? (
                <>
                  <Chip tone={target.https ? "good" : "bad"} icon={target.https ? Lock : ShieldAlert}>
                    {target.https ? "HTTPS" : "No HTTPS"}
                  </Chip>
                  <Chip tone={target.verified ? "good" : "muted"} icon={target.verified ? ShieldCheck : ShieldAlert}>
                    {target.verified ? "Ownership verified" : "Not verified"}
                  </Chip>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#6B7A94]">
                    <Timer className="size-3" aria-hidden />
                    Last scan {formatRelative(target.lastScannedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#6B7A94]">
                    <RefreshCw className="size-3" aria-hidden />
                    Next scan {formatRelative(target.nextScanAt)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <WButton
            tone="primary"
            icon={RefreshCw}
            disabled={!hasWebsite || scan.isRunning}
            disabledReason={!hasWebsite ? "This client has no website URL" : "A scan is already running"}
            onClick={() => runScan("full-crawl")}
          >
            {scan.isRunning ? "Scanning…" : "Scan now"}
          </WButton>
          <WButton
            icon={ExternalLink}
            disabled={!websiteUrl}
            disabledReason="This client has no website URL"
            onClick={() => websiteUrl && window.open(websiteUrl, "_blank", "noopener,noreferrer")}
          >
            Open website
          </WButton>
          <WButton
            icon={Download}
            disabled={!hasWebsite}
            disabledReason="This client has no website URL"
            onClick={openExport}
          >
            Export report
          </WButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More website actions"
                className="grid h-8.5 w-8.5 cursor-pointer place-items-center rounded-md border border-[#DAE1EC] bg-white text-[#4A5A73] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                Run a scan
              </DropdownMenuLabel>
              <DropdownMenuItem disabled={!hasWebsite} onSelect={() => runScan("seo-audit")} className="text-[12px]">
                <Search className="size-3.5" /> SEO audit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasWebsite} onSelect={() => runScan("performance")} className="text-[12px]">
                <Gauge className="size-3.5" /> Performance audit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasWebsite} onSelect={() => runScan("uptime")} className="text-[12px]">
                <Wifi className="size-3.5" /> Uptime check
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!hasWebsite}
                onSelect={() => openIntegration("ownership")}
                className="text-[12px]"
              >
                <ShieldCheck className="size-3.5" /> Re-verify ownership
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/admin/website/settings")} className="text-[12px]">
                <Settings2 className="size-3.5" /> Website settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/admin/projects")} className="text-[12px]">
                <UserRound className="size-3.5" /> Open client profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Integration strip — always visible, always honest about what is off. */}
      {hasWebsite ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
            Integrations
          </span>
          {(["ga4", "searchConsole", "omniTracking"] as IntegrationKey[]).map((key) => {
            const integration = capabilities?.integrations[key];
            const tone = integration ? integrationTone(integration.status) : "muted";
            return (
              <button
                key={key}
                type="button"
                onClick={() => openIntegration(key)}
                className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
              >
                <Chip tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "muted"} dot>
                  {INTEGRATION_SHORT[key]} ·{" "}
                  {integration ? integrationStatusLabel(integration.status) : "Checking…"}
                </Chip>
              </button>
            );
          })}
          {summary ? (
            <span className="ml-auto text-[11px] text-[#6B7A94]">
              {summary.pagesDiscovered} pages · {summary.openIssues} open issues ·{" "}
              <b className="font-semibold text-[#C0261F]">{summary.criticalIssues} critical</b>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="pt-0.5">
        <ScanBanner />
      </div>
    </header>
  );
}

function TabBar() {
  const pathname = usePathname();
  const { navigate, clientId, hasWebsite } = useWebsiteWorkspace();
  const active = activeTabHref(pathname ?? "/admin/website");
  const { data: summary } = useWebsiteSummary(clientId, hasWebsite);

  return (
    <nav aria-label="Website sections" className="scrollbar-thin -mb-px flex gap-5 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        const count = tab.href === "/admin/website/issues" ? summary?.openIssues : undefined;
        return (
          <button
            key={tab.href}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => navigate(tab.href)}
            className={cn(
              "shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2 text-[12px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
              isActive
                ? "border-[#2563EB] text-[#1D4ED8]"
                : "border-transparent text-[#64748B] hover:text-[#28354C]",
            )}
          >
            {tab.label}
            {count !== undefined && count > 0 ? (
              <span
                className={cn(
                  "ml-1.5 rounded px-1 py-px text-[9.5px]",
                  isActive ? "bg-[#EAF2FE] text-[#1D4ED8]" : "bg-[#F1F4F9] text-[#64748B]",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Wraps a Website screen. Handles the two states where no screen can render:
 * no client selected, and a client with no website URL.
 */
export function WebsiteShell({ children }: { children: ReactNode }) {
  const { hasClient, hasWebsite, clientName, navigate } = useWebsiteWorkspace();

  return (
    <div className="pb-6">
      <div className="-mx-4 -mt-5 mb-1 border-b border-[#E3E9F2] bg-gradient-to-b from-[#FCFDFF] via-white to-[#FAFCFF] px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <WebsiteHeader />
        <div className="mt-2.5 border-t border-[#EEF2F8] pt-2.5">
          <TabBar />
        </div>
      </div>

      {!hasClient ? (
        <NoClientSelectedState />
      ) : !hasWebsite ? (
        <NoWebsiteState clientName={clientName} onOpenClientProfile={() => navigate("/admin/projects")} />
      ) : (
        children
      )}
    </div>
  );
}

export { TABS as WEBSITE_TABS };
