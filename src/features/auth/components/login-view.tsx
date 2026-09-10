"use client";

import { ShieldCheckIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { REDIRECT_PARAM, resolveLandingRoute } from "@/config/routes";
import type { TotpChallenge } from "@/types/domain/auth";
import type { InternalRole } from "@/types/domain/team";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { CredentialsStep } from "./credentials-step";
import { TotpStep } from "./totp-step";

interface ChallengeState {
  challenge: TotpChallenge;
  rememberMe: boolean;
}

/**
 * Decides where a completed sign-in lands.
 *
 * A `next` parameter is honoured only when it is an in-app path *inside the
 * panel this role owns* — that blocks open-redirect abuse, and stops a stale
 * deep link in the address bar from dropping someone into an unrelated page
 * instead of their dashboard.
 */
function safeRedirect(target: string | null, landing: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return landing;

  const panelRoot = landing.split("/").slice(0, 2).join("/");
  return target === panelRoot || target.startsWith(`${panelRoot}/`) ? target : landing;
}

/**
 * Owns the sign-in journey.
 *
 * Each step is a self-contained form; this component only decides which one is
 * showing and where a completed sign-in should land. Navigation is a
 * consequence of a session existing, never of a button being clicked.
 */
export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);

  const completeSignIn = (role: InternalRole) => {
    router.replace(safeRedirect(searchParams.get(REDIRECT_PARAM), resolveLandingRoute(role)));
  };

  return (
    <>
      <AuthCard>
        {challengeState ? (
          <TotpStep
            challenge={challengeState.challenge}
            rememberMe={challengeState.rememberMe}
            onVerified={completeSignIn}
            onBack={() => setChallengeState(null)}
          />
        ) : (
          <CredentialsStep
            onChallenge={(result, rememberMe) =>
              setChallengeState({ challenge: result.challenge, rememberMe })
            }
            onAuthenticated={completeSignIn}
          />
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
          <ShieldCheckIcon size={16} aria-hidden />
          Secure access for EnCodency administrators.
        </p>
      </AuthCard>

      <AuthPanelFooter />
    </>
  );
}
