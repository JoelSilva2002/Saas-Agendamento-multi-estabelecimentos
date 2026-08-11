import { toast } from "sonner";

import { clearSession } from "@/lib/auth/clear-session";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Shared across concurrent 401s so a burst of requests that all expire at once triggers one
// refresh call, not one per request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  // No refresh token means either a signed-out session or an impersonation session, which
  // deliberately has no refresh token so it expires on its own (see startImpersonation) —
  // either way there's nothing to refresh with.
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

function handleSessionExpired(): void {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    toast.error("Sessão expirada. Faça login novamente.");
    window.location.assign("/login");
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const accessToken = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  // Only treat a 401 as "session expired, try to refresh" when the request actually carried a
  // token (otherwise it's a real auth failure — e.g. wrong login password — not an expiry).
  // isRetry guards against looping if the refreshed token still gets rejected.
  if (res.status === 401 && accessToken && !isRetry) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;

    if (refreshed) {
      return apiFetch<T>(path, init, true);
    }

    handleSessionExpired();
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String(data.message)) ||
      "Erro inesperado. Tente novamente.";
    throw new ApiError(message, res.status);
  }

  return data as T;
}
