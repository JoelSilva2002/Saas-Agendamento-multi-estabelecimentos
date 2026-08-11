const ACCESS_TOKEN_KEY = "agendasaas.accessToken";
const REFRESH_TOKEN_KEY = "agendasaas.refreshToken";
// Mirrors the access token into a plain cookie so proxy.ts (which runs on
// the server and can't see localStorage) can do its optimistic auth check.
const ACCESS_TOKEN_COOKIE = "accessToken";
const IMPERSONATION_KEY = "agendasaas.impersonation";

export interface ImpersonationState {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  adminAccessToken: string;
  adminRefreshToken: string;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}; path=/; SameSite=Lax`;
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;
}

/** Stashes the platform admin's own tokens and switches the active session to the
 * impersonation access token (support access — see ImpersonateTenantUseCase). No refresh
 * token: the impersonation session is meant to expire on its own. */
export function startImpersonation(params: {
  accessToken: string;
  sessionId: string;
  tenantId: string;
  tenantName: string;
}): void {
  const adminAccessToken = getAccessToken();
  const adminRefreshToken = getRefreshToken();
  if (!adminAccessToken || !adminRefreshToken) {
    throw new Error("Sessão de administrador ausente — não é possível iniciar o modo suporte");
  }

  const state: ImpersonationState = {
    sessionId: params.sessionId,
    tenantId: params.tenantId,
    tenantName: params.tenantName,
    adminAccessToken,
    adminRefreshToken,
  };
  window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));

  window.localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${params.accessToken}; path=/; SameSite=Lax`;
}

export function getImpersonationState(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(IMPERSONATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

/** Restores the platform admin's own tokens after "voltar ao SuperAdmin". */
export function endImpersonationAndRestore(): void {
  const state = getImpersonationState();
  window.localStorage.removeItem(IMPERSONATION_KEY);
  if (!state) return;
  setTokens({ accessToken: state.adminAccessToken, refreshToken: state.adminRefreshToken });
}
