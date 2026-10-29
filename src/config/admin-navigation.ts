import {
  BarChart3, Blocks, Bot, BriefcaseBusiness, CalendarDays, ContactRound, FileChartColumn,
  Building2, FolderKanban, Gauge, Globe2, Hash, Image, Landmark, ListChecks, Network,
  Megaphone, MessageCircle, PanelsTopLeft, Settings, ShieldCheck, Target,
  Server, Share2, Swords, UsersRound, Video, WalletCards, Webhook, type LucideIcon,
} from "lucide-react";

/** `underConstruction`: the sidebar shows an animated "under construction" icon and does not let anyone open the page from there. */
export interface AdminNavItem { label: string; href: string; icon: LucideIcon; underConstruction?: boolean; }
export interface AdminNavSection { label: string; items: AdminNavItem[]; }

export const adminNavigation: AdminNavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: Gauge }] },
  {
    label: "Clients", items: [
      { label: "Clients", href: "/admin/clients", icon: FolderKanban },
    ]
  },
  {
    label: "Marketing", items: [
      { label: "Content Studio", href: "/admin/content", icon: PanelsTopLeft },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
      { label: "Media Library", href: "/admin/media", icon: Image },
      { label: "Competitor Analyzer", href: "/admin/competitor-analyzer", icon: Swords },
    ]
  },
  {
    label: "Channels", items: [
      { label: "Meta & Instagram", href: "/admin/meta", icon: Share2 },
      { label: "LinkedIn", href: "/admin/linkedin", icon: Network },
      { label: "Google Business", href: "/admin/google-business", icon: Landmark },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle },
      { label: "YouTube", href: "/admin/youtube", icon: Video },
      { label: "X (Twitter)", href: "/admin/x", icon: Hash, underConstruction: true },
      { label: "Website", href: "/admin/website", icon: Globe2 },
      { label: "Infrastructure", href: "/admin/infrastructure", icon: Server },
    ]
  },
  {
    label: "CRM", items: [
      { label: "Leads", href: "/admin/crm/leads", icon: Target },
      { label: "Contacts", href: "/admin/crm/contacts", icon: ContactRound },
      { label: "Pipeline", href: "/admin/crm/pipeline", icon: BriefcaseBusiness },
      { label: "Tasks", href: "/admin/crm/tasks", icon: ListChecks },
      { label: "Accounts", href: "/admin/crm/companies", icon: Building2 },
    ]
  },
  {
    label: "Workspace", items: [
      { label: "Automation", href: "/admin/automation", icon: Bot },
      { label: "Automation Logs", href: "/admin/automation/logs", icon: ListChecks },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Reports", href: "/admin/reports", icon: FileChartColumn },
      { label: "Support & Tickets", href: "/admin/support", icon: MessageCircle },
    ]
  },
  {
    label: "Management", items: [
      { label: "Team", href: "/admin/team", icon: UsersRound },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
      { label: "Integrations", href: "/admin/integrations", icon: Blocks },
      { label: "Webhooks", href: "/admin/settings/integrations/webhooks", icon: Webhook },
      { label: "Billing", href: "/admin/billing", icon: WalletCards },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ]
  },
];
