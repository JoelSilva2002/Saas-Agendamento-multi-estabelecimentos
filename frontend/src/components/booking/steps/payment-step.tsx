import { CreditCard, QrCode } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { computeChargeCents, formatCentsToBRL } from "@/lib/booking/pricing";
import { cn } from "@/lib/utils";
import type { CouponPreview, PaymentMethod, PaymentType, Service } from "@/lib/booking/types";
import type { BookingStepProps } from "@/components/booking/step-props";

function OptionCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
      )}
    >
      {Icon && <Icon className={cn("size-5", selected ? "text-primary" : "text-muted-foreground")} />}
      <span className="text-sm font-medium">{title}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </button>
  );
}

export function PaymentStep({
  form,
  service,
  coupon,
}: BookingStepProps & { service?: Service; coupon: CouponPreview | null }) {
  const { watch, setValue } = form;
  const method = watch("paymentMethod");
  const paymentType = watch("paymentType");

  const priceCents = service ? Math.round(service.price * 100) : 0;
  const { baseCents, discountCents, totalCents } = computeChargeCents({
    priceCents,
    paymentType,
    coupon,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Pagamento</h2>
        <p className="text-sm text-muted-foreground">
          Escolha como e quanto deseja pagar agora para confirmar o horário.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Forma de pagamento</span>
        <div role="radiogroup" aria-label="Forma de pagamento" className="flex gap-2">
          <OptionCard
            selected={method === "pix"}
            onSelect={() => setValue("paymentMethod", "pix" as PaymentMethod, { shouldValidate: true })}
            icon={QrCode}
            title="Pix"
          />
          <OptionCard
            selected={method === "card"}
            onSelect={() => setValue("paymentMethod", "card" as PaymentMethod, { shouldValidate: true })}
            icon={CreditCard}
            title="Cartão"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Quanto pagar agora</span>
        <div role="radiogroup" aria-label="Tipo de pagamento" className="flex gap-2">
          <OptionCard
            selected={paymentType === "deposit"}
            onSelect={() =>
              setValue("paymentType", "deposit" as PaymentType, { shouldValidate: true })
            }
            title="Sinal (30%)"
            subtitle="Pague o restante no local"
          />
          <OptionCard
            selected={paymentType === "full"}
            onSelect={() => setValue("paymentType", "full" as PaymentType, { shouldValidate: true })}
            title="Valor total"
          />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {paymentType === "deposit" ? "Sinal (30% do serviço)" : "Valor do serviço"}
            </span>
            <span>{formatCentsToBRL(baseCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-primary">
              <span>Desconto ({coupon?.code})</span>
              <span>-{formatCentsToBRL(discountCents)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t pt-1.5 font-semibold">
            <span>Total a pagar agora</span>
            <span>{formatCentsToBRL(totalCents)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
