import { IsBoolean, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentRequestDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  employeeId!: string;

  @IsUUID()
  serviceId!: string;

  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsBoolean()
  isFitIn?: boolean;
}
