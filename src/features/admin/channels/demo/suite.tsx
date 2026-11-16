"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelHeader } from "../components/channel-header";
import { DraftRecovery, useCreationWorkspace } from "./creation-session";
import { useWhatsAppWorkspaceContext } from "./workspace-context";
import { Reports } from "./reports";
import { NativeBilling, NativeConnectionPanel, SimulationConnectionButton } from "./native-operations";
import { WhatsAppOverviewInsights } from "../components/whatsapp-tabs/whatsapp-overview-insights";
import { overviewDemo } from "./overview-data";
import { Campaigns, Templates } from "./marketing-lists";
import { Contacts, Inbox, Messages } from "./conversations";
import { Automations, Flows } from "./builders";
import { MediaLibrary, Billing, Settings } from "./operations";
import { WhatsAppAIAssistant } from "./ai-assistant";
import { WorkspaceAccess, useWorkspaceAccess } from "./workspace-access";
import { recoveryWarnings } from "./mock-service";
import { applyAIProposal, type AIProposal } from "./ai-model";

const tabs = ["Overview", "Team Inbox", "Campaigns", "Templates", "Contacts", "Messages", "Automations", "WhatsApp Flows", "Media Library", "Analytics", "Billing & Usage", "Settings & Connections"] as const;
type Tab = (typeof tabs)[number];

export function WhatsAppDemoSuite({ onProvider, initialSection }: { onProvider: () => void; initialSection?: string }) {
  const { scope, accountHandle, isReady, companyId, clientId, access } = useWhatsAppWorkspaceContext();
  const [activeTab, setActiveTab] = useState<Tab>(tabs.find(tab => tab === initialSection) || "Overview");
  return <WorkspaceAccess value={access}><DraftRecovery scope={scope}><WorkspaceView key={scope} scope={scope} accountHandle={accountHandle} ready={isReady} hasCompany={Boolean(companyId)} hasClient={Boolean(clientId)} activeTab={activeTab} onTabChange={setActiveTab} onProvider={onProvider} /></DraftRecovery></WorkspaceAccess>;
}

function WorkspaceView({ scope, accountHandle, ready, hasCompany, hasClient, activeTab, onTabChange, onProvider }: {
  scope: string; accountHandle: string; ready: boolean; hasCompany: boolean; hasClient: boolean;
  activeTab: Tab; onTabChange: (tab: Tab) => void; onProvider: () => void;
}) {
  const { data, update, isNative, envelope, action } = useCreationWorkspace(scope);
  const access = useWorkspaceAccess();
  const [query, setQuery] = useState("");
  const [aiRevision, setAiRevision] = useState(0);
  const [aiContactId, setAiContactId] = useState("");
  const applyAI = async (proposal: AIProposal) => {
    if(!await update(current => applyAIProposal(current, proposal)))return false;
    const target: Partial<Record<AIProposal["kind"], Tab>> = { template: "Templates", campaign: "Campaigns", reply: "Team Inbox", workflow: "Automations", flow: "WhatsApp Flows", profile: "Settings & Connections" };
    const nextTab = target[proposal.kind];
    if (proposal.kind === "reply") setAiContactId(proposal.contactId);
    if (nextTab) onTabChange(nextTab);
    setAiRevision(value => value + 1);
    return true;
  };
  const hasSearch = !["Overview", "Analytics", "Billing & Usage", "Settings & Connections"].includes(activeTab);

  return <div className="min-w-0 bg-white pb-8 text-slate-800 [color-scheme:light]">
    <div className="-mx-4 -mt-5 mb-1 border-b border-slate-200 bg-white px-4 pt-5 shadow-xs sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <ChannelHeader channel="whatsapp" customTagline="Manage WhatsApp Business conversations, campaigns, templates, contacts and analytics." customAccountHandle={accountHandle} connectionStatus={{ label: isNative?`${envelope?.origin||"SIMULATED"} · ${envelope?.connection.status||"Disconnected"}`:"Demo Preview · Meta Not Connected", tone: "warning" }} hideDateRange hideExport hidePrimaryAction disableSync syncLabel="Coming After Meta Integration" extraActions={<WhatsAppAIAssistant key={`${scope}:${activeTab}`} area={activeTab} scope={scope} data={data} onApply={applyAI} disabled={!ready || !hasCompany || !hasClient} readOnly={!access.canEdit||(!access.canManage&&activeTab!=="Team Inbox")} />} />
      <nav aria-label="WhatsApp Sections" className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-slate-200">
        {tabs.map(tab => <button key={tab} aria-current={activeTab === tab ? "page" : undefined} onClick={() => { onTabChange(tab); setQuery(""); }} className={`shrink-0 border-b-2 pb-2.5 text-[12.5px] font-bold transition-colors ${activeTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{tab}</button>)}
      </nav>
    </div>
    <div className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p>{isNative ? envelope?.origin==="SIMULATED" ? <><strong>SIMULATED WhatsApp.</strong> Records Are Saved. No Real WhatsApp Messages Or Charges.</> : <><strong>Native WhatsApp.</strong> Sending Requires An Active Client Connection And Explicit Authorization.</> : <><strong>Demo Information Only.</strong> No Real Messages, Connections Or Charges. Changes Are Local Demo Drafts.</>}</p>
      <Button size="xs" variant="outline" onClick={onProvider}>Existing Provider Workspace</Button>
    </div>
    {isNative&&envelope?.connection.status!=="ACTIVE"&&<div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs"><p>{envelope?.origin==="SIMULATED"?"Activate This Client’s Simulated Connection To Test Sending And Campaigns.":"This Client’s WhatsApp Connection Requires Setup Or Activation."}</p>{envelope?.access.canConfigure&&envelope.mode==="MOCK"&&<SimulationConnectionButton action={action}/>}</div>}
    {recoveryWarnings.get(scope) && <p role="status" className="mb-2 text-xs text-amber-700">{recoveryWarnings.get(scope)}</p>}
    {!ready ? <div role="status" className="space-y-2"><p className="text-xs text-slate-500">Loading WhatsApp Workspace...</p><div className="h-24 animate-pulse rounded-lg bg-slate-100" /></div>
      : !hasCompany || !hasClient ? <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{hasCompany ? "Select A Client From The Sidebar To View WhatsApp." : "Select Your Company In The Existing Workspace To Continue."}</div>
      : <>
        {hasSearch && <div className="mb-2 flex justify-end"><Input className="h-8 w-full sm:w-64" aria-label={`Search ${activeTab}`} placeholder={`Search ${activeTab}…`} value={query} onChange={event => setQuery(event.target.value)} /></div>}
        <div className="mt-2">
          {activeTab === "Overview" && <WhatsAppOverviewInsights overviewAnalytics={null} status={null} templates={[]} messages={[]} loading={false} nativeScope={isNative?scope:undefined} demoAnalytics={isNative?undefined:query => overviewDemo(data, scope, query)} onTabChange={next => { const tab = tabs.find(tab => tab === next); if (tab) onTabChange(tab); }} />}
          {activeTab === "Analytics" && <Reports data={data} scope={scope} analytics />}
          {activeTab === "Team Inbox" && <Inbox key={aiRevision} data={data} update={update} query={query} initialContactId={aiContactId} scope={scope} />}
          {activeTab === "Campaigns" && <Campaigns scope={scope} data={data} query={query} />}
          {activeTab === "Templates" && <Templates scope={scope} data={data} query={query} />}
          {activeTab === "Contacts" && <Contacts scope={scope} data={data} update={update} query={query} />}
          {activeTab === "Messages" && <Messages scope={scope} data={data} query={query} />}
          {activeTab === "Automations" && <fieldset disabled={!access.canManage} className="min-w-0"><Automations scope={scope} key={aiRevision} data={data} update={update} query={query} /></fieldset>}
          {activeTab === "WhatsApp Flows" && <fieldset disabled={!access.canManage} className="min-w-0"><Flows scope={scope} key={aiRevision} data={data} update={update} query={query} /></fieldset>}
          {activeTab === "Media Library" && <MediaLibrary data={data} update={update} query={query} />}
          {activeTab === "Billing & Usage" && (isNative?<NativeBilling scope={scope} data={data} update={update}/>:<Billing data={data} update={update} />)}
          {activeTab === "Settings & Connections" && <>{isNative&&<NativeConnectionPanel scope={scope}/>}<fieldset disabled={!(access.canConfigure??access.canManage)} className="min-w-0"><Settings key={aiRevision} data={data} update={update} native={isNative}/></fieldset></>}
        </div>
      </>}
  </div>;
}
