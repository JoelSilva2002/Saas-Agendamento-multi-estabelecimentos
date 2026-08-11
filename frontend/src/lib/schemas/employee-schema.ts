import { z } from "zod";

export const employeeInviteSchema = z.object({
  firstName: z.string().min(1, "Informe o nome"),
  lastName: z.string().min(1, "Informe o sobrenome"),
  email: z.email("Informe um e-mail válido"),
  roleId: z.string().min(1, "Selecione um papel"),
  jobTitle: z.string().min(1, "Informe o cargo"),
  hiredAt: z.string().optional(),
});

export type EmployeeInviteFormValues = z.infer<typeof employeeInviteSchema>;

export const employeeEditSchema = z.object({
  jobTitle: z.string().min(1, "Informe o cargo"),
  hiredAt: z.string().optional(),
});

export type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>;
