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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import type { Client, CreateClientInput, UpdateClientProfileInput } from "@/lib/clients/types";
import {
  clientProfileSchema,
  createClientSchema,
  type ClientProfileFormValues,
  type CreateClientFormValues,
} from "@/lib/schemas/client-schema";

/**
 * Handles both creating a walk-in client (only the name is required — see
 * ResolveOrCreateClientUseCase on the backend) and editing an existing profile's
 * phone/birth date/notes. The two modes show different fields entirely — a client's name/
 * e-mail aren't editable here, only set once at creation.
 */
export function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  client,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required for "edit", ignored for "create". */
  client: Client | null;
  onCreate: (values: CreateClientInput) => Promise<void>;
  onUpdate: (values: UpdateClientProfileInput) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const editForm = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: { phone: "", birthDate: "", notes: "" },
  });

  const createForm = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(undefined);
    if (mode === "edit") {
      editForm.reset({
        phone: client?.phone ?? "",
        birthDate: client?.birthDate ? client.birthDate.slice(0, 10) : "",
        notes: client?.notes ?? "",
      });
    } else {
      createForm.reset({ firstName: "", lastName: "", email: "", phone: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, client?.id]);

  async function handleUpdate(values: ClientProfileFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onUpdate({ phone: values.phone ?? "", birthDate: values.birthDate ?? "", notes: values.notes ?? "" });
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

  async function handleCreate(values: CreateClientFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onCreate({
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível cadastrar o cliente";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const clientName = client ? `${client.firstName} ${client.lastName}`.trim() : "";
  const createFormHasEmail = !!createForm.watch("email");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? clientName || "Cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        {mode === "edit" ? (
          <form onSubmit={editForm.handleSubmit(handleUpdate)} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
              <Input id="client-phone" {...editForm.register("phone")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-birth-date">Data de nascimento</FieldLabel>
              <Input id="client-birth-date" type="date" {...editForm.register("birthDate")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-notes">Notas internas</FieldLabel>
              <Textarea id="client-notes" rows={3} {...editForm.register("notes")} />
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
        ) : (
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!createForm.formState.errors.firstName}>
                <FieldLabel htmlFor="new-client-first-name">Nome</FieldLabel>
                <Input id="new-client-first-name" autoFocus {...createForm.register("firstName")} />
                <FieldError
                  errors={
                    createForm.formState.errors.firstName
                      ? [{ message: createForm.formState.errors.firstName.message }]
                      : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-client-last-name">Sobrenome</FieldLabel>
                <Input id="new-client-last-name" {...createForm.register("lastName")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="new-client-phone">Telefone</FieldLabel>
                <Input id="new-client-phone" {...createForm.register("phone")} />
              </Field>
              <Field data-invalid={!!createForm.formState.errors.email}>
                <FieldLabel htmlFor="new-client-email">E-mail</FieldLabel>
                <Input id="new-client-email" type="email" {...createForm.register("email")} />
                <FieldError
                  errors={
                    createForm.formState.errors.email
                      ? [{ message: createForm.formState.errors.email.message }]
                      : undefined
                  }
                />
              </Field>
            </div>
            {!createFormHasEmail && (
              <FieldDescription>
                Sem e-mail — este cliente não receberá confirmação nem lembretes.
              </FieldDescription>
            )}

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
                {isSubmitting ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
