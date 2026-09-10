import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersView } from "@/features/users/components/users-view";

export const metadata: Metadata = {
  title: "Users",
  description: "Every person with access to a customer organisation.",
};

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersView />
    </Suspense>
  );
}
