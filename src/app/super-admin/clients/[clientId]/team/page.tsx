import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientTeamPage } from "@/features/clients/pages/client-team";

export const metadata: Metadata = {
  title: "Client team & access",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientTeamPage />
    </Suspense>
  );
}
