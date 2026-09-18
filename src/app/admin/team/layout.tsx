import { ReactNode } from "react";
import { TeamLayout } from "@/features/admin/team/components/team-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <TeamLayout>{children}</TeamLayout>;
}
