"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ClientSignupForm } from "@/components/public/client-signup-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { getMe, login } from "@/lib/auth/api";
import { clearSession } from "@/lib/auth/clear-session";
import { hasClientAccess } from "@/lib/auth/roles";
import { setTokens } from "@/lib/auth/token-storage";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/login-schema";

/**
 * Client-facing sign in. Kept separate from /login (establishment staff) because the two lead
 * to different places and have different expectations: a client should never be dropped into
 * the admin panel, where every request would 403.
 */
export default function ClientLoginPage() {
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

      // A staff-only account has no client area to show. Rather than leaving them on a page
      // that would render an empty history, send them where they belong.
      if (!hasClientAccess(me)) {
        clearSession();
        setSubmitError(
          "Esta conta é de um estabelecimento. Use o acesso para estabelecimentos.",
        );
        return;
      }

      router.push("/meus-agendamentos");
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
        <CardTitle>Sua conta</CardTitle>
        <CardDescription>Acesse seus agendamentos e histórico.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Criar conta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input id="email" type="email" placeholder="voce@email.com" {...form.register("email")} />
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
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <ClientSignupForm />
          </TabsContent>
        </Tabs>

        <p className="mt-4 border-t pt-3 text-center text-sm text-muted-foreground">
          É um estabelecimento?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Acesse o painel
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
