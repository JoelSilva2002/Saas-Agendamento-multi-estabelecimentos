import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectableCard } from "@/components/booking/selectable-card";
import type { PublicEmployee } from "@/lib/public/types";
import type { BookingStepProps } from "@/components/booking/step-props";

export function ProfessionalStep({
  form,
  employees,
  status,
  error,
  onSelect,
}: BookingStepProps & {
  employees: PublicEmployee[];
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  onSelect: (employeeId: string) => void;
}) {
  const selected = form.watch("employeeId");
  const fieldError = form.formState.errors.employeeId?.message;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Com quem você quer agendar?</h2>
        <p className="text-sm text-muted-foreground">
          Profissionais disponíveis para o serviço escolhido.
        </p>
      </div>

      {status === "loading" && (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "success" && employees.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum profissional disponível para este serviço no momento.
          </AlertDescription>
        </Alert>
      )}

      {status === "success" && employees.length > 0 && (
        <div role="radiogroup" aria-label="Profissionais" className="flex flex-col gap-2">
          {employees.map((employee) => (
            <SelectableCard
              key={employee.id}
              selected={selected === employee.id}
              onSelect={() => onSelect(employee.id)}
              title={employee.name}
              subtitle={employee.jobTitle}
            />
          ))}
        </div>
      )}

      {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
    </div>
  );
}
