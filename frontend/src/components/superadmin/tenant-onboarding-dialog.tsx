"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  tenantOnboardingSchema,
  type TenantOnboardingFormValues,
} from "@/lib/schemas/tenant-onboarding-schema";
import { createTenant } from "@/lib/tenants/api";
import { TENANT_PLANS, type CreateTenantOutput } from "@/lib/tenants/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PLAN_LABEL: Record<(typeof TENANT_PLANS)[number], string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const DEFAULT_VALUES: TenantOnboardingFormValues = {
  name: "",
  slug: "",
  document: "",
  plan: "free",
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  establishmentName: "",
  establishmentSlug: "",
};

export function TenantOnboardingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [result, setResult] = useState<{ output: CreateTenantOutput; ownerEmail: string } | null>(null);

  const form = useForm<TenantOnboardingFormValues>({
    resolver: zodResolver(tenantOnboardingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
      setSubmitError(undefined);
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: TenantOnboardingFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const output = await createTenant(values);
      setResult({ output, ownerEmail: values.ownerEmail });
      onCreated();
      toast.success("Empreendimento criado com sucesso");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível criar o empreendimento";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyPassword() {
    if (!result?.output.temporaryPassword) return;
    void navigator.clipboard.writeText(result.output.temporaryPassword);
    toast.success("Senha copiada");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Empreendimento criado</DialogTitle>
              <DialogDescription>
                Guarde a senha temporária abaixo — ela só é exibida uma vez.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Empreendimento: </span>
                {result.output.name} ({result.output.slug})
              </div>
              <div>
                <span className="text-muted-foreground">Acesso do admin: </span>
                {result.ownerEmail}
              </div>
              {result.output.temporaryPassword && (
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  <span className="flex-1 break-all">{result.output.temporaryPassword}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={handleCopyPassword}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Novo empreendimento</DialogTitle>
              <DialogDescription>
                Cadastra o tenant, o primeiro estabelecimento e o usuário admin do cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="tenant-name">Nome do empreendimento</FieldLabel>
                  <Input
                    id="tenant-name"
                    {...form.register("name", {
                      onChange: (e) => {
                        if (!form.formState.dirtyFields.slug) {
                          form.setValue("slug", slugify(e.target.value));
                        }
                      },
                    })}
                  />
                  <FieldError
                    errors={form.formState.errors.name ? [{ message: form.formState.errors.name.message }] : undefined}
                  />
                </Field>
                <Field data-invalid={!!form.formState.errors.slug}>
                  <FieldLabel htmlFor="tenant-slug">Slug</FieldLabel>
                  <Input id="tenant-slug" {...form.register("slug")} />
                  <FieldError
                    errors={form.formState.errors.slug ? [{ message: form.formState.errors.slug.message }] : undefined}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="tenant-document">Documento (opcional)</FieldLabel>
                  <Input id="tenant-document" placeholder="CNPJ/CPF" {...form.register("document")} />
                </Field>
                <Field>
                  <FieldLabel>Plano</FieldLabel>
                  <Controller
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TENANT_PLANS.map((plan) => (
                            <SelectItem key={plan} value={plan}>
                              {PLAN_LABEL[plan]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.ownerFirstName}>
                  <FieldLabel htmlFor="owner-first-name">Nome do responsável</FieldLabel>
                  <Input id="owner-first-name" {...form.register("ownerFirstName")} />
                  <FieldError
                    errors={
                      form.formState.errors.ownerFirstName
                        ? [{ message: form.formState.errors.ownerFirstName.message }]
                        : undefined
                    }
                  />
                </Field>
                <Field data-invalid={!!form.formState.errors.ownerLastName}>
                  <FieldLabel htmlFor="owner-last-name">Sobrenome</FieldLabel>
                  <Input id="owner-last-name" {...form.register("ownerLastName")} />
                  <FieldError
                    errors={
                      form.formState.errors.ownerLastName
                        ? [{ message: form.formState.errors.ownerLastName.message }]
                        : undefined
                    }
                  />
                </Field>
              </div>

              <Field data-invalid={!!form.formState.errors.ownerEmail}>
                <FieldLabel htmlFor="owner-email">E-mail do responsável</FieldLabel>
                <Input id="owner-email" type="email" {...form.register("ownerEmail")} />
                <FieldError
                  errors={
                    form.formState.errors.ownerEmail
                      ? [{ message: form.formState.errors.ownerEmail.message }]
                      : undefined
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.establishmentName}>
                  <FieldLabel htmlFor="establishment-name">Nome do estabelecimento</FieldLabel>
                  <Input
                    id="establishment-name"
                    {...form.register("establishmentName", {
                      onChange: (e) => {
                        if (!form.formState.dirtyFields.establishmentSlug) {
                          form.setValue("establishmentSlug", slugify(e.target.value));
                        }
                      },
                    })}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.establishmentName
                        ? [{ message: form.formState.errors.establishmentName.message }]
                        : undefined
                    }
                  />
                </Field>
                <Field data-invalid={!!form.formState.errors.establishmentSlug}>
                  <FieldLabel htmlFor="establishment-slug">Slug do estabelecimento</FieldLabel>
                  <Input id="establishment-slug" {...form.register("establishmentSlug")} />
                  <FieldError
                    errors={
                      form.formState.errors.establishmentSlug
                        ? [{ message: form.formState.errors.establishmentSlug.message }]
                        : undefined
                    }
                  />
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
                  {isSubmitting ? "Criando..." : "Criar empreendimento"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
