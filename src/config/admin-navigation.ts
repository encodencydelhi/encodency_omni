import type { AnimatedIconName } from "@/components/shared/animated-icon";
import {
  BarChart3, Blocks, Bot, BriefcaseBusiness, CalendarDays, ContactRound, FileChartColumn,
  Building2, FolderKanban, Gauge, Globe2, Hash, Image, Landmark, ListChecks, Network,
  Megaphone, MessageCircle, PanelsTopLeft, Settings, ShieldCheck, Target,
  Server, Share2, Swords, UsersRound, Video, WalletCards, Webhook, type LucideIcon,
} from "lucide-react";

/** `underConstruction`: the sidebar shows an animated "under construction" icon and does not let anyone open the page from there. */
export interface AdminNavItem { label: string; href: string; icon: LucideIcon; animatedIcon: AnimatedIconName; iconColor: string; underConstruction?: boolean; }
export interface AdminNavSection { label: string; items: AdminNavItem[]; }

export const adminNavigation: AdminNavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: Gauge, animatedIcon: "dashboard", iconColor: "text-sky-400" }] },
  {
    label: "Clients", items: [
      { label: "Clients", href: "/admin/clients", icon: FolderKanban, animatedIcon: "clients", iconColor: "text-blue-400" },
    ]
  },
  {
    label: "Marketing", items: [
      { label: "Content Studio", href: "/admin/content", icon: PanelsTopLeft, animatedIcon: "content", iconColor: "text-violet-400" },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays, animatedIcon: "calendar", iconColor: "text-pink-400" },
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone, animatedIcon: "campaigns", iconColor: "text-orange-400" },
      { label: "Media Library", href: "/admin/media", icon: Image, animatedIcon: "media", iconColor: "text-teal-400" },
      { label: "Competitor Analyzer", href: "/admin/competitor-analyzer", icon: Swords, animatedIcon: "competitor", iconColor: "text-rose-400" },
    ]
  },
  {
    label: "Channels", items: [
      { label: "Meta & Instagram", href: "/admin/meta", icon: Share2, animatedIcon: "integrations", iconColor: "text-fuchsia-400" },
      { label: "LinkedIn", href: "/admin/linkedin", icon: Network, animatedIcon: "integrations", iconColor: "text-sky-400" },
      { label: "Google Business", href: "/admin/google-business", icon: Landmark, animatedIcon: "companies", iconColor: "text-blue-400" },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle, animatedIcon: "support", iconColor: "text-emerald-400" },
      { label: "YouTube", href: "/admin/youtube", icon: Video, animatedIcon: "media", iconColor: "text-red-400" },
      { label: "X (Twitter)", href: "/admin/x", icon: Hash, animatedIcon: "flags", iconColor: "text-slate-400", underConstruction: true },
      { label: "Website", href: "/admin/website", icon: Globe2, animatedIcon: "website", iconColor: "text-cyan-400" },
      { label: "Infrastructure", href: "/admin/infrastructure", icon: Server, animatedIcon: "infrastructure", iconColor: "text-indigo-400" },
    ]
  },
  {
    label: "CRM", items: [
      { label: "Leads", href: "/admin/crm/leads", icon: Target, animatedIcon: "leads", iconColor: "text-rose-400" },
      { label: "Contacts", href: "/admin/crm/contacts", icon: ContactRound, animatedIcon: "contacts", iconColor: "text-cyan-400" },
      { label: "Pipeline", href: "/admin/crm/pipeline", icon: BriefcaseBusiness, animatedIcon: "pipeline", iconColor: "text-amber-400" },
      { label: "Tasks", href: "/admin/crm/tasks", icon: ListChecks, animatedIcon: "jobs", iconColor: "text-lime-400" },
      { label: "Accounts", href: "/admin/crm/companies", icon: Building2, animatedIcon: "companies", iconColor: "text-orange-400" },
    ]
  },
  {
    label: "Workspace", items: [
      { label: "Automation", href: "/admin/automation", icon: Bot, animatedIcon: "assistant", iconColor: "text-violet-400" },
      { label: "Automation Logs", href: "/admin/automation/logs", icon: ListChecks, animatedIcon: "jobs", iconColor: "text-lime-400" },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, animatedIcon: "analytics", iconColor: "text-emerald-400" },
      { label: "Reports", href: "/admin/reports", icon: FileChartColumn, animatedIcon: "reports", iconColor: "text-sky-400" },
      { label: "Support & Tickets", href: "/admin/support", icon: MessageCircle, animatedIcon: "support", iconColor: "text-emerald-400" },
    ]
  },
  {
    label: "Management", items: [
      { label: "Team", href: "/admin/team", icon: UsersRound, animatedIcon: "users", iconColor: "text-purple-400" },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, animatedIcon: "roles", iconColor: "text-teal-400" },
      { label: "Integrations", href: "/admin/integrations", icon: Blocks, animatedIcon: "integrations", iconColor: "text-fuchsia-400" },
      { label: "Webhooks", href: "/admin/settings/integrations/webhooks", icon: Webhook, animatedIcon: "webhooks", iconColor: "text-pink-400" },
      { label: "Billing", href: "/admin/billing", icon: WalletCards, animatedIcon: "billing", iconColor: "text-emerald-400" },
      { label: "Settings", href: "/admin/settings", icon: Settings, animatedIcon: "settings", iconColor: "text-blue-400" },
    ]
  },
];
