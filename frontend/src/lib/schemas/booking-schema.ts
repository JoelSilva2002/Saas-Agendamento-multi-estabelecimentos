import { z } from "zod";

export const bookingFormSchema = z
  .object({
    // Step 1 — Serviço
    serviceId: z.string().min(1, "Selecione um serviço"),

    // Step 2 — Profissional
    employeeId: z.string().min(1, "Selecione um profissional"),

    // Step 3 — Data
    date: z.string().min(1, "Selecione uma data"),

    // Step 4 — Horário
    slotStartAt: z.string().min(1, "Selecione um horário"),
    slotEndAt: z.string().min(1),

    // Step 5 — Identificação
    authMode: z.enum(["login", "register"]),
    email: z.email("Informe um e-mail válido"),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),

    // Step 6 — Cupom (opcional)
    couponCode: z.string().optional(),

    // Step 7 — Pagamento
    paymentMethod: z.enum(["pix", "card"], { error: "Selecione a forma de pagamento" }),
    paymentType: z.enum(["deposit", "full"], { error: "Selecione o tipo de pagamento" }),
  })
  .superRefine((values, ctx) => {
    if (values.authMode === "register") {
      if (!values.firstName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["firstName"], message: "Informe seu nome" });
      }
      if (!values.lastName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["lastName"], message: "Informe seu sobrenome" });
      }
      if (!values.phone?.trim() || values.phone.trim().length < 8) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Informe um telefone válido" });
      }
    }
  });

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export const BOOKING_STEP_COUNT = 8;

export const STEP_FIELDS: Record<number, (keyof BookingFormValues)[]> = {
  1: ["serviceId"],
  2: ["employeeId"],
  3: ["date"],
  4: ["slotStartAt", "slotEndAt"],
  5: ["authMode", "email", "password", "firstName", "lastName", "phone"],
  6: ["couponCode"],
  7: ["paymentMethod", "paymentType"],
  8: [],
};

export const BOOKING_STEP_TITLES: Record<number, string> = {
  1: "Serviço",
  2: "Profissional",
  3: "Data",
  4: "Horário",
  5: "Identificação",
  6: "Cupom",
  7: "Pagamento",
  8: "Confirmação",
};

export const defaultBookingFormValues: BookingFormValues = {
  serviceId: "",
  employeeId: "",
  date: "",
  slotStartAt: "",
  slotEndAt: "",
  authMode: "login",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  couponCode: "",
  paymentMethod: "pix",
  paymentType: "full",
};
