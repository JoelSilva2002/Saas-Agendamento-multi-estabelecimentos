import { IsString, MinLength } from 'class-validator';

export class CheckInAppointmentRequestDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
