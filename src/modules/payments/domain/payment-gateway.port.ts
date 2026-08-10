import { PaymentMethod } from './entities/payment.entity';

export interface CreateChargeParams {
  method: PaymentMethod;
  amountCents: number;
  /** Opaque reference passed to the gateway for reconciliation on their side (e.g. shows up
   * in their dashboard) — we use the local Payment id. */
  reference: string;
}

export interface CreateChargeResult {
  externalReference: string;
  /** `paid` only in sandbox mode's degenerate "cash-equivalent" case; real gateways always
   * come back `pending` and confirm later via webhook. */
  status: 'pending' | 'paid';
  checkoutUrl?: string;
}

/** `cash`/local payments never reach this port — see CreatePaymentUseCase. */
export abstract class PaymentGatewayPort {
  abstract createCharge(params: CreateChargeParams): Promise<CreateChargeResult>;
}
