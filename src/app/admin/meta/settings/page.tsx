import { Suspense } from "react";
import { MetaSettingsPage } from "@/features/admin/meta/pages/settings-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MetaSettingsPage />
    </Suspense>
  );
}
