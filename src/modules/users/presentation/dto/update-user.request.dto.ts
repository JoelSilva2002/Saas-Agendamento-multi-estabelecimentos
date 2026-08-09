import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
