import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateClientRequestDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  /** Optional on purpose — a walk-in client is often booked with nothing more than a name. */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate deve estar no formato YYYY-MM-DD' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
