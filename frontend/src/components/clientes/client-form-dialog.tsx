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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import type { ClientProfile, UpdateClientProfileInput } from "@/lib/clients/types";
import { clientProfileSchema, type ClientProfileFormValues } from "@/lib/schemas/client-schema";

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  clientName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientProfile | null;
  clientName: string;
  onSubmit: (values: UpdateClientProfileInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: { phone: "", birthDate: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        phone: client?.phone ?? "",
        birthDate: client?.birthDate ? client.birthDate.slice(0, 10) : "",
        notes: client?.notes ?? "",
      });
      setSubmitError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  async function handleSubmit(values: ClientProfileFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onSubmit({
        phone: values.phone ?? "",
        birthDate: values.birthDate ?? "",
        notes: values.notes ?? "",
      });
      toast.success("Cliente atualizado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o cliente";
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
          <DialogTitle>{clientName || "Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
            <Input id="client-phone" {...form.register("phone")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-birth-date">Data de nascimento</FieldLabel>
            <Input id="client-birth-date" type="date" {...form.register("birthDate")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-notes">Notas internas</FieldLabel>
            <Textarea id="client-notes" rows={3} {...form.register("notes")} />
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
