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
import type { Employee } from "@/lib/employees/types";
import type { Role } from "@/lib/roles/types";
import {
  employeeEditSchema,
  employeeInviteSchema,
  type EmployeeEditFormValues,
  type EmployeeInviteFormValues,
} from "@/lib/schemas/employee-schema";

const ASSIGNABLE_ROLES = ["owner", "manager", "receptionist", "employee"];
const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  manager: "Gerente",
  receptionist: "Recepcionista",
  employee: "Funcionário",
};

const INVITE_DEFAULTS: EmployeeInviteFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  roleId: "",
  jobTitle: "",
  hiredAt: "",
};

type CreatedResult = { employee: Employee; temporaryPassword?: string; email: string };

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  roles,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  roles: Role[];
  onCreate: (
    values: EmployeeInviteFormValues,
  ) => Promise<{ employee: Employee; temporaryPassword?: string }>;
  onUpdate: (employeeId: string, values: EmployeeEditFormValues) => Promise<void>;
}) {
  const isEditMode = !!employee;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [created, setCreated] = useState<CreatedResult | null>(null);

  const inviteForm = useForm<EmployeeInviteFormValues>({
    resolver: zodResolver(employeeInviteSchema),
    defaultValues: INVITE_DEFAULTS,
  });
  const editForm = useForm<EmployeeEditFormValues>({
    resolver: zodResolver(employeeEditSchema),
    defaultValues: { jobTitle: "", hiredAt: "" },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(undefined);
    setCreated(null);
    if (employee) {
      editForm.reset({ jobTitle: employee.jobTitle, hiredAt: employee.hiredAt?.slice(0, 10) ?? "" });
    } else {
      inviteForm.reset(INVITE_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  async function handleCreateSubmit(values: EmployeeInviteFormValues) {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await onCreate(values);
      setCreated({
        employee: result.employee,
        temporaryPassword: result.temporaryPassword,
        email: values.email,
      });
      toast.success("Funcionário criado com sucesso");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível criar o funcionário";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(values: EmployeeEditFormValues) {
    if (!employee) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onUpdate(employee.id, values);
      toast.success("Funcionário atualizado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível atualizar o funcionário";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyPassword() {
    if (!created?.temporaryPassword) return;
    void navigator.clipboard.writeText(created.temporaryPassword);
    toast.success("Senha copiada");
  }

  const assignableRoles = roles.filter((role) => ASSIGNABLE_ROLES.includes(role.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Funcionário criado</DialogTitle>
              <DialogDescription>
                Guarde a senha temporária abaixo — ela só é exibida uma vez.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Acesso: </span>
                {created.email}
              </div>
              {created.temporaryPassword ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  <span className="flex-1 break-all">{created.temporaryPassword}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={handleCopyPassword}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Esse e-mail já tinha uma conta no sistema — só o papel foi concedido.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </>
        ) : isEditMode ? (
          <>
            <DialogHeader>
              <DialogTitle>Editar funcionário</DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="flex flex-col gap-4">
              <Field data-invalid={!!editForm.formState.errors.jobTitle}>
                <FieldLabel htmlFor="edit-job-title">Cargo</FieldLabel>
                <Input id="edit-job-title" {...editForm.register("jobTitle")} />
                <FieldError
                  errors={
                    editForm.formState.errors.jobTitle
                      ? [{ message: editForm.formState.errors.jobTitle.message }]
                      : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-hired-at">Contratado em (opcional)</FieldLabel>
                <Input id="edit-hired-at" type="date" {...editForm.register("hiredAt")} />
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
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Novo funcionário</DialogTitle>
              <DialogDescription>Cria o acesso do funcionário e o vincula à equipe.</DialogDescription>
            </DialogHeader>
            <form onSubmit={inviteForm.handleSubmit(handleCreateSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!inviteForm.formState.errors.firstName}>
                  <FieldLabel htmlFor="invite-first-name">Nome</FieldLabel>
                  <Input id="invite-first-name" {...inviteForm.register("firstName")} />
                  <FieldError
                    errors={
                      inviteForm.formState.errors.firstName
                        ? [{ message: inviteForm.formState.errors.firstName.message }]
                        : undefined
                    }
                  />
                </Field>
                <Field data-invalid={!!inviteForm.formState.errors.lastName}>
                  <FieldLabel htmlFor="invite-last-name">Sobrenome</FieldLabel>
                  <Input id="invite-last-name" {...inviteForm.register("lastName")} />
                  <FieldError
                    errors={
                      inviteForm.formState.errors.lastName
                        ? [{ message: inviteForm.formState.errors.lastName.message }]
                        : undefined
                    }
                  />
                </Field>
              </div>

              <Field data-invalid={!!inviteForm.formState.errors.email}>
                <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                <Input id="invite-email" type="email" {...inviteForm.register("email")} />
                <FieldError
                  errors={
                    inviteForm.formState.errors.email
                      ? [{ message: inviteForm.formState.errors.email.message }]
                      : undefined
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!inviteForm.formState.errors.jobTitle}>
                  <FieldLabel htmlFor="invite-job-title">Cargo</FieldLabel>
                  <Input
                    id="invite-job-title"
                    placeholder="Ex: Cabeleireiro(a)"
                    {...inviteForm.register("jobTitle")}
                  />
                  <FieldError
                    errors={
                      inviteForm.formState.errors.jobTitle
                        ? [{ message: inviteForm.formState.errors.jobTitle.message }]
                        : undefined
                    }
                  />
                </Field>
                <Field data-invalid={!!inviteForm.formState.errors.roleId}>
                  <FieldLabel>Papel</FieldLabel>
                  <Controller
                    control={inviteForm.control}
                    name="roleId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {ROLE_LABEL[role.name] ?? role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError
                    errors={
                      inviteForm.formState.errors.roleId
                        ? [{ message: inviteForm.formState.errors.roleId.message }]
                        : undefined
                    }
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="invite-hired-at">Contratado em (opcional)</FieldLabel>
                <Input id="invite-hired-at" type="date" {...inviteForm.register("hiredAt")} />
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
                  {isSubmitting ? "Criando..." : "Criar funcionário"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
