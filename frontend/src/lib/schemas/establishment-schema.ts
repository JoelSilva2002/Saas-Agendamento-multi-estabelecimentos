import { z } from "zod";

// Numeric fields stay as strings (react-hook-form registers inputs as strings regardless of
// type) and are parsed in the screen's submit handler — same convention as service-schema.ts.
export const establishmentSchema = z
  .object({
    name: z.string().min(1, "Informe o nome"),
    slug: z.string().min(1, "Informe o slug"),
    description: z.string().max(2000, "A descrição deve ter no máximo 2000 caracteres").optional(),
    timezone: z.string().min(1, "Informe o fuso horário"),
    phones: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    cancellationMinHoursNotice: z
      .string()
      .min(1, "Informe o prazo mínimo")
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Valor inválido"),
    noShowFeeEnabled: z.boolean(),
    noShowFeePercentage: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 100), "Informe um valor entre 1 e 100"),
    depositEnabled: z.boolean(),
    depositPercentage: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 100), "Informe um valor entre 1 e 100"),
    reminder24hEnabled: z.boolean(),
    reminder2hEnabled: z.boolean(),
    notifyEmailEnabled: z.boolean(),
    notifyWhatsappEnabled: z.boolean(),
  })
  .refine((data) => !data.noShowFeeEnabled || !!data.noShowFeePercentage, {
    message: "Informe o percentual da multa por no-show",
    path: ["noShowFeePercentage"],
  })
  .refine((data) => !data.depositEnabled || !!data.depositPercentage, {
    message: "Informe o percentual do sinal",
    path: ["depositPercentage"],
  });

export type EstablishmentFormValues = z.infer<typeof establishmentSchema>;
