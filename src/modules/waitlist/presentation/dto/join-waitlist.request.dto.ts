import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { WaitlistPeriod } from '../../domain/entities/waitlist-entry.entity';

const PERIODS: WaitlistPeriod[] = ['morning', 'afternoon', 'evening', 'any'];

export class JoinWaitlistRequestDto {
  /** Required for staff joining a client onto the waitlist; ignored (forced to the caller)
   * for a client self-service join — same clientId-trust pattern as booking. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desiredDate deve estar no formato YYYY-MM-DD' })
  desiredDate!: string;

  @IsOptional()
  @IsIn(PERIODS)
  desiredPeriod?: WaitlistPeriod;
}
