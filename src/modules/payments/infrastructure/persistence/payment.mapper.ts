import { Payment as PrismaPayment } from '@prisma/client';
import { Payment } from '../../domain/entities/payment.entity';

export class PaymentMapper {
  static toDomain(record: PrismaPayment): Payment {
    return Payment.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      appointmentId: record.appointmentId,
      method: record.method,
      paymentType: record.paymentType,
      status: record.status,
      amountCents: record.amountCents,
      externalReference: record.externalReference,
      paidAt: record.paidAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
