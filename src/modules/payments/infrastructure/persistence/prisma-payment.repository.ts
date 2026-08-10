import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Payment } from '../../domain/entities/payment.entity';
import { ListPaymentsFilters, PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { PaymentMapper } from './payment.mapper';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(payment: Payment): Promise<Payment> {
    const created = await this.prisma.payment.create({ data: payment.toPersistenceProps() });
    return PaymentMapper.toDomain(created);
  }

  async update(payment: Payment): Promise<Payment> {
    const props = payment.toPersistenceProps();
    const updated = await this.prisma.payment.update({
      where: { id: props.id },
      data: {
        status: props.status,
        externalReference: props.externalReference,
        paidAt: props.paidAt,
      },
    });
    return PaymentMapper.toDomain(updated);
  }

  async findById(id: string, establishmentId: string): Promise<Payment | null> {
    const found = await this.prisma.payment.findFirst({ where: { id, establishmentId } });
    return found ? PaymentMapper.toDomain(found) : null;
  }

  async findByExternalReference(externalReference: string): Promise<Payment | null> {
    const found = await this.prisma.payment.findFirst({ where: { externalReference } });
    return found ? PaymentMapper.toDomain(found) : null;
  }

  async findMany(establishmentId: string, filters: ListPaymentsFilters): Promise<Payment[]> {
    const records = await this.prisma.payment.findMany({
      where: { establishmentId, appointmentId: filters.appointmentId, status: filters.status },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(PaymentMapper.toDomain);
  }

  async sumPaidAmountBetween(establishmentId: string, from: Date, to: Date): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { establishmentId, status: 'paid', paidAt: { gte: from, lt: to } },
      _sum: { amountCents: true },
    });
    return result._sum.amountCents ?? 0;
  }
}
