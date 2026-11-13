"use client";

import type { SessionInfo } from "./types";

export const AUTH_TOKEN_KEY = "trax_auth_token";
export const SESSION_CACHE_KEY = "trax_session_cache";
export const AUTH_EVENT = "trax-auth-state-change";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuthSession(session: SessionInfo, token?: string): void {
  if (typeof window === "undefined") return;
  try {
    const finalToken = token || session.token;
    if (finalToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, finalToken);
    }
    if (session.authenticated) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: session }));
  } catch {
    // localStorage may be disabled or quota exceeded
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(SESSION_CACHE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}

export function getCachedSession(): SessionInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionInfo;
    if (parsed && typeof parsed === "object" && parsed.authenticated && parsed.userId) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
