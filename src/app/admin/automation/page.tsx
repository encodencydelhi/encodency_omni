import { Suspense } from "react";
import { AutomationPage } from "@/features/admin/automation/automation-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-sm text-gray-500">Loading...</div></div>}>
      <AutomationPage />
    </Suspense>
  );
}
