"use client";

import { Plus, Scissors } from "lucide-react";
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
import { listEligibleEmployees, listEmployees } from "@/lib/employees/api";
import type { Employee } from "@/lib/employees/types";
import type { ServiceCategoryFormValues } from "@/lib/schemas/service-schema";
import {
  createService,
  createServiceCategory,
  deactivateService,
  deleteServiceCategory,
  listServiceCategories,
  listServices,
  setServiceEmployees,
  updateService,
  updateServiceCategory,
} from "@/lib/services/api";
import type { CatalogService, CreateServiceInput, ServiceCategory } from "@/lib/services/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

import { ServiceCategoryDialog } from "./service-category-dialog";
import { ServiceEmployeesDialog } from "./service-employees-dialog";
import { ServiceFormDialog } from "./service-form-dialog";

export function ServicosScreen() {
  const [session] = useState(() => getSessionContext());
  const [services, setServices] = useState<CatalogService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false);
  const [employeesTargetService, setEmployeesTargetService] = useState<CatalogService | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<CatalogService | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ServiceCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const [servicesResult, categoriesResult, employeesResult, usersResult] = await Promise.all([
        listServices(session.tenantId, session.establishmentId),
        listServiceCategories(session.tenantId, session.establishmentId),
        listEmployees(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
      ]);
      setServices(servicesResult);
      setCategories(categoriesResult);
      setEmployees(employeesResult);
      setUsers(usersResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os serviços");
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

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    displayName: userNames.get(e.userId) ?? e.jobTitle,
  }));

  async function handleServiceSubmit(values: CreateServiceInput) {
    if (!session) throw new Error("Sessão não encontrada");
    if (editingService) {
      await updateService(session.tenantId, session.establishmentId, editingService.id, values);
    } else {
      await createService(session.tenantId, session.establishmentId, {
        name: values.name,
        categoryId: values.categoryId,
        description: values.description,
        price: values.price,
        durationMinutes: values.durationMinutes,
        bufferBeforeMinutes: values.bufferBeforeMinutes,
        bufferAfterMinutes: values.bufferAfterMinutes,
      });
    }
    await load();
  }

  async function handleCategorySubmit(values: ServiceCategoryFormValues) {
    if (!session) throw new Error("Sessão não encontrada");
    if (editingCategory) {
      await updateServiceCategory(session.tenantId, session.establishmentId, editingCategory.id, values);
    } else {
      await createServiceCategory(session.tenantId, session.establishmentId, values);
    }
    await load();
  }

  async function handleDeactivateService() {
    if (!session || !deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivateService(session.tenantId, session.establishmentId, deactivateTarget.id);
      toast.success("Serviço desativado");
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível desativar o serviço");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleDeleteCategory() {
    if (!session || !deleteCategoryTarget) return;
    setIsDeletingCategory(true);
    try {
      await deleteServiceCategory(session.tenantId, session.establishmentId, deleteCategoryTarget.id);
      toast.success("Categoria removida");
      setDeleteCategoryTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a categoria");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de serviços, preços e profissionais habilitados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setCategoryDialogOpen(true);
            }}
          >
            <Plus />
            Categoria
          </Button>
          <Button
            onClick={() => {
              setEditingService(null);
              setServiceFormOpen(true);
            }}
          >
            <Plus />
            Novo serviço
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm"
            >
              {category.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  setEditingCategory(category);
                  setCategoryDialogOpen(true);
                }}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteCategoryTarget(category)}
              >
                Excluir
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Scissors className="size-8 opacity-50" />
                    Nenhum serviço cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.categoryId ? (categoryNames.get(service.categoryId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell>
                    {service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{service.durationMinutes} min</TableCell>
                  <TableCell>
                    <Badge variant={service.status === "active" ? "default" : "secondary"}>
                      {service.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmployeesTargetService(service);
                          setEmployeesDialogOpen(true);
                        }}
                      >
                        Profissionais
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingService(service);
                          setServiceFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      {service.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeactivateTarget(service)}
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

      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={editingService}
        categories={categories}
        onSubmit={handleServiceSubmit}
      />

      <ServiceCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
      />

      <ServiceEmployeesDialog
        open={employeesDialogOpen}
        onOpenChange={setEmployeesDialogOpen}
        service={employeesTargetService}
        employees={employeeOptions}
        getEligibleIds={(serviceId) =>
          listEligibleEmployees(session.tenantId, session.establishmentId, serviceId).then((list) =>
            list.map((e) => e.id),
          )
        }
        onSave={async (serviceId, employeeIds) => {
          await setServiceEmployees(session.tenantId, session.establishmentId, serviceId, employeeIds);
        }}
      />

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar serviço</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `"${deactivateTarget.name}" deixará de aparecer para novos agendamentos.`
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
              onClick={handleDeactivateService}
            >
              {isDeactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryTarget} onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
            <DialogDescription>
              {deleteCategoryTarget
                ? `Remover "${deleteCategoryTarget.name}"? Os serviços dessa categoria ficam sem categoria.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteCategoryTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingCategory}
              onClick={handleDeleteCategory}
            >
              {isDeletingCategory ? "Removendo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
