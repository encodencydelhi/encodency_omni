import { ROLES_MOCK_MODE } from "./config";
import { getMockRoles } from "./mock-provider";
import type { RolesPayload } from "./types";

export async function fetchRoles(): Promise<RolesPayload> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  if (!ROLES_MOCK_MODE) throw new Error("Roles service unavailable. Mock mode is disabled.");
  return { roles: getMockRoles() };
}
