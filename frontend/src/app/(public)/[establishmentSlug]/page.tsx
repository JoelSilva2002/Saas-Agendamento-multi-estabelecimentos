import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string }>;
}) {
  const { establishmentSlug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{establishmentSlug}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            Endereço não informado
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-4" />
            Sem avaliações ainda
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O catálogo de serviços deste estabelecimento aparecerá aqui.
        </CardContent>
      </Card>

      <Button size="lg" className="w-fit" asChild>
        <Link href={`/${establishmentSlug}/agendar`}>Agendar horário</Link>
      </Button>
    </section>
  );
}
