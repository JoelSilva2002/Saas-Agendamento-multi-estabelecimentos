import { MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { PublicEstablishment } from "@/lib/public/types";

export function formatAddress(address: PublicEstablishment["address"]): string | null {
  const line = [address.street, address.number].filter(Boolean).join(", ");
  const area = [address.neighborhood, address.city, address.state].filter(Boolean).join(" · ");
  const full = [line, area].filter(Boolean).join(" — ");
  return full || null;
}

export function EstablishmentCard({ establishment }: { establishment: PublicEstablishment }) {
  const address = formatAddress(establishment.address);

  return (
    <Link href={`/${establishment.slug}`} className="group">
      <Card className="h-full transition-colors group-hover:border-primary/40">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold group-hover:text-primary">{establishment.name}</h2>
            {establishment.rating.count > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                {establishment.rating.average.toFixed(1)} ({establishment.rating.count})
              </span>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {address ?? "Endereço não informado"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
