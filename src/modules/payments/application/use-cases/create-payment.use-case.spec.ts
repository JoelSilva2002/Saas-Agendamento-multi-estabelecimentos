import { CreatePaymentUseCase } from './create-payment.use-case';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { PaymentRepositoryPort } from '../../domain/payment.repository.port';
import { PaymentGatewayPort } from '../../domain/payment-gateway.port';
import { CouponRepositoryPort } from '../../../coupons/domain/coupon.repository.port';
import { ValidateCouponUseCase } from '../../../coupons/application/use-cases/validate-coupon.use-case';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { Payment } from '../../domain/entities/payment.entity';
import {
  AppointmentNotPayableError,
  DepositNotConfiguredError,
} from '../../domain/errors/payment-errors';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-errors';

describe('CreatePaymentUseCase', () => {
  const appointment = Appointment.create({
    id: 'appointment-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    endAt: new Date('2026-03-10T10:30:00.000Z'),
    priceCents: 10000,
    createdById: 'staff-1',
  });

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
    paymentRepository?: Partial<PaymentRepositoryPort>;
    paymentGateway?: Partial<PaymentGatewayPort>;
    couponRepository?: Partial<CouponRepositoryPort>;
    validateCoupon?: Partial<ValidateCouponUseCase>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(appointment),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(
        Establishment.create({
          id: 'establishment-1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          depositEnabled: true,
          depositPercentage: 30,
        }),
      ),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const paymentRepository: PaymentRepositoryPort = {
      create: jest.fn().mockImplementation((p: Payment) => Promise.resolve(p)),
      ...overrides?.paymentRepository,
    } as unknown as PaymentRepositoryPort;

    const paymentGateway: PaymentGatewayPort = {
      createCharge: jest
        .fn()
        .mockResolvedValue({ externalReference: 'ext-ref-1', status: 'pending' }),
      ...overrides?.paymentGateway,
    } as unknown as PaymentGatewayPort;

    const couponRepository: CouponRepositoryPort = {
      redeem: jest.fn().mockResolvedValue(undefined),
      ...overrides?.couponRepository,
    } as unknown as CouponRepositoryPort;

    const validateCoupon = {
      execute: jest.fn(),
      ...overrides?.validateCoupon,
    } as unknown as ValidateCouponUseCase;

    return {
      useCase: new CreatePaymentUseCase(
        appointmentRepository,
        establishmentRepository,
        paymentRepository,
        paymentGateway,
        couponRepository,
        validateCoupon,
      ),
      paymentRepository,
      paymentGateway,
      couponRepository,
      validateCoupon,
    };
  }

  const baseInput = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    method: 'pix' as const,
    paymentType: 'full' as const,
  };

  it('charges the full appointment price for paymentType full', async () => {
    const { useCase, paymentRepository } = build();
    await useCase.execute(baseInput);

    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 10000 }),
    );
  });

  it('charges a percentage of the price for paymentType deposit', async () => {
    const { useCase, paymentRepository } = build();
    await useCase.execute({ ...baseInput, paymentType: 'deposit' });

    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 3000 }),
    );
  });

  it('throws DepositNotConfiguredError when the establishment has no deposit policy', async () => {
    const { useCase } = build({
      establishmentRepository: {
        findById: jest.fn().mockResolvedValue(
          Establishment.create({
            id: 'establishment-1',
            tenantId: 'tenant-1',
            name: 'Filial',
            slug: 'filial',
          }),
        ),
      },
    });

    await expect(useCase.execute({ ...baseInput, paymentType: 'deposit' })).rejects.toThrow(
      DepositNotConfiguredError,
    );
  });

  it('never calls the gateway for a local payment', async () => {
    const { useCase, paymentGateway, paymentRepository } = build();
    await useCase.execute({ ...baseInput, paymentType: 'local', method: 'cash' });

    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ externalReference: null }),
    );
  });

  it('calls the gateway and stores its externalReference for pix/card', async () => {
    const { useCase, paymentGateway, paymentRepository } = build();
    await useCase.execute(baseInput);

    expect(paymentGateway.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'pix', amountCents: 10000 }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ externalReference: 'ext-ref-1' }),
    );
  });

  it('throws AppointmentNotFoundError when the appointment does not exist', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotFoundError);
  });

  it('throws AppointmentNotPayableError for a cancelled appointment', async () => {
    const cancelled = appointment.cancel('motivo', 'staff-1');
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(cancelled) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotPayableError);
  });

  it('applies the coupon discount to the charged amount and redeems it before charging', async () => {
    const { useCase, paymentGateway, paymentRepository, couponRepository, validateCoupon } = build({
      validateCoupon: {
        execute: jest.fn().mockResolvedValue({ couponId: 'coupon-1', discountCents: 2000 }),
      },
    });

    await useCase.execute({ ...baseInput, couponCode: 'PROMO10' });

    expect(validateCoupon.execute).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROMO10', amountCents: 10000 }),
    );
    expect(couponRepository.redeem).toHaveBeenCalledWith(
      expect.objectContaining({
        couponId: 'coupon-1',
        appointmentId: 'appointment-1',
        discountAppliedCents: 2000,
      }),
    );
    expect(paymentGateway.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 8000 }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 8000 }),
    );
  });

  it('never calls the gateway or creates a payment when coupon redemption fails', async () => {
    const { useCase, paymentGateway, paymentRepository } = build({
      validateCoupon: {
        execute: jest.fn().mockResolvedValue({ couponId: 'coupon-1', discountCents: 2000 }),
      },
      couponRepository: { redeem: jest.fn().mockRejectedValue(new Error('exhausted')) },
    });

    await expect(useCase.execute({ ...baseInput, couponCode: 'PROMO10' })).rejects.toThrow(
      'exhausted',
    );
    expect(paymentGateway.createCharge).not.toHaveBeenCalled();
    expect(paymentRepository.create).not.toHaveBeenCalled();
  });
});
