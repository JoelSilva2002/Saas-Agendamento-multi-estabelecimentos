type LegendEntry = { id: string; displayName: string; color: string };

export function AgendaLegend({ legend }: { legend: LegendEntry[] }) {
  if (legend.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
      {legend.map((employee) => (
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
