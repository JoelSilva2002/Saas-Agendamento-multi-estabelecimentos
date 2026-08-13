import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateApiKeyRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
