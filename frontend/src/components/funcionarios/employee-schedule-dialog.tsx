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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import type { Employee, ScheduleSlot } from "@/lib/employees/types";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

type DayRow = { active: boolean; startTime: string; endTime: string };

function defaultRow(): DayRow {
  return { active: false, startTime: "09:00", endTime: "18:00" };
}

export function EmployeeScheduleDialog({
  open,
  onOpenChange,
  employee,
  getSchedule,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  getSchedule: (employeeId: string) => Promise<ScheduleSlot[]>;
  onSave: (employeeId: string, slots: ScheduleSlot[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<DayRow[]>(() => WEEKDAYS.map(defaultRow));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open || !employee) return;
    setIsLoading(true);
    setError(undefined);
    getSchedule(employee.id)
      .then((slots) => {
        setRows(
          WEEKDAYS.map((day) => {
            const slot = slots.find((s) => s.weekday === day.value && s.slotType === "working");
            return slot
              ? { active: true, startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5) }
              : defaultRow();
          }),
        );
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o horário");
      })
      .finally(() => setIsLoading(false));
  }, [open, employee, getSchedule]);

  function updateRow(index: number, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    if (!employee) return;
    setIsSaving(true);
    setError(undefined);
    try {
      const slots: ScheduleSlot[] = rows.flatMap((row, index) =>
        row.active
          ? [
              {
                weekday: WEEKDAYS[index].value,
                slotType: "working" as const,
                startTime: row.startTime,
                endTime: row.endTime,
              },
            ]
          : [],
      );
      await onSave(employee.id, slots);
      toast.success("Horário atualizado");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o horário";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Horário de trabalho</DialogTitle>
          <DialogDescription>{employee ? employee.jobTitle : ""}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {WEEKDAYS.map((day, index) => (
              <div key={day.value} className="flex items-center gap-3">
                <Switch
                  checked={rows[index].active}
                  onCheckedChange={(checked) => updateRow(index, { active: checked })}
                />
                <span className="w-20 text-sm">{day.label}</span>
                <Input
                  type="time"
                  className="w-28"
                  disabled={!rows[index].active}
                  value={rows[index].startTime}
                  onChange={(e) => updateRow(index, { startTime: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="time"
                  className="w-28"
                  disabled={!rows[index].active}
                  value={rows[index].endTime}
                  onChange={(e) => updateRow(index, { endTime: e.target.value })}
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
            {isSaving ? "Salvando..." : "Salvar horário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
