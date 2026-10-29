/**
 * Who may be offered what in the Company Admin search box.
 *
 * The server is the real gate for data (it only returns records the person may open). These rules keep the search box from offering pages and
 * shortcuts the person could not use anyway, and are checked against the person's OWN capabilities that the server reports. Anything that needs a
 * capability stays hidden until the capabilities are known (fail closed).
 */

/** What a person needs to open each page or run each shortcut. Anything not listed (Dashboard, Ask AI) is open to every member. */
export const CAPABILITY_BY_ID: Record<string, string> = {
  "page-clients": "clients:read",
  "page-content": "content:read",
  "page-calendar": "content:read",
  "page-media": "content:read",
  "page-campaigns": "campaigns:read",
  "page-competitor-analyzer": "clients:read",
  "page-meta": "integrations:read",
  "page-linkedin": "integrations:read",
  "page-google-business": "integrations:read",
  "page-whatsapp": "integrations:read",
  "page-youtube": "integrations:read",
  "page-x": "integrations:read",
  "page-website": "clients:read",
  "page-seo": "clients:read",
  "page-seo-audit": "clients:read",
  "page-seo-pages": "clients:read",
  "page-seo-issues": "clients:read",
  "page-seo-keywords": "clients:read",
  "page-crm-companies": "clients:read",
  "page-crm-leads": "clients:read",
  "page-crm-contacts": "clients:read",
  "page-crm-pipeline": "clients:read",
  "page-crm-tasks": "clients:read",
  "page-automation": "automation:read",
  "page-automation-logs": "automation:read",
  "page-analytics": "clients:read",
  "page-reports": "clients:read",
  "page-support": "support:read",
  "page-team": "team:manage",
  "page-roles": "team:manage",
  "page-integrations": "integrations:read",
  "page-billing": "billing:read",
  "page-settings": "organization:read",
  "cmd-create-post": "content:write",
  "cmd-add-lead": "clients:write",
  "cmd-new-campaign": "campaigns:write",
  "cmd-add-client": "clients:write",
  "cmd-run-audit": "clients:write",
  "cmd-invite-team": "team:manage",
  "cmd-connect-channel": "integrations:write",
};

/** Suggestion chips that lead to something permission-gated are hidden for people who could not open it. */
export const CHIP_CAPABILITY: Record<string, string> = {
  clients: "clients:read",
  crm: "clients:read",
  seo: "clients:read",
  team: "team:manage",
  billing: "billing:read",
};

/** The same rule for records found by the server (used to re-check saved recents and pins). */
export const CAPABILITY_BY_KIND: Record<string, string> = {
  client: "clients:read",
  campaign: "campaigns:read",
  draft: "content:read",
  crm: "clients:read",
  ticket: "support:read",
  member: "team:manage",
  invoice: "billing:read",
  workflow: "automation:read",
  study: "clients:read",
};

/** The capability an item needs, or undefined when every member may see it. A page id wins over its kind. */
export function requiredCapability(item: { id: string; kind: string }): string | undefined {
  return CAPABILITY_BY_ID[item.id] ?? CAPABILITY_BY_KIND[item.kind];
}

export function isAllowed(item: { id: string; kind: string }, capabilities: ReadonlySet<string>): boolean {
  const needed = requiredCapability(item);
  return !needed || capabilities.has(needed);
}

/** Kind words that limit a search to one kind (the server understands the same words); pages and shortcuts are left out when one is used. */
export const SCOPE_WORDS: ReadonlySet<string> = new Set([
  "client", "clients", "campaign", "campaigns", "draft", "drafts", "post", "posts", "content", "crm", "lead", "leads", "contact", "contacts", "deal", "deals", "task", "tasks",
  "account", "accounts", "ticket", "tickets", "support", "member", "members", "team", "invoice", "invoices", "billing", "workflow", "workflows", "automation", "study", "studies",
  "competitor", "competitors",
]);

export function splitScope(query: string): { scoped: boolean; text: string } {
  const match = /^([a-z]+)\s*:\s*(.*)$/i.exec(query.trim());
  if (match && SCOPE_WORDS.has(match[1]!.toLowerCase())) return { scoped: true, text: match[2]!.trim() };
  return { scoped: false, text: query.trim() };
}

/** Recents and pins are stored per person and Company, so another person on the same browser (or another Company) never sees them. */
export const storageKey = (base: string, userId: string | undefined, companyId: string) => `${base}:${userId ?? "anonymous"}:${companyId}`;
