import { apiFetch } from "@/lib/api/client";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type RegisterClientInput = {
  tenantId: string;
  establishmentId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

// Self-service client signup from the public booking flow. Returns the created user but no
// tokens — the caller still has to log in.
export function register(input: RegisterClientInput): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export type MembershipGrant = { tenantId: string; establishmentId: string | null; roleName: string };

export type MeResponse = {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
  themePreference: "light" | "dark" | "system";
  memberships: MembershipGrant[];
};

export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

// Revokes every refresh token for the user server-side, so other sessions are cut off.
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>("/auth/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
