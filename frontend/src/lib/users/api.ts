import { apiFetch } from "@/lib/api/client";
import type { InviteUserInput, InviteUserOutput, TenantUser } from "./types";

// Every user in the tenant (staff and clients alike) — there is no dedicated clients-list
// endpoint today. Used as the source of display names (client + employee, both are User rows)
// and, faute de mieux, as the client picker in the fit-in dialog. See real-api.ts.
export function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  return apiFetch<TenantUser[]>(`/tenants/${tenantId}/users`);
}

// Creates a new user account (or, if the email already belongs to someone in the tenant,
// just grants them the given role) — the first step of adding a staff member; the caller
// still has to create the Employee record separately with the returned user's id.
export function inviteUser(tenantId: string, input: InviteUserInput): Promise<InviteUserOutput> {
  return apiFetch<InviteUserOutput>(`/tenants/${tenantId}/users/invite`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
