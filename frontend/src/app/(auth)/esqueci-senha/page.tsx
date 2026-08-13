"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/api";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/schemas/forgot-password-schema";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function handleSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    try {
      await requestPasswordReset(values.email);
    } finally {
      // Always shows the same message, sent or not — the backend never reveals whether the
      // e-mail exists, so the UI can't either (enumeration defense).
      setIsSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Informe seu e-mail para receber um link de redefinição.</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <Alert>
            <AlertDescription>
              Se esse e-mail estiver cadastrado, você vai receber um link para redefinir sua
              senha em instantes.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Acesso do estabelecimento
          </Link>{" "}
          ·{" "}
          <Link href="/entrar" className="text-primary underline underline-offset-4">
            Acesso do cliente
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
