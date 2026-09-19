import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientSettingsPage } from "@/features/clients/pages/client-settings";

export const metadata: Metadata = {
  title: "Client settings",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientSettingsPage />
    </Suspense>
  );
}
