/**
 * EnCodency OmniPlatform - Super Admin Payments Page
 */

"use client";

import { useSearchParams } from "next/navigation";
import { PaymentsTable } from "../components/payments/payments-table";

export function PaymentsPage() {
  const searchParams = useSearchParams();
  const quick = searchParams.get("quick") ?? undefined;

  return <PaymentsTable initialQuickFilter={quick} />;
}
