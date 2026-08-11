import { Lock, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AGENDA_VIEW_MODES, type AgendaViewMode } from "./agenda-view-mode";

type ToolbarEmployee = { id: string; displayName: string };

export function AgendaToolbar({
  viewMode,
  onViewModeChange,
  employees,
  selectedEmployeeId,
  onSelectedEmployeeChange,
  selectedDate,
  onDateChange,
  onOpenFitIn,
  onOpenBlock,
}: {
  viewMode: AgendaViewMode;
  onViewModeChange: (mode: AgendaViewMode) => void;
  employees: ToolbarEmployee[];
  selectedEmployeeId: string;
  onSelectedEmployeeChange: (employeeId: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenFitIn: () => void;
  onOpenBlock: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Visão da agenda" className="flex gap-1 rounded-lg bg-muted p-1">
          {AGENDA_VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={viewMode === mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === mode.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <Input
          type="date"
          aria-label="Ir para data"
          className="w-40"
          value={selectedDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
        />

        {viewMode === "professional" && (
          <Select value={selectedEmployeeId} onValueChange={onSelectedEmployeeChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione um profissional" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onOpenBlock}>
          <Lock />
          Bloquear horário
        </Button>
        <Button onClick={onOpenFitIn}>
          <Zap />
          Encaixe
        </Button>
      </div>
    </div>
  );
}
