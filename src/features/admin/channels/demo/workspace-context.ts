"use client";

import { useTenancyContext } from "@/lib/api/tenancy-context";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { whatsappWorkspaceScope } from "./workspace-scope";
import { useAuth } from "@/features/auth/components/auth-provider";
import { whatsappAccess } from "./audit-model";

export function useWhatsAppWorkspaceContext() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const { user } = useAuth();
  const membership = user?.memberships.find(member => member.companyId === companyId);
  const { organization, Clients, isPlaceholderData } = useAdminContext();
  const companyName = organization.id === companyId ? organization.name : "";
  const clientName = !isPlaceholderData
    ? Clients.find(client => client.id === clientId && client.organizationId === companyId)?.name
    : undefined;

  return {
    companyId,
    clientId,
    isReady,
    scope: whatsappWorkspaceScope(companyId, clientId, user?.id),
    access: whatsappAccess(membership?.systemRole, user?.platformRole, membership?.jobTitle),
    accountHandle: [companyName, clientName].filter(Boolean).join(" · ") || "Company WhatsApp Configuration",
  };
}
