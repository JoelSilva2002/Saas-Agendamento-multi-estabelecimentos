// Shapes mirror the real NestJS API responses (see modules/{services,employees,
// appointments,auth,payments} controllers/DTOs) so swapping BookingApi's mock
// implementation for real `fetch` calls later is a drop-in change.

import type { Service, Employee } from "@/lib/mock-data/types";

export type { Service, Employee };

export type TimeSlot = {
  startAt: string; // ISO datetime
  endAt: string; // ISO datetime
};

export type AuthMode = "login" | "register";

export type AuthResult = {
  accessToken: string;
  user: { id: string; firstName: string; lastName: string; email: string };
};

export type CouponPreview = {
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
};

export type PaymentMethod = "pix" | "card";
export type PaymentType = "deposit" | "full";

export type CreateAppointmentInput = {
  serviceId: string;
  employeeId: string;
  startAt: string;
};

export type CreatedAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  priceCents: number;
};

export type CreatePaymentInput = {
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  couponCode?: string;
};

export type CreatedPayment = {
  id: string;
  status: "pending" | "paid";
  amountCents: number;
};

export type BookingApi = {
  listServices(): Promise<Service[]>;
  listEligibleEmployees(serviceId: string): Promise<Employee[]>;
  listAvailableSlots(params: {
    serviceId: string;
    employeeId: string;
    date: string;
  }): Promise<TimeSlot[]>;
  login(params: { email: string; password: string }): Promise<AuthResult>;
  register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<AuthResult>;
  // No standalone validate-coupon endpoint exists on the backend today —
  // coupon validation/redemption is bundled into payment creation. This is
  // an optimistic client-side preview only; the payment step is the source
  // of truth and can still reject a coupon this preview accepted.
  previewCoupon(params: { code: string; amountCents: number }): Promise<CouponPreview>;
  createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment>;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
};
