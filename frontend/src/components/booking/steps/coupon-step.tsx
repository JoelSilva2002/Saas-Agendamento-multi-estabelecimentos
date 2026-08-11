import { Loader2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CouponPreview } from "@/lib/booking/types";
import type { BookingStepProps } from "@/components/booking/step-props";

export function CouponStep({
  form,
  coupon,
  couponError,
  isChecking,
  onApply,
  onClear,
}: BookingStepProps & {
  coupon: CouponPreview | null;
  couponError: string | null;
  isChecking: boolean;
  onApply: (code: string) => void;
  onClear: () => void;
}) {
  const { register, watch } = form;
  const couponCode = watch("couponCode");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Cupom de desconto</h2>
        <p className="text-sm text-muted-foreground">
          Tem um cupom? Aplique agora. Esta etapa é opcional.
        </p>
      </div>

      {coupon ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              Cupom <span className="font-semibold">{coupon.code}</span> aplicado —{" "}
              {coupon.discountType === "percentage"
                ? `${coupon.discountValue}% de desconto`
                : `R$ ${coupon.discountValue.toFixed(2)} de desconto`}
            </span>
            <Button type="button" variant="ghost" size="icon" onClick={onClear} aria-label="Remover cupom">
              <X className="size-4" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Field>
          <FieldLabel htmlFor="couponCode">Código do cupom</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="couponCode"
              placeholder="Ex: BEMVINDO10"
              className="h-11 flex-1 uppercase"
              {...register("couponCode")}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={!couponCode?.trim() || isChecking}
              onClick={() => onApply(couponCode ?? "")}
            >
              {isChecking && <Loader2 className="size-4 animate-spin" />}
              Aplicar
            </Button>
          </div>
          <FieldDescription>Deixe em branco para continuar sem cupom.</FieldDescription>
        </Field>
      )}

      {couponError && (
        <Alert variant="destructive">
          <AlertDescription>{couponError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
