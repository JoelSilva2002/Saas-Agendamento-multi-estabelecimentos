import { z } from "zod";

export const clientProfileSchema = z.object({
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientProfileFormValues = z.infer<typeof clientProfileSchema>;
