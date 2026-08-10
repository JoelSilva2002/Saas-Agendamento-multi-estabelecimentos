import { IsString, MinLength } from 'class-validator';

export class CancelAppointmentRequestDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
