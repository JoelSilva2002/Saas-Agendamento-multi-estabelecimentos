import { z } from "zod";

const NO_EMPLOYEE_VALUE = "any";

export const waitlistSchema = z.object({
  clientId: z.string().min(1, "Selecione o cliente"),
  serviceId: z.string().min(1, "Selecione o serviço"),
  employeeId: z.string().optional(),
  desiredDate: z.string().min(1, "Informe a data desejada"),
  desiredPeriod: z.enum(["morning", "afternoon", "evening", "any"]),
});

export type WaitlistFormValues = z.infer<typeof waitlistSchema>;

export { NO_EMPLOYEE_VALUE };
