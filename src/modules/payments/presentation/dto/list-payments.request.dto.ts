import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../domain/entities/payment.entity';

const STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];

export class ListPaymentsRequestDto {
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: PaymentStatus;
}
