import type { Metadata } from "next";
import { LandingRedirect } from "@/features/auth/components/landing-redirect";

export const metadata: Metadata = {
  title: "Signing in",
};

/**
 * The product has no marketing surface.
 *
 * Which panel a visitor belongs in depends on their role, which is only known
 * once the session is restored, so the decision is made on the client.
 */
export default function RootPage() {
  return <LandingRedirect />;
}
