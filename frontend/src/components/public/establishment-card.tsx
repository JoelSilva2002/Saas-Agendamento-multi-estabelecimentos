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
        <CardContent className="flex gap-3">
          {establishment.logoThumbUrl && (
            // No placeholder when there's no logo: on rollout day, when every establishment
            // still lacks one, the card should look byte-for-byte like it did before this
            // feature shipped. Decorative — the name sits right beside it.
            // eslint-disable-next-line @next/next/no-img-element -- already resized/converted server-side, see Fase 26 plan
            <img
              src={establishment.logoThumbUrl}
              alt=""
              width={44}
              height={44}
              loading="lazy"
              className="size-11 shrink-0 rounded-md border object-cover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
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
            {establishment.description && (
              // Clamped to two lines: the card is a scannable summary, the full text lives on
              // the establishment's own page.
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {establishment.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
