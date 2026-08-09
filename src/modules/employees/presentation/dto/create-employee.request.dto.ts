import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEmployeeRequestDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  jobTitle!: string;

  @IsOptional()
  @IsDateString()
  hiredAt?: string;
}
