import { getRoles, toAdminRoles } from "../live/roles-api";
import { ROLES_MOCK_MODE } from "./config";
import { getMockRoles } from "./mock-provider";
import type { RolesPayload } from "./types";

export async function fetchRoles(): Promise<RolesPayload> {
  if (!ROLES_MOCK_MODE) return toAdminRoles(await getRoles());
  await new Promise((resolve) => setTimeout(resolve, 120));
  return { roles: getMockRoles() };
}
