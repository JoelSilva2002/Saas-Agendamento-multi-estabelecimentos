"use client";

import { UserCog, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import {
  createEmployee,
  deactivateEmployee,
  getEmployeeSchedule,
  listEmployees,
  setEmployeeSchedule,
  updateEmployee,
} from "@/lib/employees/api";
import type { Employee } from "@/lib/employees/types";
import { listRoles } from "@/lib/roles/api";
import type { Role } from "@/lib/roles/types";
import type { EmployeeEditFormValues, EmployeeInviteFormValues } from "@/lib/schemas/employee-schema";
import { inviteUser, listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeScheduleDialog } from "./employee-schedule-dialog";

export function FuncionariosScreen() {
  const [session] = useState(() => getSessionContext());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const [employeesResult, usersResult, rolesResult] = await Promise.all([
        listEmployees(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
        listRoles(),
      ]);
      setEmployees(employeesResult);
      setUsers(usersResult);
      setRoles(rolesResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os funcionários");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

  // Stable identity so EmployeeScheduleDialog's load effect doesn't refetch (and clobber
  // unsaved edits) every time this screen re-renders while the dialog is open.
  const fetchEmployeeSchedule = useCallback(
    (employeeId: string) => getEmployeeSchedule(session.tenantId, session.establishmentId, employeeId),
    [session.tenantId, session.establishmentId],
  );

  async function handleCreate(values: EmployeeInviteFormValues) {
    if (!session) throw new Error("Sessão não encontrada");
    const invited = await inviteUser(session.tenantId, {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      roleId: values.roleId,
      establishmentId: session.establishmentId,
    });
    const employee = await createEmployee(session.tenantId, session.establishmentId, {
      userId: invited.user.id,
      jobTitle: values.jobTitle,
      hiredAt: values.hiredAt || undefined,
    });
    await load();
    return { employee, temporaryPassword: invited.temporaryPassword };
  }

  async function handleUpdate(employeeId: string, values: EmployeeEditFormValues) {
    if (!session) throw new Error("Sessão não encontrada");
    await updateEmployee(session.tenantId, session.establishmentId, employeeId, {
      jobTitle: values.jobTitle,
      hiredAt: values.hiredAt || undefined,
    });
    await load();
  }

  async function handleDeactivate() {
    if (!session || !deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivateEmployee(session.tenantId, session.establishmentId, deactivateTarget.id);
      toast.success("Funcionário desativado");
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível desativar o funcionário");
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
          <p className="text-sm text-muted-foreground">Equipe, horários de trabalho e produtividade.</p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setFormOpen(true);
          }}
        >
          <UserCog />
          Novo funcionário
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contratado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserX className="size-8 opacity-50" />
                    Nenhum funcionário cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {userNames.get(employee.userId) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.jobTitle}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                      {employee.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.hiredAt ? new Date(employee.hiredAt).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScheduleEmployee(employee);
                          setScheduleOpen(true);
                        }}
                      >
                        Horário
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingEmployee(employee);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      {employee.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeactivateTarget(employee)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
        roles={roles}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <EmployeeScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        employee={scheduleEmployee}
        getSchedule={fetchEmployeeSchedule}
        onSave={async (employeeId, slots) => {
          await setEmployeeSchedule(session.tenantId, session.establishmentId, employeeId, slots);
        }}
      />

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar funcionário</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${userNames.get(deactivateTarget.userId) ?? "Este funcionário"} deixará de aparecer na agenda para novos agendamentos.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
