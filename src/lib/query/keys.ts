interface EntityKeys {
  all: readonly string[];
  list: (params?: unknown) => readonly unknown[];
  detail: (id: string) => readonly unknown[];
  summary: (params?: unknown) => readonly unknown[];
}

function entityKeys(scope: string): EntityKeys {
  return {
    all: [scope],
    list: (params) => [scope, "list", params ?? {}],
    detail: (id) => [scope, "detail", id],
    summary: (params) => [scope, "summary", params ?? {}],
  };
}

export const queryKeys = {
  session: ["session"] as const,
  dashboard: entityKeys("dashboard"),
  companies: entityKeys("companies"),
  users: entityKeys("users"),
  Clients: entityKeys("Clients"),
  team: entityKeys("team"),
  plans: entityKeys("plans"),
  subscriptions: entityKeys("subscriptions"),
  billing: entityKeys("billing"),
  invoices: entityKeys("invoices"),
  usage: entityKeys("usage"),
  integrations: entityKeys("integrations"),
  systemHealth: entityKeys("system-health"),
  jobs: entityKeys("jobs"),
  apiMonitoring: entityKeys("api-monitoring"),
  webhooks: entityKeys("webhooks"),
  featureFlags: entityKeys("feature-flags"),
  auditLogs: entityKeys("audit-logs"),
  support: entityKeys("support"),
  notifications: entityKeys("notifications"),
  settings: entityKeys("settings"),
} as const;
