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
import type { Appointment } from "@/lib/appointments/types";
import { ApiError } from "@/lib/api/client";
import type { CreatePaymentInput } from "@/lib/payments/types";
import { paymentSchema, type PaymentFormValues } from "@/lib/schemas/payment-schema";

const METHOD_LABEL: Record<PaymentFormValues["method"], string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

const TYPE_LABEL: Record<PaymentFormValues["paymentType"], string> = {
  deposit: "Sinal",
  full: "Integral",
  local: "Pagamento no local",
};

export function PaymentFormDialog({
  open,
  onOpenChange,
  appointments,
  appointmentLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: Appointment[];
  appointmentLabel: (appointment: Appointment) => string;
  onSubmit: (values: CreatePaymentInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      appointmentId: "",
      method: "pix",
      paymentType: "full",
      couponCode: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ appointmentId: "", method: "pix", paymentType: "full", couponCode: "" });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: PaymentFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        appointmentId: values.appointmentId,
        method: values.method,
        paymentType: values.paymentType,
        couponCode: values.couponCode || undefined,
      });
      toast.success("Pagamento registrado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível registrar o pagamento";
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
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.appointmentId}>
            <FieldLabel>Agendamento</FieldLabel>
            <Controller
              control={form.control}
              name="appointmentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o agendamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((appointment) => (
                      <SelectItem key={appointment.id} value={appointment.id}>
                        {appointmentLabel(appointment)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              errors={
                form.formState.errors.appointmentId
                  ? [{ message: form.formState.errors.appointmentId.message }]
                  : undefined
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Método</FieldLabel>
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METHOD_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="payment-coupon">Cupom (opcional)</FieldLabel>
            <Input id="payment-coupon" className="uppercase" {...form.register("couponCode")} />
          </Field>

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
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
