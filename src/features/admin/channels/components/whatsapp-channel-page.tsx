"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChannelHeader } from "./channel-header";
import { ClientScopeSelect } from "./client-scope-select";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { whatsappApi, type WhatsAppMessage, type WhatsAppMessageStatus } from "../live/whatsapp-api";
import {
  useWhatsAppCampaigns,
  useWhatsAppConfig,
  useWhatsAppContacts,
  useWhatsAppMessages,
  useWhatsAppOverview,
  useWhatsAppOverviewAnalytics,
  useWhatsAppTemplateAnalytics,
  useWhatsAppTemplates,
  useWhatsAppWebhookHealth,
  useSyncWhatsAppTemplates,
  whatsappKeys,
} from "../live/whatsapp-hooks";
import {
  CampaignsTab,
  ContactsTab,
  ConversationsTab,
  CreateCampaignModal,
  CreateTemplateModal,
  OverviewTab,
  SendTemplateModal,
  SettingsTab,
  TemplatesTab,
} from "./whatsapp-tabs/whatsapp-live-tabs";

const tabs = ["Overview", "Campaigns", "Templates", "Contacts", "Messages", "Settings"] as const;
type TabType = (typeof tabs)[number];

const SUPPORT_STATE_COPY: Record<NonNullable<ProviderOverview["state"]>, string> = {
  connected: "Connected",
  disconnected: "Connected · Ready (Add Template to Send)",
  setup_required: "Setup required",
  unsupported: "Unsupported",
  coming_soon: "Coming soon",
  permission_required: "Permission required",
  degraded: "Configuration needs attention",
};

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function WhatsappChannelPage() {
  const { companyId, clientId, setClientId, isReady } = useTenancyContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [activeModal, setActiveModal] = useState<"send-template" | "create-template" | "create-campaign" | null>(null);
  const [messageStatus, setMessageStatus] = useState<WhatsAppMessageStatus | "ALL">("ALL");

  const hasCompany = isReady && Boolean(companyId);
  const hasClient = hasCompany && Boolean(clientId);

  // Each endpoint is its own query: a failure in one tab never blanks the others,
  // and the Company-scoped Settings tab works before a Client is selected.
  const configQuery = useWhatsAppConfig(companyId, hasCompany);
  const overviewQuery = useWhatsAppOverview(companyId, clientId, hasClient);
  const overviewAnalyticsQuery = useWhatsAppOverviewAnalytics(companyId, clientId, hasClient);
  const campaignsQuery = useWhatsAppCampaigns(companyId, clientId, hasClient);
  const templatesQuery = useWhatsAppTemplates(companyId, clientId, hasClient);
  const templateAnalyticsQuery = useWhatsAppTemplateAnalytics(companyId, clientId, hasClient);
  const contactsQuery = useWhatsAppContacts(companyId, clientId, hasClient);
  const messagesQuery = useWhatsAppMessages(companyId, clientId, messageStatus, hasClient);
  const webhookHealthQuery = useWhatsAppWebhookHealth(companyId, clientId, hasClient);

  const config = configQuery.data ?? null;
  const providerOverview = overviewQuery.data ?? null;
  const overviewAnalytics = overviewAnalyticsQuery.data ?? null;
  const campaigns = campaignsQuery.data?.items ?? [];
  const rawTemplates = templatesQuery.data?.items ?? [];
  const templateAnalytics = templateAnalyticsQuery.data?.items ?? [];
  const contacts = contactsQuery.data?.items ?? [];
  const messages = messagesQuery.data?.items ?? [];
  const webhookHealth = webhookHealthQuery.data ?? null;
  const enabledTemplates = rawTemplates.filter((template) => template.status === "ENABLED");

  const syncTemplatesMutation = useSyncWhatsAppTemplates();

  const refetchAll = () => {
    void configQuery.refetch();
    void overviewQuery.refetch();
    void overviewAnalyticsQuery.refetch();
    void campaignsQuery.refetch();
    void templatesQuery.refetch();
    void templateAnalyticsQuery.refetch();
    void contactsQuery.refetch();
    void messagesQuery.refetch();
    void webhookHealthQuery.refetch();
  };

  const handleSyncLive = async () => {
    refetchAll();
    if (companyId && clientId) {
      try {
        const res = await syncTemplatesMutation.mutateAsync({ companyId, clientId });
        if (res.synced > 0) {
          toast.success("Live Sync Complete", {
            description: `Synced ${res.synced} approved template(s) from AiSensy.`,
          });
        }
      } catch {
        // refetchAll already triggered
      }
    }
  };

  // Informational states the user resolves by picking a scope — never a retry target.
  const scopeNotice = !isReady
    ? null
    : !companyId
      ? "Select a Company to manage WhatsApp."
      : !clientId
        ? "Select a Client to view templates, campaigns, contacts, and message history. Company configuration remains available in Settings."
        : null;

  const scopeError = !isReady
    ? null
    : !companyId || configQuery.error
      ? configQuery.error
        ? errorText(configQuery.error, "Unable to load the WhatsApp configuration.")
        : null
      : !clientId
        ? null
        : overviewQuery.error
          ? errorText(overviewQuery.error, "Unable to load the channel overview.")
          : templatesQuery.error
            ? errorText(templatesQuery.error, "Unable to load templates.")
            : messagesQuery.error
              ? errorText(messagesQuery.error, "Unable to load message history.")
              : null;

  const status = providerOverview?.state;

  const changeMessageStatus = (nextStatus: WhatsAppMessageStatus | "ALL") => {
    setMessageStatus(nextStatus);
  };

  const handleMessageDetails = async (id: string) => {
    if (!companyId || !clientId) return;
    try {
      const message = await whatsappApi.getMessage(companyId, clientId, id);
      const key = whatsappKeys.messages(companyId, clientId, messageStatus);
      queryClient.setQueryData<{ items: WhatsAppMessage[] }>(key, (current) =>
        current ? { items: current.items.map((item) => (item.id === id ? message : item)) } : current,
      );
    } catch (error) {
      toast.error(errorText(error, "Unable to refresh message status."));
    }
  };

  const connectionLabel = !companyId
    ? "Select a Company"
    : config && !config.configured
      ? "Setup required"
      : providerOverview
        ? SUPPORT_STATE_COPY[providerOverview.state]
        : config?.configured
          ? "Configured · select a Client"
          : clientId
            ? "Checking status"
            : "Select a Client";
  const connectionTone =
    config && !config.configured
      ? "warning"
      : status === "connected" || (status === "disconnected" && Boolean(config?.configured))
        ? "success"
        : status === "degraded"
          ? "error"
          : status
            ? "warning"
            : "neutral";

  return (
    <div className="pb-8 capitalize">
      <div className="-mx-4 -mt-5 mb-1 border-b border-slate-200 bg-white px-4 pt-5 shadow-xs sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <ChannelHeader
          channel="whatsapp"
          customTagline="Configure AiSensy, manage Client campaigns, templates, contacts, and track queued delivery status."
          customAccountHandle={
            config?.configured
              ? config.displayName
                ? `${config.displayName} · AiSensy`
                : "AiSensy provider configured"
              : "Company WhatsApp configuration"
          }
          connectionStatus={{ label: connectionLabel, tone: connectionTone }}
          onSync={handleSyncLive}
          onPrimaryAction={() => setActiveModal("send-template")}
          hideDateRange
          hideExport
          hidePrimaryAction={!clientId || enabledTemplates.length === 0}
        />
        <nav
          className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-slate-200"
          aria-label="WhatsApp sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-bold transition-colors",
                activeTab === tab
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-900",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {scopeNotice && (
        <div className="my-3 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" role="status">
          <p>{scopeNotice}</p>
          {isReady && companyId && !clientId && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Client
                <span className="ml-2 inline-block align-middle">
                  <ClientScopeSelect companyId={companyId} onSelect={setClientId} />
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {scopeError && (
        <div
          className="my-3 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <span>{scopeError}</span>
          <button className="font-semibold underline" onClick={refetchAll}>
            Retry
          </button>
        </div>
      )}

      <div className="space-y-4">
        {activeTab === "Overview" && (
          <OverviewTab
            loading={overviewQuery.isLoading || templatesQuery.isLoading || messagesQuery.isLoading || overviewAnalyticsQuery.isLoading}
            error={
              overviewQuery.error
                ? errorText(overviewQuery.error, "Unable to load the channel overview.")
                : overviewAnalyticsQuery.error
                  ? errorText(overviewAnalyticsQuery.error, "Unable to load overview analytics.")
                  : null
            }
            onRetry={() => {
              void overviewQuery.refetch();
              void overviewAnalyticsQuery.refetch();
            }}
            status={providerOverview}
            templates={rawTemplates}
            messages={messages}
            overviewAnalytics={overviewAnalytics}
            onTabChange={(tab) => setActiveTab(tab as TabType)}
            companyId={companyId}
            clientId={clientId}
          />
        )}
        {activeTab === "Campaigns" && (
          <CampaignsTab
            campaigns={campaigns}
            loading={campaignsQuery.isLoading}
            error={campaignsQuery.error ? errorText(campaignsQuery.error, "Unable to load campaigns.") : null}
            onRetry={() => void campaignsQuery.refetch()}
            onOpenModal={(modal) => setActiveModal(modal as any)}
          />
        )}
        {activeTab === "Templates" && (
          <TemplatesTab
            companyId={companyId}
            clientId={clientId}
            templates={templateAnalytics}
            loading={templateAnalyticsQuery.isLoading || templatesQuery.isLoading}
            error={
              templateAnalyticsQuery.error
                ? errorText(templateAnalyticsQuery.error, "Unable to load template analytics.")
                : templatesQuery.error
                  ? errorText(templatesQuery.error, "Unable to load templates.")
                  : null
            }
            onRetry={() => {
              void templateAnalyticsQuery.refetch();
              void templatesQuery.refetch();
            }}
            onOpenModal={(modal) => setActiveModal(modal as "create-template" | "send-template")}
          />
        )}
        {activeTab === "Contacts" && (
          <ContactsTab
            contacts={contacts}
            growthTimeline={contactsQuery.data?.growthTimeline ?? []}
            loading={contactsQuery.isLoading}
            error={contactsQuery.error ? errorText(contactsQuery.error, "Unable to load contacts.") : null}
            onRetry={() => void contactsQuery.refetch()}
          />
        )}
        {activeTab === "Messages" && (
          <ConversationsTab
            companyId={companyId}
            clientId={clientId}
            messages={messages}
            templates={rawTemplates}
            loading={messagesQuery.isLoading}
            error={messagesQuery.error ? errorText(messagesQuery.error, "Unable to load message history.") : null}
            onRetry={() => void messagesQuery.refetch()}
            status={messageStatus}
            onStatusChange={changeMessageStatus}
            onRefresh={() => void messagesQuery.refetch()}
            onViewMessage={handleMessageDetails}
          />
        )}
        {activeTab === "Settings" && (
          <SettingsTab
            key={`${companyId}-${config?.updatedAt ?? "unconfigured"}`}
            companyId={companyId}
            config={config}
            webhookHealth={webhookHealth}
            loading={configQuery.isLoading || webhookHealthQuery.isLoading}
            error={configQuery.error ? errorText(configQuery.error, "Unable to load the WhatsApp configuration.") : null}
            onRetry={() => {
              void configQuery.refetch();
              void webhookHealthQuery.refetch();
            }}
            onSaved={refetchAll}
          />
        )}
      </div>

      <CreateTemplateModal
        isOpen={activeModal === "create-template"}
        onClose={() => setActiveModal(null)}
        companyId={companyId}
        clientId={clientId}
        onSaved={() => {
          void templatesQuery.refetch();
          void templateAnalyticsQuery.refetch();
          void overviewQuery.refetch();
        }}
      />
      <SendTemplateModal
        isOpen={activeModal === "send-template"}
        onClose={() => setActiveModal(null)}
        companyId={companyId}
        clientId={clientId}
        templates={enabledTemplates}
        campaigns={campaigns}
        onSent={() => {
          void messagesQuery.refetch();
          void overviewAnalyticsQuery.refetch();
          void campaignsQuery.refetch();
          void contactsQuery.refetch();
        }}
      />
      <CreateCampaignModal
        isOpen={activeModal === "create-campaign"}
        onClose={() => setActiveModal(null)}
        companyId={companyId}
        clientId={clientId}
        templates={enabledTemplates}
        contacts={contacts}
        onCreated={() => {
          void campaignsQuery.refetch();
          void overviewAnalyticsQuery.refetch();
          void overviewQuery.refetch();
          void messagesQuery.refetch();
          void contactsQuery.refetch();
        }}
      />
    </div>
  );
}
