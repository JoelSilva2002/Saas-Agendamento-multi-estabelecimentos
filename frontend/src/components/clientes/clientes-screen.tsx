"use client";

import { UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { listAppointments } from "@/lib/appointments/api";
import { getSessionContext } from "@/lib/auth/session-context";
import { listClients, updateClientProfile } from "@/lib/clients/api";
import type { ClientProfile, UpdateClientProfileInput } from "@/lib/clients/types";
import { listServices } from "@/lib/services/api";
import type { CatalogService } from "@/lib/services/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

import { ClientFormDialog } from "./client-form-dialog";
import { ClientHistoryDialog } from "./client-history-dialog";

const HISTORY_WINDOW_DAYS = 365;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ClientesScreen() {
  const [session] = useState(() => getSessionContext());
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<ClientProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<ClientProfile | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const [clientsResult, usersResult, servicesResult] = await Promise.all([
        listClients(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
        listServices(session.tenantId, session.establishmentId),
      ]);
      setClients(clientsResult);
      setUsers(usersResult);
      setServices(servicesResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os clientes");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const userEmails = new Map(users.map((u) => [u.id, u.email]));
  const serviceNames = new Map(services.map((s) => [s.id, s.name]));

  const getHistory = useCallback(() => {
    if (!session || !historyTarget) return Promise.resolve([]);
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - HISTORY_WINDOW_DAYS);
    const toDate = new Date(now);
    toDate.setDate(toDate.getDate() + HISTORY_WINDOW_DAYS);
    return listAppointments(session.tenantId, session.establishmentId, {
      clientId: historyTarget.userId,
      fromDate: toIsoDate(fromDate),
      toDate: toIsoDate(toDate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, historyTarget?.userId]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  async function handleSubmit(values: UpdateClientProfileInput) {
    if (!session || !editTarget) throw new Error("Sessão não encontrada");
    await updateClientProfile(session.tenantId, session.establishmentId, editTarget.id, values);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Cadastro e histórico de clientes do estabelecimento.</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Nascimento</TableHead>
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
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserX className="size-8 opacity-50" />
                    Nenhum cliente cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{userNames.get(client.userId) ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {userEmails.get(client.userId) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.birthDate
                      ? new Date(client.birthDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHistoryTarget(client);
                          setHistoryOpen(true);
                        }}
                      >
                        Histórico
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditTarget(client);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editTarget}
        clientName={editTarget ? userNames.get(editTarget.userId) ?? "" : ""}
        onSubmit={handleSubmit}
      />

      <ClientHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        clientName={historyTarget ? userNames.get(historyTarget.userId) ?? "" : ""}
        getHistory={getHistory}
        serviceNames={serviceNames}
      />
    </div>
  );
}
