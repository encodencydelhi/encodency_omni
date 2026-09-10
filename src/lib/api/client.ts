import { env } from "@/config/env";
import { createMockTransport } from "@/mocks";
import { HttpTransport } from "./http-transport";
import type { Transport } from "./transport";
export const apiClient: Transport =
  env.dataSource === "api" ? new HttpTransport() : createMockTransport();

export type { Transport, RequestSpec } from "./transport";
