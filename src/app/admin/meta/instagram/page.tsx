import { Suspense } from "react";
import { InstagramWorkspacePage } from "@/features/admin/meta/pages/instagram-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InstagramWorkspacePage />
    </Suspense>
  );
}
