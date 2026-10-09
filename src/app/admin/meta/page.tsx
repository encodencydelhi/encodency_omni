import { Suspense } from "react";
import { MetaOverviewPage } from "@/features/admin/meta/pages/overview-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MetaOverviewPage />
    </Suspense>
  );
}
