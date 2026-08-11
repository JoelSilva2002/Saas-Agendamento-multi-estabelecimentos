import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchEstablishmentsRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
