import { Suspense } from "react";
import { AutomationLogsPage } from "@/features/admin/automation/components/logs/automation-logs-page";

export const metadata = {
  title: "Automation Logs & Diagnostics | EnCodency OmniPlatform",
  description: "Real-time execution traces, webhook payload inspection, and error diagnostics.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-[12px] text-[#64748B] animate-pulse">Loading automation logs...</div>}>
      <AutomationLogsPage />
    </Suspense>
  );
}
