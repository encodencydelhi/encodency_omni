"use client";

import { ShieldCheckIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { REDIRECT_PARAM, resolveLandingRoute } from "@/config/routes";
import type { AuthenticatedUser, EnrollmentResult, TotpChallenge } from "@/types/domain/auth";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { useAuth } from "./auth-provider";
import { CredentialsStep } from "./credentials-step";
import { RecoveryCodesStep } from "./recovery-codes-step";
import { SessionBootScreen } from "./session-boot-screen";
import { TotpStep } from "./totp-step";
import { TotpSetupStep } from "./totp-setup-step";

/**
 * Decides where a completed sign-in lands.
 *
 * A `next` parameter is honoured only when it is an in-app path *inside the
 * panel this user owns* — that blocks open-redirect abuse, and stops a stale
 * deep link in the address bar from dropping someone into an unrelated page
 * instead of their dashboard.
 */
function safeRedirect(target: string | null, landing: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return landing;

  const panelRoot = landing.split("/").slice(0, 2).join("/");
  return target === panelRoot || target.startsWith(`${panelRoot}/`) ? target : landing;
}

/**
 * Owns the sign-in journey: credentials → authenticator code (or first-time
 * setup → one-time recovery codes) → the panel the server says this user owns.
 */
export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, acceptSession } = useAuth();

  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);

  const landingFor = (signedIn: AuthenticatedUser) =>
    safeRedirect(searchParams.get(REDIRECT_PARAM), resolveLandingRoute(signedIn.role ?? undefined));

  // Already signed in (e.g. a reload, or a completed sign-in) and not in the
  // middle of acknowledging recovery codes: go to the panel.
  useEffect(() => {
    if (status === "authenticated" && user && !enrollment) {
      router.replace(landingFor(user));
    }
    // landingFor only depends on searchParams, which is covered by `router` navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, enrollment, router]);

  if (status === "loading" || (status === "authenticated" && !enrollment)) {
    return <SessionBootScreen />;
  }

  let step;
  if (enrollment) {
    step = (
      <RecoveryCodesStep
        codes={enrollment.recoveryCodes}
        onAcknowledged={() => {
          const enrolledUser = enrollment.user;
          setEnrollment(null);
          setChallenge(null);
          acceptSession(enrolledUser);
          router.replace(landingFor(enrolledUser));
        }}
      />
    );
  } else if (challenge?.type === "enrollment") {
    step = <TotpSetupStep challenge={challenge} onEnrolled={setEnrollment} onBack={() => setChallenge(null)} />;
  } else if (challenge) {
    step = (
      <TotpStep
        challenge={challenge}
        onVerified={(signedIn) => router.replace(landingFor(signedIn))}
        onBack={() => setChallenge(null)}
      />
    );
  } else {
    step = <CredentialsStep onChallenge={(result) => setChallenge(result.challenge)} />;
  }

  return (
    <>
      <AuthCard>
        {step}

        <p className="mt-6 flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
          <ShieldCheckIcon size={16} aria-hidden />
          Secure access for EnCodency administrators.
        </p>
      </AuthCard>

      <AuthPanelFooter />
    </>
  );
}
