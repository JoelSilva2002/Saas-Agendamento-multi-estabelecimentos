const SESSION_KEY = "agendasaas.session";

export interface SessionContext {
  tenantId: string;
  establishmentId: string;
}

export function getSessionContext(): SessionContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionContext;
  } catch {
    return null;
  }
}

export function setSessionContext(context: SessionContext): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(context));
}

export function clearSessionContext(): void {
  window.localStorage.removeItem(SESSION_KEY);
}
