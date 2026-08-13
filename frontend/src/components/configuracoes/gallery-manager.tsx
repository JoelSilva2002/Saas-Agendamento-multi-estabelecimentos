"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { FieldDescription } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { deletePhoto, listPhotos, reorderPhotos, uploadPhoto } from "@/lib/establishments/media.api";
import type { EstablishmentPhoto } from "@/lib/establishments/types";

// Mirrors MEDIA_MAX_GALLERY_PHOTOS's backend default (see configuration.ts) — a UX guardrail to
// disable the input proactively; the server is the actual source of truth and still enforces it.
const MAX_GALLERY_PHOTOS = 12;

type GalleryManagerProps = { tenantId: string; establishmentId: string };

export function GalleryManager({ tenantId, establishmentId }: GalleryManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<EstablishmentPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstablishmentPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const result = await listPhotos(tenantId, establishmentId);
      setPhotos(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar as fotos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, establishmentId]);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    // Sequential, not Promise.all: keeps the server-side count check and position assignment
    // coherent, and one failure (e.g. hitting the cap midway) doesn't abort the whole batch.
    for (let i = 0; i < list.length; i++) {
      setUploadProgress({ current: i + 1, total: list.length });
      try {
        const photo = await uploadPhoto(tenantId, establishmentId, list[i]);
        setPhotos((prev) => [...prev, photo]);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar uma das fotos");
      }
    }
    setUploadProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleReorder(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const reordered = [...photos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const previous = photos;
    setPhotos(reordered);
    setIsReordering(true);
    try {
      const result = await reorderPhotos(tenantId, establishmentId, reordered.map((p) => p.id));
      setPhotos(result);
    } catch (err) {
      setPhotos(previous);
      toast.error(err instanceof ApiError ? err.message : "Não foi possível reordenar as fotos");
    } finally {
      setIsReordering(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePhoto(tenantId, establishmentId, deleteTarget.id);
      setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a foto");
    } finally {
      setIsDeleting(false);
    }
  }

  const atCap = photos.length >= MAX_GALLERY_PHOTOS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galeria</CardTitle>
        <CardDescription>Fotos do espaço, mostradas na página pública do estabelecimento.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-muted-foreground">
            <ImagePlus className="size-8 opacity-50" />
            <p>Nenhuma foto ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- already resized/converted server-side, see Fase 26 plan */}
                <img
                  src={photo.thumbUrl}
                  alt={photo.caption ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="secondary"
                      disabled={index === 0 || isReordering}
                      onClick={() => handleReorder(index, -1)}
                      aria-label="Mover para a esquerda"
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="secondary"
                      disabled={index === photos.length - 1 || isReordering}
                      onClick={() => handleReorder(index, 1)}
                      aria-label="Mover para a direita"
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="destructive"
                    onClick={() => setDeleteTarget(photo)}
                    aria-label="Remover foto"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <Button type="button" asChild variant="outline" disabled={atCap || !!uploadProgress}>
            <label htmlFor="gallery-input" className="cursor-pointer">
              {uploadProgress
                ? `Enviando ${uploadProgress.current} de ${uploadProgress.total}...`
                : "Adicionar fotos"}
            </label>
          </Button>
          <input
            ref={inputRef}
            id="gallery-input"
            type="file"
            multiple
            className="sr-only"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={atCap || !!uploadProgress}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          {atCap && (
            <FieldDescription>
              Limite de {MAX_GALLERY_PHOTOS} fotos atingido — remova uma para adicionar outra.
            </FieldDescription>
          )}
        </div>
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover foto</DialogTitle>
            <DialogDescription>Esta foto deixa de aparecer para os clientes imediatamente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
