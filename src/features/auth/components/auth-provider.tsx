"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ROUTES } from "@/config/routes";
import { authService } from "@/features/auth/services/auth-service";
import type {
  AuthSession,
  AuthStatus,
  AuthenticatedUser,
  LoginCredentials,
  LoginResult,
  TotpVerification,
} from "@/types/domain/auth";
import type { Permission } from "@/types/domain/team";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  /** Step one. Returns a challenge; it does not by itself sign anyone in. */
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  /** Step two. Exchanges a verified code for a session. */
  verifyTotp: (verification: TotpVerification) => Promise<AuthSession>;
  logout: () => Promise<void>;
  /** RBAC check used by guards and by conditional UI. */
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the session for the whole application.
 *
 * Auth state is deliberately centralised: no component reads a cookie, and no
 * component decides on its own what "signed in" means.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    void authService
      .restore()
      .then((session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setStatus(session ? "authenticated" : "unauthenticated");
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

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authService.login(credentials);

    // A backend that decides MFA is not required can return a session here.
    if (result.status === "authenticated") {
      setUser(result.session.user);
      setStatus("authenticated");
    }

    return result;
  }, []);

  const verifyTotp = useCallback(async (verification: TotpVerification) => {
    const session = await authService.verifyTotp(verification);
    setUser(session.user);
    setStatus("authenticated");
    return session;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus("unauthenticated");
    router.replace(ROUTES.login);
  }, [router]);

  const can = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, verifyTotp, logout, can }),
    [can, login, logout, status, user, verifyTotp],
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
