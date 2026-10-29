import type { AnimatedIconName } from "@/components/shared/animated-icon";
import {
  BarChart3, Blocks, Bot, BriefcaseBusiness, CalendarDays, ContactRound, FileChartColumn,
  Building2, FolderKanban, Gauge, Globe2, Hash, Image, Landmark, ListChecks, Network,
  Megaphone, MessageCircle, PanelsTopLeft, Settings, ShieldCheck, Target,
  Server, Share2, Swords, UsersRound, Video, WalletCards, Webhook, type LucideIcon,
} from "lucide-react";

/** `underConstruction`: the sidebar shows an animated "under construction" icon and does not let anyone open the page from there. */
export interface AdminNavItem { label: string; description: string; href: string; icon: LucideIcon; animatedIcon: AnimatedIconName; iconColor: string; underConstruction?: boolean; }
export interface AdminNavSection { label: string; items: AdminNavItem[]; }

export const adminNavigation: AdminNavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", description: "View workspace activity and key business metrics.", href: "/admin", icon: Gauge, animatedIcon: "dashboard", iconColor: "text-sky-400" }] },
  {
    label: "Clients", items: [
      { label: "Clients", description: "Manage clients and switch between client workspaces.", href: "/admin/clients", icon: FolderKanban, animatedIcon: "clients", iconColor: "text-blue-400" },
    ]
  },
  {
    label: "Marketing", items: [
      { label: "Content Studio", description: "Create, edit, and prepare social content.", href: "/admin/content", icon: PanelsTopLeft, animatedIcon: "content", iconColor: "text-violet-400" },
      { label: "Calendar", description: "Plan content and review your publishing schedule.", href: "/admin/calendar", icon: CalendarDays, animatedIcon: "calendar", iconColor: "text-pink-400" },
      { label: "Campaigns", description: "Organize campaigns and track their progress.", href: "/admin/campaigns", icon: Megaphone, animatedIcon: "campaigns", iconColor: "text-orange-400" },
      { label: "Media Library", description: "Upload, organize, and reuse images and videos.", href: "/admin/media", icon: Image, animatedIcon: "media", iconColor: "text-teal-400" },
      { label: "Competitor Analyzer", description: "Compare competitors and explore content performance.", href: "/admin/competitor-analyzer", icon: Swords, animatedIcon: "competitor", iconColor: "text-rose-400" },
    ]
  },
  {
    label: "Channels", items: [
      { label: "Meta & Instagram", description: "Manage Facebook and Instagram content and activity.", href: "/admin/meta", icon: Share2, animatedIcon: "integrations", iconColor: "text-fuchsia-400" },
      { label: "LinkedIn", description: "Manage LinkedIn content and review performance.", href: "/admin/linkedin", icon: Network, animatedIcon: "integrations", iconColor: "text-sky-400" },
      { label: "Google Business", description: "Manage business listings, posts, and reviews.", href: "/admin/google-business", icon: Landmark, animatedIcon: "companies", iconColor: "text-blue-400" },
      { label: "WhatsApp", description: "Manage conversations, templates, and messaging campaigns.", href: "/admin/whatsapp", icon: MessageCircle, animatedIcon: "support", iconColor: "text-emerald-400" },
      { label: "YouTube", description: "Manage videos and review channel performance.", href: "/admin/youtube", icon: Video, animatedIcon: "media", iconColor: "text-red-400" },
      { label: "X (Twitter)", description: "Under construction. This channel is not available yet.", href: "/admin/x", icon: Hash, animatedIcon: "flags", iconColor: "text-slate-400", underConstruction: true },
      { label: "Website", description: "Manage website content and monitor site performance.", href: "/admin/website", icon: Globe2, animatedIcon: "website", iconColor: "text-cyan-400" },
      { label: "Infrastructure", description: "Monitor hosting, domains, and infrastructure services.", href: "/admin/infrastructure", icon: Server, animatedIcon: "infrastructure", iconColor: "text-indigo-400" },
    ]
  },
  {
    label: "CRM", items: [
      { label: "Leads", description: "Capture leads and track sales follow-ups.", href: "/admin/crm/leads", icon: Target, animatedIcon: "leads", iconColor: "text-rose-400" },
      { label: "Contacts", description: "Manage contact details and customer relationships.", href: "/admin/crm/contacts", icon: ContactRound, animatedIcon: "contacts", iconColor: "text-cyan-400" },
      { label: "Pipeline", description: "Track deals through each sales stage.", href: "/admin/crm/pipeline", icon: BriefcaseBusiness, animatedIcon: "pipeline", iconColor: "text-amber-400" },
      { label: "Tasks", description: "Assign tasks, set deadlines, and track completion.", href: "/admin/crm/tasks", icon: ListChecks, animatedIcon: "jobs", iconColor: "text-lime-400" },
      { label: "Accounts", description: "Manage company records and related sales activity.", href: "/admin/crm/companies", icon: Building2, animatedIcon: "companies", iconColor: "text-orange-400" },
    ]
  },
  {
    label: "Workspace", items: [
      { label: "Automation", description: "Build workflows that automate recurring tasks.", href: "/admin/automation", icon: Bot, animatedIcon: "assistant", iconColor: "text-violet-400" },
      { label: "Automation Logs", description: "Inspect workflow runs, errors, and execution history.", href: "/admin/automation/logs", icon: ListChecks, animatedIcon: "jobs", iconColor: "text-lime-400" },
      { label: "Analytics", description: "Explore performance across channels and campaigns.", href: "/admin/analytics", icon: BarChart3, animatedIcon: "analytics", iconColor: "text-emerald-400" },
      { label: "Reports", description: "Create and review business performance reports.", href: "/admin/reports", icon: FileChartColumn, animatedIcon: "reports", iconColor: "text-sky-400" },
      { label: "Support & Tickets", description: "Raise support requests and track their resolution.", href: "/admin/support", icon: MessageCircle, animatedIcon: "support", iconColor: "text-emerald-400" },
    ]
  },
  {
    label: "Management", items: [
      { label: "Team", description: "Invite teammates and manage workspace membership.", href: "/admin/team", icon: UsersRound, animatedIcon: "users", iconColor: "text-purple-400" },
      { label: "Roles & Permissions", description: "Define roles and control workspace access.", href: "/admin/roles", icon: ShieldCheck, animatedIcon: "roles", iconColor: "text-teal-400" },
      { label: "Integrations", description: "Connect external services to your workspace.", href: "/admin/integrations", icon: Blocks, animatedIcon: "integrations", iconColor: "text-fuchsia-400" },
      { label: "Webhooks", description: "Configure endpoints and review event deliveries.", href: "/admin/settings/integrations/webhooks", icon: Webhook, animatedIcon: "webhooks", iconColor: "text-pink-400" },
      { label: "Billing", description: "Review your plan, invoices, and payment details.", href: "/admin/billing", icon: WalletCards, animatedIcon: "billing", iconColor: "text-emerald-400" },
      { label: "Settings", description: "Configure workspace preferences, branding, and security.", href: "/admin/settings", icon: Settings, animatedIcon: "settings", iconColor: "text-blue-400" },
    ]
  },
];
