import { z } from "zod";

export const paymentSchema = z.object({
  appointmentId: z.string().min(1, "Selecione o agendamento"),
  method: z.enum(["pix", "card", "cash"]),
  paymentType: z.enum(["deposit", "full", "local"]),
  couponCode: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
