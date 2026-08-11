import { getMe, type MeResponse } from "./api";
import type { SessionContext } from "./session-context";
import { listEstablishments } from "@/lib/establishments/api";

/** Figures out which tenant/establishment a just-authenticated staff user (real login or
 * impersonation) should operate in. There's no establishment switcher in the UI yet — this
 * always picks the first establishment-scoped membership, falling back to the tenant's first
 * establishment for a brand-new owner who only has a tenant-wide grant so far.
 *
 * Accepts an already-fetched `me` to avoid a redundant GET /auth/me when the caller already
 * has it (e.g. the login page fetches it once to decide isPlatformAdmin routing). */
export async function resolveSessionContext(me?: MeResponse): Promise<SessionContext> {
  const resolvedMe = me ?? (await getMe());

  const scopedMembership = resolvedMe.memberships.find((m) => m.establishmentId);
  if (scopedMembership?.establishmentId) {
    return { tenantId: scopedMembership.tenantId, establishmentId: scopedMembership.establishmentId };
  }

  const tenantMembership = resolvedMe.memberships[0];
  if (!tenantMembership) {
    throw new Error("Usuário sem tenant associado");
  }

  const establishments = await listEstablishments(tenantMembership.tenantId);
  const establishment = establishments[0];
  if (!establishment) {
    throw new Error("Tenant sem estabelecimento cadastrado");
  }

  return { tenantId: tenantMembership.tenantId, establishmentId: establishment.id };
}
