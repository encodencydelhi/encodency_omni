import type { ReactNode } from "react";
import { MetaConnectionProvider } from "@/features/admin/meta/connection-context";

export default function MetaLayout({ children }: { children: ReactNode }) {
  return <MetaConnectionProvider>{children}</MetaConnectionProvider>;
}
