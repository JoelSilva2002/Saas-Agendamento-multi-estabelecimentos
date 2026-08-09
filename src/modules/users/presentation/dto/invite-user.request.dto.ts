import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class InviteUserRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  establishmentId?: string;
}
