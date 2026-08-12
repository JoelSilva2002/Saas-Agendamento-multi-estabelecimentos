export interface AuthenticatedUser {
  id: string;
  // Null for a walk-in client (see User.createWalkIn) — in practice this identity can never
  // reach an authenticated request (no password means no login), but the type stays honest
  // since it's read straight off the User entity.
  email: string | null;
  isPlatformAdmin: boolean;
}

export interface TenantContext {
  tenantId: string;
  establishmentId?: string;
  roleNames: string[];
  permissions: Set<string>;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
    tenantContext?: TenantContext;
  }
}
