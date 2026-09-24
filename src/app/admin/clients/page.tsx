import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsListPage } from "@/features/clients/pages/clients-list";

export const metadata: Metadata = {
  title: "Clients",
  description: "Monitor and manage client workspaces across all companies on OmniPlatform.",
};

export default function AdminClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsListPage />
    </Suspense>
  );
}
