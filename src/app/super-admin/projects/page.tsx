import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsView } from "@/features/projects/components/projects-view";

export const metadata: Metadata = {
  title: "Clients",
  description: "Brands and business units across every organisation.",
};

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsView />
    </Suspense>
  );
}
