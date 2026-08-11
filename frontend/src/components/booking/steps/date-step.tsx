import { formatMonthShort, formatWeekday, nextDays, toDateKey } from "@/lib/booking/date-utils";
import { cn } from "@/lib/utils";
import type { BookingStepProps } from "@/components/booking/step-props";

const DAYS_AHEAD = 21;

export function DateStep({
  form,
  onSelect,
}: BookingStepProps & { onSelect: (dateKey: string) => void }) {
  const selected = form.watch("date");
  const fieldError = form.formState.errors.date?.message;
  const days = nextDays(DAYS_AHEAD);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Escolha uma data</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o dia em que deseja ser atendido.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Datas disponíveis"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2"
      >
        {days.map((day) => {
          const key = toDateKey(day);
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(key)}
              className={cn(
                "flex h-20 w-16 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="text-[11px] uppercase opacity-80">{formatWeekday(day)}</span>
              <span className="text-lg font-semibold">{day.getDate()}</span>
              <span className="text-[11px] uppercase opacity-80">{formatMonthShort(day)}</span>
            </button>
          );
        })}
      </div>

      {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
    </div>
  );
}
