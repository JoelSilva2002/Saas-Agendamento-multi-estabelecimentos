"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateKey } from "@/lib/booking/date-utils";
import { ALL_STAFF_VALUE, blockSchema, type BlockFormValues } from "@/lib/schemas/block-schema";
import type { CreateBlockInput } from "@/lib/agenda/types";

export type BlockPrefill = { date?: string; employeeId?: string };
type BlockEmployee = { id: string; displayName: string };

export function BlockDialog({
  open,
  onOpenChange,
  prefill,
  employees,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: BlockPrefill;
  employees: BlockEmployee[];
  onSubmit: (input: CreateBlockInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      employeeId: ALL_STAFF_VALUE,
      date: "",
      startTime: "",
      endTime: "",
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: prefill?.employeeId ?? ALL_STAFF_VALUE,
        date: prefill?.date ?? toDateKey(new Date()),
        startTime: "",
        endTime: "",
        reason: "",
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: BlockFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        employeeId: values.employeeId === ALL_STAFF_VALUE ? null : values.employeeId,
        startAt: new Date(`${values.date}T${values.startTime}:00`).toISOString(),
        endAt: new Date(`${values.date}T${values.endTime}:00`).toISOString(),
        reason: values.reason,
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível bloquear o horário");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            Reserva um período da agenda para reunião, manutenção ou outro motivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Profissional</FieldLabel>
            <Controller
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STAFF_VALUE}>Toda a equipe</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              &quot;Toda a equipe&quot; bloqueia o recurso do estabelecimento, não um profissional
              específico.
            </FieldDescription>
          </Field>

          <Field data-invalid={!!form.formState.errors.date}>
            <FieldLabel htmlFor="block-date">Data</FieldLabel>
            <Input id="block-date" type="date" {...form.register("date")} />
            <FieldError
              errors={
                form.formState.errors.date ? [{ message: form.formState.errors.date.message }] : undefined
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.startTime}>
              <FieldLabel htmlFor="block-start">Início</FieldLabel>
              <Input id="block-start" type="time" {...form.register("startTime")} />
              <FieldError
                errors={
                  form.formState.errors.startTime
                    ? [{ message: form.formState.errors.startTime.message }]
                    : undefined
                }
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.endTime}>
              <FieldLabel htmlFor="block-end">Término</FieldLabel>
              <Input id="block-end" type="time" {...form.register("endTime")} />
              <FieldError
                errors={
                  form.formState.errors.endTime
                    ? [{ message: form.formState.errors.endTime.message }]
                    : undefined
                }
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="block-reason">Motivo (opcional)</FieldLabel>
            <Textarea
              id="block-reason"
              rows={2}
              placeholder="Ex: reunião de equipe, manutenção"
              {...form.register("reason")}
            />
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
              Bloquear horário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
