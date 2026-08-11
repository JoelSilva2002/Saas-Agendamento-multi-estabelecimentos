"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  endImpersonationAndRestore,
  getImpersonationState,
  type ImpersonationState,
} from "@/lib/auth/token-storage";
import { endImpersonation } from "@/lib/tenants/api";

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    setState(getImpersonationState());
  }, []);

  if (!state) return null;

  async function handleReturn() {
    if (!state) return;
    setIsEnding(true);
    // Restore the admin's own token FIRST — endImpersonation must be called as the platform
    // admin (EndImpersonationUseCase checks the caller is who started the session), not as
    // the impersonated owner, which is still the active token at this point otherwise.
    const sessionId = state.sessionId;
    endImpersonationAndRestore();
    await endImpersonation(sessionId).catch(() => undefined);
    window.location.assign("/superadmin/tenants");
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500/15 px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
      <span>
        Modo suporte: acessando como <strong>{state.tenantName}</strong>.
      </span>
      <Button size="sm" variant="outline" disabled={isEnding} onClick={handleReturn}>
        <LogOut />
        {isEnding ? "Saindo..." : "Voltar ao SuperAdmin"}
      </Button>
    </div>
  );
}
