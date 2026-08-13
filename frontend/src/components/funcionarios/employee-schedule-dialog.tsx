"use client";

import { Plus, X } from "lucide-react";
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

type BreakRow = { startTime: string; endTime: string };
type DayRow = { active: boolean; startTime: string; endTime: string; breaks: BreakRow[] };

function defaultRow(): DayRow {
  return { active: false, startTime: "09:00", endTime: "18:00", breaks: [] };
}

function defaultBreak(): BreakRow {
  return { startTime: "12:00", endTime: "13:00" };
}

/** Client-side mirror of SetEmployeeScheduleUseCase's containment/overlap rules — the backend
 * rejects the same cases, but its error messages interpolate the weekday as a raw number
 * ("...no dia da semana '1'"), which isn't fit for a user. Catching this first also saves a
 * round-trip. */
function validateRows(rows: DayRow[]): string | undefined {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!row.active) continue;
    const dayLabel = WEEKDAYS[index].label;

    if (row.startTime >= row.endTime) {
      return `${dayLabel}: o horário de início precisa ser antes do término.`;
    }

    for (let i = 0; i < row.breaks.length; i++) {
      const brk = row.breaks[i];
      if (brk.startTime >= brk.endTime) {
        return `${dayLabel}: a pausa precisa ter o início antes do término.`;
      }
      if (brk.startTime < row.startTime || brk.endTime > row.endTime) {
        return `${dayLabel}: a pausa precisa estar dentro do horário de trabalho (${row.startTime}–${row.endTime}).`;
      }
      for (let j = i + 1; j < row.breaks.length; j++) {
        const other = row.breaks[j];
        if (brk.startTime < other.endTime && other.startTime < brk.endTime) {
          return `${dayLabel}: as pausas não podem se sobrepor.`;
        }
      }
    }
  }
  return undefined;
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
            const daySlots = slots.filter((s) => s.weekday === day.value);
            const working = daySlots.find((s) => s.slotType === "working");
            if (!working) return defaultRow();
            const breaks = daySlots
              .filter((s) => s.slotType === "break")
              .map((s) => ({ startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) }));
            return {
              active: true,
              startTime: working.startTime.slice(0, 5),
              endTime: working.endTime.slice(0, 5),
              breaks,
            };
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

  function addBreak(dayIndex: number) {
    setRows((prev) =>
      prev.map((row, i) => (i === dayIndex ? { ...row, breaks: [...row.breaks, defaultBreak()] } : row)),
    );
  }

  function updateBreak(dayIndex: number, breakIndex: number, patch: Partial<BreakRow>) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === dayIndex
          ? { ...row, breaks: row.breaks.map((b, j) => (j === breakIndex ? { ...b, ...patch } : b)) }
          : row,
      ),
    );
  }

  function removeBreak(dayIndex: number, breakIndex: number) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === dayIndex ? { ...row, breaks: row.breaks.filter((_, j) => j !== breakIndex) } : row,
      ),
    );
  }

  async function handleSave() {
    if (!employee) return;
    setError(undefined);

    const validationError = validateRows(rows);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const slots: ScheduleSlot[] = rows.flatMap((row, index) => {
        if (!row.active) return [];
        const weekday = WEEKDAYS[index].value;
        return [
          { weekday, slotType: "working" as const, startTime: row.startTime, endTime: row.endTime },
          ...row.breaks.map((brk) => ({
            weekday,
            slotType: "break" as const,
            startTime: brk.startTime,
            endTime: brk.endTime,
          })),
        ];
      });
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
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {WEEKDAYS.map((day, index) => (
              <div key={day.value} className="flex flex-col gap-2 rounded-md border p-2">
                <div className="flex items-center gap-3">
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

                {rows[index].active && (
                  <div className="flex flex-col gap-2 pl-11">
                    {rows[index].breaks.map((brk, breakIndex) => (
                      <div key={breakIndex} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-muted-foreground">Pausa</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={brk.startTime}
                          onChange={(e) => updateBreak(index, breakIndex, { startTime: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">até</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={brk.endTime}
                          onChange={(e) => updateBreak(index, breakIndex, { endTime: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeBreak(index, breakIndex)}
                          aria-label="Remover pausa"
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={() => addBreak(index)}
                    >
                      <Plus />
                      Adicionar pausa
                    </Button>
                  </div>
                )}
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
