import { z } from "zod";

// Payment and coupon are deliberately absent: there is no payment gateway integrated, and
// coupon redemption only happens as part of creating a payment. The client books, and the
// establishment settles the charge from the admin panel (Pagamentos).
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

    // Step 5 — Identificação (só é exigida aqui, no fim do fluxo)
    authMode: z.enum(["login", "register"]),
    email: z.email("Informe um e-mail válido"),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
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

export const BOOKING_STEP_COUNT = 6;

/** Step at which the visitor must be authenticated. Everything before it is browsable
 * anonymously — that is the whole point of the public flow. */
export const AUTH_STEP = 5;

export const STEP_FIELDS: Record<number, (keyof BookingFormValues)[]> = {
  1: ["serviceId"],
  2: ["employeeId"],
  3: ["date"],
  4: ["slotStartAt", "slotEndAt"],
  5: ["authMode", "email", "password", "firstName", "lastName", "phone"],
  6: [],
};

export const BOOKING_STEP_TITLES: Record<number, string> = {
  1: "Serviço",
  2: "Profissional",
  3: "Data",
  4: "Horário",
  5: "Identificação",
  6: "Confirmação",
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
};
