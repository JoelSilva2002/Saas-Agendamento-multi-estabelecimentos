import { IsBoolean, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentRequestDto {
  /** Required for staff bookings (`appointment:create`); ignored and forced to the caller's
   * own id for self-service bookings (`appointment:create:own`) — see AppointmentsController. */
  @IsOptional()
  @IsUUID()
  clientId?: string;

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
