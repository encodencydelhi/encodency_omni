"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { REDIRECT_PARAM, ROUTES } from "@/config/routes";
import { onSessionExpired } from "@/lib/api/session-events";
import { authService } from "@/features/auth/services/auth-service";
import type {
  AuthStatus,
  AuthenticatedUser,
  ChallengeVerification,
  EnrollmentResult,
  LoginCredentials,
  LoginResult,
  TotpSetupResponse,
} from "@/types/domain/auth";
import type { Permission } from "@/types/domain/team";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  /** Step one. Returns a challenge; it never signs anyone in by itself. */
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  setupTotp: (challengeToken: string) => Promise<TotpSetupResponse>;
  /** First-time enrollment. Does NOT enter the app: the recovery codes must be acknowledged first. */
  verifyTotpSetup: (verification: ChallengeVerification) => Promise<EnrollmentResult>;
  verifyTotp: (verification: ChallengeVerification) => Promise<AuthenticatedUser>;
  verifyRecoveryCode: (verification: ChallengeVerification) => Promise<AuthenticatedUser>;
  /** Enters the app with a user returned by a completed sign-in. */
  acceptSession: (user: AuthenticatedUser) => void;
  /** Re-reads GET /users/me (e.g. after a membership change). */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  /** Presentation-only check for Super Admin navigation. The API authorises every request. */
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the session for the whole application.
 *
 * Auth state is derived from the server only: GET /users/me on load, and after
 * every completed sign-in. No component reads a cookie (it is HttpOnly), and no
 * token is ever stored in browser storage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const statusRef = useRef<AuthStatus>("loading");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /** Drops everything user-specific held in memory: profile, cached (Company-scoped) query data. */
  const clearLocalSession = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    void authService
      .restore()
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus(restored ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from an authenticated request means the server no longer
  // recognises this session (expired, revoked, logged out elsewhere).
  useEffect(
    () =>
      onSessionExpired(() => {
        if (statusRef.current !== "authenticated") return;
        clearLocalSession();
        toast.error("Your session has ended. Please sign in again.");
        const next = pathname && pathname !== ROUTES.login ? `?${REDIRECT_PARAM}=${encodeURIComponent(pathname)}` : "";
        router.replace(`${ROUTES.login}${next}`);
      }),
    [clearLocalSession, pathname, router],
  );

  const acceptSession = useCallback(
    (nextUser: AuthenticatedUser) => {
      // A different person signing in on the same tab must never see the previous user's cached data.
      queryClient.clear();
      setUser(nextUser);
      setStatus("authenticated");
    },
    [queryClient],
  );

  const login = useCallback((credentials: LoginCredentials) => authService.login(credentials), []);
  const setupTotp = useCallback((challengeToken: string) => authService.setupTotp(challengeToken), []);
  const verifyTotpSetup = useCallback((verification: ChallengeVerification) => authService.verifyTotpSetup(verification), []);

  const verifyTotp = useCallback(
    async (verification: ChallengeVerification) => {
      const signedIn = await authService.verifyTotp(verification);
      acceptSession(signedIn);
      return signedIn;
    },
    [acceptSession],
  );

  const verifyRecoveryCode = useCallback(
    async (verification: ChallengeVerification) => {
      const signedIn = await authService.verifyRecoveryCode(verification);
      acceptSession(signedIn);
      return signedIn;
    },
    [acceptSession],
  );

  const refreshUser = useCallback(async () => {
    const refreshed = await authService.fetchCurrentUser();
    setUser(refreshed);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The local session is cleared even if the server call fails, so nobody is left appearing signed in.
    } finally {
      clearLocalSession();
      router.replace(ROUTES.login);
    }
  }, [clearLocalSession, router]);

  const can = useCallback((permission: Permission) => user?.permissions?.includes(permission) ?? false, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, setupTotp, verifyTotpSetup, verifyTotp, verifyRecoveryCode, acceptSession, refreshUser, logout, can }),
    [status, user, login, setupTotp, verifyTotpSetup, verifyTotp, verifyRecoveryCode, acceptSession, refreshUser, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
