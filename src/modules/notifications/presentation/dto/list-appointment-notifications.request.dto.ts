import { IsUUID } from 'class-validator';

export class ListAppointmentNotificationsRequestDto {
  @IsUUID()
  appointmentId!: string;
}
