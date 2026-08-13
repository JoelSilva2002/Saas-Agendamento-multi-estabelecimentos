import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';
import { AppointmentStatus } from '../../../appointments/domain/entities/appointment.entity';

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export class ListIntegrationAppointmentsRequestDto {
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}
