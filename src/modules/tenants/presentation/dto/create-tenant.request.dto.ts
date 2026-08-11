import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { TENANT_PLANS } from '../../domain/entities/tenant.entity';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const SLUG_MESSAGE = 'slug deve conter apenas letras minúsculas, números e hífen';

export class CreateTenantRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug!: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsIn(TENANT_PLANS)
  plan?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(1)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  ownerLastName!: string;

  /** Optional — if omitted, the backend generates a temporary password and returns it once. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  ownerPassword?: string;

  @IsString()
  @MinLength(1)
  establishmentName!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  establishmentSlug!: string;
}
