import { IntegrationCapability } from "./types";

export interface IntegrationStatus {
  capability: IntegrationCapability;
  available: boolean;
  status: "connected" | "needs-reconnect" | "missing" | "unavailable";
  providerName: string;
}

const MOCK_CAPABILITIES: IntegrationStatus[] = [
  { capability: "meta", available: true, status: "connected", providerName: "Meta Ads" },
  { capability: "aisensy", available: true, status: "connected", providerName: "AiSensy (WhatsApp)" },
  { capability: "google-business", available: false, status: "needs-reconnect", providerName: "Google Business Profile" },
  { capability: "ga4", available: true, status: "connected", providerName: "Google Analytics 4" },
  { capability: "search-console", available: false, status: "missing", providerName: "Google Search Console" },
  { capability: "omni-tracking", available: true, status: "connected", providerName: "Omni Tracking Snippet" },
];

export const getClientCapabilities = async (_clientId: string): Promise<IntegrationStatus[]> => {
  // In a real app this would check the backend for active integrations scoped by client
  return MOCK_CAPABILITIES;
};

export const hasCapability = (capabilities: IntegrationStatus[], required: IntegrationCapability[]): boolean => {
  return required.every(req => capabilities.find(c => c.capability === req)?.available);
};
