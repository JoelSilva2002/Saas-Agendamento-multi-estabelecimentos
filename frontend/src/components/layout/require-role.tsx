"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/auth/api";
import { clearSession } from "@/lib/auth/clear-session";
import { hasStaffAccess } from "@/lib/auth/roles";

/**
 * Role gate for the protected shells.
 *
 * proxy.ts can only see that an access token cookie exists — the JWT carries just `sub` and
 * `email`, no role — so it cannot tell a client from an owner. Without this, a client who types
 * /admin/... gets the full admin shell rendered around pages where every request 403s, and any
 * signed-in user could open the SuperAdmin console the same way.
 *
 * This is UX, not security: the API is the real boundary and rejects those calls regardless.
 */
export function RequireRole({
  require: required,
  children,
}: {
  require: "staff" | "platformAdmin";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((me) => {
        if (cancelled) return;

        if (required === "platformAdmin" && !me.isPlatformAdmin) {
          // A legitimate staff member simply took a wrong turn — send them to their own panel
          // rather than logging them out.
          router.replace(hasStaffAccess(me) ? "/admin/dashboard" : "/entrar");
          return;
        }

        if (required === "staff" && !hasStaffAccess(me)) {
          router.replace("/meus-agendamentos");
          return;
        }

        setAllowed(true);
      })
      .catch(() => {
        if (cancelled) return;
        // A 401 is already handled by apiFetch (refresh, then redirect to /login). Anything
        // else reaching here means we cannot establish who this is, so do not render the shell.
        clearSession();
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [required, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
