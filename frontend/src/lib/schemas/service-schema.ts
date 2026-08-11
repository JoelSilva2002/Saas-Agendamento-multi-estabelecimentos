import { z } from "zod";

// Numeric fields stay as strings here (react-hook-form registers inputs as strings
// regardless of type="number") and are parsed to numbers in the dialog's submit handler —
// mirrors how fit-in-schema.ts keeps date/time as strings and combines them on submit,
// rather than using z.coerce.number() (which breaks zodResolver's input/output typing).
export const serviceSchema = z.object({
  name: z.string().min(1, "Informe o nome do serviço"),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, "Informe um preço")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Informe um preço válido"),
  durationMinutes: z
    .string()
    .min(1, "Informe a duração")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "Informe a duração em minutos"),
  bufferBeforeMinutes: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), "Valor inválido"),
  bufferAfterMinutes: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), "Valor inválido"),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const serviceCategorySchema = z.object({
  name: z.string().min(1, "Informe o nome da categoria"),
});

export type ServiceCategoryFormValues = z.infer<typeof serviceCategorySchema>;
