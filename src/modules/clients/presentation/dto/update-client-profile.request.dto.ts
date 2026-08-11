import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateClientProfileRequestDto {
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
