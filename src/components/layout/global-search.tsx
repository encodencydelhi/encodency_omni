"use client";

import {
  ActivityIcon,
  BellIcon,
  BotMessageSquareIcon,
  Building2Icon,
  CreditCardIcon,
  FlagIcon,
  FolderIcon,
  HeadsetIcon,
  HeartPulseIcon,
  ReceiptIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  WebhookIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { superAdminCompaniesApi } from "@/features/companies/live/super-admin-companies-api";
import { superAdminPlansApi } from "@/features/plans-subscriptions/live/super-admin-plans-api";
import { deskApi } from "@/features/support/api";
import { superAdminUsersApi } from "@/features/users/live/super-admin-users-api";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS = 250;
const MAX_RESULTS_PER_GROUP = 6;

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: string;
  icon: LucideIcon;
  badge?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
};

const pageShortcuts: SearchResult[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Super Admin Overview", href: ROUTES.superAdmin.dashboard, group: "Pages", icon: ServerIcon },
  { id: "companies", title: "Companies", subtitle: "Company Directory", href: ROUTES.superAdmin.companies, group: "Pages", icon: Building2Icon },
  { id: "clients", title: "Clients", subtitle: "Client Directory", href: ROUTES.superAdmin.Clients, group: "Pages", icon: FolderIcon },
  { id: "users", title: "Users", subtitle: "User Access And Security", href: ROUTES.superAdmin.users, group: "Pages", icon: UserIcon },
  { id: "team", title: "Internal Team", subtitle: "Staff, Roles And Assignments", href: ROUTES.superAdmin.team, group: "Pages", icon: UsersIcon },
  { id: "plans", title: "Plans", subtitle: "Plan Catalogue And Pricing", href: ROUTES.superAdmin.plans, group: "Pages", icon: ReceiptIcon },
  { id: "subscriptions", title: "Subscriptions", subtitle: "Company Subscriptions", href: ROUTES.superAdmin.subscriptions, group: "Pages", icon: CreditCardIcon },
  { id: "billing", title: "Billing", subtitle: "Invoices, Payments And Accounts", href: ROUTES.superAdmin.billing, group: "Pages", icon: CreditCardIcon },
  { id: "usage", title: "Usage", subtitle: "Limits, Metering And Overrides", href: ROUTES.superAdmin.usage, group: "Pages", icon: ActivityIcon },
  { id: "support", title: "Support", subtitle: "Support Desk And Tickets", href: ROUTES.superAdmin.support, group: "Pages", icon: HeadsetIcon },
  { id: "assistant", title: "AI Assistant", subtitle: "Conversations, Knowledge And Quality", href: ROUTES.superAdmin.assistant, group: "Pages", icon: BotMessageSquareIcon },
  { id: "integrations", title: "Integrations", subtitle: "Providers, Connections And Issues", href: ROUTES.superAdmin.integrations, group: "Pages", icon: ServerIcon },
  { id: "webhooks", title: "Webhooks", subtitle: "Incoming And Outgoing Webhooks", href: ROUTES.superAdmin.webhooks, group: "Pages", icon: WebhookIcon },
  { id: "feature-flags", title: "Feature Flags", subtitle: "Rollouts And Company Access", href: ROUTES.superAdmin.featureFlags, group: "Pages", icon: FlagIcon },
  { id: "audit-logs", title: "Audit Logs", subtitle: "Security And Platform Events", href: ROUTES.superAdmin.auditLogs, group: "Pages", icon: ShieldCheckIcon },
  { id: "system-health", title: "System Health", subtitle: "Services, Incidents And Maintenance", href: ROUTES.superAdmin.systemHealth, group: "Pages", icon: HeartPulseIcon },
  { id: "api-monitoring", title: "API Monitoring", subtitle: "Requests, Performance And Availability", href: ROUTES.superAdmin.apiMonitoring, group: "Pages", icon: ActivityIcon },
  { id: "notifications", title: "Notifications", subtitle: "Center, Campaigns And Deliveries", href: ROUTES.superAdmin.notifications, group: "Pages", icon: BellIcon },
  { id: "settings", title: "Settings", subtitle: "Global Platform Configuration", href: ROUTES.superAdmin.settings, group: "Pages", icon: SettingsIcon },
  { id: "jobs", title: "Jobs", subtitle: "Background Jobs And Workers", href: ROUTES.superAdmin.jobs, group: "Pages", icon: ServerIcon },
];

const includesTerm = (value: string | null | undefined, term: string) => (value ?? "").toLowerCase().includes(term.toLowerCase());

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function emptyPage<T>() {
  return { items: [] as T[], total: 0, page: 1, limit: MAX_RESULTS_PER_GROUP };
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;

  const matchAt = text.toLowerCase().indexOf(term.toLowerCase());
  if (matchAt < 0) return <>{text}</>;

  const before = text.slice(0, matchAt);
  const match = text.slice(matchAt, matchAt + term.length);
  const after = text.slice(matchAt + term.length);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-amber-900">{match}</mark>
      {after}
    </>
  );
}

async function searchSuperAdmin(term: string): Promise<SearchResult[]> {
  const [companies, clients, users, tickets, plans, subscriptions] = await Promise.all([
    safe(superAdminCompaniesApi.list({ page: 1, limit: MAX_RESULTS_PER_GROUP, search: term }), emptyPage()),
    safe(superAdminCompaniesApi.listClients({ page: 1, limit: MAX_RESULTS_PER_GROUP, search: term }), emptyPage()),
    safe(superAdminUsersApi.list({ page: 1, limit: MAX_RESULTS_PER_GROUP, search: term }), emptyPage()),
    safe(deskApi.list({ page: 1, limit: MAX_RESULTS_PER_GROUP, search: term }), emptyPage()),
    safe(superAdminPlansApi.listPlans(), []),
    safe(superAdminPlansApi.listSubscriptions(), []),
  ]);

  const pageResults = pageShortcuts.filter((item) => includesTerm(`${item.title} ${item.subtitle}`, term)).slice(0, MAX_RESULTS_PER_GROUP);
  const planResults = plans
    .filter((plan) => includesTerm(plan.name, term))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map<SearchResult>((plan) => ({
      id: `plan-${plan.id}`,
      title: plan.name,
      subtitle: `Plan - Rs ${(plan.monthlyPrice / 100).toLocaleString("en-IN")}/month`,
      href: `${ROUTES.superAdmin.plans}/${plan.id}`,
      group: "Plans",
      icon: ReceiptIcon,
      badge: plan.isActive ? "Active" : "Inactive",
      tone: plan.isActive ? "success" : "neutral",
    }));
  const subscriptionResults = subscriptions
    .filter((sub) => includesTerm(`${sub.company?.name ?? ""} ${sub.plan?.name ?? ""} ${sub.status}`, term))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map<SearchResult>((sub) => ({
      id: `subscription-${sub.id}`,
      title: sub.company?.name ?? "Subscription",
      subtitle: `${sub.plan?.name ?? "Plan"} Subscription`,
      href: `${ROUTES.superAdmin.subscriptions}/${sub.id}`,
      group: "Subscriptions",
      icon: CreditCardIcon,
      badge: sub.status.replaceAll("_", " "),
      tone: sub.status === "ACTIVE" ? "success" : sub.status === "PAST_DUE" ? "warning" : "neutral",
    }));

  return [
    ...pageResults,
    ...companies.items.map<SearchResult>((company) => ({
      id: `company-${company.id}`,
      title: company.name,
      subtitle: `Company - ${company.ownerEmail ?? "No Owner Email"}`,
      href: ROUTES.superAdmin.company(company.id),
      group: "Companies",
      icon: Building2Icon,
      badge: company.status === "ACTIVE" ? "Active" : "Archived",
      tone: company.status === "ACTIVE" ? "success" : "neutral",
    })),
    ...clients.items.map<SearchResult>((client) => ({
      id: `client-${client.id}`,
      title: client.displayName ?? client.name,
      subtitle: `Client - ${client.companyName}`,
      href: ROUTES.superAdmin.client(client.id),
      group: "Clients",
      icon: FolderIcon,
      badge: client.industry ?? undefined,
      tone: "info",
    })),
    ...users.items.map<SearchResult>((user) => ({
      id: `user-${user.id}`,
      title: user.name ?? user.email,
      subtitle: `User - ${user.email}`,
      href: ROUTES.superAdmin.user(user.id),
      group: "Users",
      icon: UserIcon,
      badge: user.status === "ACTIVE" ? "Active" : "Deactivated",
      tone: user.status === "ACTIVE" ? "success" : "neutral",
    })),
    ...tickets.items.map<SearchResult>((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: `#${ticket.number} ${ticket.subject}`,
      subtitle: `Support - ${ticket.company.name}`,
      href: `${ROUTES.superAdmin.support}/tickets/${ticket.number}`,
      group: "Support Tickets",
      icon: HeadsetIcon,
      badge: ticket.status.replaceAll("_", " "),
      tone: ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : "neutral",
    })),
    ...planResults,
    ...subscriptionResults,
  ];
}

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = debounced.length >= MIN_QUERY_LENGTH;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => searchSuperAdmin(debounced),
    enabled: isActive,
    staleTime: 30_000,
  });

  const goTo = (href: string) => {
    setOpen(false);
    setTerm("");
    setDebounced("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-full max-w-[260px] items-center gap-2.5 rounded-sm bg-[#F4F4F5] px-4 transition-colors hover:bg-[#E4E4E7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#E4E4E7]"
      >
        <SearchIcon className="size-4 text-[#A1A1AA]" />
        <span className="flex-1 text-left text-[13px] text-[#A1A1AA]">Search...</span>
        <kbd className="hidden sm:flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[12px] font-medium text-[#A1A1AA] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E4E4E7]">
          <span>⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center border-b border-slate-100 px-4">
            <SearchIcon className="size-5 text-slate-400" />
            <input
              ref={inputRef}
              className="flex h-14 w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-slate-400 text-slate-800"
              placeholder="Search companies, users, clients, invoices..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && debounced && results && results.length > 0) {
                  const firstResult = results[0];
                  if (firstResult) {
                    goTo(firstResult.href);
                  }
                }
              }}
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-2">
            {!isActive && (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                <p>Type to search across the platform.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><Building2Icon className="size-3" /> Companies</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><UserIcon className="size-3" /> Users</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><FolderIcon className="size-3" /> Clients</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><ServerIcon className="size-3" /> Platform</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><ReceiptIcon className="size-3" /> Billing</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><HeadsetIcon className="size-3" /> Support</span>
                </div>
              </div>
            )}

            {isActive && isFetching && results.length === 0 && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {isActive && !isFetching && results.length === 0 && (
              <p className="px-3 py-10 text-center text-[13px] text-slate-500">
                No results found for “{debounced}”
              </p>
            )}

            {isActive && results.length > 0 && (
              <div className="space-y-1">
                {Array.from(new Set(results.map((item) => item.group))).map((group) => (
                  <div key={group}>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{group}</div>
                    <ul>
                      {results.filter((item) => item.group === group).map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => goTo(item.href)}
                              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm text-slate-600">
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-slate-800 leading-tight">
                                  <Highlight text={item.title} term={debounced} />
                                </p>
                                <p className="mt-0.5 truncate text-[12px] text-slate-500 leading-tight">
                                  <Highlight text={item.subtitle} term={debounced} />
                                </p>
                              </div>
                              {item.badge ? (
                                <Badge tone={item.tone ?? "neutral"} className="hidden max-w-32 capitalize sm:inline-flex">
                                  <span className="truncate">{item.badge.toLowerCase()}</span>
                                </Badge>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
