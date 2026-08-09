import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateEstablishmentRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
