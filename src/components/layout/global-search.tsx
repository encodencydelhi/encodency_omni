"use client";

import { Building2Icon, SearchIcon, UserIcon, FolderIcon, ServerIcon, ReceiptIcon, HeadsetIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { useCompanies } from "@/features/companies/hooks/use-companies";
import { COMPANY_STATUS } from "@/types/domain/company";
import { PLAN_TIER } from "@/types/domain/plan";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS = 250;

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

  const { data, isFetching } = useCompanies({
    search: debounced,
    pageSize: 6,
    ...(isActive ? {} : { page: 1 }),
  });

  const results = isActive ? (data?.data ?? []) : [];

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
                    goTo(ROUTES.superAdmin.company(firstResult.id));
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
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Companies</div>
                <ul>
                  {results.map((company) => (
                    <li key={company.id}>
                      <button
                        type="button"
                        onClick={() => goTo(ROUTES.superAdmin.company(company.id))}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm text-slate-600">
                          <Building2Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-slate-800 leading-tight">
                            {company.name}
                          </p>
                          <p className="text-[12px] text-slate-500 leading-tight mt-0.5">
                            Company • {PLAN_TIER[company.planTier].label} Plan
                          </p>
                        </div>
                        <Badge tone={COMPANY_STATUS[company.status].tone} className="hidden sm:inline-flex">
                          {COMPANY_STATUS[company.status].label}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
