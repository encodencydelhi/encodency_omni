import type { Transport } from "@/lib/api/transport";
import { authRoutes } from "./handlers/auth";
import { commerceRoutes } from "./handlers/commerce";
import { controlRoutes } from "./handlers/control";
import { platformRoutes } from "./handlers/platform";
import { reportsRoutes } from "./handlers/reports";
import { tenantRoutes } from "./handlers/tenants";
import { contentRoutes } from "./handlers/content";
import { publishingRoutes } from "./handlers/publishing";
import { MockRouter } from "./lib/router";
import { MockTransport } from "./transport";

/**
 * Assembles the mock API.
 *
 * This is the only file the application imports from `src/mocks`. Deleting the
 * directory and pointing `apiClient` at `HttpTransport` is the whole migration
 * to the real backend.
 */
export function createMockTransport(): Transport {
  const router = new MockRouter();

  router.register(authRoutes);
  router.register(tenantRoutes);
  router.register(commerceRoutes);
  router.register(platformRoutes);
  router.register(controlRoutes);
  router.register(reportsRoutes);
  router.register(contentRoutes);
  router.register(publishingRoutes);

  return new MockTransport(router);
}
