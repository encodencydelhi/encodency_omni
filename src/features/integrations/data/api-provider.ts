/**
 * Real HTTP provider for the Super Admin Integrations workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Reads the one
 * endpoint the backend actually serves today:
 *
 *   GET /api/v1/integrations/registry
 *     → SupportedOAuthProvider[] (e.g. ["META", "GOOGLE_BUSINESS", "LINKEDIN"])
 *
 * The backend returns only providers whose OAuth adapter has every server-side
 * credential configured (`ProviderRegistryService.configuredProviders()`). This
 * provider maps those enums onto the Super Admin catalogue ids and keeps only
 * the providers this deployment can actually connect. Catalogue entries the
 * backend does not manage (api-key connectors, providers still on the roadmap)
 * come from the injected demo fallback so the Super Admin still sees the full
 * platform surface while the registry answers for OAuth availability.
 *
 * Fallback policy (owner decision, 2026-09-24): network / 404 / 5xx / empty
 * registry → the injected `fallback` (demo dataset) answers with the full
 * catalogue. 401/403/400/429 still propagate: an authorization or contract
 * problem must surface, not quietly swap in demo rows.
 *
 * Every method the backend does not serve (configs, capabilities, connections,
 * issues, mutations, ...) delegates straight to the same fallback.
 */
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { IntegrationsRepository } from "./repository";
import type { IntegrationProvider, ProviderConfiguration } from "./types";

/* ------------------------------------------------------------------ */
/* Backend DTO (mirrors providers/provider.types.ts)                  */
/* ------------------------------------------------------------------ */

export type BackendOAuthProvider = "META" | "GOOGLE_BUSINESS" | "LINKEDIN";

/** Backend enum → Super Admin catalogue id (mock/dataset.ts). */
export function fromBackendProvider(provider: BackendOAuthProvider): string {
  switch (provider) {
    case "META":
      return "meta";
    case "GOOGLE_BUSINESS":
      return "google_business";
    case "LINKEDIN":
      return "linkedin";
  }
}

/** Super Admin catalogue id → backend enum, when the id is OAuth-managed. */
export function toBackendProvider(providerId: string): BackendOAuthProvider | null {
  switch (providerId) {
    case "meta":
      return "META";
    case "google_business":
      return "GOOGLE_BUSINESS";
    case "linkedin":
      return "LINKEDIN";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fallback policy                                                     */
/* ------------------------------------------------------------------ */

/** Unreachable (0), missing (404) or broken (5xx) backend → show demo data. */
export function shouldFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

async function fetchRegistry(): Promise<BackendOAuthProvider[]> {
  const response = await apiClient.request<BackendOAuthProvider[]>({
    method: "GET",
    path: "/integrations/registry",
  });
  return Array.isArray(response) ? response : [];
}

/**
 * Providers this deployment can OAuth-connect, as catalogue ids. Returns
 * `null` when the registry is unusable (fallback-worthy error or empty list)
 * so callers show the full demo catalogue rather than an empty panel.
 */
async function fetchConfiguredIds(): Promise<Set<string> | null> {
  let registry: BackendOAuthProvider[];
  try {
    registry = await fetchRegistry();
  } catch (error) {
    if (shouldFallBack(error)) return null;
    throw error;
  }
  if (registry.length === 0) return null;
  return new Set(registry.map(fromBackendProvider));
}

/**
 * Keep OAuth-managed providers that the registry confirms, plus every
 * catalogue entry the backend does not manage (api-key / roadmap providers)
 * so Super Admin never loses sight of the full platform surface.
 */
function isCatalogueVisible(providerId: string, configured: Set<string>): boolean {
  const backendProvider = toBackendProvider(providerId);
  if (backendProvider === null) return true;
  return configured.has(providerId);
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function createApiIntegrationsProvider(fallback: IntegrationsRepository): IntegrationsRepository {
  return {
    ...fallback,
    mode: "api",

    async getProviders(): Promise<IntegrationProvider[]> {
      try {
        const configured = await fetchConfiguredIds();
        if (configured === null) return fallback.getProviders();
        const providers = await fallback.getProviders();
        const visible = providers.filter((provider) => isCatalogueVisible(provider.id, configured));
        // Owner decision: no matching rows → show the demo catalogue, not an empty panel.
        if (visible.length === 0) return fallback.getProviders();
        return visible;
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getProviders();
        throw error;
      }
    },

    async getProviderById(id: string): Promise<IntegrationProvider | null> {
      try {
        const configured = await fetchConfiguredIds();
        if (configured === null) return fallback.getProviderById(id);
        if (!isCatalogueVisible(id, configured)) return null;
        return fallback.getProviderById(id);
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getProviderById(id);
        throw error;
      }
    },

    async getProviderConfig(providerId: string): Promise<ProviderConfiguration | null> {
      try {
        const configured = await fetchConfiguredIds();
        if (configured === null) return fallback.getProviderConfig(providerId);
        if (!isCatalogueVisible(providerId, configured)) return null;
        return fallback.getProviderConfig(providerId);
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getProviderConfig(providerId);
        throw error;
      }
    },
  };
}
