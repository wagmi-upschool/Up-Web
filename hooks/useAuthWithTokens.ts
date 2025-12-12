"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

type SessionOutput = Awaited<ReturnType<typeof fetchAuthSession>>;

type AuthWithTokens = {
  session: SessionOutput | null;
  user: Awaited<ReturnType<typeof getCurrentUser>> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokensReady: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

let inFlightSession: Promise<SessionOutput | null> | null = null;

async function fetchSessionOnce(forceRefresh = false) {
  if (!inFlightSession) {
    inFlightSession = fetchAuthSession({ forceRefresh }).catch((error) => {
      console.error("Failed to fetch auth session", error);
      return null;
    });
  }

  const session = await inFlightSession;
  inFlightSession = null;
  return session;
}

export async function getValidIdToken(forceRefresh = false) {
  const initialSession = await fetchSessionOnce(forceRefresh);
  const firstToken = initialSession?.tokens?.idToken?.toString();
  if (firstToken) return firstToken;

  const refreshedSession = await fetchSessionOnce(true);
  const refreshedToken = refreshedSession?.tokens?.idToken?.toString();
  if (refreshedToken) return refreshedToken;

  throw new Error("Unable to resolve ID token");
}

export function useAuthWithTokens(): AuthWithTokens {
  const [session, setSession] = useState<SessionOutput | null>(null);
  const [user, setUser] =
    useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokensReady, setTokensReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resolveSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resolvedSession, resolvedUser] = await Promise.all([
        fetchSessionOnce(),
        getCurrentUser().catch(() => null),
      ]);

      setSession(resolvedSession);
      setUser(resolvedUser);
      setTokensReady(!!resolvedSession?.tokens?.idToken);
      setError(null);
    } catch (err) {
      const asError = err instanceof Error ? err : new Error(String(err));
      setSession(null);
      setUser(null);
      setTokensReady(false);
      setError(asError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveSession();

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (
        payload.event === "tokenRefresh" ||
        payload.event === "signedOut" ||
        payload.event === "signedIn"
      ) {
        resolveSession();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [resolveSession]);

  return {
    session,
    user,
    isAuthenticated: !!session?.tokens?.idToken,
    isLoading,
    tokensReady,
    error,
    refresh: resolveSession,
  };
}
