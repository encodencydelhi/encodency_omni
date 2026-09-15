"use client";

import type { ReactNode } from "react";
import { YouTubeWorkspace } from "./components/workspace";
import { YouTubeProvider } from "./store/youtube-store";

export function YouTubeLayout({ children }: { children: ReactNode }) {
  return (
    <YouTubeProvider>
      <YouTubeWorkspace>{children}</YouTubeWorkspace>
    </YouTubeProvider>
  );
}
