import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTime } from "@/lib/booking/date-utils";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/lib/booking/types";
import type { BookingStepProps } from "@/components/booking/step-props";

export function TimeSlotsStep({
  form,
  slots,
  status,
  error,
  onSelect,
}: BookingStepProps & {
  slots: TimeSlot[];
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  onSelect: (slot: TimeSlot) => void;
}) {
  const selected = form.watch("slotStartAt");
  const fieldError = form.formState.errors.slotStartAt?.message;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Escolha um horário</h2>
        <p className="text-sm text-muted-foreground">Horários livres para a data escolhida.</p>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "success" && slots.length === 0 && (
        <Alert>
          <AlertDescription>
            Não há horários livres nesta data. Volte e escolha outra data.
          </AlertDescription>
        </Alert>
      )}

      {status === "success" && slots.length > 0 && (
        <div role="radiogroup" aria-label="Horários" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const isSelected = selected === slot.startAt;
            return (
              <button
                key={slot.startAt}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(slot)}
                className={cn(
                  "min-h-11 rounded-md border text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent/50",
                )}
              >
                {formatTime(slot.startAt)}
              </button>
            );
          })}
        </div>
      )}

      {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
    </div>
  );
}
