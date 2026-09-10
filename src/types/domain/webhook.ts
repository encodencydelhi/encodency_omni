import type { StatusRegistry } from "@/types/common";
import type { IntegrationProvider } from "./integration";

export const WEBHOOK_STATUS = {
  processed: { label: "Processed", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  retrying: { label: "Retrying", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  ignored: { label: "Ignored", tone: "neutral", description: "No subscriber for this event" },
} as const satisfies StatusRegistry<string>;

export type WebhookStatus = keyof typeof WEBHOOK_STATUS;

export interface WebhookEvent {
  id: string;
  provider: IntegrationProvider;
  event: string;
  status: WebhookStatus;
  signatureVerified: boolean;
  companyName: string | null;
  processingMs: number | null;
  retryCount: number;
  errorMessage: string | null;
  payloadPreview: Record<string, string | number | boolean>;
  receivedAt: string;
}

export interface WebhookFilters {
  provider: IntegrationProvider;
  status: WebhookStatus;
  event: string;
}

export type WebhookSortField = "receivedAt" | "provider" | "status" | "processingMs";

export interface WebhookEndpointSummary {
  provider: IntegrationProvider;
  eventsLast24h: number;
  failureRate: number;
  averageProcessingMs: number;
  lastReceivedAt: string;
  isVerified: boolean;
}
