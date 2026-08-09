export interface AuthenticatedUser {
  id: string;
  email: string;
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
