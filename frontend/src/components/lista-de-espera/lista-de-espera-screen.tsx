"use client";

import { Clock, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { listEmployees } from "@/lib/employees/api";
import type { Employee } from "@/lib/employees/types";
import { listServices } from "@/lib/services/api";
import type { CatalogService } from "@/lib/services/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";
import { cancelWaitlistEntry, joinWaitlist, listWaitlist } from "@/lib/waitlist/api";
import type { JoinWaitlistInput, WaitlistEntry } from "@/lib/waitlist/types";

import { WaitlistEntryDialog } from "./waitlist-entry-dialog";

const STATUS_LABEL: Record<WaitlistEntry["status"], string> = {
  waiting: "Aguardando",
  notified: "Notificado",
  converted: "Convertido",
  expired: "Expirado",
  cancelled: "Cancelado",
};

const PERIOD_LABEL: Record<WaitlistEntry["desiredPeriod"], string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  any: "Qualquer horário",
};

export function ListaDeEsperaScreen() {
  const [session] = useState(() => getSessionContext());
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [clients, setClients] = useState<TenantUser[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<WaitlistEntry | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const [entriesResult, clientsResult, servicesResult, employeesResult] = await Promise.all([
        listWaitlist(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
        listServices(session.tenantId, session.establishmentId),
        listEmployees(session.tenantId, session.establishmentId),
      ]);
      setEntries(entriesResult);
      setClients(clientsResult);
      setServices(servicesResult);
      setEmployees(employeesResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar a fila de espera");
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

  const clientNames = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
  const serviceNames = new Map(services.map((s) => [s.id, s.name]));
  const employeeNames = new Map(employees.map((e) => [e.id, e.jobTitle]));

  async function handleJoin(values: JoinWaitlistInput) {
    if (!session) throw new Error("Sessão não encontrada");
    await joinWaitlist(session.tenantId, session.establishmentId, values);
    await load();
  }

  async function handleCancel() {
    if (!session || !cancelTarget) return;
    setIsCancelling(true);
    try {
      await cancelWaitlistEntry(session.tenantId, session.establishmentId, cancelTarget.id);
      toast.success("Entrada removida da fila");
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover da fila");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lista de Espera</h1>
          <p className="text-sm text-muted-foreground">
            Clientes aguardando uma vaga, notificados automaticamente em cancelamentos.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <UserPlus />
          Adicionar à fila
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Data desejada</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="size-8 opacity-50" />
                    Nenhum cliente na fila de espera.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{clientNames.get(entry.clientId) ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {serviceNames.get(entry.serviceId) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.employeeId ? employeeNames.get(entry.employeeId) ?? "—" : "Qualquer profissional"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(entry.desiredDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{PERIOD_LABEL[entry.desiredPeriod]}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "waiting" ? "default" : "secondary"}>
                      {STATUS_LABEL[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.status === "waiting" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelTarget(entry)}
                      >
                        Remover
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WaitlistEntryDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clients={clients}
        services={services}
        employees={employees}
        onSubmit={handleJoin}
      />

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover da fila de espera</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${clientNames.get(cancelTarget.clientId) ?? "Este cliente"} será removido da fila de espera.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCancelTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isCancelling} onClick={handleCancel}>
              {isCancelling ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
