import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import { formatCentsToBRL } from "@/lib/booking/pricing";
import type { CreatedAppointment, CreatedPayment, Service } from "@/lib/booking/types";

export function BookingSuccess({
  establishmentSlug,
  appointment,
  payment,
  service,
}: {
  establishmentSlug: string;
  appointment: CreatedAppointment;
  payment: CreatedPayment;
  service?: Service;
}) {
  const dateKey = appointment.startAt.slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-10 text-center">
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="text-2xl font-semibold">Agendamento confirmado!</h1>
      <p className="text-muted-foreground">
        Enviamos os detalhes para o seu e-mail. Chegue com alguns minutos de antecedência.
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
            <span className="text-muted-foreground">
              {payment.status === "paid" ? "Pago agora" : "Pagamento pendente"}
            </span>
            <span className="font-semibold">{formatCentsToBRL(payment.amountCents)}</span>
          </div>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="h-12 w-full">
        <Link href={`/${establishmentSlug}`}>Voltar ao estabelecimento</Link>
      </Button>
    </div>
  );
}
