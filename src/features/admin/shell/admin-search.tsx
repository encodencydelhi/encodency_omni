"use client";

import {
  BarChart3Icon,
  BotIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  CommandIcon,
  ContactRoundIcon,
  FileChartColumnIcon,
  FolderKanbanIcon,
  GaugeIcon,
  Globe2Icon,
  HashIcon,
  HeadsetIcon,
  HistoryIcon,
  ImageIcon,
  LandmarkIcon,
  ListChecksIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  NetworkIcon,
  PanelsTopLeftIcon,
  SearchCheckIcon,
  SearchIcon,
  SettingsIcon,
  Share2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TagsIcon,
  TargetIcon,
  UsersRoundIcon,
  VideoIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAdminContext } from "./admin-context";
import { useAssistant } from "@/features/assistant/assistant-provider";
import type { Project } from "@/types/admin";

export type AdminSearchKind =
  | "page"
  | "command"
  | "client"
  | "channel"
  | "seo"
  | "crm"
  | "workspace"
  | "management";

export interface AdminSearchResult {
  id: string;
  kind: AdminSearchKind;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  preview: Array<{ label: string; value: string }>;
  score: number;
  clientId?: string;
  isAiAction?: boolean;
}

const RECENTS_KEY = "admin-global-search-recents";
const PINNED_KEY = "admin-global-search-pinned";
const DEBOUNCE_MS = 150;

const iconByKind: Record<AdminSearchKind, LucideIcon> = {
  page: PanelsTopLeftIcon,
  command: CommandIcon,
  client: FolderKanbanIcon,
  channel: Share2Icon,
  seo: SearchCheckIcon,
  crm: TargetIcon,
  workspace: BarChart3Icon,
  management: SettingsIcon,
};

const iconByGroup: Record<string, LucideIcon> = {
  "Overview": GaugeIcon,
  "Clients": FolderKanbanIcon,
  "Marketing": MegaphoneIcon,
  "Channels": Share2Icon,
  "SEO": SearchCheckIcon,
  "CRM": TargetIcon,
  "Workspace": BotIcon,
  "Management": SettingsIcon,
  "Commands": CommandIcon,
  "Pinned": StarIcon,
  "Recent": HistoryIcon,
};

const PAGE_RESULTS: AdminSearchResult[] = [
  // Overview
  { id: "page-dashboard", kind: "page", group: "Overview", title: "Dashboard", subtitle: "Main performance overview, KPI summary & recent metrics", href: "/admin", preview: [{ label: "Section", value: "Overview" }, { label: "Route", value: "/admin" }], score: 0 },
  
  // Clients
  { id: "page-clients", kind: "client", group: "Clients", title: "Clients Directory", subtitle: "Browse, manage and configure all client workspaces", href: "/admin/clients", preview: [{ label: "Section", value: "Clients" }, { label: "Route", value: "/admin/clients" }], score: 0 },

  // Marketing
  { id: "page-content", kind: "page", group: "Marketing", title: "Content Studio", subtitle: "Draft, schedule and publish social media content", href: "/admin/content", preview: [{ label: "Section", value: "Marketing" }, { label: "Route", value: "/admin/content" }], score: 0 },
  { id: "page-calendar", kind: "page", group: "Marketing", title: "Content Calendar", subtitle: "Editorial timeline, scheduled posts & publishing dates", href: "/admin/calendar", preview: [{ label: "Section", value: "Marketing" }, { label: "Route", value: "/admin/calendar" }], score: 0 },
  { id: "page-campaigns", kind: "page", group: "Marketing", title: "Campaigns", subtitle: "Multi-channel marketing campaigns & promotions", href: "/admin/campaigns", preview: [{ label: "Section", value: "Marketing" }, { label: "Route", value: "/admin/campaigns" }], score: 0 },
  { id: "page-media", kind: "page", group: "Marketing", title: "Media Library", subtitle: "Upload, organise and share images, videos & brand assets", href: "/admin/media", preview: [{ label: "Section", value: "Marketing" }, { label: "Route", value: "/admin/media" }], score: 0 },

  // Channels
  { id: "page-meta", kind: "channel", group: "Channels", title: "Meta & Instagram", subtitle: "Facebook page updates, Instagram posts & Meta Ads Manager", href: "/admin/meta", preview: [{ label: "Channel", value: "Meta / Instagram" }, { label: "Route", value: "/admin/meta" }], score: 0 },
  { id: "page-linkedin", kind: "channel", group: "Channels", title: "LinkedIn", subtitle: "Company page updates, professional engagement & analytics", href: "/admin/linkedin", preview: [{ label: "Channel", value: "LinkedIn" }, { label: "Route", value: "/admin/linkedin" }], score: 0 },
  { id: "page-google-business", kind: "channel", group: "Channels", title: "Google Business", subtitle: "Google Business Profile locations, reviews & local SEO", href: "/admin/google-business", preview: [{ label: "Channel", value: "Google Business" }, { label: "Route", value: "/admin/google-business" }], score: 0 },
  { id: "page-whatsapp", kind: "channel", group: "Channels", title: "WhatsApp", subtitle: "Customer broadcasts, live chats & approved message templates", href: "/admin/whatsapp", preview: [{ label: "Channel", value: "WhatsApp" }, { label: "Route", value: "/admin/whatsapp" }], score: 0 },
  { id: "page-youtube", kind: "channel", group: "Channels", title: "YouTube", subtitle: "Video publishing, playlists, comment replies & channel metrics", href: "/admin/youtube", preview: [{ label: "Channel", value: "YouTube" }, { label: "Route", value: "/admin/youtube" }], score: 0 },
  { id: "page-x", kind: "channel", group: "Channels", title: "X (Twitter)", subtitle: "Posts, threads, audience interactions & mention monitoring", href: "/admin/x", preview: [{ label: "Channel", value: "X / Twitter" }, { label: "Route", value: "/admin/x" }], score: 0 },
  { id: "page-website", kind: "channel", group: "Channels", title: "Website Intelligence", subtitle: "Website speed, health checks, security SSL & audit reports", href: "/admin/website", preview: [{ label: "Channel", value: "Website" }, { label: "Route", value: "/admin/website" }], score: 0 },

  // SEO
  { id: "page-seo", kind: "seo", group: "SEO", title: "SEO Overview", subtitle: "Search engine performance dashboard, traffic & domain visibility", href: "/admin/seo", preview: [{ label: "Section", value: "SEO" }, { label: "Route", value: "/admin/seo" }], score: 0 },
  { id: "page-seo-audit", kind: "seo", group: "SEO", title: "Site Audit", subtitle: "In-depth technical SEO crawl, error scores & fix guides", href: "/admin/seo/audit", preview: [{ label: "Section", value: "SEO" }, { label: "Route", value: "/admin/seo/audit" }], score: 0 },
  { id: "page-seo-pages", kind: "seo", group: "SEO", title: "SEO Pages", subtitle: "Crawled page inventory, HTTP status, indexability & vitals", href: "/admin/seo/pages", preview: [{ label: "Section", value: "SEO" }, { label: "Route", value: "/admin/seo/pages" }], score: 0 },
  { id: "page-seo-issues", kind: "seo", group: "SEO", title: "SEO Issues", subtitle: "Prioritised critical errors, warnings and performance notices", href: "/admin/seo/issues", preview: [{ label: "Section", value: "SEO" }, { label: "Route", value: "/admin/seo/issues" }], score: 0 },
  { id: "page-seo-keywords", kind: "seo", group: "SEO", title: "Keywords Tracker", subtitle: "Target keyword rankings, search intent & opportunity discovery", href: "/admin/seo/keywords", preview: [{ label: "Section", value: "SEO" }, { label: "Route", value: "/admin/seo/keywords" }], score: 0 },

  // CRM
  { id: "page-crm-leads", kind: "crm", group: "CRM", title: "Leads", subtitle: "Track inbound inquiries, lead status, sources & contact details", href: "/admin/crm/leads", preview: [{ label: "Section", value: "CRM" }, { label: "Route", value: "/admin/crm/leads" }], score: 0 },
  { id: "page-crm-contacts", kind: "crm", group: "CRM", title: "Contacts", subtitle: "Client & prospect contact directory with activity history", href: "/admin/crm/contacts", preview: [{ label: "Section", value: "CRM" }, { label: "Route", value: "/admin/crm/contacts" }], score: 0 },
  { id: "page-crm-pipeline", kind: "crm", group: "CRM", title: "Sales Pipeline", subtitle: "Visual Kanban deal stages, estimated revenue & conversions", href: "/admin/crm/pipeline", preview: [{ label: "Section", value: "CRM" }, { label: "Route", value: "/admin/crm/pipeline" }], score: 0 },
  { id: "page-crm-tasks", kind: "crm", group: "CRM", title: "CRM Tasks", subtitle: "Sales activities, call follow-ups, deadlines & assignments", href: "/admin/crm/tasks", preview: [{ label: "Section", value: "CRM" }, { label: "Route", value: "/admin/crm/tasks" }], score: 0 },

  // Workspace
  { id: "page-automation", kind: "workspace", group: "Workspace", title: "Automation", subtitle: "Visual workflow automations, webhooks & auto-responders", href: "/admin/automation", preview: [{ label: "Section", value: "Workspace" }, { label: "Route", value: "/admin/automation" }], score: 0 },
  { id: "page-automation-logs", kind: "workspace", group: "Workspace", title: "Automation Logs", subtitle: "Workflow execution logs, trigger events and audit history", href: "/admin/automation/logs", preview: [{ label: "Section", value: "Workspace" }, { label: "Route", value: "/admin/automation/logs" }], score: 0 },
  { id: "page-analytics", kind: "workspace", group: "Workspace", title: "Analytics", subtitle: "Unified cross-platform metrics, reach, engagement & conversions", href: "/admin/analytics", preview: [{ label: "Section", value: "Workspace" }, { label: "Route", value: "/admin/analytics" }], score: 0 },
  { id: "page-reports", kind: "workspace", group: "Workspace", title: "Reports", subtitle: "Automated executive PDF/CSV reports and scheduled sharing", href: "/admin/reports", preview: [{ label: "Section", value: "Workspace" }, { label: "Route", value: "/admin/reports" }], score: 0 },
  { id: "page-support", kind: "workspace", group: "Workspace", title: "Support & Tickets", subtitle: "Helpdesk tickets, client issues & resolution tracker", href: "/admin/support", preview: [{ label: "Section", value: "Workspace" }, { label: "Route", value: "/admin/support" }], score: 0 },

  // Management
  { id: "page-team", kind: "management", group: "Management", title: "Team Members", subtitle: "Manage staff, invite colleagues & assign workspace roles", href: "/admin/team", preview: [{ label: "Section", value: "Management" }, { label: "Route", value: "/admin/team" }], score: 0 },
  { id: "page-roles", kind: "management", group: "Management", title: "Roles & Permissions", subtitle: "Custom permission sets, access policies & role matrix", href: "/admin/roles", preview: [{ label: "Section", value: "Management" }, { label: "Route", value: "/admin/roles" }], score: 0 },
  { id: "page-integrations", kind: "management", group: "Management", title: "Integrations", subtitle: "Connect third-party marketing, analytics & messaging tools", href: "/admin/integrations", preview: [{ label: "Section", value: "Management" }, { label: "Route", value: "/admin/integrations" }], score: 0 },
  { id: "page-billing", kind: "management", group: "Management", title: "Billing & Subscriptions", subtitle: "Company plan tier, payment invoices & add-on usage", href: "/admin/billing", preview: [{ label: "Section", value: "Management" }, { label: "Route", value: "/admin/billing" }], score: 0 },
  { id: "page-settings", kind: "management", group: "Management", title: "Organization Settings", subtitle: "Company branding, custom domain, timezone & general config", href: "/admin/settings", preview: [{ label: "Section", value: "Management" }, { label: "Route", value: "/admin/settings" }], score: 0 },
];

const COMMAND_RESULTS: AdminSearchResult[] = [
  { id: "cmd-create-post", kind: "command", group: "Commands", title: "Create Post", subtitle: "Draft and schedule a new social media update", href: "/admin/content", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Open Content Studio" }, { label: "Destination", value: "/admin/content" }], score: 0 },
  { id: "cmd-add-lead", kind: "command", group: "Commands", title: "Add Lead", subtitle: "Create a new prospect in the CRM pipeline", href: "/admin/crm/leads", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Capture Lead" }, { label: "Destination", value: "/admin/crm/leads" }], score: 0 },
  { id: "cmd-new-campaign", kind: "command", group: "Commands", title: "Create Campaign", subtitle: "Configure a marketing campaign across channels", href: "/admin/campaigns", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Launch Campaign" }, { label: "Destination", value: "/admin/campaigns" }], score: 0 },
  { id: "cmd-add-client", kind: "command", group: "Commands", title: "Add Client", subtitle: "Onboard a new client workspace to your agency", href: "/admin/clients", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Create Client" }, { label: "Destination", value: "/admin/clients" }], score: 0 },
  { id: "cmd-run-audit", kind: "command", group: "Commands", title: "Run SEO Audit", subtitle: "Initiate full technical SEO crawler on website", href: "/admin/seo/audit", badge: "Command", tone: "info", preview: [{ label: "Action", value: "Trigger Site Audit" }, { label: "Destination", value: "/admin/seo/audit" }], score: 0 },
  { id: "cmd-invite-team", kind: "command", group: "Commands", title: "Invite Team Member", subtitle: "Invite staff or agency collaborators", href: "/admin/team", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Send Invitation" }, { label: "Destination", value: "/admin/team" }], score: 0 },
  { id: "cmd-connect-channel", kind: "command", group: "Commands", title: "Connect Channel", subtitle: "Authorize Meta, Google, LinkedIn or YouTube", href: "/admin/integrations", badge: "Command", tone: "neutral", preview: [{ label: "Action", value: "Manage Connections" }, { label: "Destination", value: "/admin/integrations" }], score: 0 },
  { id: "cmd-ai-assistant", kind: "command", group: "Commands", title: "Ask AI Assistant", subtitle: "Open OmniPlatform intelligent copilot", href: "#assistant", badge: "AI Copilot", tone: "brand", preview: [{ label: "Action", value: "Launch Copilot" }, { label: "Feature", value: "Interactive AI Chat" }], score: 0, isAiAction: true },
];

const SUGGESTED_CHIPS = [
  { label: "Clients", query: "clients" },
  { label: "Marketing", query: "marketing" },
  { label: "Channels", query: "channels" },
  { label: "SEO", query: "seo" },
  { label: "CRM", query: "crm" },
  { label: "Team", query: "team" },
  { label: "Billing", query: "billing" },
  { label: "Commands", query: "command" },
];

const SYNONYMS: Record<string, string[]> = {
  post: ["content", "studio", "publish", "schedule", "social"],
  content: ["post", "studio", "calendar", "publish"],
  lead: ["leads", "crm", "contacts", "pipeline", "sales"],
  client: ["clients", "workspace", "account", "company"],
  seo: ["audit", "keywords", "pages", "issues", "crawl", "google"],
  ads: ["meta", "campaigns", "facebook", "instagram"],
  bill: ["billing", "invoice", "invoices", "subscription", "plan"],
  staff: ["team", "members", "users", "roles", "permissions"],
  user: ["team", "members", "staff"],
  ai: ["assistant", "copilot", "chat", "automation"],
  bot: ["assistant", "automation", "copilot"],
  video: ["youtube", "media"],
  tweet: ["x", "twitter"],
  insta: ["meta", "instagram"],
  fb: ["meta", "facebook"],
};

function readRecents(): AdminSearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: AdminSearchResult) {
  if (typeof window === "undefined") return;
  const current = readRecents();
  const next = [item, ...current.filter((recent) => recent.id !== item.id)].slice(0, 5);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

function readPinned(): AdminSearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PINNED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function savePinned(items: AdminSearchResult[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PINNED_KEY, JSON.stringify(items.slice(0, 8)));
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={`${part}-${index}`} className="rounded-sm bg-amber-100 px-0.5 text-amber-900 font-medium">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function ResultRow({
  item,
  active,
  pinned,
  term,
  onSelect,
  onHover,
  onTogglePin,
}: {
  item: AdminSearchResult;
  active: boolean;
  pinned: boolean;
  term: string;
  onSelect: () => void;
  onHover: () => void;
  onTogglePin: () => void;
}) {
  const Icon = item.isAiAction ? SparklesIcon : iconByGroup[item.group] ?? iconByKind[item.kind] ?? PanelsTopLeftIcon;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus:outline-none ${
        active ? "bg-slate-100/90 text-slate-900" : "hover:bg-slate-50 text-slate-700"
      }`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
          active
            ? "border-blue-200 bg-blue-50 text-blue-600 shadow-sm"
            : "border-slate-200 bg-white text-slate-500 shadow-xs group-hover:border-slate-300"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-slate-800">
          <Highlight text={item.title} term={term} />
        </p>
        <p className="mt-0.5 truncate text-[11.5px] leading-tight text-slate-500">
          <Highlight text={item.subtitle} term={term} />
        </p>
      </div>

      {item.badge ? (
        <Badge tone={item.tone ?? "neutral"} className="hidden sm:inline-flex capitalize">
          {item.badge}
        </Badge>
      ) : null}

      <span
        role="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin();
        }}
        className={`hidden rounded p-1 transition-colors hover:bg-white sm:inline-flex ${
          pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"
        }`}
        title={pinned ? "Unpin" : "Pin"}
      >
        <StarIcon className={`size-3.5 ${pinned ? "fill-current" : ""}`} />
      </span>

      <ChevronRightIcon
        className={`hidden size-4 text-slate-400 transition-opacity sm:block ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

export function AdminGlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { Clients, setSelectedProjectId } = useAdminContext();
  const { open: openAssistant } = useAssistant();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<AdminSearchResult[]>([]);
  const [pinned, setPinned] = useState<AdminSearchResult[]>([]);
  const [previewFocused, setPreviewFocused] = useState(false);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((curr) => !curr);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Sync recents & pinned on open
  useEffect(() => {
    if (open) {
      setRecents(readRecents());
      setPinned(readPinned());
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Map dynamic Clients from workspace context into searchable items
  const clientResults = useMemo<AdminSearchResult[]>(() => {
    if (!Clients || Clients.length === 0) return [];
    return Clients.map((client: Project) => ({
      id: `client-${client.id}`,
      kind: "client",
      group: "Clients",
      title: client.name,
      subtitle: client.website ? `Client Workspace · ${client.website}` : "Client Workspace",
      href: "/admin/clients",
      badge: "Client",
      tone: "info",
      preview: [
        { label: "Client Name", value: client.name },
        { label: "Website", value: client.website || "No URL provided" },
        { label: "Status", value: client.status ?? "Active" },
        { label: "Action", value: "Switch active client & open directory" },
      ],
      score: 0,
      clientId: client.id,
    }));
  }, [Clients]);

  // All catalog items
  const allItems = useMemo<AdminSearchResult[]>(() => {
    return [...PAGE_RESULTS, ...COMMAND_RESULTS, ...clientResults];
  }, [clientResults]);

  // Scoring algorithm matching superadmin intelligence
  const scoredResults = useMemo<AdminSearchResult[]>(() => {
    const q = debounced.toLowerCase();
    if (!q) {
      return [
        ...pinned.map((item) => ({ ...item, group: "Pinned" })),
        ...recents
          .filter((recent) => !pinned.some((item) => item.id === recent.id))
          .map((item) => ({ ...item, group: "Recent" })),
      ];
    }

    const parts = q.split(/\s+/).filter(Boolean);
    const expanded = Array.from(
      new Set([q, ...parts, ...parts.flatMap((p) => SYNONYMS[p] ?? [])]),
    );

    return allItems
      .map((item) => {
        let best = 0;
        const titleLower = item.title.toLowerCase();
        const subtitleLower = item.subtitle.toLowerCase();
        const groupLower = item.group.toLowerCase();
        const haystack = `${titleLower} ${subtitleLower} ${groupLower}`;

        expanded.forEach((needle) => {
          if (!needle) return;
          if (titleLower === needle) best = Math.max(best, 600);
          else if (titleLower.startsWith(needle)) best = Math.max(best, 460);
          else if (haystack.includes(needle)) best = Math.max(best, 260);
          else {
            // Check character match if query is 2+ chars
            if (needle.length >= 2 && haystack.includes(needle.slice(0, 3))) {
              best = Math.max(best, 90);
            }
          }
        });

        return { ...item, score: best };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }, [debounced, allItems, pinned, recents]);

  const isActive = debounced.length > 0;
  const results = scoredResults;
  const selected = results[activeIndex] ?? results[0] ?? null;
  const grouped = useMemo(
    () => Array.from(new Set(results.map((item) => item.group))),
    [results],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced, open]);

  useEffect(() => {
    const activeElem = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    activeElem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  const handleSelect = (item: AdminSearchResult, newTab = false) => {
    saveRecent(item);
    setRecents(readRecents());
    setOpen(false);
    setTerm("");
    setDebounced("");
    setActiveIndex(0);

    if (item.isAiAction) {
      openAssistant();
      return;
    }

    if (item.clientId) {
      setSelectedProjectId(item.clientId);
    }

    if (newTab && typeof window !== "undefined") {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(item.href);
  };

  const togglePin = (item: AdminSearchResult) => {
    const next = pinned.some((entry) => entry.id === item.id)
      ? pinned.filter((entry) => entry.id !== item.id)
      : [item, ...pinned].slice(0, 8);
    setPinned(next);
    savePinned(next);
  };

  return (
    <>
      {/* Search Input Trigger in Admin Topbar */}
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="relative flex h-9 w-full max-w-[260px] items-center gap-2.5 rounded-sm bg-[#F4F4F5] px-4 text-left transition-colors hover:bg-[#E4E4E7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="Open search dialog"
      >
        <SearchIcon className="size-4 text-[#A1A1AA] shrink-0" />
        <span className="flex-1 truncate text-[13px] text-[#A1A1AA]">Search...</span>
        <kbd className="hidden items-center gap-1 rounded border border-[#E4E4E7] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#71717A] shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:flex">
          Ctrl K
        </kbd>
      </button>

      {/* Main Search Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
          {/* Header Input Area */}
          <div className="flex items-center border-b border-slate-100 px-4 bg-slate-50/50">
            <SearchIcon className="size-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              className="flex h-14 w-full bg-transparent px-4 py-3 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Search pages, commands, clients, channels, SEO, leads, team..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                }
                if (e.key === "Tab" && selected) {
                  e.preventDefault();
                  setPreviewFocused((value) => !value);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((index) =>
                    Math.min(index + 1, Math.max(results.length - 1, 0)),
                  );
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((index) => Math.max(index - 1, 0));
                }
                if (e.key === "Enter" && selected) {
                  e.preventDefault();
                  handleSelect(selected, e.metaKey || e.ctrlKey);
                }
              }}
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results + Preview Layout */}
          <div className="grid max-h-[68vh] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_310px]">
            {/* Results Column */}
            <div
              ref={listRef}
              className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200"
            >
              {/* Empty state with helpful filter tags */}
              {!isActive && recents.length === 0 && pinned.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <p className="font-medium text-slate-700">Type to search across OmniPlatform</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Jump directly to any page, execute quick actions, or switch clients.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    {SUGGESTED_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setTerm(chip.query)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 transition-all"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* No results found state */}
              {isActive && results.length === 0 ? (
                <div className="space-y-4 px-4 py-10 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <SearchIcon className="size-6" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">
                      No results found for "{debounced}"
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try searching for pages, clients, channels, keywords, or quick commands.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-left pt-2">
                    {PAGE_RESULTS.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-semibold text-slate-700 block">{item.title}</span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {item.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Grouped results list */}
              {results.length > 0 ? (
                <div className="space-y-2">
                  {grouped.map((group) => {
                    const GroupIcon = iconByGroup[group] ?? PanelsTopLeftIcon;
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {group === "Pinned" ? (
                            <StarIcon className="size-3 text-amber-500 fill-current" />
                          ) : group === "Recent" ? (
                            <HistoryIcon className="size-3 text-slate-400" />
                          ) : (
                            <GroupIcon className="size-3 text-slate-400" />
                          )}
                          <span>{group}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {results
                            .filter((item) => item.group === group)
                            .map((item) => {
                              const absoluteIndex = results.findIndex(
                                (r) => r.id === item.id,
                              );
                              return (
                                <li key={item.id}>
                                  <div
                                    data-active={
                                      absoluteIndex === activeIndex ? "true" : "false"
                                    }
                                  >
                                    <ResultRow
                                      item={item}
                                      active={absoluteIndex === activeIndex}
                                      pinned={pinned.some((p) => p.id === item.id)}
                                      term={debounced}
                                      onHover={() => setActiveIndex(absoluteIndex)}
                                      onSelect={() => handleSelect(item)}
                                      onTogglePin={() => togglePin(item)}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Preview Aside Panel */}
            <aside
              className={`hidden border-l border-slate-100 bg-slate-50/70 p-4.5 md:flex md:flex-col justify-between ${
                previewFocused ? "ring-2 ring-inset ring-blue-300" : ""
              }`}
            >
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm">
                      {(() => {
                        const Icon = selected.isAiAction
                          ? SparklesIcon
                          : iconByGroup[selected.group] ??
                            iconByKind[selected.kind] ??
                            PanelsTopLeftIcon;
                        return <Icon className="size-5" />;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold leading-tight text-slate-900">
                        <Highlight text={selected.title} term={debounced} />
                      </p>
                      {selected.badge && (
                        <Badge tone={selected.tone ?? "neutral"} className="text-2xs">
                          {selected.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      <Highlight text={selected.subtitle} term={debounced} />
                    </p>
                  </div>

                  <div className="space-y-2">
                    {selected.preview.map((row) => (
                      <div
                        key={`${selected.id}-${row.label}`}
                        className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-xs"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {row.label}
                        </p>
                        <p className="mt-0.5 break-words text-xs font-semibold text-slate-700">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                  Select a result to preview details
                </div>
              )}

              {/* Keyboard helper hints footer */}
              <div className="mt-4 border-t border-slate-200/70 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                  <span>
                    <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px]">
                      ↑
                    </kbd>{" "}
                    <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px]">
                      ↓
                    </kbd>{" "}
                    navigate
                  </span>
                  <span>
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                      ↵
                    </kbd>{" "}
                    open
                  </span>
                  <span>
                    <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px]">
                      Esc
                    </kbd>{" "}
                    close
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
