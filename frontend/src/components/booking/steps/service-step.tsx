import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectableCard } from "@/components/booking/selectable-card";
import { formatCentsToBRL } from "@/lib/booking/pricing";
import type { Service } from "@/lib/booking/types";
import type { BookingStepProps } from "@/components/booking/step-props";

export function ServiceStep({
  form,
  services,
  status,
  error,
  onSelect,
}: BookingStepProps & {
  services: Service[];
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  onSelect: (serviceId: string) => void;
}) {
  const selected = form.watch("serviceId");
  const fieldError = form.formState.errors.serviceId?.message;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Qual serviço você deseja?</h2>
        <p className="text-sm text-muted-foreground">Escolha um serviço para continuar.</p>
      </div>

      {status === "loading" && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "success" && (
        <div role="radiogroup" aria-label="Serviços" className="flex flex-col gap-2">
          {services.map((service) => (
            <SelectableCard
              key={service.id}
              selected={selected === service.id}
              onSelect={() => onSelect(service.id)}
              title={service.name}
              subtitle={`${service.durationMinutes} min${service.description ? ` · ${service.description}` : ""}`}
              trailing={<span className="font-medium">{formatCentsToBRL(service.price * 100)}</span>}
            />
          ))}
        </div>
      )}

      {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
    </div>
  );
}
