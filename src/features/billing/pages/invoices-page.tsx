/**
 * EnCodency OmniPlatform - Super Admin Invoices Page
 */

"use client";

import { useSearchParams } from "next/navigation";
import { InvoicesTable } from "../components/invoices/invoices-table";

export function InvoicesPage() {
  const searchParams = useSearchParams();
  const quick = searchParams.get("quick") ?? undefined;

  return <InvoicesTable initialQuickFilter={quick} />;
}
