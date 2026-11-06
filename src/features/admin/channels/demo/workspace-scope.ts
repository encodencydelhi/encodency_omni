/** The existing admin/sidebar tenancy is the only source of WhatsApp scope. */
export function whatsappWorkspaceScope(companyId: string, clientId: string, actorId?: string): string {
  return JSON.stringify(["whatsapp", companyId, clientId, ...(actorId ? [actorId] : [])]);
}
