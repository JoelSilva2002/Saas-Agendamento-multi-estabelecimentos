import { IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAgendaBlockRequestDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
