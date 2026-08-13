"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoUploader } from "@/components/configuracoes/logo-uploader";
import { GalleryManager } from "@/components/configuracoes/gallery-manager";
import { ApiError } from "@/lib/api/client";
import { getEstablishment } from "@/lib/establishments/api";
import type { Establishment } from "@/lib/establishments/types";
import { getSessionContext } from "@/lib/auth/session-context";

export function ImagensScreen() {
  const [session] = useState(() => getSessionContext());
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setIsLoading(true);
    getEstablishment(session.tenantId, session.establishmentId)
      .then(setEstablishment)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o estabelecimento");
      })
      .finally(() => setIsLoading(false));
  }, [session]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Imagens</h1>
        <p className="text-sm text-muted-foreground">
          A logo e as fotos aparecem para o cliente na busca e na página do estabelecimento.
        </p>
      </div>

      {isLoading || !establishment ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <LogoUploader
          tenantId={session.tenantId}
          establishmentId={session.establishmentId}
          establishmentName={establishment.name}
          logoUrl={establishment.logoUrl}
          logoThumbUrl={establishment.logoThumbUrl}
          onChange={(logoUrl, logoThumbUrl) =>
            setEstablishment((prev) => (prev ? { ...prev, logoUrl, logoThumbUrl } : prev))
          }
        />
      )}

      <GalleryManager tenantId={session.tenantId} establishmentId={session.establishmentId} />
    </div>
  );
}
