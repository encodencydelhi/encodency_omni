"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Link as LinkIcon, RefreshCcw } from "lucide-react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { useLinkedInOverview, linkedinProvider } from "../live/linkedin-hooks";
import { integrationsApi } from "@/features/admin/integrations/live/integrations-api";
import { LinkedInLiveTab } from "./linkedin-live-tab";
import { ChannelHeader } from "./channel-header";
import { cn } from "@/lib/utils/cn";
import { LinkedInRemoteImage } from "./linkedin-remote-image";

const tabs = [
  "Overview",
  "Posts",
  "Analytics",
  "Audience",
  "Campaigns",
  "Leads",
  "Inbox",
  "Settings",
] as const;

type TabType = (typeof tabs)[number];

export function LinkedInChannelPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  
  const { companyId, clientId, isReady } = useTenancyContext();
  const enabled = isReady && Boolean(companyId) && Boolean(clientId);
  const overviewQuery = useLinkedInOverview(companyId!, clientId!, enabled);
  const linkedinStatus = linkedinProvider(overviewQuery.data);
  const isConnected = linkedinStatus?.status === "CONNECTED" || linkedinStatus?.status === "MAPPED" || linkedinStatus?.state === "connected";
  const hasMappedPage = Boolean(linkedinStatus?.mappedResourceCount);
  const showLiveConnectionState = isConnected;

  return (
    <div className="pb-8">
      {/* White Header Area */}
      <div className="-mx-4 -mt-5 mb-5 bg-white px-4 pt-5 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6 shadow-sm border-b border-[#E4EAF2]">
        <ChannelHeader
          channel="linkedin"
          connectionStatus={
            overviewQuery.isLoading
              ? { label: "Checking Status...", tone: "neutral" }
              : isConnected
                ? { label: linkedinStatus?.mappedResourceCount ? "LinkedIn Page Active" : "LinkedIn Account Active", tone: "success" }
                : { label: "Not Connected", tone: "neutral" }
          }
          onSync={() => overviewQuery.refetch()}
          onPrimaryAction={() => router.push("/admin/linkedin/create-post")}
        />
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="space-y-2">
        {showLiveConnectionState ? (
          activeTab === "Overview" || activeTab === "Settings" ? (
            <div className="space-y-1.5">
              <LinkedInPersonalOnlyState status={linkedinStatus} onRefetch={() => overviewQuery.refetch()} compact={activeTab === "Overview"} />
              {hasMappedPage && <LinkedInLiveTab tab={activeTab} />}
            </div>
          ) : hasMappedPage ? (
            <LinkedInLiveTab tab={activeTab} />
          ) : (
            <LinkedInPersonalOnlyState status={linkedinStatus} onRefetch={() => overviewQuery.refetch()} />
          )
        ) : (
          <LinkedInConnectState status={linkedinStatus} isLoading={overviewQuery.isLoading} />
        )}
      </div>
    </div>
  );
}


function Tabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  return (
    <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-semibold transition-colors",
            activeTab === tab
              ? "border-[#0A66C2] text-[#0A66C2]"
              : "border-transparent text-[#687797] hover:text-[#172044]",
          )}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
/**
 * The second LinkedIn connection: the Community Management API app (company-page posts, comments & reactions, page and
 * follower analytics, page publishing). It sits next to the member login, which keeps working as before.
 */
function LinkedInCommunityCard({ connection, resources, onRefetch }: { connection: any; resources: any[]; onRefetch?: () => void }) {
  const { companyId } = useTenancyContext();
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pagesOnIt = connection ? resources.filter((resource: any) => resource.integrationId === connection.integrationId).length : 0;
  const adminPages = Number(connection?.accountProfile?.adminPages ?? 0);

  const connect = async () => {
    try {
      setError(null);
      setBusy("connect");
      if (!companyId) throw new Error("Active Company ID is required to connect LinkedIn.");
      const { authUrl } = await integrationsApi.initLinkedInCommunityOAuth(companyId);
      window.location.href = authUrl;
    } catch (err: any) {
      setBusy(null);
      setError(err?.message || "Could not start the LinkedIn Community Management connection.");
    }
  };

  const disconnect = async () => {
    try {
      setError(null);
      setBusy("disconnect");
      if (!companyId) throw new Error("Active Company ID is required to disconnect LinkedIn.");
      await integrationsApi.disconnectLinkedInCommunity(companyId);
      onRefetch?.();
    } catch (err: any) {
      setError(err?.message || "Could not disconnect the Community Management connection.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex flex-col gap-3 border border-[#DDE4ED] bg-white px-5 py-3.5 shadow-[0_1px_3px_rgb(31_50_81/0.05)] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="size-4 text-[#0A66C2]" />
          <p className="text-[12.5px] font-bold text-[#172044]">Company page data · Community Management API</p>
          {connection ? (
            <span className="inline-flex h-5 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 text-[9.5px] font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</span>
          ) : (
            <span className="inline-flex h-5 items-center border border-amber-200 bg-amber-50 px-2 text-[9.5px] font-bold text-amber-700">Not connected</span>
          )}
        </div>
        <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#52617D]">
          {connection
            ? `Posts, comments & reactions, page analytics and followers are read with this connection. Admin of ${adminPages} company ${adminPages === 1 ? "page" : "pages"} · ${pagesOnIt} mapped ${pagesOnIt === 1 ? "page uses" : "pages use"} it. The LinkedIn login above stays as it is.`
            : "Posts, comments & reactions and page analytics need LinkedIn's Community Management API, which runs on its own LinkedIn app. Connect it with the LinkedIn account that is an admin of the company page; mapped pages switch to it automatically. The LinkedIn login above stays as it is."}
        </p>
        {error && <p className="mt-1.5 border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">{error}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {connection ? (
          <button type="button" onClick={disconnect} disabled={busy !== null} className="h-8 border border-rose-200 bg-white px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-70">
            {busy === "disconnect" ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : null}
        <button type="button" onClick={connect} disabled={busy !== null} className="inline-flex h-8 items-center gap-1.5 bg-[#0A66C2] px-3 text-[11px] font-bold text-white hover:bg-[#084e96] disabled:opacity-70">
          <LinkIcon className="size-3.5" />
          {busy === "connect" ? "Redirecting..." : connection ? "Reconnect" : "Connect Community API"}
        </button>
      </div>
    </section>
  );
}

function LinkedInPersonalOnlyState({
  status,
  onRefetch,
  compact = false,
}: {
  status: any;
  onRefetch?: () => void;
  compact?: boolean;
}) {
  const { companyId, clientId } = useTenancyContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [mappingResourceId, setMappingResourceId] = useState<string | null>(null);
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [connectError, setConnectError] = useState<string | null>(null);
  const connectedAt = status?.lastUpdatedAt ? new Date(status.lastUpdatedAt).toLocaleString() : null;
  const isCommunity = (connection: any) => connection?.accountProfile?.linkedinApp === "community";
  const memberConnection = status?.connections?.find((connection: any) => connection.accountType === "LINKEDIN_MEMBER" && !isCommunity(connection));
  const communityConnection = status?.connections?.find((connection: any) => connection.accountType === "LINKEDIN_MEMBER" && isCommunity(connection));
  // Company pages are found and mapped through the Community Management connection when there is one (it has the page permissions).
  const pageConnection = communityConnection ?? memberConnection;
  const mappedResources = Array.isArray(status?.resources) ? status.resources : [];
  const hasMappedPage = mappedResources.length > 0;
  const accountName = memberConnection?.accountName || "LinkedIn Personal Account";
  const accountEmail = memberConnection?.accountEmail || "Email not returned yet";
  const accountPictureUrl = memberConnection?.accountPictureUrl;
  const profile = memberConnection?.accountProfile || {};
  const profileRows = [
    ["Full name", profile.name || memberConnection?.accountName],
    ["First name", profile.givenName],
    ["Last name", profile.familyName],
    ["Email", profile.email || memberConnection?.accountEmail],
    ["Email verified", typeof profile.emailVerified === "boolean" ? (profile.emailVerified ? "Yes" : "No") : null],
    ["Locale", profile.locale],
    ["Member id", profile.sub || memberConnection?.externalAccountId],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);

  const handleReconnect = async () => {
    try {
      setConnectError(null);
      setIsConnecting(true);
      if (!companyId) throw new Error("Active Company ID is required to connect LinkedIn.");
      const { authUrl } = await integrationsApi.initOAuth(companyId, "LINKEDIN");
      window.location.href = authUrl;
    } catch (error: any) {
      setIsConnecting(false);
      setConnectError(error?.message || "Failed to start LinkedIn OAuth flow. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      setConnectError(null);
      setIsDisconnecting(true);
      if (!companyId) throw new Error("Active Company ID is required to disconnect LinkedIn.");
      await integrationsApi.disconnectProvider(companyId, "LINKEDIN");
      onRefetch?.();
    } catch (error: any) {
      setConnectError(error?.message || "Failed to disconnect LinkedIn. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleDiscoverPages = async () => {
    try {
      setConnectError(null);
      setIsDiscovering(true);
      const integrationId = pageConnection?.integrationId;
      if (!companyId || !integrationId) throw new Error("LinkedIn connection is required before discovering pages.");
      const pages = await integrationsApi.discoverResources(companyId, integrationId);
      setDiscoveredPages(pages.filter((page) => page.resourceType === "LINKEDIN_ORGANIZATION"));
    } catch (error: any) {
      setConnectError(error?.message || "Could not discover LinkedIn company pages. Reconnect after enabling organization permissions.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleMapPage = async (page: any) => {
    try {
      setConnectError(null);
      setMappingResourceId(page.externalResourceId);
      const integrationId = pageConnection?.integrationId;
      if (!companyId || !clientId || !integrationId) throw new Error("Company, client and LinkedIn connection are required before mapping.");
      await integrationsApi.mapResource(companyId, integrationId, {
        clientId,
        externalResourceId: page.externalResourceId,
        resourceType: "LINKEDIN_ORGANIZATION",
      });
      onRefetch?.();
    } catch (error: any) {
      setConnectError(error?.message || "Could not map this LinkedIn company page.");
    } finally {
      setMappingResourceId(null);
    }
  };

  if (compact && hasMappedPage) {
    return (
      <div className="space-y-2">
      <section className="relative flex min-h-23 flex-col gap-4 overflow-hidden border border-[#D8E1EC] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgb(31_50_81/0.05)] lg:flex-row lg:items-center lg:justify-between">
        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#0A66C2]" />
        <div className="flex min-w-0 items-center gap-5">
          {accountPictureUrl ? (
            <LinkedInRemoteImage src={accountPictureUrl} alt={accountName} width={112} height={64} className="h-16 w-28 shrink-0 scale-[1.18] object-contain object-center" loading="eager" fallback={<div className="grid size-12 shrink-0 place-items-center bg-[#0A66C2] text-[15px] font-bold text-white">in</div>} />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center bg-[#0A66C2] text-[15px] font-bold text-white">in</div>
          )}
          <span className="hidden h-11 w-px shrink-0 bg-[#E2E8F0] sm:block" />
          <div className="min-w-0 py-1">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-bold text-[#172044]">{accountName}</p><span className="inline-flex h-5 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 text-[9.5px] font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</span></div>
            <p className="mt-1 truncate text-[10.5px] font-medium text-[#64748B]">{accountEmail}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[9.5px] text-[#8A97AF]"><Building2 className="size-3 text-[#0A66C2]" />{mappedResources.length} company {mappedResources.length === 1 ? "page" : "pages"} mapped to this client</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRefetch} title="Refresh connection" className="inline-flex h-9 items-center gap-2 border border-[#D8E1EC] bg-white px-3.5 text-[10.5px] font-semibold text-[#425273] shadow-[0_1px_2px_rgb(31_50_81/0.04)] hover:border-[#B8C7DA] hover:bg-[#F8FAFC]"><RefreshCcw className="size-3.5" />Refresh</button>
          <button type="button" onClick={handleReconnect} disabled={isConnecting} className="inline-flex h-9 items-center gap-2 bg-[#0A66C2] px-3.5 text-[10.5px] font-semibold text-white shadow-[0_1px_2px_rgb(10_102_194/0.2)] hover:bg-[#084E96] disabled:opacity-60"><LinkIcon className="size-3.5" />{isConnecting ? "Redirecting..." : "Reconnect"}</button>
        </div>
        {connectError && <p className="text-[10px] font-semibold text-rose-600">{connectError}</p>}
      </section>
      <LinkedInCommunityCard connection={communityConnection} resources={mappedResources} onRefetch={onRefetch} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-[#DDE4ED] bg-white shadow-[0_1px_3px_rgb(31_50_81/0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#E4EAF2] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            {accountPictureUrl ? (
              <LinkedInRemoteImage src={accountPictureUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-sm object-cover" fallback={<div className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#0A66C2] text-white"><span className="text-[17px] font-bold">in</span></div>} />
            ) : (
              <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#0A66C2] text-white">
                <span className="text-[17px] font-bold">in</span>
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-bold text-[#111B43]">{accountName}</h2>
                <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="size-1.5 rounded-sm bg-emerald-500" />
                  Active
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">{accountEmail}</p>
              <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#52617D]">
                {hasMappedPage
                  ? "Authenticated member account used to manage and sync the LinkedIn pages mapped below."
                  : "Authenticated member account. Discover and map a company page to start syncing page data."}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#64748B]">
                <span>Connected: <strong className="text-[#172044]">{connectedAt || "Yes"}</strong></span>
                <span>Account type: <strong className="text-[#172044]">Personal profile</strong></span>
                <span>Company page mappings: <strong className="text-[#172044]">{mappedResources.length}</strong></span>
                {memberConnection?.externalAccountId && (
                  <span>LinkedIn member id: <strong className="text-[#172044]">{memberConnection.externalAccountId}</strong></span>
                )}
              </div>
              {connectError && (
                <p className="mt-2 rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                  {connectError}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="h-8 rounded-sm border border-rose-200 bg-white px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-70"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
            <button
              type="button"
              onClick={onRefetch}
              className="h-8 rounded-sm border border-[#DDE4ED] bg-white px-3 text-[11px] font-bold text-[#425273] hover:bg-[#F8FAFD]"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleDiscoverPages}
              disabled={isDiscovering}
              className="h-8 rounded-sm border border-[#BFDBFE] bg-white px-3 text-[11px] font-bold text-[#0A66C2] hover:bg-[#EFF6FF] disabled:opacity-70"
            >
              {isDiscovering ? "Discovering..." : "Discover Pages"}
            </button>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={isConnecting}
              className="h-8 rounded-sm bg-[#0A66C2] px-3 text-[11px] font-bold text-white hover:bg-[#084e96] disabled:opacity-70"
            >
              {isConnecting ? "Redirecting..." : "Reconnect"}
            </button>
          </div>
        </div>
        {profileRows.length > 0 && <div className="grid border-b border-[#E4EAF2] bg-[#F8FAFC] sm:grid-cols-2 lg:grid-cols-4">{profileRows.slice(0, 4).map(([label, value], index) => <div key={label} className={`px-5 py-3 ${index ? "border-t border-[#E4EAF2] sm:border-l sm:border-t-0" : ""}`}><p className="text-[9px] font-semibold uppercase text-[#8A97AF]">{label}</p><p className="mt-1 truncate text-[11px] font-semibold text-[#172044]" title={value}>{value}</p></div>)}</div>}
        {mappedResources.length > 0 && <div className="px-5 py-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-[12px] font-bold text-[#172044]">Mapped company pages</h3><p className="mt-0.5 text-[10px] text-[#7B89A4]">LinkedIn organizations assigned to this client</p></div><span className="text-[10px] font-semibold text-[#0A66C2]">{mappedResources.length} connected</span></div><div className="grid gap-2 md:grid-cols-2">{mappedResources.map((resource: any, index: number) => { const organizationId = String(resource.externalResourceId || "").split(":").at(-1); return <div key={resource.mappingId} className="flex min-w-0 items-center gap-3 border border-[#DDE4ED] bg-white px-3 py-3"><div className="grid size-9 shrink-0 place-items-center bg-[#EAF3FB] text-[11px] font-bold text-[#0A66C2]">in</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[11px] font-semibold text-[#172044]">Company page {index + 1}</p><span className="size-1.5 shrink-0 rounded-full bg-emerald-500" /></div><p className="mt-0.5 truncate text-[9.5px] text-[#7B89A4]">Organization ID: {organizationId}</p></div><a href={`https://www.linkedin.com/company/${organizationId}`} target="_blank" rel="noreferrer" title="Open on LinkedIn" className="grid size-8 shrink-0 place-items-center border border-[#DDE4ED] text-[#0A66C2] hover:bg-[#F2F8FD]"><ExternalLink className="size-3.5" /></a></div>; })}</div></div>}
      </section>

      <LinkedInCommunityCard connection={communityConnection} resources={mappedResources} onRefetch={onRefetch} />

      {discoveredPages.length > 0 && (
        <section className="rounded-sm border border-[#DDE4ED] bg-white p-4 shadow-sm">
          <h3 className="text-[13px] font-bold text-[#172044]">LinkedIn company pages found</h3>
          <div className="mt-3 grid gap-2">
            {discoveredPages.map((page) => (
              <div key={page.externalResourceId} className="flex items-center justify-between gap-3 rounded-sm border border-[#E4EAF2] bg-[#F8FAFD] p-3">
                <div>
                  <p className="text-[12px] font-bold text-[#172044]">{page.name}</p>
                  <p className="mt-0.5 text-[10px] text-[#64748B]">{page.externalResourceId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleMapPage(page)}
                  disabled={mappingResourceId === page.externalResourceId}
                  className="h-8 shrink-0 rounded-sm bg-[#0A66C2] px-3 text-[11px] font-bold text-white hover:bg-[#084e96] disabled:opacity-70"
                >
                  {mappingResourceId === page.externalResourceId ? "Mapping..." : "Map to Client"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasMappedPage && <section className="rounded-sm border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-[13px] font-bold text-amber-900">
          Real LinkedIn page data is blocked until a company page is mapped
        </h3>
        <p className="mt-1 text-[12px] leading-5 text-amber-800">
          The connected LinkedIn user must have admin access to a LinkedIn company page and the app must have LinkedIn organization/page permissions. A normal /in/ personal profile does not provide company-page analytics.
        </p>
      </section>}
    </div>
  );
}

/** Shown on every tab until LinkedIn is connected. Nothing is drawn before there is real data to draw. */
function LinkedInConnectState({ status, isLoading }: { status: any; isLoading?: boolean }) {
  const { companyId } = useTenancyContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnectError(null);
      setIsConnecting(true);
      if (!companyId) throw new Error("Active Company ID is required to connect LinkedIn.");
      const { authUrl } = await integrationsApi.initOAuth(companyId, "LINKEDIN");
      if (!authUrl) throw new Error("Backend did not return an authorization URL.");
      window.location.href = authUrl;
    } catch (error: any) {
      setIsConnecting(false);
      setConnectError(error?.message || "Failed to start LinkedIn OAuth flow. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="grid h-48 place-items-center text-[12px] text-[#5E6D89]">Checking LinkedIn connection...</div>;
  }

  return (
    <div className="flex flex-col items-start justify-between gap-3.5 rounded-sm border border-[#DDE4ED] bg-white p-5 shadow-xs sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#0A66C2] text-white shadow-xs">
          <span className="text-[17px] font-bold">in</span>
        </div>
        <div>
          <h3 className="text-[13.5px] font-bold text-[#111B43]">LinkedIn is not connected</h3>
          <p className="mt-0.5 max-w-xl text-[11.5px] leading-5 text-[#475569]">
            {status?.reason || "Connect LinkedIn to verify your login. Company page analytics, posts, audience and leads appear here once an organization page is mapped."}
          </p>
          {connectError && (
            <p className="mt-1 rounded-xs border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">{connectError}</p>
          )}
        </div>
      </div>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={cn(
          "flex w-full shrink-0 items-center justify-center gap-2 rounded-sm bg-[#0A66C2] px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-[#084e96] sm:w-auto",
          isConnecting && "cursor-not-allowed opacity-75",
        )}
      >
        {isConnecting ? "Redirecting to LinkedIn..." : "Connect LinkedIn"}
      </button>
    </div>
  );
}
