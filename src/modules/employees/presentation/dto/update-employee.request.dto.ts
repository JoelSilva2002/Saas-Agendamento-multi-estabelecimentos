import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateEmployeeRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  jobTitle?: string;

  @IsOptional()
  @IsDateString()
  hiredAt?: string;
}
