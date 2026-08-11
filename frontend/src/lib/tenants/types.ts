export type TenantStatus = "active" | "suspended" | "cancelled";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
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
