"use client";

import { SearchX } from "lucide-react";
import { useEffect, useState } from "react";

import { CitySearchForm } from "@/components/public/city-search-form";
import { EstablishmentCard } from "@/components/public/establishment-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { searchEstablishments } from "@/lib/public/api";
import type { PublicEstablishment } from "@/lib/public/types";

export function SearchResults({ city, search }: { city?: string; search?: string }) {
  const [results, setResults] = useState<PublicEstablishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    searchEstablishments({ city, search })
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Não foi possível buscar agora");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, search]);

  const label = [city, search].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {label ? `Resultados para ${label}` : "Estabelecimentos"}
        </h1>
        <CitySearchForm initialCity={city} initialSearch={search} size="sm" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <SearchX className="size-10 opacity-50" />
          <p>Nenhum estabelecimento encontrado{city ? ` em ${city}` : ""}.</p>
          <p className="text-sm">Tente outra cidade ou remova os filtros.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "estabelecimento" : "estabelecimentos"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((establishment) => (
              <EstablishmentCard key={establishment.establishmentId} establishment={establishment} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
