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
