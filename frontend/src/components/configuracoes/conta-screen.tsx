"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { changePassword, getMe, type MeResponse } from "@/lib/auth/api";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/schemas/change-password-schema";

function PasswordInput({
  id,
  register,
  invalid,
}: {
  id: string;
  register: UseFormRegisterReturn;
  invalid: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={invalid}
        className="pr-10"
        {...register}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function ContaScreen() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar a conta");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: ChangePasswordFormValues) {
    setSubmitError(undefined);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Senha alterada. As outras sessões foram encerradas.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar a senha";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-sm text-muted-foreground">Dados de acesso e senha.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados de acesso</CardTitle>
          <CardDescription>
            O e-mail é o seu identificador de login e só pode ser alterado pelo suporte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-5 w-64" />
          ) : (
            <div className="text-sm">
              <span className="text-muted-foreground">E-mail: </span>
              {me?.email ?? "—"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>
            Por segurança, a senha atual nunca é exibida — ela é armazenada criptografada e não pode
            ser recuperada. Use o ícone de olho para conferir o que você está digitando.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex max-w-sm flex-col gap-4"
          >
            <Field data-invalid={!!form.formState.errors.currentPassword}>
              <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
              <PasswordInput
                id="current-password"
                register={form.register("currentPassword")}
                invalid={!!form.formState.errors.currentPassword}
              />
              <FieldError
                errors={
                  form.formState.errors.currentPassword
                    ? [{ message: form.formState.errors.currentPassword.message }]
                    : undefined
                }
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.newPassword}>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <PasswordInput
                id="new-password"
                register={form.register("newPassword")}
                invalid={!!form.formState.errors.newPassword}
              />
              <FieldError
                errors={
                  form.formState.errors.newPassword
                    ? [{ message: form.formState.errors.newPassword.message }]
                    : undefined
                }
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">Confirmar nova senha</FieldLabel>
              <PasswordInput
                id="confirm-password"
                register={form.register("confirmPassword")}
                invalid={!!form.formState.errors.confirmPassword}
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

            <div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
