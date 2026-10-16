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

const DEMO_MODE = process.env.NEXT_PUBLIC_DATA_SOURCE !== "api";

/**
 * Demo mode returns the fixture above. Live mode never claims a connection state it has not verified: until a backend
 * integration-status endpoint exists, every provider is reported as "unavailable" (UI: "Data unavailable").
 */
export const getClientCapabilities = async (_clientId: string): Promise<IntegrationStatus[]> => {
  if (DEMO_MODE) return MOCK_CAPABILITIES;
  return MOCK_CAPABILITIES.map((c) => ({ ...c, available: false, status: "unavailable" as const }));
};

export const hasCapability = (capabilities: IntegrationStatus[], required: IntegrationCapability[]): boolean => {
  return required.every(req => capabilities.find(c => c.capability === req)?.available);
};
