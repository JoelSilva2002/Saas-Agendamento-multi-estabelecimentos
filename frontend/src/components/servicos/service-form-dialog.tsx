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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { serviceSchema, type ServiceFormValues } from "@/lib/schemas/service-schema";
import type { CatalogService, CreateServiceInput, ServiceCategory } from "@/lib/services/types";

const NO_CATEGORY_VALUE = "none";

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: CatalogService | null;
  categories: ServiceCategory[];
  onSubmit: (values: CreateServiceInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      categoryId: NO_CATEGORY_VALUE,
      description: "",
      price: "0",
      durationMinutes: "30",
      bufferBeforeMinutes: "0",
      bufferAfterMinutes: "0",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: service?.name ?? "",
        categoryId: service?.categoryId ?? NO_CATEGORY_VALUE,
        description: service?.description ?? "",
        price: String(service?.price ?? 0),
        durationMinutes: String(service?.durationMinutes ?? 30),
        bufferBeforeMinutes: String(service?.bufferBeforeMinutes ?? 0),
        bufferAfterMinutes: String(service?.bufferAfterMinutes ?? 0),
      });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id]);

  async function handleSubmit(values: ServiceFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        name: values.name,
        categoryId: values.categoryId === NO_CATEGORY_VALUE ? undefined : values.categoryId,
        description: values.description,
        price: Number(values.price),
        durationMinutes: Number(values.durationMinutes),
        bufferBeforeMinutes: values.bufferBeforeMinutes ? Number(values.bufferBeforeMinutes) : undefined,
        bufferAfterMinutes: values.bufferAfterMinutes ? Number(values.bufferAfterMinutes) : undefined,
      });
      toast.success(service ? "Serviço atualizado" : "Serviço criado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o serviço";
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
          <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="service-name">Nome</FieldLabel>
            <Input id="service-name" {...form.register("name")} />
            <FieldError
              errors={form.formState.errors.name ? [{ message: form.formState.errors.name.message }] : undefined}
            />
          </Field>

          <Field>
            <FieldLabel>Categoria</FieldLabel>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="service-description">Descrição (opcional)</FieldLabel>
            <Textarea id="service-description" rows={2} {...form.register("description")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.price}>
              <FieldLabel htmlFor="service-price">Preço (R$)</FieldLabel>
              <Input id="service-price" type="number" step="0.01" min="0" {...form.register("price")} />
              <FieldError
                errors={
                  form.formState.errors.price ? [{ message: form.formState.errors.price.message }] : undefined
                }
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.durationMinutes}>
              <FieldLabel htmlFor="service-duration">Duração (min)</FieldLabel>
              <Input id="service-duration" type="number" min="1" {...form.register("durationMinutes")} />
              <FieldError
                errors={
                  form.formState.errors.durationMinutes
                    ? [{ message: form.formState.errors.durationMinutes.message }]
                    : undefined
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="service-buffer-before">Intervalo antes (min)</FieldLabel>
              <Input id="service-buffer-before" type="number" min="0" {...form.register("bufferBeforeMinutes")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="service-buffer-after">Intervalo depois (min)</FieldLabel>
              <Input id="service-buffer-after" type="number" min="0" {...form.register("bufferAfterMinutes")} />
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
