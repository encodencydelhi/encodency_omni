import {
  BarChart3, Blocks, Bot, BriefcaseBusiness, CalendarDays, ContactRound, FileChartColumn,
  FolderKanban, Gauge, Globe2, Image, Landmark, ListChecks, Network,
  Megaphone, MessageCircle, PanelsTopLeft, SearchCheck, Settings, ShieldCheck, Tags, Target,
  Share2, UsersRound, Video, WalletCards, type LucideIcon,
} from "lucide-react";

export interface AdminNavItem { label: string; href: string; icon: LucideIcon; }
export interface AdminNavSection { label: string; items: AdminNavItem[]; }

export const adminNavigation: AdminNavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: Gauge }] },
  {
    label: "Clients", items: [
      { label: "Clients", href: "/admin/projects", icon: FolderKanban },
    ]
  },
  {
    label: "Marketing", items: [
      { label: "Content Studio", href: "/admin/content", icon: PanelsTopLeft },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
      { label: "Media Library", href: "/admin/media", icon: Image },
    ]
  },
  {
    label: "Channels", items: [
      { label: "Meta & Instagram", href: "/admin/meta", icon: Share2 },
      { label: "LinkedIn", href: "/admin/linkedin", icon: Network },
      { label: "Google Business", href: "/admin/google-business", icon: Landmark },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle },
      { label: "YouTube", href: "/admin/youtube", icon: Video },
      { label: "Website", href: "/admin/website", icon: Globe2 },
    ]
  },
  {
    label: "SEO", items: [
      { label: "SEO Overview", href: "/admin/seo", icon: SearchCheck },
      { label: "Site Audit", href: "/admin/seo/audit", icon: ListChecks },
      { label: "Pages", href: "/admin/seo/pages", icon: PanelsTopLeft },
      { label: "Issues", href: "/admin/seo/issues", icon: ShieldCheck },
      { label: "Keywords", href: "/admin/seo/keywords", icon: Tags },
    ]
  },
  {
    label: "CRM", items: [
      { label: "Leads", href: "/admin/crm/leads", icon: Target },
      { label: "Contacts", href: "/admin/crm/contacts", icon: ContactRound },
      { label: "Pipeline", href: "/admin/crm/pipeline", icon: BriefcaseBusiness },
      { label: "Tasks", href: "/admin/crm/tasks", icon: ListChecks },
    ]
  },
  {
    label: "Workspace", items: [
      { label: "Automation", href: "/admin/automation", icon: Bot },
      { label: "Automation Logs", href: "/admin/automation/logs", icon: ListChecks },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Reports", href: "/admin/reports", icon: FileChartColumn },
    ]
  },
  {
    label: "Management", items: [
      { label: "Team", href: "/admin/team", icon: UsersRound },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
      { label: "Integrations", href: "/admin/integrations", icon: Blocks },
      { label: "Billing", href: "/admin/billing", icon: WalletCards },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ]
  },
];
