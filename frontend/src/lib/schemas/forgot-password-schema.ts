import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
