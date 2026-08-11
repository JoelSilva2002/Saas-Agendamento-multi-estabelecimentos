import { z } from "zod";

// Numeric/date fields stay as strings (react-hook-form registers inputs as strings regardless
// of type) and are parsed in the dialog's submit handler — same convention as service-schema.ts.
export const couponSchema = z
  .object({
    code: z.string().min(1, "Informe o código"),
    discountType: z.enum(["percentage", "fixed_amount"]),
    discountValue: z
      .string()
      .min(1, "Informe o valor do desconto")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Informe um valor válido"),
    maxUses: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1), "Valor inválido"),
    minPurchase: z
      .string()
      .optional()
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Valor inválido"),
    validFrom: z.string().min(1, "Informe a data de início"),
    validUntil: z.string().min(1, "Informe a data de término"),
  })
  .refine((data) => data.validFrom < data.validUntil, {
    message: "A data de início deve ser anterior à data de término",
    path: ["validUntil"],
  });

export type CouponFormValues = z.infer<typeof couponSchema>;
