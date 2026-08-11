"use client";

import { Clock, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatAddress } from "@/components/public/establishment-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
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
      </div>

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
    </section>
  );
}
