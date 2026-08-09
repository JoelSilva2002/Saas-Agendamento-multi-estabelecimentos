import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateTenantRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug deve conter apenas letras minúsculas, números e hífen' })
  slug!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(1)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  ownerLastName!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}
