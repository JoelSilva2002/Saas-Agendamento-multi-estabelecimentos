import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { WaitlistStatus } from '../../domain/entities/waitlist-entry.entity';

const STATUSES: WaitlistStatus[] = ['waiting', 'notified', 'converted', 'expired', 'cancelled'];

export class ListWaitlistRequestDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: WaitlistStatus;
}
