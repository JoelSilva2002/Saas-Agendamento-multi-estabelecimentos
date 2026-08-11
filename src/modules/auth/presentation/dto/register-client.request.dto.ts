import { IsDateString, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterClientRequestDto {
  // Sent when signing up mid-booking; omitted when signing up from the login page, where no
  // establishment has been chosen yet.
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
