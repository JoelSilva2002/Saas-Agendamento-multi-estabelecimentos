import { IsString, MinLength } from 'class-validator';

export class CancelIntegrationAppointmentRequestDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
