export type TenantStatus = "active" | "suspended" | "cancelled";

export const TENANT_PLANS = ["free", "starter", "pro", "enterprise"] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  plan: string;
  status: TenantStatus;
};

export type PaginatedTenants = {
  items: Tenant[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListTenantsParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: TenantStatus;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  document?: string;
  plan?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  establishmentName: string;
  establishmentSlug: string;
};

export type CreateTenantOutput = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  plan: string;
  status: TenantStatus;
  ownerUserId: string;
  establishment: { id: string; name: string; slug: string };
  temporaryPassword?: string;
};

export type ImpersonateTenantOutput = {
  accessToken: string;
  sessionId: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  tenant: { id: string; name: string; slug: string };
};
