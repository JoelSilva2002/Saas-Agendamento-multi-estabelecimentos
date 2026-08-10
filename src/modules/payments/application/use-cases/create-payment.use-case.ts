import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-errors';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';
import { CouponRepositoryPort } from '../../../coupons/domain/coupon.repository.port';
import { ValidateCouponUseCase } from '../../../coupons/application/use-cases/validate-coupon.use-case';
import { PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { PaymentGatewayPort } from '../../domain/payment-gateway.port';
import {
  AppointmentNotPayableError,
  DepositNotConfiguredError,
} from '../../domain/errors/payment-errors';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../../domain/entities/payment.entity';

const NON_PAYABLE_APPOINTMENT_STATUSES = ['cancelled', 'no_show'];

export interface CreatePaymentInput {
  tenantId: string;
  establishmentId: string;
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  couponCode?: string;
}

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly couponRepository: CouponRepositoryPort,
    private readonly validateCoupon: ValidateCouponUseCase,
  ) {}

  async execute(input: CreatePaymentInput): Promise<Payment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }
    if (NON_PAYABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new AppointmentNotPayableError(appointment.status);
    }

    const baseAmountCents = await this.resolveAmountCents(input, appointment);

    let amountCents = baseAmountCents;
    let couponId: string | null = null;
    let discountCents = 0;
    if (input.couponCode) {
      const validated = await this.validateCoupon.execute({
        tenantId: input.tenantId,
        establishmentId: input.establishmentId,
        code: input.couponCode,
        amountCents: baseAmountCents,
      });
      couponId = validated.couponId;
      discountCents = validated.discountCents;
      amountCents = baseAmountCents - discountCents;
    }

    // Committed before the charge/payment are created — if a concurrent redemption already
    // used up the last slot, we fail here with nothing else written yet.
    if (couponId) {
      await this.couponRepository.redeem({
        id: randomUUID(),
        couponId,
        appointmentId: input.appointmentId,
        clientId: appointment.clientId,
        discountAppliedCents: discountCents,
      });
    }

    const id = randomUUID();

    let externalReference: string | null = null;
    let initialStatus: PaymentStatus = 'pending';

    // "local" (pay-at-store) never talks to a gateway — it's confirmed later by staff via
    // the mark-paid endpoint, exactly like a pix/card payment in sandbox mode would be.
    if (input.paymentType !== 'local') {
      const charge = await this.paymentGateway.createCharge({
        method: input.method,
        amountCents,
        reference: id,
      });
      externalReference = charge.externalReference;
      initialStatus = charge.status;
    }

    const payment = Payment.create({
      id,
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      method: input.method,
      paymentType: input.paymentType,
      amountCents,
      externalReference,
      initialStatus,
    });

    return this.paymentRepository.create(payment);
  }

  private async resolveAmountCents(
    input: CreatePaymentInput,
    appointment: Appointment,
  ): Promise<number> {
    if (input.paymentType !== 'deposit') {
      return appointment.priceCents;
    }

    const establishment = await this.establishmentRepository.findById(
      input.establishmentId,
      input.tenantId,
    );
    if (!establishment) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }
    if (!establishment.depositEnabled || !establishment.depositPercentage) {
      throw new DepositNotConfiguredError();
    }

    return Math.round((appointment.priceCents * establishment.depositPercentage) / 100);
  }
}
