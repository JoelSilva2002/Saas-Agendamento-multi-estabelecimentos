import { ChevronLeft, ChevronRight, Lock, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFullDate, formatTime, toDateKey } from "@/lib/booking/date-utils";
import { getEmployeeColor, type EmployeeColorMap } from "@/lib/agenda/colors";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/agenda/status";
import type { AgendaAppointment, AgendaBlock } from "@/lib/agenda/types";

function shiftDay(dateKey: string, delta: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

type MobileEntry =
  | { kind: "appointment"; startAt: string; appointment: AgendaAppointment }
  | { kind: "block"; startAt: string; block: AgendaBlock };

export function AgendaMobileList({
  date,
  onDateChange,
  appointments,
  blocks,
  colorMap,
  onAppointmentClick,
  onBlockClick,
}: {
  date: string;
  onDateChange: (date: string) => void;
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  colorMap: EmployeeColorMap;
  onAppointmentClick: (appointment: AgendaAppointment) => void;
  onBlockClick: (block: AgendaBlock) => void;
}) {
  const entries: MobileEntry[] = [
    ...appointments
      .filter((a) => a.startAt.slice(0, 10) === date)
      .map((appointment) => ({ kind: "appointment" as const, startAt: appointment.startAt, appointment })),
    ...blocks
      .filter((b) => b.startAt.slice(0, 10) === date)
      .map((block) => ({ kind: "block" as const, startAt: block.startAt, block })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => onDateChange(shiftDay(date, -1))}>
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium capitalize">{formatFullDate(date)}</span>
        <Button variant="outline" size="icon" onClick={() => onDateChange(shiftDay(date, 1))}>
          <ChevronRight />
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum agendamento neste dia.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) =>
            entry.kind === "appointment" ? (
              <button
                key={`appt-${entry.appointment.id}`}
                type="button"
                onClick={() => onAppointmentClick(entry.appointment)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <span
                  className="h-full min-h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: getEmployeeColor(colorMap, entry.appointment.employeeId) }}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {entry.appointment.isFitIn && <Zap className="size-3.5 text-muted-foreground" />}
                    {entry.appointment.clientName} · {entry.appointment.serviceName}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(entry.appointment.startAt)} – {formatTime(entry.appointment.endAt)} ·{" "}
                    {entry.appointment.employeeName}
                  </span>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[entry.appointment.status]}>
                  {STATUS_LABELS[entry.appointment.status]}
                </Badge>
              </button>
            ) : (
              <button
                key={`block-${entry.block.id}`}
                type="button"
                onClick={() => onBlockClick(entry.block)}
                className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
              >
                <Lock className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="text-sm font-medium">{entry.block.reason ?? "Bloqueado"}</div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(entry.block.startAt)} – {formatTime(entry.block.endAt)}
                  </span>
                </div>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
