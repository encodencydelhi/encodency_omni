import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsListPage } from "@/features/clients/pages/clients-list";

export const metadata: Metadata = {
  title: "Create Client",
  description: "Create a new client workspace.",
};

/**
 * Landing on /admin/clients/new opens the clients list with the create wizard
 * pre-opened. The wizard is built into ClientsListPage itself.
 */
export default function AdminCreateClientPage() {
  return (
    <Suspense fallback={null}>
      <ClientsListPage />
    </Suspense>
  );
}
