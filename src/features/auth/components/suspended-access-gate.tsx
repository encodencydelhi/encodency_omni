"use client";

import { LogOutIcon, ShieldAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { setStoredTenancy } from "@/lib/api/tenancy-storage";
import { useAuth } from "./auth-provider";

/**
 * A suspended member cannot use the Company (every request is refused), so instead of a page full of failing requests
 * they see why, and can switch to another Company they still have access to or sign out.
 */
export function SuspendedAccessGate({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { companyId, isReady } = useTenancyContext();

  const memberships = user?.memberships ?? [];
  const current = memberships.find((m) => m.companyId === companyId);
  if (!isReady || !current?.suspended) return <>{children}</>;

  const alternatives = memberships.filter((m) => !m.suspended && m.companyStatus === "ACTIVE");

  return (
    <div className="grid min-h-dvh place-items-center bg-[#F5F8FC] p-6">
      <div className="w-full max-w-md rounded-lg border border-[#E8EAED] bg-white p-7 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600"><ShieldAlertIcon className="size-6" /></span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Your access is suspended</h1>
        <p className="mt-2 text-sm text-slate-600">
          An owner or admin of <strong>{current.companyName}</strong> has suspended your access. Your account and your work are untouched; ask them to reactivate you.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {alternatives.map((m) => (
            <Button key={m.companyId} variant="outline" onClick={() => { setStoredTenancy(m.companyId); window.location.reload(); }}>
              Switch to {m.companyName}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => void logout()}><LogOutIcon /> Sign out</Button>
        </div>
      </div>
    </div>
  );
}
