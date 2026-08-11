import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WizardNav({
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  isSubmitting,
}: {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))] sm:mx-0 sm:rounded-b-lg">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onBack}
        disabled={step === 1 || isSubmitting}
        className="h-12 min-w-24"
      >
        Voltar
      </Button>
      <Button
        type="button"
        size="lg"
        onClick={onNext}
        disabled={nextDisabled || isSubmitting}
        className="h-12 flex-1 sm:flex-none sm:min-w-32"
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {nextLabel ?? (step === totalSteps ? "Confirmar" : "Continuar")}
      </Button>
    </div>
  );
}
