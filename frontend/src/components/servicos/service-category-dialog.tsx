"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { ApiError } from "@/lib/api/client";
import { serviceCategorySchema, type ServiceCategoryFormValues } from "@/lib/schemas/service-schema";
import type { ServiceCategory } from "@/lib/services/types";

export function ServiceCategoryDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ServiceCategory | null;
  onSubmit: (values: ServiceCategoryFormValues) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<ServiceCategoryFormValues>({
    resolver: zodResolver(serviceCategorySchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: category?.name ?? "" });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  async function handleSubmit(values: ServiceCategoryFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit(values);
      toast.success(category ? "Categoria atualizada" : "Categoria criada");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a categoria";
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
          <DialogTitle>{category ? "Renomear categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="category-name">Nome</FieldLabel>
            <Input id="category-name" {...form.register("name")} />
            <FieldError
              errors={form.formState.errors.name ? [{ message: form.formState.errors.name.message }] : undefined}
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
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
