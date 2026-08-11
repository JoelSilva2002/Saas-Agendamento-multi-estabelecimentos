"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateKey } from "@/lib/booking/date-utils";
import { cn } from "@/lib/utils";
import { fitInSchema, type FitInFormValues } from "@/lib/schemas/fit-in-schema";
import type { CreateFitInInput } from "@/lib/agenda/types";

export type FitInPrefill = { date?: string; time?: string; employeeId?: string };
type FitInClient = { id: string; displayName: string };
type FitInService = { id: string; name: string };
type FitInEmployee = { id: string; displayName: string };

export function FitInDialog({
  open,
  onOpenChange,
  prefill,
  clients,
  services,
  employees,
  getEligibleEmployeeIds,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: FitInPrefill;
  clients: FitInClient[];
  services: FitInService[];
  employees: FitInEmployee[];
  // Real eligibility is per-service (GET .../services/:id/employees) — there's no static
  // map to look up synchronously like the old mock had.
  getEligibleEmployeeIds: (serviceId: string) => Promise<string[]>;
  onSubmit: (input: CreateFitInInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [eligibleEmployeeIds, setEligibleEmployeeIds] = useState<string[] | null>(null);

  const form = useForm<FitInFormValues>({
    resolver: zodResolver(fitInSchema),
    defaultValues: { clientId: "", serviceId: "", employeeId: "", date: "", time: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        clientId: "",
        serviceId: "",
        employeeId: prefill?.employeeId ?? "",
        date: prefill?.date ?? toDateKey(new Date()),
        time: prefill?.time ?? "",
      });
      setSubmitError(undefined);
      setEligibleEmployeeIds(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const serviceId = form.watch("serviceId");

  useEffect(() => {
    if (!serviceId) {
      setEligibleEmployeeIds(null);
      return;
    }
    let cancelled = false;
    getEligibleEmployeeIds(serviceId).then((ids) => {
      if (!cancelled) setEligibleEmployeeIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, getEligibleEmployeeIds]);

  const eligibleEmployees = eligibleEmployeeIds
    ? employees.filter((e) => eligibleEmployeeIds.includes(e.id))
    : [];

  async function handleSubmit(values: FitInFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const startAt = new Date(`${values.date}T${values.time}:00`);
      await onSubmit({
        clientId: values.clientId,
        serviceId: values.serviceId,
        employeeId: values.employeeId,
        startAt: startAt.toISOString(),
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível criar o encaixe");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === form.watch("clientId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo encaixe</DialogTitle>
          <DialogDescription>
            Cria um agendamento fora da grade normal de horários disponíveis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.clientId}>
            <FieldLabel>Cliente</FieldLabel>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.displayName : "Buscar cliente..."}
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Buscar por nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.displayName}
                          onSelect={() => {
                            form.setValue("clientId", client.id, { shouldValidate: true });
                            setClientPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              client.id === selectedClient?.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {client.displayName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldError
              errors={
                form.formState.errors.clientId
                  ? [{ message: form.formState.errors.clientId.message }]
                  : undefined
              }
            />
          </Field>

          <Field data-invalid={!!form.formState.errors.serviceId}>
            <FieldLabel>Serviço</FieldLabel>
            <Controller
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("employeeId", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um serviço" />
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

          <Field data-invalid={!!form.formState.errors.employeeId}>
            <FieldLabel>Profissional</FieldLabel>
            <Controller
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!serviceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={serviceId ? "Selecione um profissional" : "Escolha o serviço primeiro"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              errors={
                form.formState.errors.employeeId
                  ? [{ message: form.formState.errors.employeeId.message }]
                  : undefined
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.date}>
              <FieldLabel htmlFor="fitin-date">Data</FieldLabel>
              <Input id="fitin-date" type="date" {...form.register("date")} />
              <FieldError
                errors={
                  form.formState.errors.date ? [{ message: form.formState.errors.date.message }] : undefined
                }
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.time}>
              <FieldLabel htmlFor="fitin-time">Horário</FieldLabel>
              <Input id="fitin-time" type="time" {...form.register("time")} />
              <FieldError
                errors={
                  form.formState.errors.time ? [{ message: form.formState.errors.time.message }] : undefined
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
              Criar encaixe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
