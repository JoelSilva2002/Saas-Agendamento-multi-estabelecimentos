import { z } from "zod";

export const fitInSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
  serviceId: z.string().min(1, "Selecione um serviço"),
  employeeId: z.string().min(1, "Selecione um profissional"),
  date: z.string().min(1, "Selecione uma data"),
  time: z.string().min(1, "Informe um horário"),
});

export type FitInFormValues = z.infer<typeof fitInSchema>;
