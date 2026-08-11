"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { login, register } from "@/lib/auth/api";
import { setTokens } from "@/lib/auth/token-storage";
import {
  clientSignupSchema,
  type ClientSignupFormValues,
} from "@/lib/schemas/client-signup-schema";

/**
 * Standalone client signup, with no establishment attached: the person may not have picked
 * one yet. The `client` role grant is created later, the first time they book somewhere.
 */
export function ClientSignupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<ClientSignupFormValues>({
    resolver: zodResolver(clientSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleSubmit(values: ClientSignupFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      });
      // Registration returns no tokens, so sign in right away — nobody wants to retype what
      // they just typed.
      const result = await login(values.email, values.password);
      setTokens(result);
      router.push("/meus-agendamentos");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Não foi possível criar a conta. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={!!form.formState.errors.firstName}>
          <FieldLabel htmlFor="signup-first-name">Nome</FieldLabel>
          <Input id="signup-first-name" autoComplete="given-name" {...form.register("firstName")} />
          <FieldError
            errors={
              form.formState.errors.firstName
                ? [{ message: form.formState.errors.firstName.message }]
                : undefined
            }
          />
        </Field>
        <Field data-invalid={!!form.formState.errors.lastName}>
          <FieldLabel htmlFor="signup-last-name">Sobrenome</FieldLabel>
          <Input id="signup-last-name" autoComplete="family-name" {...form.register("lastName")} />
          <FieldError
            errors={
              form.formState.errors.lastName
                ? [{ message: form.formState.errors.lastName.message }]
                : undefined
            }
          />
        </Field>
      </div>

      <Field data-invalid={!!form.formState.errors.email}>
        <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          {...form.register("email")}
        />
        <FieldError
          errors={
            form.formState.errors.email
              ? [{ message: form.formState.errors.email.message }]
              : undefined
          }
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="signup-phone">Telefone (opcional)</FieldLabel>
        <Input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          {...form.register("phone")}
        />
      </Field>

      <Field data-invalid={!!form.formState.errors.password}>
        <FieldLabel htmlFor="signup-password">Senha</FieldLabel>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        <FieldError
          errors={
            form.formState.errors.password
              ? [{ message: form.formState.errors.password.message }]
              : undefined
          }
        />
      </Field>

      <Field data-invalid={!!form.formState.errors.confirmPassword}>
        <FieldLabel htmlFor="signup-confirm-password">Confirmar senha</FieldLabel>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
        <FieldError
          errors={
            form.formState.errors.confirmPassword
              ? [{ message: form.formState.errors.confirmPassword.message }]
              : undefined
          }
        />
      </Field>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
