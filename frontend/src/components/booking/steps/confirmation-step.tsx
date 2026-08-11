import { CalendarDays, Clock, CreditCard, Scissors, Ticket, User } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import { computeChargeCents, formatCentsToBRL } from "@/lib/booking/pricing";
import type { CouponPreview, Employee, Service } from "@/lib/booking/types";
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
  coupon,
  submitError,
}: BookingStepProps & {
  service?: Service;
  employee?: Employee;
  coupon: CouponPreview | null;
  submitError?: string;
}) {
  const values = form.getValues();
  const priceCents = service ? Math.round(service.price * 100) : 0;
  const { totalCents } = computeChargeCents({
    priceCents,
    paymentType: values.paymentType,
    coupon,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Confirme seu agendamento</h2>
        <p className="text-sm text-muted-foreground">
          Revise os detalhes antes de confirmar. Você será cobrado ao confirmar.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SummaryRow icon={Scissors} label="Serviço" value={service?.name ?? "—"} />
          <SummaryRow icon={User} label="Profissional" value={employee?.displayName ?? "—"} />
          <SummaryRow
            icon={CalendarDays}
            label="Data"
            value={values.date ? formatFullDate(values.date) : "—"}
          />
          <SummaryRow
            icon={Clock}
            label="Horário"
            value={values.slotStartAt ? formatTime(values.slotStartAt) : "—"}
          />
          {coupon && <SummaryRow icon={Ticket} label="Cupom" value={coupon.code} />}
          <SummaryRow
            icon={CreditCard}
            label="Pagamento"
            value={`${values.paymentMethod === "pix" ? "Pix" : "Cartão"} · ${
              values.paymentType === "deposit" ? "Sinal (30%)" : "Total"
            }`}
          />
          <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
            <span>Total a pagar agora</span>
            <span>{formatCentsToBRL(totalCents)}</span>
          </div>
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
