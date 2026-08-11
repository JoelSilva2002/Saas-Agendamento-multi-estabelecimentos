export type PaymentMethod = "pix" | "card" | "cash";
export type PaymentType = "deposit" | "full" | "local";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";

export type Payment = {
  id: string;
  establishmentId: string;
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  amountCents: number;
  externalReference: string | null;
  paidAt: string | null;
};

export type CreatePaymentInput = {
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  couponCode?: string;
};

export type ListPaymentsParams = {
  appointmentId?: string;
  status?: PaymentStatus;
};
