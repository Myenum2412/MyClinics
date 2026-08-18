"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type ClinicRole,
  type ClinicSession,
  can,
  ensureSession,
  getSession,
} from "@/lib/clinic-api";

/**
 * Client-side session hook. The JWT lives in localStorage (mirrored in a
 * cookie for the server-side proxy), so only client components can read it.
 * Workspaces are protected twice: the proxy redirects unauthenticated
 * requests, and this hook re-verifies + enforces role minimums.
 */
export function useClinicSession(): {
  session: ClinicSession | null;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [session, setSession] = useState<ClinicSession | null>(() =>
    getSession()
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setSession(await ensureSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { session, loading, reload };
}

/** Redirects to /login when there is no valid session (client-side guard). */
export function useRequireClinicSession(): ClinicSession {
  const { session, loading } = useClinicSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      const url = new URL("/login", window.location.href);
      url.searchParams.set("callbackUrl", pathname);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    }
  }, [loading, session, router, pathname]);

  return session!;
}

/** Enforces a minimum role; redirects away when the session is too weak. */
export function useRequireRole(
  min: ClinicRole
): ClinicSession | null {
  const { session, loading } = useClinicSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      const url = new URL("/login", window.location.href);
      url.searchParams.set("callbackUrl", pathname);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
      return;
    }
    if (!can(session.role, min)) {
      router.replace(session.role === "platform_admin" ? "/admin" : "/clinic");
    }
  }, [loading, session, router, pathname, min]);

  return loading ? null : session;
}

/** True when the session's role passes the minimum (sync helper). */
export function sessionCan(
  session: ClinicSession | null,
  min: ClinicRole
): boolean {
  return !!session && can(session.role, min);
}