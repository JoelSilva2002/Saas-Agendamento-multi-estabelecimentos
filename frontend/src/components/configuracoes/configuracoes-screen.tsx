"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import {
  getBusinessHours,
  getEstablishment,
  setBusinessHours,
  updateEstablishment,
} from "@/lib/establishments/api";
import type { BusinessHoursDay } from "@/lib/establishments/types";
import {
  establishmentSchema,
  type EstablishmentFormValues,
} from "@/lib/schemas/establishment-schema";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

type DayRow = { open: boolean; openTime: string; closeTime: string };

function defaultRow(): DayRow {
  return { open: false, openTime: "09:00", closeTime: "18:00" };
}

export function ConfiguracoesScreen() {
  const [session] = useState(() => getSessionContext());
  const [isLoading, setIsLoading] = useState(true);

  const [hoursRows, setHoursRows] = useState<DayRow[]>(() => WEEKDAYS.map(defaultRow));
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState<string | undefined>();

  const form = useForm<EstablishmentFormValues>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      name: "",
      slug: "",
      timezone: "America/Sao_Paulo",
      phones: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      country: "BR",
      cancellationMinHoursNotice: "24",
      noShowFeeEnabled: false,
      noShowFeePercentage: "",
      depositEnabled: false,
      depositPercentage: "",
    },
  });

  useEffect(() => {
    if (!session) return;
    setIsLoading(true);
    Promise.all([
      getEstablishment(session.tenantId, session.establishmentId),
      getBusinessHours(session.tenantId, session.establishmentId),
    ])
      .then(([establishment, days]) => {
        form.reset({
          name: establishment.name,
          slug: establishment.slug,
          timezone: establishment.timezone,
          phones: establishment.phones.join(", "),
          street: establishment.address.street ?? "",
          number: establishment.address.number ?? "",
          complement: establishment.address.complement ?? "",
          neighborhood: establishment.address.neighborhood ?? "",
          city: establishment.address.city ?? "",
          state: establishment.address.state ?? "",
          zipCode: establishment.address.zipCode ?? "",
          country: establishment.address.country,
          cancellationMinHoursNotice: String(establishment.cancellationMinHoursNotice),
          noShowFeeEnabled: establishment.noShowFeeEnabled,
          noShowFeePercentage:
            establishment.noShowFeePercentage != null ? String(establishment.noShowFeePercentage) : "",
          depositEnabled: establishment.depositEnabled,
          depositPercentage:
            establishment.depositPercentage != null ? String(establishment.depositPercentage) : "",
        });
        setHoursRows(
          WEEKDAYS.map((day) => {
            const found = days.find((d: BusinessHoursDay) => d.weekday === day.value);
            return found && !found.isClosed && found.openTime && found.closeTime
              ? { open: true, openTime: found.openTime.slice(0, 5), closeTime: found.closeTime.slice(0, 5) }
              : defaultRow();
          }),
        );
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o estabelecimento");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const noShowFeeEnabled = form.watch("noShowFeeEnabled");
  const depositEnabled = form.watch("depositEnabled");

  async function handleSubmit(values: EstablishmentFormValues) {
    if (!session) throw new Error("Sessão não encontrada");
    try {
      await updateEstablishment(session.tenantId, session.establishmentId, {
        name: values.name,
        slug: values.slug,
        timezone: values.timezone,
        phones: values.phones
          ? values.phones.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
        address: {
          street: values.street || undefined,
          number: values.number || undefined,
          complement: values.complement || undefined,
          neighborhood: values.neighborhood || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          zipCode: values.zipCode || undefined,
          country: values.country || undefined,
        },
        cancellationMinHoursNotice: Number(values.cancellationMinHoursNotice),
        noShowFeeEnabled: values.noShowFeeEnabled,
        noShowFeePercentage: values.noShowFeeEnabled ? Number(values.noShowFeePercentage) : null,
        depositEnabled: values.depositEnabled,
        depositPercentage: values.depositEnabled ? Number(values.depositPercentage) : null,
      });
      toast.success("Estabelecimento atualizado");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações");
    }
  }

  function updateHoursRow(index: number, patch: Partial<DayRow>) {
    setHoursRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSaveHours() {
    if (!session) return;
    setIsSavingHours(true);
    setHoursError(undefined);
    try {
      const days: BusinessHoursDay[] = WEEKDAYS.map((day, index) => {
        const row = hoursRows[index];
        return row.open
          ? { weekday: day.value, isClosed: false, openTime: row.openTime, closeTime: row.closeTime }
          : { weekday: day.value, isClosed: true, openTime: null, closeTime: null };
      });
      await setBusinessHours(session.tenantId, session.establishmentId, days);
      toast.success("Horário de funcionamento atualizado");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o horário";
      setHoursError(message);
      toast.error(message);
    } finally {
      setIsSavingHours(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estabelecimento</h1>
        <p className="text-sm text-muted-foreground">
          Dados cadastrais, endereço, horários e política de cancelamento.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados do estabelecimento</CardTitle>
            <CardDescription>Nome, identificador público e fuso horário.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="establishment-name">Nome</FieldLabel>
                <Input id="establishment-name" {...form.register("name")} />
                <FieldError
                  errors={form.formState.errors.name ? [{ message: form.formState.errors.name.message }] : undefined}
                />
              </Field>
              <Field data-invalid={!!form.formState.errors.slug}>
                <FieldLabel htmlFor="establishment-slug">Slug</FieldLabel>
                <Input id="establishment-slug" {...form.register("slug")} />
                <FieldError
                  errors={form.formState.errors.slug ? [{ message: form.formState.errors.slug.message }] : undefined}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!form.formState.errors.timezone}>
                <FieldLabel htmlFor="establishment-timezone">Fuso horário</FieldLabel>
                <Input id="establishment-timezone" {...form.register("timezone")} />
                <FieldError
                  errors={
                    form.formState.errors.timezone
                      ? [{ message: form.formState.errors.timezone.message }]
                      : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishment-phones">Telefones (separados por vírgula)</FieldLabel>
                <Input id="establishment-phones" {...form.register("phones")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field className="col-span-2">
                <FieldLabel htmlFor="establishment-street">Rua</FieldLabel>
                <Input id="establishment-street" {...form.register("street")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishment-number">Número</FieldLabel>
                <Input id="establishment-number" {...form.register("number")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="establishment-complement">Complemento</FieldLabel>
                <Input id="establishment-complement" {...form.register("complement")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishment-neighborhood">Bairro</FieldLabel>
                <Input id="establishment-neighborhood" {...form.register("neighborhood")} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Field className="col-span-2">
                <FieldLabel htmlFor="establishment-city">Cidade</FieldLabel>
                <Input id="establishment-city" {...form.register("city")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishment-state">Estado</FieldLabel>
                <Input id="establishment-state" {...form.register("state")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="establishment-zip">CEP</FieldLabel>
                <Input id="establishment-zip" {...form.register("zipCode")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política de cancelamento e pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field
              className="max-w-xs"
              data-invalid={!!form.formState.errors.cancellationMinHoursNotice}
            >
              <FieldLabel htmlFor="establishment-cancellation-notice">
                Antecedência mínima para cancelamento (horas)
              </FieldLabel>
              <Input
                id="establishment-cancellation-notice"
                type="number"
                min="0"
                {...form.register("cancellationMinHoursNotice")}
              />
              <FieldError
                errors={
                  form.formState.errors.cancellationMinHoursNotice
                    ? [{ message: form.formState.errors.cancellationMinHoursNotice.message }]
                    : undefined
                }
              />
            </Field>

            <div className="flex items-center gap-3">
              <Switch
                checked={noShowFeeEnabled}
                onCheckedChange={(checked) => form.setValue("noShowFeeEnabled", checked)}
              />
              <span className="text-sm">Cobrar multa por no-show</span>
              {noShowFeeEnabled && (
                <Field className="w-32" data-invalid={!!form.formState.errors.noShowFeePercentage}>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="% do serviço"
                    {...form.register("noShowFeePercentage")}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.noShowFeePercentage
                        ? [{ message: form.formState.errors.noShowFeePercentage.message }]
                        : undefined
                    }
                  />
                </Field>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={depositEnabled}
                onCheckedChange={(checked) => form.setValue("depositEnabled", checked)}
              />
              <span className="text-sm">Exigir sinal/depósito</span>
              {depositEnabled && (
                <Field className="w-32" data-invalid={!!form.formState.errors.depositPercentage}>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="% do serviço"
                    {...form.register("depositPercentage")}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.depositPercentage
                        ? [{ message: form.formState.errors.depositPercentage.message }]
                        : undefined
                    }
                  />
                </Field>
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Horário de funcionamento</CardTitle>
          <CardDescription>Dias e horários em que o estabelecimento aceita agendamentos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {WEEKDAYS.map((day, index) => (
              <div key={day.value} className="flex items-center gap-3">
                <Switch
                  checked={hoursRows[index].open}
                  onCheckedChange={(checked) => updateHoursRow(index, { open: checked })}
                />
                <span className="w-24 text-sm">{day.label}</span>
                <Input
                  type="time"
                  className="w-28"
                  disabled={!hoursRows[index].open}
                  value={hoursRows[index].openTime}
                  onChange={(e) => updateHoursRow(index, { openTime: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="time"
                  className="w-28"
                  disabled={!hoursRows[index].open}
                  value={hoursRows[index].closeTime}
                  onChange={(e) => updateHoursRow(index, { closeTime: e.target.value })}
                />
              </div>
            ))}
          </div>

          {hoursError && (
            <Alert variant="destructive">
              <AlertDescription>{hoursError}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button type="button" disabled={isSavingHours} onClick={handleSaveHours}>
              {isSavingHours ? "Salvando..." : "Salvar horário"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
