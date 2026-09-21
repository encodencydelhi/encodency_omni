import type { Metadata } from "next";
import { Suspense } from "react";
import { EventExplorerPage } from "@/features/audit-logs/pages/event-explorer";

export const metadata: Metadata = {
  title: "Event Explorer",
  description: "Search and inspect recorded platform actions across companies, staff and system resources.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <EventExplorerPage />
    </Suspense>
  );
}
