import type { UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function TextField({
  label,
  type = "text",
  placeholder,
  registration,
  error,
  autoComplete,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={registration.name}>{label}</FieldLabel>
      <Input
        id={registration.name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className="h-11"
        {...registration}
      />
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  );
}
