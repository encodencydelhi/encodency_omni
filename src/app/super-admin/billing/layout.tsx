import type { ReactNode } from "react";
import { BillingTabs } from "@/features/billing";

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3">
      <BillingTabs />
      <div>{children}</div>
    </div>
  );
}
