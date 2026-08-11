import { CalendarDays, Clock, Scissors, User } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import type { PublicEmployee, PublicService } from "@/lib/public/types";
import type { BookingStepProps } from "@/components/booking/step-props";

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

export function ConfirmationStep({
  form,
  service,
  employee,
  submitError,
  timeZone,
}: BookingStepProps & {
  service?: PublicService;
  employee?: PublicEmployee;
  submitError?: string;
  timeZone: string;
}) {
  const values = form.getValues();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Confirme seu agendamento</h2>
        <p className="text-sm text-muted-foreground">
          Revise os detalhes antes de confirmar. O pagamento é combinado diretamente com o
          estabelecimento.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SummaryRow icon={Scissors} label="Serviço" value={service?.name ?? "—"} />
          <SummaryRow icon={User} label="Profissional" value={employee?.name ?? "—"} />
          <SummaryRow
            icon={CalendarDays}
            label="Data"
            value={values.date ? formatFullDate(values.date) : "—"}
          />
          <SummaryRow
            icon={Clock}
            label="Horário"
            value={values.slotStartAt ? formatTime(values.slotStartAt, timeZone) : "—"}
          />
          {service && (
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Valor do serviço</span>
              <span>
                {service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
