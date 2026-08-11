import { apiFetch } from "@/lib/api/client";
import type { Role } from "./types";

export function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>("/roles");
}
