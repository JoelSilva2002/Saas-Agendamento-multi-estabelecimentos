import type { MeResponse } from "./api";

/** The only role that is NOT establishment staff. Everything else (owner, manager,
 * receptionist, employee) belongs in the admin panel. Mirrors the roles seeded in
 * prisma/seed.ts. */
const CLIENT_ROLE = "client";

/**
 * Whether this account can reach the admin panel at all.
 *
 * A single person can legitimately be both — the owner of a salon who books at another one —
 * so this asks "does any grant give staff access?", not "is this a client?".
 */
export function hasStaffAccess(me: MeResponse): boolean {
  if (me.isPlatformAdmin) return true;
  return me.memberships.some((membership) => membership.roleName !== CLIENT_ROLE);
}

/** Whether the account has a client grant somewhere, i.e. can use the client area. */
export function hasClientAccess(me: MeResponse): boolean {
  return me.memberships.some((membership) => membership.roleName === CLIENT_ROLE);
}
