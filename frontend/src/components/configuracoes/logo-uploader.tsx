"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { removeLogo, uploadLogo } from "@/lib/establishments/media.api";

type LogoUploaderProps = {
  tenantId: string;
  establishmentId: string;
  establishmentName: string;
  logoUrl: string | null;
  logoThumbUrl: string | null;
  onChange: (logoUrl: string | null, logoThumbUrl: string | null) => void;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function LogoUploader({
  tenantId,
  establishmentId,
  establishmentName,
  logoUrl,
  logoThumbUrl,
  onChange,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    try {
      const result = await uploadLogo(tenantId, establishmentId, file);
      onChange(result.logoUrl, result.logoThumbUrl);
      toast.success("Logo atualizada");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a logo");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await removeLogo(tenantId, establishmentId);
      onChange(null, null);
      toast.success("Logo removida");
      setConfirmRemoveOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a logo");
    } finally {
      setIsRemoving(false);
    }
  }

  const displaySrc = previewUrl ?? logoThumbUrl ?? logoUrl ?? undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>Aparece ao lado do nome na busca e no topo da página pública.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar size="lg" className="size-20 rounded-lg">
          <AvatarImage src={displaySrc} alt="" className="rounded-lg" />
          <AvatarFallback className="rounded-lg text-lg">
            {initialsFor(establishmentName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" asChild variant="outline" disabled={isUploading}>
              <label htmlFor="logo-input" className="cursor-pointer">
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </>
                ) : logoUrl ? (
                  "Substituir"
                ) : (
                  "Enviar logo"
                )}
              </label>
            </Button>
            <input
              ref={inputRef}
              id="logo-input"
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/webp,image/avif"
              disabled={isUploading}
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!logoUrl || isUploading}
              onClick={() => setConfirmRemoveOpen(true)}
            >
              Remover
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou AVIF, até 5 MB.</p>
        </div>
      </CardContent>

      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover logo</DialogTitle>
            <DialogDescription>
              A logo deixa de aparecer para os clientes imediatamente. Você pode enviar outra a
              qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmRemoveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isRemoving} onClick={handleRemove}>
              {isRemoving ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
