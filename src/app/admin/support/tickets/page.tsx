import { Suspense } from "react";
import { MyTicketsPage } from "@/features/support/admin/tickets-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MyTicketsPage />
    </Suspense>
  );
}
