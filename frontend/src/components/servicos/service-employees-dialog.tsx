"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import type { CatalogService } from "@/lib/services/types";

type EligibilityEmployee = { id: string; displayName: string };

export function ServiceEmployeesDialog({
  open,
  onOpenChange,
  service,
  employees,
  getEligibleIds,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: CatalogService | null;
  employees: EligibilityEmployee[];
  getEligibleIds: (serviceId: string) => Promise<string[]>;
  onSave: (serviceId: string, employeeIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open || !service) return;
    setIsLoading(true);
    setError(undefined);
    getEligibleIds(service.id)
      .then((ids) => setSelected(new Set(ids)))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar os profissionais");
      })
      .finally(() => setIsLoading(false));
  }, [open, service, getEligibleIds]);

  function toggle(employeeId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(employeeId);
      } else {
        next.delete(employeeId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!service) return;
    setIsSaving(true);
    setError(undefined);
    try {
      await onSave(service.id, Array.from(selected));
      toast.success("Profissionais atualizados");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profissionais habilitados</DialogTitle>
          <DialogDescription>{service?.name}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{employee.displayName}</span>
                <Switch
                  checked={selected.has(employee.id)}
                  onCheckedChange={(checked) => toggle(employee.id, checked)}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSaving || isLoading} onClick={handleSave}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
