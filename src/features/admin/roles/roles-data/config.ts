export const ROLES_MOCK_MODE = true;

export const MODULES = [
  "CRM",
  "Campaigns",
  "Content",
  "Meta & Instagram",
  "LinkedIn",
  "Google Business",
  "WhatsApp",
  "YouTube",
  "X",
  "Website",
  "SEO",
  "Automation",
  "Analytics",
  "Reports",
  "Team",
  "Billing",
] as const;

export const PERMISSION_LABELS: Record<string, string[]> = {
  CRM: ["View leads", "Create leads", "Edit pipeline", "Export contacts"],
  Campaigns: ["View campaigns", "Create campaigns", "Edit campaigns", "Pause campaigns", "Publish campaigns", "Export reports"],
  Content: ["View content", "Create content", "Edit content", "Publish content", "Delete drafts"],
  "Meta & Instagram": ["View account", "Create posts", "Publish posts", "Manage ads", "Reply to messages"],
  LinkedIn: ["View company page", "Create posts", "Publish posts", "Review analytics"],
  "Google Business": ["View locations", "Reply to reviews", "Create posts", "Upload media", "Edit profile"],
  WhatsApp: ["View conversations", "Reply to chats", "Manage templates", "Export conversations"],
  YouTube: ["View channel", "Upload videos", "Publish videos", "Manage comments", "View analytics"],
  X: ["View account", "Create posts", "Publish posts", "Review mentions"],
  Website: ["View pages", "Edit pages", "Publish pages", "Manage forms"],
  SEO: ["View SEO", "Run audit", "Manage issues", "Export report"],
  Automation: ["View workflows", "Create workflows", "Edit workflows", "Pause workflows", "View logs"],
  Analytics: ["View analytics", "Build reports", "Export dashboards"],
  Reports: ["View reports", "Create reports", "Schedule reports", "Export reports"],
  Team: ["View team", "Invite members", "Manage access", "View activity"],
  Billing: ["View billing", "Manage subscription", "Download invoices"],
};
