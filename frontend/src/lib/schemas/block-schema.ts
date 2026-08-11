import { z } from "zod";

export const ALL_STAFF_VALUE = "all";

export const blockSchema = z
  .object({
    employeeId: z.string().min(1),
    date: z.string().min(1, "Selecione uma data"),
    startTime: z.string().min(1, "Informe o horário de início"),
    endTime: z.string().min(1, "Informe o horário de término"),
    reason: z.string().optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "O horário de término deve ser depois do início",
    path: ["endTime"],
  });

export type BlockFormValues = z.infer<typeof blockSchema>;
