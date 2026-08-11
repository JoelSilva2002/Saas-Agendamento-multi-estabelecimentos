import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import type { Appointment } from "@/lib/appointments/types";
import type { PublicService } from "@/lib/public/types";

export function BookingSuccess({
  establishmentSlug,
  appointment,
  service,
}: {
  establishmentSlug: string;
  appointment: Appointment;
  service?: PublicService;
}) {
  const dateKey = appointment.startAt.slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-10 text-center">
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="text-2xl font-semibold">Agendamento confirmado!</h1>
      <p className="text-muted-foreground">
        Guarde os detalhes abaixo. Chegue com alguns minutos de antecedência.
      </p>

      <Card className="w-full text-left">
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Serviço</span>
            <span className="font-medium">{service?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data</span>
            <span className="font-medium">{formatFullDate(dateKey)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horário</span>
            <span className="font-medium">{formatTime(appointment.startAt)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold">
              {(appointment.priceCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="h-12 w-full">
        <Link href={`/${establishmentSlug}`}>Voltar ao estabelecimento</Link>
      </Button>
    </div>
  );
}
