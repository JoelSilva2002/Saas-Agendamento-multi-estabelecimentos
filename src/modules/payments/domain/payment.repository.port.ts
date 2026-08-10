import { Payment, PaymentStatus } from './entities/payment.entity';

export interface ListPaymentsFilters {
  appointmentId?: string;
  status?: PaymentStatus;
}

export abstract class PaymentRepositoryPort {
  abstract create(payment: Payment): Promise<Payment>;
  abstract update(payment: Payment): Promise<Payment>;
  abstract findById(id: string, establishmentId: string): Promise<Payment | null>;
  abstract findByExternalReference(externalReference: string): Promise<Payment | null>;
  abstract findMany(establishmentId: string, filters: ListPaymentsFilters): Promise<Payment[]>;

  /** Sum of `amountCents` for payments that became `paid` within [from, to) — used by the
   * dashboard's "faturamento do dia" metric. Recognizes revenue by paidAt, not by the
   * appointment's startAt, since that's the date the money actually came in. */
  abstract sumPaidAmountBetween(establishmentId: string, from: Date, to: Date): Promise<number>;
}
