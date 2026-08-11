import { Check } from "lucide-react";

import { BOOKING_STEP_COUNT, BOOKING_STEP_TITLES } from "@/lib/schemas/booking-schema";
import { cn } from "@/lib/utils";

export function WizardProgress({ step }: { step: number }) {
  const steps = Array.from({ length: BOOKING_STEP_COUNT }, (_, i) => i + 1);

  return (
    <div className="w-full">
      {/* Mobile: compact progress bar + current step label */}
      <div className="sm:hidden">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Passo {step} de {BOOKING_STEP_COUNT} · {BOOKING_STEP_TITLES[step]}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / BOOKING_STEP_COUNT) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop/tablet: full stepper */}
      <ol className="hidden items-center sm:flex">
        {steps.map((s, index) => {
          const isCompleted = s < step;
          const isCurrent = s === step;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : s}
                </div>
                <span
                  className={cn(
                    "max-w-16 text-center text-[11px] leading-tight text-muted-foreground",
                    isCurrent && "font-medium text-foreground",
                  )}
                >
                  {BOOKING_STEP_TITLES[s]}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 bg-muted-foreground/30",
                    isCompleted && "bg-primary",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
