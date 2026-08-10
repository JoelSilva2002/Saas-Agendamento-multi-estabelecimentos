import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type PaymentMethod = 'pix' | 'card' | 'cash';
export type PaymentType = 'deposit' | 'full' | 'local';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

const TERMINAL_STATUSES: PaymentStatus[] = ['paid', 'failed', 'refunded', 'cancelled'];

export interface PaymentProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  amountCents: number;
  externalReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  amountCents: number;
  externalReference?: string | null;
  /** Local ("pay at store") payments are recorded already `paid` when staff confirms cash
   * in hand at booking time; pix/card start `pending` until the gateway (or a manual
   * mark-paid, in sandbox mode) confirms. */
  initialStatus?: PaymentStatus;
}

export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  static create(props: CreatePaymentProps): Payment {
    if (!Number.isInteger(props.amountCents) || props.amountCents <= 0) {
      throw new ValidationError('Payment requer amountCents inteiro e positivo');
    }

    const now = new Date();
    return new Payment({
      id: props.id,
      establishmentId: props.establishmentId,
      appointmentId: props.appointmentId,
      method: props.method,
      paymentType: props.paymentType,
      status: props.initialStatus ?? 'pending',
      amountCents: props.amountCents,
      externalReference: props.externalReference ?? null,
      paidAt: props.initialStatus === 'paid' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get appointmentId(): string {
    return this.props.appointmentId;
  }

  get method(): PaymentMethod {
    return this.props.method;
  }

  get paymentType(): PaymentType {
    return this.props.paymentType;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get amountCents(): number {
    return this.props.amountCents;
  }

  get externalReference(): string | null {
    return this.props.externalReference;
  }

  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  markPaid(): Payment {
    this.assertNotTerminal();
    return new Payment({
      ...this.props,
      status: 'paid',
      paidAt: new Date(),
      updatedAt: new Date(),
    });
  }

  markFailed(): Payment {
    this.assertNotTerminal();
    return new Payment({ ...this.props, status: 'failed', updatedAt: new Date() });
  }

  private assertNotTerminal(): void {
    if (TERMINAL_STATUSES.includes(this.props.status)) {
      throw new ValidationError(
        `Não é possível alterar um pagamento com status '${this.props.status}'`,
      );
    }
  }

  toPersistenceProps(): PaymentProps {
    return { ...this.props };
  }
}
