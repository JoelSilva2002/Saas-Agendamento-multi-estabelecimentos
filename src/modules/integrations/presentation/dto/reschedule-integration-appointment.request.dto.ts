import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class RescheduleIntegrationAppointmentRequestDto {
  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
