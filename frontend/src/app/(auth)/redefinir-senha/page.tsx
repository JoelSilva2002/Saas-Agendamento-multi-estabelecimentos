"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { resetPassword } from "@/lib/auth/api";
import { clearSession } from "@/lib/auth/clear-session";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/schemas/reset-password-schema";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  // A leftover access token from a previous session must never let apiFetch's "session
  // expired" handling get involved while the user is resetting their password — and setting a
  // new password should end any local session anyway.
  useEffect(() => {
    clearSession();
  }, []);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function handleSubmit(values: ResetPasswordFormValues) {
    if (!token) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await resetPassword(token, values.newPassword);
      router.push(result.redirectTo === "login" ? "/login" : "/entrar");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Não foi possível redefinir a senha. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>Este link de redefinição de senha está incompleto.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="text-primary underline underline-offset-4">
              Solicite um novo link
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.newPassword}>
            <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
            <Input id="newPassword" type="password" {...form.register("newPassword")} />
            <FieldError
              errors={
                form.formState.errors.newPassword
                  ? [{ message: form.formState.errors.newPassword.message }]
                  : undefined
              }
            />
          </Field>

          <Field data-invalid={!!form.formState.errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirme a nova senha</FieldLabel>
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
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
            {isSubmitting ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
