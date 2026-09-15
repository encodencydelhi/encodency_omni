import { Suspense, type ReactNode } from "react";
import { YouTubeLayout } from "@/features/admin/youtube/youtube-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <YouTubeLayout>{children}</YouTubeLayout>
    </Suspense>
  );
}
