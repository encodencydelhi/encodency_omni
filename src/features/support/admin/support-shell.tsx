"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Activity, BookOpen, LayoutDashboard, LifeBuoy, Plus, Ticket } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCompanyScope, useSupportSummary } from "../hooks";
import { btnPrimary } from "../ui";
import { NewTicketDialog } from "./new-ticket-dialog";

const TABS = [
  { id: "overview", label: "Overview", href: "/admin/support", icon: LayoutDashboard },
  { id: "tickets", label: "My Tickets", href: "/admin/support/tickets", icon: Ticket },
  { id: "activity", label: "Activity", href: "/admin/support/activity", icon: Activity },
  { id: "help", label: "Help Center", href: "/admin/support/help", icon: BookOpen },
];

interface RaiseContext {
  /** Open the "raise a ticket" dialog, optionally with a subject already typed. */
  open: (preset?: { subject?: string }) => void;
  canRaise: boolean;
}

const Raise = createContext<RaiseContext | null>(null);

export function useRaiseTicket(): RaiseContext {
  const value = useContext(Raise);
  if (!value) throw new Error("useRaiseTicket must be used inside <SupportShell>.");
  return value;
}

/** Everyone but a Viewer may raise and reply (mirror of the `support:write` capability; the API re-checks it). */
function useCanRaise(): boolean {
  const { user } = useAuth();
  const { companyId } = useCompanyScope();
  const membership = user?.memberships?.find((m) => m.companyId === companyId) ?? user?.memberships?.[0];
  return membership ? membership.systemRole !== "VIEWER" : true;
}

export function SupportShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin/support";
  const summary = useSupportSummary();
  const canRaise = useCanRaise();
  const [dialog, setDialog] = useState<{ open: boolean; subject?: string }>({ open: false });
  const raise = useMemo<RaiseContext>(() => ({ open: (preset) => setDialog({ open: true, subject: preset?.subject }), canRaise }), [canRaise]);
  const waiting = summary.data?.counts.waitingForYou ?? 0;
  const active = summary.data?.counts.active ?? 0;

  return (
    <Raise.Provider value={raise}>
      <div className="flex min-h-full flex-col bg-[#f8fafc]">
        <div className="border-b border-slate-200 bg-white px-5 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-red-50 text-red-600 ring-1 ring-red-100">
                <LifeBuoy className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight text-slate-900">Help &amp; Support</h1>
                <p className="text-xs font-medium text-slate-600">Raise a ticket and our support team will work on it. You are notified here when they reply.</p>
              </div>
            </div>
            <button type="button" className={btnPrimary} onClick={() => raise.open()} disabled={!canRaise} title={canRaise ? undefined : "Viewers can read tickets but not raise them. Ask an Owner, Admin or Manager."}>
              <Plus className="size-3.5" />
              Raise a ticket
            </button>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto" aria-label="Support sections">
            {TABS.map((tab) => {
              const current = tab.href === "/admin/support" ? pathname === tab.href : pathname.startsWith(tab.href);
              const badge = tab.id === "tickets" ? (waiting > 0 ? { n: waiting, tone: "amber" } : active > 0 ? { n: active, tone: "slate" } : null) : null;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  className={cn("-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition", current ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-900")}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {badge && <span className={cn("rounded-sm px-1.5 py-px text-[10px] font-bold", badge.tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")}>{badge.n}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-1 px-5 py-4 sm:px-6">{children}</div>
      </div>
      <NewTicketDialog open={dialog.open} presetSubject={dialog.subject} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </Raise.Provider>
  );
}
