import { IsIn, IsString } from 'class-validator';

export class PaymentWebhookRequestDto {
  @IsString()
  externalReference!: string;

  @IsIn(['paid', 'failed'])
  status!: 'paid' | 'failed';
}
