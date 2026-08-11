"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth/clear-session";
import { getAccessToken } from "@/lib/auth/token-storage";

/**
 * Client-side only: the token lives in localStorage, so the server cannot know whether the
 * visitor is signed in. Rendering nothing until mount avoids a hydration mismatch between the
 * server's "logged out" markup and the browser's actual state.
 */
export function PublicAuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(Boolean(getAccessToken()));
  }, []);

  if (signedIn === null) {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (!signedIn) {
    return (
      <Button asChild>
        <Link href="/entrar">Entrar</Link>
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/meus-agendamentos">Meus agendamentos</Link>
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          clearSession();
          window.location.assign("/");
        }}
      >
        Sair
      </Button>
    </>
  );
}
