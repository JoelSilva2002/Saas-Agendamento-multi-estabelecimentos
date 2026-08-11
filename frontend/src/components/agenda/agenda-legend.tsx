import { EMPLOYEE_LEGEND } from "@/lib/agenda/colors";

export function AgendaLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
      {EMPLOYEE_LEGEND.map((employee) => (
        <span key={employee.id} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: employee.color }}
          />
          {employee.displayName}
        </span>
      ))}
    </div>
  );
}
