"use client";

import { useState } from "react";
import { Send, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ChannelHeader } from "./channel-header";
import { cn } from "@/lib/utils/cn";
import { OverviewTab } from "./whatsapp-tabs/overview-tab";
import { CampaignsTab } from "./whatsapp-tabs/campaigns-tab";
import { TemplatesTab } from "./whatsapp-tabs/templates-tab";
import { ConversationsTab } from "./whatsapp-tabs/conversations-tab";
import { ContactsTab } from "./whatsapp-tabs/contacts-tab";
import { AutomationTab } from "./whatsapp-tabs/automation-tab";
import { AnalyticsTab } from "./whatsapp-tabs/analytics-tab";
import { SettingsTab } from "./whatsapp-tabs/settings-tab";
import { FlowsTab } from "./whatsapp-tabs/flows-tab";
import {
  CreateCampaignModal,
  SendTemplateModal,
  CreateTemplateModal,
  ImportContactsModal,
  EditIntegrationModal,
  CreateRuleModal,
  CreateCTWAAdModal,
  WabaIntegrationDetails,
} from "./whatsapp-modals";

const tabs = [
  "Overview",
  "Campaigns",
  "Templates",
  "Conversations",
  "Contacts",
  "Flows",
  "Automation",
  "Analytics",
  "Settings",
] as const;

type TabType = (typeof tabs)[number];

export function WhatsappChannelPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [integrationDetails, setIntegrationDetails] = useState<WabaIntegrationDetails>({
    provider: "AiSensy (WABA)",
    phoneNumber: "+91 98765 43210",
    businessName: "Namo Gange Trust",
    wabaStatus: "Active",
    qualityRating: "High",
    dailyLimit: "10,000 messages",
    timezone: "Asia/Kolkata",
    wabaId: "waba_namogange_2025",
  });

  const handleSync = () => {
    toast.success("Syncing WhatsApp Business API data...", {
      description: "Fetched latest messages, WABA templates and contacts from AiSensy.",
    });
  };

  const handleExport = () => {
    toast.success("Exporting WhatsApp Analytics Report...", {
      description: "A comprehensive CSV report will download shortly.",
    });
  };

  const handlePrimaryAction = () => {
    setActiveModal("create-campaign");
  };

  const handleSendTest = () => {
    setActiveModal("send-template");
  };

  return (
    <div className="pb-8">
      {/* Header Navigation & Banner */}
      <div className="-mx-4 -mt-5 mb-5 bg-white px-4 pt-5 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6 shadow-xs border-b border-slate-200">
        <ChannelHeader
          channel="whatsapp"
          onSync={handleSync}
          onExport={handleExport}
          onPrimaryAction={handlePrimaryAction}
          extraActions={
            <button
              onClick={handleSendTest}
              className="flex h-[38px] items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-[11.5px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-emerald-600"
            >
              <Send className="size-3.5 text-emerald-600" />
              <span>Send Test Message</span>
            </button>
          }
        />
        <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-bold transition-all",
                activeTab === tab
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Tab Render */}
      <div className="space-y-4">
        {activeTab === "Overview" && (
          <OverviewTab
            onTabChange={(t) => setActiveTab(t as TabType)}
            onOpenModal={(m) => setActiveModal(m)}
            integrationDetails={integrationDetails}
          />
        )}
        {activeTab === "Campaigns" && (
          <CampaignsTab onOpenModal={(m) => setActiveModal(m)} />
        )}
        {activeTab === "Templates" && (
          <TemplatesTab onOpenModal={(m) => setActiveModal(m)} />
        )}
        {activeTab === "Conversations" && <ConversationsTab />}
        {activeTab === "Contacts" && (
          <ContactsTab onOpenModal={(m) => setActiveModal(m)} />
        )}
        {activeTab === "Flows" && <FlowsTab />}
        {activeTab === "Automation" && (
          <AutomationTab onOpenModal={(m) => setActiveModal(m)} />
        )}
        {activeTab === "Analytics" && <AnalyticsTab />}
        {activeTab === "Settings" && <SettingsTab />}
      </div>

      {/* Interactive Modals */}
      <CreateCampaignModal
        isOpen={activeModal === "create-campaign"}
        onClose={() => setActiveModal(null)}
      />
      <SendTemplateModal
        isOpen={activeModal === "send-template"}
        onClose={() => setActiveModal(null)}
      />
      <CreateTemplateModal
        isOpen={activeModal === "create-template"}
        onClose={() => setActiveModal(null)}
      />
      <ImportContactsModal
        isOpen={activeModal === "import-contacts" || activeModal === "add-contact"}
        onClose={() => setActiveModal(null)}
      />
      <EditIntegrationModal
        isOpen={activeModal === "edit-integration"}
        onClose={() => setActiveModal(null)}
        details={integrationDetails}
        onSave={(updated) => setIntegrationDetails(updated)}
      />
      <CreateRuleModal
        isOpen={activeModal === "create-rule"}
        onClose={() => setActiveModal(null)}
      />
      <CreateCTWAAdModal
        isOpen={activeModal === "create-ctwa"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
