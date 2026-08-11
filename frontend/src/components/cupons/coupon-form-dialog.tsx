"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { Coupon, CreateCouponInput, UpdateCouponInput } from "@/lib/coupons/types";
import { couponSchema, type CouponFormValues } from "@/lib/schemas/coupon-schema";

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function CouponFormDialog({
  open,
  onOpenChange,
  coupon,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
  onSubmit: (values: CreateCouponInput | UpdateCouponInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discountType: "percentage",
      discountValue: "10",
      maxUses: "",
      minPurchase: "",
      validFrom: "",
      validUntil: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: coupon?.code ?? "",
        discountType: coupon?.discountType ?? "percentage",
        discountValue: String(coupon?.discountValue ?? 10),
        maxUses: coupon?.maxUses != null ? String(coupon.maxUses) : "",
        minPurchase: coupon?.minPurchaseCents != null ? String(coupon.minPurchaseCents / 100) : "",
        validFrom: coupon ? toDateInputValue(coupon.validFrom) : "",
        validUntil: coupon ? toDateInputValue(coupon.validUntil) : "",
      });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coupon?.id]);

  async function handleSubmit(values: CouponFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        code: values.code,
        discountType: values.discountType,
        discountValue: Number(values.discountValue),
        maxUses: values.maxUses ? Number(values.maxUses) : undefined,
        minPurchase: values.minPurchase ? Number(values.minPurchase) : undefined,
        validFrom: `${values.validFrom}T00:00:00.000Z`,
        validUntil: `${values.validUntil}T23:59:59.999Z`,
      });
      toast.success(coupon ? "Cupom atualizado" : "Cupom criado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o cupom";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coupon ? "Editar cupom" : "Novo cupom"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.code}>
            <FieldLabel htmlFor="coupon-code">Código</FieldLabel>
            <Input
              id="coupon-code"
              className="uppercase"
              placeholder="PROMO10"
              {...form.register("code")}
            />
            <FieldError
              errors={form.formState.errors.code ? [{ message: form.formState.errors.code.message }] : undefined}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Tipo de desconto</FieldLabel>
              <Controller
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed_amount">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.discountValue}>
              <FieldLabel htmlFor="coupon-discount-value">Valor</FieldLabel>
              <Input
                id="coupon-discount-value"
                type="number"
                step="0.01"
                min="0"
                {...form.register("discountValue")}
              />
              <FieldError
                errors={
                  form.formState.errors.discountValue
                    ? [{ message: form.formState.errors.discountValue.message }]
                    : undefined
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.maxUses}>
              <FieldLabel htmlFor="coupon-max-uses">Limite de usos (opcional)</FieldLabel>
              <Input id="coupon-max-uses" type="number" min="1" {...form.register("maxUses")} />
              <FieldError
                errors={
                  form.formState.errors.maxUses
                    ? [{ message: form.formState.errors.maxUses.message }]
                    : undefined
                }
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.minPurchase}>
              <FieldLabel htmlFor="coupon-min-purchase">Compra mínima R$ (opcional)</FieldLabel>
              <Input
                id="coupon-min-purchase"
                type="number"
                step="0.01"
                min="0"
                {...form.register("minPurchase")}
              />
              <FieldError
                errors={
                  form.formState.errors.minPurchase
                    ? [{ message: form.formState.errors.minPurchase.message }]
                    : undefined
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.validFrom}>
              <FieldLabel htmlFor="coupon-valid-from">Válido de</FieldLabel>
              <Input id="coupon-valid-from" type="date" {...form.register("validFrom")} />
              <FieldError
                errors={
                  form.formState.errors.validFrom
                    ? [{ message: form.formState.errors.validFrom.message }]
                    : undefined
                }
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.validUntil}>
              <FieldLabel htmlFor="coupon-valid-until">Válido até</FieldLabel>
              <Input id="coupon-valid-until" type="date" {...form.register("validUntil")} />
              <FieldError
                errors={
                  form.formState.errors.validUntil
                    ? [{ message: form.formState.errors.validUntil.message }]
                    : undefined
                }
              />
            </Field>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
