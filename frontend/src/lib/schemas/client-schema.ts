import { z } from "zod";

export const clientProfileSchema = z.object({
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientProfileFormValues = z.infer<typeof clientProfileSchema>;

// Only the name is required — a walk-in client is frequently booked with nothing more (see
// User.createWalkIn on the backend). Email is validated only when actually filled in.
export const createClientSchema = z.object({
  firstName: z.string().min(1, "Informe o nome"),
  lastName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type CreateClientFormValues = z.infer<typeof createClientSchema>;
