import { IsIn, IsUUID } from 'class-validator';
import { PaymentMethod, PaymentType } from '../../domain/entities/payment.entity';

const METHODS: PaymentMethod[] = ['pix', 'card', 'cash'];
const TYPES: PaymentType[] = ['deposit', 'full', 'local'];

export class CreatePaymentRequestDto {
  @IsUUID()
  appointmentId!: string;

  @IsIn(METHODS)
  method!: PaymentMethod;

  @IsIn(TYPES)
  paymentType!: PaymentType;
}
