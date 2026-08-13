"use client";

import { ArrowLeft, ArrowRight, Clock, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatAddress } from "@/components/public/establishment-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { getEstablishment, listServices } from "@/lib/public/api";
import type { PublicEstablishmentDetail, PublicService } from "@/lib/public/types";

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EstablishmentDetail({ slug }: { slug: string }) {
  const [establishment, setEstablishment] = useState<PublicEstablishmentDetail | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getEstablishment(slug), listServices(slug)])
      .then(([detail, serviceList]) => {
        if (cancelled) return;
        setEstablishment(detail);
        setServices(serviceList);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "Estabelecimento não encontrado."
            : "Não foi possível carregar este estabelecimento.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (error || !establishment) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Estabelecimento não encontrado."}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/buscar">Ver outros estabelecimentos</Link>
        </Button>
      </section>
    );
  }

  const address = formatAddress(establishment.address);
  const photos = establishment.photos;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start gap-4">
        {establishment.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- already resized/converted server-side, see Fase 26 plan
          <img
            src={establishment.logoUrl}
            alt=""
            className="size-20 shrink-0 rounded-xl border object-cover"
          />
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{establishment.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {address ?? "Endereço não informado"}
            </span>
            <span className="flex items-center gap-1">
              <Star
                className={
                  establishment.rating.count > 0
                    ? "size-4 fill-yellow-400 text-yellow-400"
                    : "size-4"
                }
              />
              {establishment.rating.count > 0
                ? `${establishment.rating.average.toFixed(1)} (${establishment.rating.count})`
                : "Sem avaliações ainda"}
            </span>
            {establishment.phones.length > 0 && (
              <span className="flex items-center gap-1">
                <Phone className="size-4" />
                {establishment.phones.join(" · ")}
              </span>
            )}
          </div>
          {establishment.description && (
            <p className="max-w-2xl whitespace-pre-line text-muted-foreground">
              {establishment.description}
            </p>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        // Static grid, not a carousel: no carousel primitive exists in this project, and a
        // grid reads better for SEO with the small photo counts this feature allows (≤12).
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="relative aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see note above */}
              <img
                src={photo.thumbUrl}
                alt={photo.caption ?? ""}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este estabelecimento ainda não publicou serviços.
            </p>
          ) : (
            <ul className="divide-y">
              {services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      {service.durationMinutes} min
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{formatPrice(service.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {services.length > 0 && (
        <Button size="lg" className="w-fit" asChild>
          <Link href={`/${slug}/agendar`}>Agendar horário</Link>
        </Button>
      )}

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-3xl p-0" showCloseButton>
          <DialogTitle className="sr-only">
            Foto {lightboxIndex !== null ? lightboxIndex + 1 : ""} de {establishment.name}
          </DialogTitle>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- see note above */}
              <img
                src={photos[lightboxIndex].url}
                alt={photos[lightboxIndex].caption ?? ""}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
              {photos.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => setLightboxIndex((i) => (i! - 1 + photos.length) % photos.length)}
                    aria-label="Foto anterior"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => setLightboxIndex((i) => (i! + 1) % photos.length)}
                    aria-label="Próxima foto"
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
