"use client";

import { Building2Icon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { useCompanies } from "@/features/companies/hooks/use-companies";
import { COMPANY_STATUS } from "@/types/domain/company";
import { PLAN_TIER } from "@/types/domain/plan";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

/**
 * Quick jump to a tenant.
 *
 * Companies are the spine of this panel — almost every investigation starts by
 * finding one — so the topbar search resolves them directly rather than
 * offering a generic, unfocused result list.
 */
export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  // Cmd/Ctrl+K focuses search from anywhere in the panel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useCompanies({
    search: debounced,
    pageSize: 6,
    ...(isActive ? {} : { page: 1 }),
  });

  const results = isActive ? (data?.data ?? []) : [];
  const isOpen = isActive && (isFetching || results.length >= 0);

  const goTo = (href: string) => {
    setTerm("");
    setDebounced("");
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <Popover open={isOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full max-w-xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setTerm("");
              if (event.key === "Enter" && debounced) {
                goTo(`${ROUTES.superAdmin.companies}?search=${encodeURIComponent(debounced)}`);
              }
            }}
            placeholder="Search companies, users, Clients, tickets..."
            aria-label="Search companies"
            className="h-9 rounded-lg bg-surface-sunken pr-14 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.5625rem] text-muted-foreground sm:block">
            ⌘ K
          </kbd>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {isFetching && results.length === 0 ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="px-3 py-4 text-center text-2xs text-muted-foreground">
            No companies match “{debounced}”
          </p>
        ) : (
          <ul>
            {results.map((company) => (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => goTo(ROUTES.superAdmin.company(company.id))}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
                >
                  <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                    {company.name}
                  </span>
                  <Badge tone={PLAN_TIER[company.planTier].tone}>
                    {PLAN_TIER[company.planTier].label}
                  </Badge>
                  <Badge tone={COMPANY_STATUS[company.status].tone}>
                    {COMPANY_STATUS[company.status].label}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
