import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersListPage } from "@/features/users/pages/users-list";

export const metadata: Metadata = {
  title: "Users Management | OmniPlatform Super Admin",
  description: "Platform-wide user identity, company membership, access management and security workspace.",
};

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersListPage />
    </Suspense>
  );
}
