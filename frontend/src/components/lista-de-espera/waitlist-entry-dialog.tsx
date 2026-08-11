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
import type { Employee } from "@/lib/employees/types";
import type { CatalogService } from "@/lib/services/types";
import type { TenantUser } from "@/lib/users/types";
import type { JoinWaitlistInput } from "@/lib/waitlist/types";
import { NO_EMPLOYEE_VALUE, waitlistSchema, type WaitlistFormValues } from "@/lib/schemas/waitlist-schema";

const PERIOD_LABEL: Record<WaitlistFormValues["desiredPeriod"], string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  any: "Qualquer horário",
};

export function WaitlistEntryDialog({
  open,
  onOpenChange,
  clients,
  services,
  employees,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: TenantUser[];
  services: CatalogService[];
  employees: Employee[];
  onSubmit: (values: JoinWaitlistInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      clientId: "",
      serviceId: "",
      employeeId: NO_EMPLOYEE_VALUE,
      desiredDate: "",
      desiredPeriod: "any",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        clientId: "",
        serviceId: "",
        employeeId: NO_EMPLOYEE_VALUE,
        desiredDate: "",
        desiredPeriod: "any",
      });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: WaitlistFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        clientId: values.clientId,
        serviceId: values.serviceId,
        employeeId: values.employeeId === NO_EMPLOYEE_VALUE ? undefined : values.employeeId,
        desiredDate: values.desiredDate,
        desiredPeriod: values.desiredPeriod,
      });
      toast.success("Cliente adicionado à fila de espera");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível adicionar à fila";
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
          <DialogTitle>Adicionar à fila de espera</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.clientId}>
            <FieldLabel>Cliente</FieldLabel>
            <Controller
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {`${client.firstName} ${client.lastName}`.trim()} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              errors={
                form.formState.errors.clientId ? [{ message: form.formState.errors.clientId.message }] : undefined
              }
            />
          </Field>

          <Field data-invalid={!!form.formState.errors.serviceId}>
            <FieldLabel>Serviço</FieldLabel>
            <Controller
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              errors={
                form.formState.errors.serviceId
                  ? [{ message: form.formState.errors.serviceId.message }]
                  : undefined
              }
            />
          </Field>

          <Field>
            <FieldLabel>Profissional (opcional)</FieldLabel>
            <Controller
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_EMPLOYEE_VALUE}>Qualquer profissional</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.desiredDate}>
              <FieldLabel htmlFor="waitlist-date">Data desejada</FieldLabel>
              <Input id="waitlist-date" type="date" {...form.register("desiredDate")} />
              <FieldError
                errors={
                  form.formState.errors.desiredDate
                    ? [{ message: form.formState.errors.desiredDate.message }]
                    : undefined
                }
              />
            </Field>
            <Field>
              <FieldLabel>Período</FieldLabel>
              <Controller
                control={form.control}
                name="desiredPeriod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERIOD_LABEL).map(([value, label]) => (
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
              {isSubmitting ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
