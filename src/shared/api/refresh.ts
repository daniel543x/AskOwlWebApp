import type { RefreshRequest, TokenData } from "../../entities/user";
import { getStoredRefreshToken, setStoredTokens } from "./tokens";

let inFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken === null) {
    return null;
  }
  const body: RefreshRequest = { refresh_token: refreshToken };
  const response = await fetch(new URL("/api/auth/refresh", window.location.origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Session refresh failed (HTTP ${response.status}).`);
  }
  const data = (await response.json()) as TokenData;
  setStoredTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

/**
 * Rotates the refresh token once and returns the new access token.
 * Concurrent callers share a single in-flight request: the refresh token
 * is single-use, and a replayed rotation reads as theft server-side.
 * Resolves null when the session is definitively over (no stored token or
 * the backend answered 401); network and 5xx failures propagate so
 * callers keep the session and can retry later.
 */
export function refreshSession(): Promise<string | null> {
  if (inFlight === null) {
    inFlight = performRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
