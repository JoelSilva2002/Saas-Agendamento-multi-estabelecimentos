import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres' })
  newPassword!: string;
}
