import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientWebsitePage } from "@/features/clients/pages/client-website";

export const metadata: Metadata = {
  title: "Client website & SEO",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientWebsitePage />
    </Suspense>
  );
}
