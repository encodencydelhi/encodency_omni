import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsListPage } from "@/features/clients/pages/clients-list";

export const metadata: Metadata = {
  title: "Clients",
  description: "Monitor and manage client workspaces across all companies on OmniPlatform.",
};

export default function ClientsPage() {
  // The list keeps its filters in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ClientsListPage />
    </Suspense>
  );
}
