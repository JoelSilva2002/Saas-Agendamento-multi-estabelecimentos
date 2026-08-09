import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEstablishmentRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
