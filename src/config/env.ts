/**
 * Typed, validated access to the public runtime configuration.
 *
 * `dataSource` is the seam between the mock adapter and the real backend.
 * Flipping `NEXT_PUBLIC_DATA_SOURCE` to "api" swaps the transport underneath
 * the service layer — no page, hook or component changes.
 */

type DataSource = "mock" | "api";

function readDataSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";
}

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  dataSource: readDataSource(),
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  mockLatencyMs: readNumber(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS, 350),
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const isMockMode = env.dataSource === "mock";
