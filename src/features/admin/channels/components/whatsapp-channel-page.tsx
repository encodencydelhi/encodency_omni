"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChannelHeader } from "./channel-header";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { whatsappApi, type WhatsAppMessage, type WhatsAppTemplate } from "../live/whatsapp-api";
import { ConversationsTab, CreateTemplateModal, OverviewTab, SendTemplateModal, SettingsTab, TemplatesTab } from "./whatsapp-tabs/whatsapp-live-tabs";

const tabs = ["Overview", "Templates", "Messages", "Settings"] as const;
type TabType = (typeof tabs)[number];

const SUPPORT_STATE_COPY: Record<NonNullable<ProviderOverview["state"]>, string> = {
  connected: "Connected",
  disconnected: "Configured · add an enabled template",
  setup_required: "Setup required",
  unsupported: "Unsupported",
  coming_soon: "Coming soon",
  permission_required: "Permission required",
  degraded: "Configuration needs attention",
};

export function WhatsappChannelPage() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [activeModal, setActiveModal] = useState<"send-template" | "create-template" | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [providerOverview, setProviderOverview] = useState<ProviderOverview | null>(null);
  const [messageStatus, setMessageStatus] = useState<WhatsAppMessage["status"] | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (status = messageStatus) => {
    if (!isReady) return;
    if (!companyId) {
      setLoadError("Select a Company to manage WhatsApp.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      if (!clientId) {
        setProviderOverview(null);
        setTemplates([]);
        setMessages([]);
        setLoadError("Select a Client to view templates and message history. Company configuration remains available in Settings.");
        return;
      }
      const [overview, templateResult, messageResult] = await Promise.all([
        integrationsApi.getOverview(companyId, clientId),
        whatsappApi.listTemplates(companyId, clientId),
        whatsappApi.listMessages(companyId, clientId, status === "ALL" ? undefined : status),
      ]);
      setProviderOverview(overview.providers.find((provider) => provider.provider === "WHATSAPP") ?? null);
      setTemplates(templateResult.items);
      setMessages(messageResult.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load WhatsApp data.");
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, isReady, messageStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const status = providerOverview?.state;
  const tone = status === "connected" ? "success" : status === "degraded" ? "error" : status ? "warning" : "neutral";
  const enabledTemplates = templates.filter((template) => template.status === "ENABLED");

  const changeMessageStatus = (nextStatus: WhatsAppMessage["status"] | "ALL") => {
    setMessageStatus(nextStatus);
    void refresh(nextStatus);
  };

  const handleMessageDetails = async (id: string) => {
    try {
      const message = await whatsappApi.getMessage(companyId, clientId, id);
      setMessages((current) => current.map((item) => item.id === id ? message : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh message status.");
    }
  };

  return (
    <div className="pb-8">
      <div className="-mx-4 -mt-5 mb-1 border-b border-slate-200 bg-white px-4 pt-5 shadow-xs sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <ChannelHeader
          channel="whatsapp"
          customTagline="Configure AiSensy, manage Client-scoped templates and track queued delivery status."
          customAccountHandle={status === "connected" ? "AiSensy provider configured" : "Company WhatsApp configuration"}
          connectionStatus={{
            label: providerOverview ? SUPPORT_STATE_COPY[providerOverview.state] : clientId ? "Checking status" : "Select a Client",
            tone,
          }}
          onSync={() => void refresh()}
          onPrimaryAction={() => setActiveModal("send-template")}
          hideDateRange
          hideExport
          hidePrimaryAction={!clientId || enabledTemplates.length === 0}
        />
        <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-slate-200" aria-label="WhatsApp sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-bold transition-colors",
                activeTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {loadError && (
        <div className="my-3 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <span>{loadError}</span>
          <button className="font-semibold underline" onClick={() => void refresh()}>Retry</button>
        </div>
      )}

      <div className="space-y-4">
        {activeTab === "Overview" && (
          <OverviewTab
            loading={loading}
            status={providerOverview}
            templates={templates}
            messages={messages}
            onTabChange={(tab) => setActiveTab(tab as TabType)}
          />
        )}
        {activeTab === "Templates" && (
          <TemplatesTab templates={templates} loading={loading} onOpenModal={(modal) => setActiveModal(modal as "create-template" | "send-template")} />
        )}
        {activeTab === "Messages" && (
          <ConversationsTab
            messages={messages}
            templates={templates}
            loading={loading}
            status={messageStatus}
            onStatusChange={changeMessageStatus}
            onRefresh={() => void refresh()}
            onViewMessage={handleMessageDetails}
          />
        )}
        {activeTab === "Settings" && (
          <SettingsTab companyId={companyId} configured={Boolean(providerOverview?.companyConnectionAvailable)} onSaved={() => void refresh()} />
        )}
      </div>

      <CreateTemplateModal
        isOpen={activeModal === "create-template"}
        onClose={() => setActiveModal(null)}
        companyId={companyId}
        clientId={clientId}
        onSaved={() => void refresh()}
      />
      <SendTemplateModal
        isOpen={activeModal === "send-template"}
        onClose={() => setActiveModal(null)}
        companyId={companyId}
        clientId={clientId}
        templates={enabledTemplates}
        onSent={() => void refresh()}
      />
    </div>
  );
}
