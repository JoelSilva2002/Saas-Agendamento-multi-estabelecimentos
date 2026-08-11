"use client";

import { Building2, ChevronLeft, ChevronRight, LogIn, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TenantOnboardingDialog } from "@/components/superadmin/tenant-onboarding-dialog";
import { TenantStatusBadge } from "@/components/superadmin/tenant-status-badge";
import { ApiError } from "@/lib/api/client";
import { getMe } from "@/lib/auth/api";
import { resolveSessionContext } from "@/lib/auth/resolve-session";
import { setSessionContext } from "@/lib/auth/session-context";
import { startImpersonation } from "@/lib/auth/token-storage";
import { impersonateTenant, listTenants, updateTenantStatus } from "@/lib/tenants/api";
import type { Tenant, TenantStatus } from "@/lib/tenants/types";

const PAGE_SIZE = 10;

type StatusAction = { tenant: Tenant; nextStatus: TenantStatus; label: string };

const STATUS_ACTION_LABEL: Record<string, string> = {
  suspended: "Suspender",
  active: "Reativar",
  cancelled: "Cancelar",
};

export default function SuperadminTenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const result = await listTenants({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os empreendimentos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  async function confirmStatusChange() {
    if (!statusAction) return;
    setIsChangingStatus(true);
    try {
      await updateTenantStatus(statusAction.tenant.id, statusAction.nextStatus);
      toast.success(`${statusAction.tenant.name}: status atualizado`);
      setStatusAction(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o status");
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleImpersonate(tenant: Tenant) {
    setImpersonatingId(tenant.id);
    try {
      const result = await impersonateTenant(tenant.id);
      startImpersonation({
        accessToken: result.accessToken,
        sessionId: result.sessionId,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
      });
      // getMe() here runs as the impersonated owner — startImpersonation already swapped the
      // active access token before this call.
      setSessionContext(await resolveSessionContext(await getMe()));
      window.location.assign("/admin/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível acessar como suporte");
      setImpersonatingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empreendimentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os tenants cadastrados na plataforma.
          </p>
        </div>
        <Button onClick={() => setOnboardingOpen(true)}>
          <Plus />
          Novo empreendimento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou slug..."
              className="w-64 pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as TenantStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="size-8 opacity-50" />
                    Nenhum empreendimento encontrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.document ?? "—"}</TableCell>
                  <TableCell>
                    <TenantStatusBadge status={tenant.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {tenant.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setStatusAction({ tenant, nextStatus: "suspended", label: STATUS_ACTION_LABEL.suspended })
                            }
                          >
                            Suspender
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={impersonatingId === tenant.id}
                            onClick={() => handleImpersonate(tenant)}
                          >
                            <LogIn />
                            {impersonatingId === tenant.id ? "Entrando..." : "Acessar como suporte"}
                          </Button>
                        </>
                      )}
                      {tenant.status === "suspended" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setStatusAction({ tenant, nextStatus: "active", label: STATUS_ACTION_LABEL.active })
                          }
                        >
                          Reativar
                        </Button>
                      )}
                      {tenant.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setStatusAction({ tenant, nextStatus: "cancelled", label: STATUS_ACTION_LABEL.cancelled })
                          }
                        >
                          Cancelar
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? "0 resultados" : `Página ${page} de ${totalPages} · ${total} resultados`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight />
          </Button>
        </div>
      </div>

      <TenantOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCreated={() => {
          setPage(1);
          void load();
        }}
      />

      <Dialog open={!!statusAction} onOpenChange={(open) => !open && setStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusAction?.label} empreendimento</DialogTitle>
            <DialogDescription>
              {statusAction?.nextStatus === "cancelled"
                ? `Cancelar "${statusAction?.tenant.name}" é permanente — o status não poderá ser alterado depois.`
                : `Confirma ${statusAction?.label.toLowerCase()} o acesso de "${statusAction?.tenant.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setStatusAction(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={statusAction?.nextStatus === "cancelled" ? "destructive" : "default"}
              disabled={isChangingStatus}
              onClick={confirmStatusChange}
            >
              {isChangingStatus ? "Aplicando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
