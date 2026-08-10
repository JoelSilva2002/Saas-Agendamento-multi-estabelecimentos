import { Payment } from './payment.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

function buildPayment(overrides?: Partial<{ initialStatus: Payment['status'] }>): Payment {
  return Payment.create({
    id: 'payment-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    method: 'pix',
    paymentType: 'full',
    amountCents: 5000,
    initialStatus: overrides?.initialStatus,
  });
}

describe('Payment', () => {
  it('creates a pending payment by default', () => {
    const payment = buildPayment();
    expect(payment.status).toBe('pending');
    expect(payment.paidAt).toBeNull();
  });

  it('rejects a non-positive amount', () => {
    expect(() =>
      Payment.create({
        id: 'payment-1',
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        method: 'pix',
        paymentType: 'full',
        amountCents: 0,
      }),
    ).toThrow(ValidationError);
  });

  it('markPaid() sets status and paidAt', () => {
    const paid = buildPayment().markPaid();
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).toBeInstanceOf(Date);
  });

  it('markFailed() sets status', () => {
    const failed = buildPayment().markFailed();
    expect(failed.status).toBe('failed');
  });

  it('rejects transitioning a terminal payment again', () => {
    const paid = buildPayment().markPaid();
    expect(() => paid.markPaid()).toThrow(ValidationError);
    expect(() => paid.markFailed()).toThrow(ValidationError);
  });
});
