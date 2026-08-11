import {
  ELIGIBLE_EMPLOYEES_BY_SERVICE,
  MOCK_EMPLOYEES,
  MOCK_SERVICES,
} from "@/lib/mock-data/catalog";
import { delay, randomId, seededRandom } from "@/lib/mock-data/mock-utils";
import { computeChargeCents } from "./pricing";
import type {
  AuthResult,
  BookingApi,
  CouponPreview,
  CreatedAppointment,
  CreatedPayment,
  TimeSlot,
} from "./types";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;

const KNOWN_COUPONS: Record<string, Omit<CouponPreview, "code">> = {
  BEMVINDO10: { discountType: "percentage", discountValue: 10 },
  DESC20: { discountType: "fixed_amount", discountValue: 20 },
};

export function createMockBookingApi(): BookingApi {
  // Per-instance ledger simulating the backend's price snapshot on the
  // appointment row, read back when the payment is created.
  const appointmentPriceCents = new Map<string, number>();

  return {
    async listServices() {
      await delay(400);
      return MOCK_SERVICES;
    },

    async listEligibleEmployees(serviceId) {
      await delay(400);
      const ids = ELIGIBLE_EMPLOYEES_BY_SERVICE[serviceId] ?? [];
      return MOCK_EMPLOYEES.filter((e) => ids.includes(e.id));
    },

    async listAvailableSlots({ serviceId, employeeId, date }) {
      await delay(500);
      const service = MOCK_SERVICES.find((s) => s.id === serviceId);
      if (!service) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requested = new Date(`${date}T00:00:00`);
      if (requested < today) return [];

      const rand = seededRandom(`${employeeId}:${date}`);
      const slots: TimeSlot[] = [];
      const stepMinutes = service.durationMinutes;

      for (
        let minutes = BUSINESS_START_HOUR * 60;
        minutes + stepMinutes <= BUSINESS_END_HOUR * 60;
        minutes += stepMinutes
      ) {
        const hour = Math.floor(minutes / 60);
        if (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) continue;

        // ~35% of slots are already booked by someone else.
        if (rand() < 0.35) continue;

        const start = new Date(requested);
        start.setHours(0, minutes, 0, 0);
        const end = new Date(start.getTime() + stepMinutes * 60_000);
        slots.push({ startAt: start.toISOString(), endAt: end.toISOString() });
      }

      return slots;
    },

    async login({ email, password }) {
      await delay(600);
      if (password.length < 8) {
        throw new Error("E-mail ou senha inválidos");
      }
      const [localPart] = email.split("@");
      return {
        accessToken: randomId("token"),
        user: {
          id: randomId("user"),
          firstName: localPart || "Cliente",
          lastName: "",
          email,
        },
      } satisfies AuthResult;
    },

    async register({ email, password, firstName, lastName }) {
      await delay(700);
      if (password.length < 8) {
        throw new Error("A senha deve ter ao menos 8 caracteres");
      }
      return {
        accessToken: randomId("token"),
        user: { id: randomId("user"), firstName, lastName, email },
      } satisfies AuthResult;
    },

    async previewCoupon({ code, amountCents }) {
      await delay(500);
      const found = KNOWN_COUPONS[code.trim().toUpperCase()];
      if (!found) {
        throw new Error(`Cupom "${code}" não encontrado`);
      }
      if (found.discountType === "fixed_amount" && found.discountValue * 100 >= amountCents) {
        throw new Error("Cupom inválido para o valor deste agendamento");
      }
      return { code: code.trim().toUpperCase(), ...found };
    },

    async createAppointment({ serviceId, employeeId, startAt }) {
      await delay(600);
      const service = MOCK_SERVICES.find((s) => s.id === serviceId);
      if (!service) throw new Error("Serviço não encontrado");
      void employeeId;
      const start = new Date(startAt);
      const end = new Date(start.getTime() + service.durationMinutes * 60_000);
      const priceCents = Math.round(service.price * 100);
      const id = randomId("appt");
      appointmentPriceCents.set(id, priceCents);
      return {
        id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: "pending",
        priceCents,
      } satisfies CreatedAppointment;
    },

    async createPayment({ appointmentId, paymentType, couponCode }) {
      await delay(800);
      const priceCents = appointmentPriceCents.get(appointmentId);
      if (priceCents === undefined) throw new Error("Agendamento não encontrado");

      // Coupon is (re)validated here, not before — matches the real backend,
      // where validation is bundled into payment creation.
      let coupon: CouponPreview | null = null;
      if (couponCode) {
        const found = KNOWN_COUPONS[couponCode.trim().toUpperCase()];
        if (!found) throw new Error(`Cupom "${couponCode}" não é mais válido`);
        coupon = { code: couponCode.trim().toUpperCase(), ...found };
      }

      const { totalCents } = computeChargeCents({ priceCents, paymentType, coupon });

      return {
        id: randomId("pay"),
        status: paymentType === "full" ? "paid" : "pending",
        amountCents: totalCents,
      } satisfies CreatedPayment;
    },
  };
}
