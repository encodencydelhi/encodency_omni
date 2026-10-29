"use client";

import {
  ActivityIcon,
  BellIcon,
  BotMessageSquareIcon,
  Building2Icon,
  ChevronRightIcon,
  CommandIcon,
  CreditCardIcon,
  FileTextIcon,
  FlagIcon,
  FolderIcon,
  HeadsetIcon,
  HeartPulseIcon,
  HistoryIcon,
  ReceiptIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  UserCogIcon,
  UserIcon,
  WebhookIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { superAdminSearchApi, type SuperAdminSearchKind, type SuperAdminSearchResult } from "@/features/super-admin-search/api";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS = 220;
const RECENTS_KEY = "super-admin-global-search-recents";
const PINNED_KEY = "super-admin-global-search-pinned";

const iconByKind: Record<SuperAdminSearchKind, LucideIcon> = {
  page: ServerIcon,
  command: CommandIcon,
  company: Building2Icon,
  client: FolderIcon,
  user: UserIcon,
  staff: UserCogIcon,
  support_ticket: HeadsetIcon,
  plan: ReceiptIcon,
  subscription: CreditCardIcon,
  invoice: FileTextIcon,
  payment: CreditCardIcon,
  billing_account: CreditCardIcon,
  integration: ServerIcon,
  audit_log: ShieldCheckIcon,
  notification: BellIcon,
  webhook: WebhookIcon,
  api_request: ActivityIcon,
};

/** `prefix` limits the search to one kind ("team: anita"); the backend understands the same words. */
const suggestedKinds = [
  { label: "Companies", icon: Building2Icon, prefix: "company: " },
  { label: "Users", icon: UserIcon, prefix: "user: " },
  { label: "Internal Team", icon: UserCogIcon, prefix: "team: " },
  { label: "Clients", icon: FolderIcon, prefix: "client: " },
  { label: "Billing", icon: ReceiptIcon, prefix: "invoice: " },
  { label: "Support", icon: HeadsetIcon, prefix: "ticket: " },
  { label: "Webhooks", icon: WebhookIcon, prefix: "webhook: " },
  { label: "Audit", icon: ShieldCheckIcon, prefix: "audit: " },
  { label: "Assistant", icon: BotMessageSquareIcon, prefix: "assistant" },
  { label: "Health", icon: HeartPulseIcon, prefix: "health" },
  { label: "Flags", icon: FlagIcon, prefix: "flags" },
  { label: "Settings", icon: SettingsIcon, prefix: "settings" },
];

const prefixByKind: Partial<Record<SuperAdminSearchKind, string>> = {
  company: "company",
  client: "client",
  user: "user",
  staff: "team",
  support_ticket: "ticket",
  plan: "plan",
  subscription: "subscription",
  invoice: "invoice",
  payment: "payment",
  webhook: "webhook",
  audit_log: "audit",
  api_request: "request",
};

const emptySuggestions: SuperAdminSearchResult[] = [
  { id: "empty-companies", kind: "page", group: "Suggestions", title: "Search Companies", subtitle: "Open company directory", href: "/super-admin/companies", preview: [{ label: "Open", value: "/super-admin/companies" }], score: 0 },
  { id: "empty-users", kind: "page", group: "Suggestions", title: "Open Users", subtitle: "Review users and access", href: "/super-admin/users", preview: [{ label: "Open", value: "/super-admin/users" }], score: 0 },
  { id: "empty-create-company", kind: "command", group: "Suggestions", title: "Create Company", subtitle: "Start company onboarding", href: "/super-admin/companies?create=1", badge: "Command", tone: "brand", preview: [{ label: "Action", value: "Create company" }], score: 0 },
  { id: "empty-audit", kind: "page", group: "Suggestions", title: "Check Audit Logs", subtitle: "Investigate platform events", href: "/super-admin/audit-logs", preview: [{ label: "Open", value: "/super-admin/audit-logs" }], score: 0 },
];

function saveRecent(item: SuperAdminSearchResult) {
  if (typeof window === "undefined") return;
  const current = readRecents();
  const next = [item, ...current.filter((recent) => recent.href !== item.href)].slice(0, 5);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private window); recents are a convenience only.
  }
}

function readRecents(): SuperAdminSearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function readPinned(): SuperAdminSearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PINNED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function savePinned(items: SuperAdminSearchResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // Storage can be blocked (private window); pins are a convenience only.
  }
}

/** Marks every typed word (not just the whole phrase), so "va ch" lights up both "Vansh" and "Chaudhary". */
function Highlight({ text, term }: { text: string; term: string }) {
  const words = Array.from(new Set(term.toLowerCase().split(/\s+/).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (words.length === 0) return <>{text}</>;
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, index) =>
        words.includes(part.toLowerCase()) ? (
          <mark key={`${part}-${index}`} className="rounded-sm bg-amber-100 px-0.5 text-amber-900">
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
  item: SuperAdminSearchResult;
  active: boolean;
  pinned: boolean;
  term: string;
  onSelect: () => void;
  onHover: () => void;
  onTogglePin: () => void;
}) {
  const Icon = iconByKind[item.kind] ?? SearchIcon;
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors focus:outline-none ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium leading-tight text-slate-800">
          <Highlight text={item.title} term={term} />
        </p>
        <p className="mt-0.5 truncate text-[12px] leading-tight text-slate-500">
          <Highlight text={item.subtitle} term={term} />
        </p>
      </div>
      {item.badge ? (
        <Badge tone={item.tone ?? "neutral"} className="hidden max-w-32 capitalize sm:inline-flex">
          <span className="truncate">{item.badge.toLowerCase().replaceAll("_", " ")}</span>
        </Badge>
      ) : null}
      <span
        role="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin();
        }}
        className={`hidden rounded p-1 transition-colors hover:bg-white sm:inline-flex ${pinned ? "text-amber-500" : "text-slate-300"}`}
        title={pinned ? "Unpin" : "Pin"}
      >
        <StarIcon className={`size-4 ${pinned ? "fill-current" : ""}`} />
      </span>
      <ChevronRightIcon className={`hidden size-4 text-slate-400 sm:block ${active ? "opacity-100" : "opacity-0"}`} />
    </button>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<SuperAdminSearchResult[]>([]);
  const [pinned, setPinned] = useState<SuperAdminSearchResult[]>([]);
  const [previewFocused, setPreviewFocused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      setRecents(readRecents());
      setPinned(readPinned());
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const isActive = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["super-admin-search", debounced],
    queryFn: ({ signal }) => superAdminSearchApi.search(debounced, 30, signal),
    enabled: isActive,
    staleTime: 20_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const searchedText = data?.text ?? debounced;
  const moreByGroup = useMemo(() => new Map((data?.more ?? []).map((entry) => [entry.group, entry])), [data?.more]);

  const results = isActive
    ? data?.items ?? []
    : [
      ...pinned.map((item) => ({ ...item, group: "Pinned" })),
      ...recents.filter((recent) => !pinned.some((item) => item.href === recent.href)).map((item) => ({ ...item, group: "Recent" })),
    ];
  const selected = results[activeIndex] ?? results[0] ?? null;
  const grouped = useMemo(() => Array.from(new Set(results.map((item) => item.group))), [results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced, open]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  const goTo = (item: SuperAdminSearchResult, newTab = false) => {
    saveRecent(item);
    setRecents(readRecents());
    void superAdminSearchApi.recordClick(debounced || term || item.title, item).catch(() => undefined);
    setOpen(false);
    setTerm("");
    setDebounced("");
    setActiveIndex(0);
    if (newTab && typeof window !== "undefined") {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.href);
  };

  const togglePin = (item: SuperAdminSearchResult) => {
    const next = pinned.some((entry) => entry.href === item.href) ? pinned.filter((entry) => entry.href !== item.href) : [item, ...pinned].slice(0, 8);
    setPinned(next);
    savePinned(next);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-full max-w-[260px] items-center gap-2.5 rounded-sm bg-[#F4F4F5] px-4 transition-colors hover:bg-[#E4E4E7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#E4E4E7]"
      >
        <SearchIcon className="size-4 text-[#A1A1AA]" />
        <span className="flex-1 text-left text-[13px] text-[#A1A1AA]">Search...</span>
        <kbd className="hidden items-center gap-1 rounded border border-[#E4E4E7] bg-white px-1.5 py-0.5 text-[12px] font-medium text-[#A1A1AA] shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:flex">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="flex items-center border-b border-slate-100 px-4">
            <SearchIcon className="size-5 text-slate-400" />
            <input
              ref={inputRef}
              className="flex h-14 w-full bg-transparent px-4 py-3 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Search pages, commands, companies, users, invoices, tickets..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Tab" && selected) {
                  e.preventDefault();
                  setPreviewFocused((value) => !value);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((index) => Math.max(index - 1, 0));
                }
                if (e.key === "Enter" && selected) {
                  e.preventDefault();
                  goTo(selected, e.metaKey || e.ctrlKey);
                }
              }}
            />
          </div>

          <div className="grid max-h-[68vh] grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_300px]">
            <div ref={listRef} className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
              {!isActive && recents.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  <p>Type to search across the platform.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {suggestedKinds.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setTerm(item.prefix);
                            inputRef.current?.focus();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200"
                        >
                          <Icon className="size-3" /> {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-slate-400">Tip: start with a word and a colon, like <span className="font-medium text-slate-500">team: anita</span> or <span className="font-medium text-slate-500">invoice: INV-0042</span>, to search one kind only.</p>
                </div>
              ) : null}

              {isActive && isFetching && results.length === 0 ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : null}

              {isActive && isError && !isFetching && results.length === 0 ? (
                <div className="space-y-3 px-3 py-8 text-center">
                  <p className="text-[13px] text-slate-600">Search could not be completed right now.</p>
                  <button type="button" onClick={() => void refetch()} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Try again
                  </button>
                </div>
              ) : null}

              {isActive && !isError && !isFetching && data && data.text === "" ? (
                <p className="px-3 py-8 text-center text-[13px] text-slate-500">Type what to look for after "{debounced}"</p>
              ) : null}

              {isActive && !isError && !isFetching && results.length === 0 && !(data && data.text === "") ? (
                <div className="space-y-3 px-3 py-6">
                  <p className="text-center text-[13px] text-slate-500">No results found for "{searchedText}"</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {emptySuggestions.map((item) => (
                      <button key={item.id} type="button" onClick={() => goTo(item)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {item.title}
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{item.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {results.length > 0 ? (
                <div className="space-y-1">
                  {grouped.map((group) => (
                    <div key={group}>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {!isActive && group === "Pinned" ? <StarIcon className="size-3.5 text-amber-500" /> : null}
                        {!isActive && group === "Recent" ? <HistoryIcon className="size-3.5" /> : null}
                        {group}
                      </div>
                      <ul>
                        {results
                          .filter((item) => item.group === group)
                          .map((item) => {
                            const absoluteIndex = results.findIndex((result) => result.id === item.id);
                            return (
                              <li key={item.id}>
                                <div data-active={absoluteIndex === activeIndex ? "true" : "false"}>
                                  <ResultRow
                                    item={item}
                                    active={absoluteIndex === activeIndex}
                                    pinned={pinned.some((entry) => entry.href === item.href)}
                                    term={isActive ? searchedText : ""}
                                    onHover={() => setActiveIndex(absoluteIndex)}
                                    onSelect={() => goTo(item)}
                                    onTogglePin={() => togglePin(item)}
                                  />
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                      {isActive && moreByGroup.has(group) && prefixByKind[moreByGroup.get(group)!.kind] ? (
                        <button
                          type="button"
                          onClick={() => {
                            const entry = moreByGroup.get(group)!;
                            setTerm(`${prefixByKind[entry.kind]}: ${searchedText}`);
                            inputRef.current?.focus();
                          }}
                          className="ml-3 mt-0.5 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        >
                          Show all {moreByGroup.get(group)!.total} {group.toLowerCase()}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className={`hidden border-l border-slate-100 bg-slate-50/70 p-4 md:block ${previewFocused ? "ring-2 ring-inset ring-slate-300" : ""}`}>
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm">
                      {(() => {
                        const Icon = iconByKind[selected.kind] ?? SearchIcon;
                        return <Icon className="size-5" />;
                      })()}
                    </div>
                    <p className="text-[15px] font-semibold leading-tight text-slate-900">
                      <Highlight text={selected.title} term={isActive ? searchedText : ""} />
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      <Highlight text={selected.subtitle} term={isActive ? searchedText : ""} />
                    </p>
                  </div>
                  <div className="space-y-2">
                    {selected.preview.map((row) => (
                      <div key={`${selected.id}-${row.label}`} className="rounded-md border border-slate-200 bg-white p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.label}</p>
                        <p className="mt-0.5 break-words text-xs font-medium text-slate-700">{row.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-md bg-white px-3 py-2 text-[11px] text-slate-500">
                    Arrow keys move, Enter opens, Ctrl+Enter opens a new tab, Tab focuses preview. Start with team: or user: to search one kind only.
                  </p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">Select a result to preview it.</div>
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
