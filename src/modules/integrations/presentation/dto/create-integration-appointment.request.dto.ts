import { Type } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// "Book for whoever's texting me" without knowing a UUID: the bot supplies name/phone/email
// instead of a clientId, and ResolveOrCreateClientUseCase (Fase 23) resolves-or-creates the
// walk-in account — same code path the admin's Encaixe dialog uses.
export class IntegrationClientRequestDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateIntegrationAppointmentRequestDto {
  @ValidateIf((dto: CreateIntegrationAppointmentRequestDto) => !dto.client)
  @IsUUID()
  clientId?: string;

  @ValidateIf((dto: CreateIntegrationAppointmentRequestDto) => !dto.clientId)
  @ValidateNested()
  @Type(() => IntegrationClientRequestDto)
  client?: IntegrationClientRequestDto;

  @IsUUID()
  employeeId!: string;

  @IsUUID()
  serviceId!: string;

  @IsISO8601()
  startAt!: string;
}
