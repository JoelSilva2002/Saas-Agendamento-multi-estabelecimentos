"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { getMe, login } from "@/lib/auth/api";
import { clearSession } from "@/lib/auth/clear-session";
import { hasStaffAccess } from "@/lib/auth/roles";
import { resolveSessionContext } from "@/lib/auth/resolve-session";
import { setSessionContext } from "@/lib/auth/session-context";
import { setTokens } from "@/lib/auth/token-storage";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/login-schema";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await login(values.email, values.password);
      setTokens(result);
      const me = await getMe();

      // A client account has no admin grants: letting it through would land on a dashboard
      // where every request 403s. Send them to their own door instead.
      if (!hasStaffAccess(me)) {
        clearSession();
        setSubmitError("Esta conta é de cliente. Use a página de entrada de clientes.");
        return;
      }

      if (me.isPlatformAdmin) {
        router.push("/superadmin/tenants");
      } else {
        setSessionContext(await resolveSessionContext(me));
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso do estabelecimento</CardTitle>
        <CardDescription>Entre no painel da sua equipe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="voce@estabelecimento.com"
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

          <Field data-invalid={!!form.formState.errors.password}>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input id="password" type="password" {...form.register("password")} />
            <FieldError
              errors={
                form.formState.errors.password
                  ? [{ message: form.formState.errors.password.message }]
                  : undefined
              }
            />
            <p className="text-right text-sm">
              <Link href="/esqueci-senha" className="text-primary underline underline-offset-4">
                Esqueci minha senha
              </Link>
            </p>
          </Field>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Quer agendar como cliente?{" "}
          <Link href="/entrar" className="text-primary underline underline-offset-4">
            Entrar como cliente
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
