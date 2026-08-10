import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class RescheduleAppointmentRequestDto {
  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
