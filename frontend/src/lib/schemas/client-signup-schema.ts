import { z } from "zod";

export const clientSignupSchema = z
  .object({
    firstName: z.string().min(1, "Informe seu nome"),
    lastName: z.string().min(1, "Informe seu sobrenome"),
    email: z.email("Informe um e-mail válido"),
    phone: z.string().optional(),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ClientSignupFormValues = z.infer<typeof clientSignupSchema>;
