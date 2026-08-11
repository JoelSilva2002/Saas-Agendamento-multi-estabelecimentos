"use client";

import { useRouter } from "next/navigation";

import { logout } from "./api";
import { clearSession } from "./clear-session";
import { getRefreshToken } from "./token-storage";

export function useLogout() {
  const router = useRouter();

  return async function handleLogout() {
    const refreshToken = getRefreshToken();
    clearSession();
    if (refreshToken) {
      await logout(refreshToken).catch(() => undefined);
    }
    router.push("/login");
  };
}
